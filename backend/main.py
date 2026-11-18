import hashlib
import json
import re
from datetime import date, timedelta
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlmodel import Session, select

import auth

import llm
from auth import current_user
from db import (Artifact, AuthToken, Card, Document, QuizAttempt, ReviewLog, User,
                get_session, init_db)
from parsing import chunk_text, extract_text
from srs import sm2

MAX_UPLOAD = 20 * 1024 * 1024
MAX_CHARS = 300_000  # cost guard

app = FastAPI(title="Study Assistant")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173"],
                   allow_methods=["*"], allow_headers=["*"])


@app.on_event("startup")
def _startup():
    init_db()


def _doc(s: Session, doc_id: int, user: User) -> Document:
    d = s.get(Document, doc_id)
    if not d or d.user_id != user.id:
        raise HTTPException(404, "Document not found")
    return d


def _cached(s: Session, doc_id: int, kind: str):
    return s.exec(select(Artifact).where(Artifact.doc_id == doc_id, Artifact.kind == kind)).first()


@app.post("/upload")
async def upload(file: UploadFile = File(...), s: Session = Depends(get_session),
                 user: User = Depends(current_user)):
    data = await file.read()
    if len(data) > MAX_UPLOAD:
        raise HTTPException(413, "File too large (max 20 MB)")
    try:
        text = extract_text(file.filename or "", data)
    except ValueError as e:
        raise HTTPException(400, str(e))
    truncated = len(text) > MAX_CHARS
    d = Document(name=file.filename, text=text[:MAX_CHARS], user_id=user.id)
    s.add(d); s.commit(); s.refresh(d)
    return {"id": d.id, "name": d.name, "chars": len(d.text), "truncated": truncated}


@app.get("/documents")
def list_docs(s: Session = Depends(get_session), user: User = Depends(current_user)):
    docs = s.exec(select(Document).where(Document.user_id == user.id).order_by(Document.id.desc())).all()
    today = date.today()
    out = []
    for d in docs:
        cards = s.exec(select(Card).where(Card.doc_id == d.id)).all()
        out.append({"id": d.id, "name": d.name, "created": d.created.isoformat(), "chars": len(d.text),
                    "cards": len(cards), "due": sum(1 for c in cards if c.due <= today)})
    return out


@app.delete("/documents/{doc_id}")
def delete_doc(doc_id: int, s: Session = Depends(get_session), user: User = Depends(current_user)):
    d = _doc(s, doc_id, user)
    for model in (Artifact, Card, QuizAttempt):
        for row in s.exec(select(model).where(model.doc_id == doc_id)).all():
            s.delete(row)
    s.delete(d); s.commit()
    return {"ok": True}


@app.post("/docs/{doc_id}/summary")
def summary(doc_id: int, s: Session = Depends(get_session), user: User = Depends(current_user)):
    d = _doc(s, doc_id, user)
    a = _cached(s, doc_id, "summary")
    if a:
        return json.loads(a.json_data)
    try:
        res = llm.summarize(chunk_text(d.text)).model_dump()
    except Exception as e:
        raise HTTPException(502, f"AI generation failed: {e}")
    s.add(Artifact(doc_id=doc_id, kind="summary", json_data=json.dumps(res))); s.commit()
    return res


@app.post("/docs/{doc_id}/flashcards")
def flashcards(doc_id: int, s: Session = Depends(get_session), user: User = Depends(current_user)):
    d = _doc(s, doc_id, user)
    existing = s.exec(select(Card).where(Card.doc_id == doc_id)).all()
    if existing:
        return existing
    try:
        cards = llm.make_flashcards(chunk_text(d.text))
    except Exception as e:
        raise HTTPException(502, f"AI generation failed: {e}")
    rows = [Card(doc_id=doc_id, front=c.front, back=c.back) for c in cards]
    s.add_all(rows); s.commit()
    for r in rows:
        s.refresh(r)
    return rows


@app.post("/docs/{doc_id}/quiz")
def quiz(doc_id: int, n: int = 10, regenerate: bool = False, s: Session = Depends(get_session), user: User = Depends(current_user)):
    d = _doc(s, doc_id, user)
    a = _cached(s, doc_id, "quiz")
    if a and not regenerate:
        return json.loads(a.json_data)
    try:
        res = [q.model_dump() for q in llm.make_quiz(chunk_text(d.text), min(n, 30))]
    except Exception as e:
        raise HTTPException(502, f"AI generation failed: {e}")
    if a:
        s.delete(a)
    s.add(Artifact(doc_id=doc_id, kind="quiz", json_data=json.dumps(res))); s.commit()
    return res


@app.get("/study/due")
def due(doc_id: int | None = None, s: Session = Depends(get_session), user: User = Depends(current_user)):
    ids = [d.id for d in s.exec(select(Document).where(Document.user_id == user.id))]
    if doc_id is not None:
        ids = [i for i in ids if i == doc_id]
    if not ids:
        return []
    cards = s.exec(select(Card).where(Card.due <= date.today(), Card.doc_id.in_(ids))).all()
    names = {d.id: d.name for d in s.exec(select(Document).where(Document.id.in_(ids)))}
    return [{**c.model_dump(mode="json"), "doc_name": names.get(c.doc_id)} for c in cards]


class Review(BaseModel):
    rating: int = Field(ge=0, le=5)


@app.post("/cards/{card_id}/review")
def review(card_id: int, r: Review, s: Session = Depends(get_session), user: User = Depends(current_user)):
    c = s.get(Card, card_id)
    if not c:
        raise HTTPException(404, "Card not found")
    _doc(s, c.doc_id, user)  # ownership check
    c.ease, c.interval, c.reps, c.due = sm2(c.ease, c.interval, c.reps, r.rating)
    s.add(c); s.add(ReviewLog(user_id=user.id, card_id=c.id, rating=r.rating)); s.commit(); s.refresh(c)
    return c


# ---------- auth ----------
class Register(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    email: str = Field(max_length=120)
    password: str = Field(min_length=8, max_length=128)


class Login(BaseModel):
    email: str
    password: str


def _user_json(u: User):
    return {"id": u.id, "name": u.name, "email": u.email, "avatar": u.avatar,
            "created": u.created.isoformat()}


@app.post("/auth/register")
def register(r: Register, s: Session = Depends(get_session)):
    email = r.email.strip().lower()
    if not auth.EMAIL_RE.match(email):
        raise HTTPException(400, "Enter a valid email address")
    if s.exec(select(User).where(User.email == email)).first():
        raise HTTPException(409, "An account with this email already exists")
    salt = auth.new_salt()
    u = User(name=r.name.strip(), email=email, salt=salt, pw_hash=auth.hash_pw(r.password, salt))
    s.add(u); s.commit(); s.refresh(u)
    return {"token": auth.issue_token(s, u.id), "user": _user_json(u)}


@app.post("/auth/login")
def login(r: Login, s: Session = Depends(get_session)):
    u = s.exec(select(User).where(User.email == r.email.strip().lower())).first()
    if not u or not auth.verify_pw(r.password, u.salt, u.pw_hash):
        raise HTTPException(401, "Incorrect email or password")
    return {"token": auth.issue_token(s, u.id), "user": _user_json(u)}


@app.get("/auth/me")
def me(user: User = Depends(current_user)):
    return _user_json(user)


@app.post("/auth/logout")
def logout(token: str = Depends(auth.bearer), s: Session = Depends(get_session)):
    auth.revoke_token(s, token)
    return {"ok": True}


class ProfileUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=60)


class PasswordChange(BaseModel):
    current: str
    new: str = Field(min_length=8, max_length=128)


class AvatarUpdate(BaseModel):
    image: str = Field(max_length=400_000)


@app.put("/auth/profile")
def update_profile(p: ProfileUpdate, s: Session = Depends(get_session), user: User = Depends(current_user)):
    name = p.name.strip()
    if not name:
        raise HTTPException(400, "Name cannot be empty")
    user.name = name
    s.add(user); s.commit(); s.refresh(user)
    return _user_json(user)


@app.put("/auth/password")
def change_password(p: PasswordChange, s: Session = Depends(get_session), user: User = Depends(current_user),
                    token: str = Depends(auth.bearer)):
    if not auth.verify_pw(p.current, user.salt, user.pw_hash):
        raise HTTPException(400, "Current password is incorrect")
    if p.new == p.current:
        raise HTTPException(400, "New password must be different from the current one")
    user.salt = auth.new_salt()
    user.pw_hash = auth.hash_pw(p.new, user.salt)
    s.add(user)
    # sign out every other device/session; keep this one
    keep = auth._th(token)
    for t in s.exec(select(AuthToken).where(AuthToken.user_id == user.id)).all():
        if t.token_hash != keep:
            s.delete(t)
    s.commit()
    return {"ok": True}


@app.put("/auth/avatar")
def set_avatar(a: AvatarUpdate, s: Session = Depends(get_session), user: User = Depends(current_user)):
    if not re.match(r"^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$", a.image):
        raise HTTPException(400, "Unsupported image. Use a PNG, JPEG or WebP picture.")
    user.avatar = a.image
    s.add(user); s.commit(); s.refresh(user)
    return _user_json(user)


@app.delete("/auth/avatar")
def remove_avatar(s: Session = Depends(get_session), user: User = Depends(current_user)):
    user.avatar = None
    s.add(user); s.commit(); s.refresh(user)
    return _user_json(user)


# ---------- progress ----------
class QuizResult(BaseModel):
    score: int = Field(ge=0)
    total: int = Field(ge=1)


@app.post("/docs/{doc_id}/quiz/result")
def quiz_result(doc_id: int, r: QuizResult, s: Session = Depends(get_session), user: User = Depends(current_user)):
    _doc(s, doc_id, user)
    s.add(QuizAttempt(user_id=user.id, doc_id=doc_id, score=min(r.score, r.total), total=r.total)); s.commit()
    return {"ok": True}


def _streak(days: set[date]) -> int:
    d = date.today()
    if d not in days:
        d -= timedelta(days=1)
    n = 0
    while d in days:
        n += 1; d -= timedelta(days=1)
    return n


@app.get("/stats")
def stats(s: Session = Depends(get_session), user: User = Depends(current_user)):
    docs = s.exec(select(Document).where(Document.user_id == user.id)).all()
    ids = [d.id for d in docs]
    cards = s.exec(select(Card).where(Card.doc_id.in_(ids))).all() if ids else []
    today = date.today()
    logs = s.exec(select(ReviewLog).where(ReviewLog.user_id == user.id)).all()
    attempts = s.exec(select(QuizAttempt).where(QuizAttempt.user_id == user.id)
                      .order_by(QuizAttempt.id.desc())).all()
    active = {l.day for l in logs} | {a.created.date() for a in attempts}
    names = {d.id: d.name for d in docs}
    week = [today - timedelta(days=i) for i in range(6, -1, -1)]
    return {
        "documents": len(docs),
        "cards": len(cards),
        "due": sum(1 for c in cards if c.due <= today),
        "mastered": sum(1 for c in cards if c.interval >= 21),
        "reviewed_today": sum(1 for l in logs if l.day == today),
        "streak": _streak(active),
        "quiz_avg": round(100 * sum(a.score for a in attempts) / max(1, sum(a.total for a in attempts))) if attempts else None,
        "week": [{"day": d.isoformat(), "reviews": sum(1 for l in logs if l.day == d)} for d in week],
        "recent_quizzes": [{"doc": names.get(a.doc_id, "(deleted)"), "score": a.score, "total": a.total,
                            "at": a.created.isoformat()} for a in attempts[:5]],
    }


# ---------- ask the document ----------
class Ask(BaseModel):
    question: str = Field(min_length=2, max_length=500)


@app.post("/docs/{doc_id}/ask")
def ask(doc_id: int, a: Ask, s: Session = Depends(get_session), user: User = Depends(current_user)):
    d = _doc(s, doc_id, user)
    try:
        return {"answer": llm.answer(chunk_text(d.text), a.question)}
    except Exception as e:
        raise HTTPException(502, f"AI generation failed: {e}")
