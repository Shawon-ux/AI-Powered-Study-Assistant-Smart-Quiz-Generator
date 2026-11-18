import hashlib
import hmac
import re
import secrets
from fastapi import Depends, Header, HTTPException
from sqlmodel import Session, select

from db import AuthToken, User, get_session

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def hash_pw(password: str, salt: str) -> str:
    return hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), n=2**14, r=8, p=1).hex()


def new_salt() -> str:
    return secrets.token_hex(16)


def verify_pw(password: str, salt: str, expected: str) -> bool:
    return hmac.compare_digest(hash_pw(password, salt), expected)


def _th(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def issue_token(s: Session, user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    s.add(AuthToken(token_hash=_th(token), user_id=user_id)); s.commit()
    return token


def revoke_token(s: Session, token: str):
    t = s.exec(select(AuthToken).where(AuthToken.token_hash == _th(token))).first()
    if t:
        s.delete(t); s.commit()


def bearer(authorization: str | None = Header(default=None)) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Not signed in")
    return authorization[7:].strip()


def current_user(token: str = Depends(bearer), s: Session = Depends(get_session)) -> User:
    t = s.exec(select(AuthToken).where(AuthToken.token_hash == _th(token))).first()
    u = s.get(User, t.user_id) if t else None
    if not u:
        raise HTTPException(401, "Session expired, please sign in again")
    return u
