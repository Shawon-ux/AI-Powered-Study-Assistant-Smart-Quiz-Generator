import hashlib
import json
from datetime import date
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlmodel import Session, select

import llm
from db import Artifact, Card, Document, get_session, init_db
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


def _doc(s: Session, doc_id: int) -> Document:
    d = s.get(Document, doc_id)
    if not d:
        raise HTTPException(404, "Document not found")
    return d


def _cached(s: Session, doc_id: int, kind: str):
    return s.exec(select(Artifact).where(Artifact.doc_id == doc_id, Artifact.kind == kind)).first()


@app.post("/upload")
async def upload(file: UploadFile = File(...), s: Session = Depends(get_session)):
    data = await file.read()
    if len(data) > MAX_UPLOAD:
        raise HTTPException(413, "File too large (max 20 MB)")
    try:
        text = extract_text(file.filename or "", data)
    except ValueError as e:
        raise HTTPException(400, str(e))
    truncated = len(text) > MAX_CHARS
    d = Document(name=file.filename, text=text[:MAX_CHARS])
    s.add(d); s.commit(); s.refresh(d)
    return {"id": d.id, "name": d.name, "chars": len(d.text), "truncated": truncated}


@app.get("/documents")
def list_docs(s: Session = Depends(get_session)):
    return [{"id": d.id, "name": d.name} for d in s.exec(select(Document).order_by(Document.id.desc()))]


@app.post("/docs/{doc_id}/summary")
def summary(doc_id: int, s: Session = Depends(get_session)):
    d = _doc(s, doc_id)
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
def flashcards(doc_id: int, s: Session = Depends(get_session)):
    d = _doc(s, doc_id)
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
def quiz(doc_id: int, n: int = 10, regenerate: bool = False, s: Session = Depends(get_session)):
    d = _doc(s, doc_id)
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
def due(doc_id: int | None = None, s: Session = Depends(get_session)):
    q = select(Card).where(Card.due <= date.today())
    if doc_id:
        q = q.where(Card.doc_id == doc_id)
    return s.exec(q).all()


class Review(BaseModel):
    rating: int = Field(ge=0, le=5)


@app.post("/cards/{card_id}/review")
def review(card_id: int, r: Review, s: Session = Depends(get_session)):
    c = s.get(Card, card_id)
    if not c:
        raise HTTPException(404, "Card not found")
    c.ease, c.interval, c.reps, c.due = sm2(c.ease, c.interval, c.reps, r.rating)
    s.add(c); s.commit(); s.refresh(c)
    return c
