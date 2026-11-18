from datetime import date, datetime, timezone
from typing import Optional
from sqlalchemy import text
from sqlmodel import Field, SQLModel, create_engine, Session

engine = create_engine("sqlite:///study.db", connect_args={"check_same_thread": False})


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    email: str = Field(index=True, unique=True)
    salt: str
    pw_hash: str
    avatar: Optional[str] = None  # small data: URL (resized client-side)
    created: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AuthToken(SQLModel, table=True):
    """Login session; only the SHA-256 of the bearer token is stored."""
    id: Optional[int] = Field(default=None, primary_key=True)
    token_hash: str = Field(index=True, unique=True)
    user_id: int = Field(index=True)
    created: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ReviewLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(index=True)
    card_id: int
    rating: int
    day: date = Field(default_factory=date.today, index=True)


class QuizAttempt(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(index=True)
    doc_id: int = Field(index=True)
    score: int
    total: int
    created: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Document(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(default=None, index=True)
    name: str
    text: str
    created: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Artifact(SQLModel, table=True):
    """Cached LLM output per document and kind (summary / quiz)."""
    id: Optional[int] = Field(default=None, primary_key=True)
    doc_id: int = Field(index=True)
    kind: str
    json_data: str


class Card(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    doc_id: int = Field(index=True)
    front: str
    back: str
    ease: float = 2.5
    interval: int = 0
    reps: int = 0
    due: date = Field(default_factory=date.today)


def init_db():
    SQLModel.metadata.create_all(engine)
    # lightweight migration: older DBs predate Document.user_id
    with engine.begin() as c:
        cols = [r[1] for r in c.execute(text("PRAGMA table_info(document)"))]
        ucols = [r[1] for r in c.execute(text('PRAGMA table_info("user")'))]
        if "avatar" not in ucols:
            c.execute(text('ALTER TABLE "user" ADD COLUMN avatar VARCHAR'))
        if "user_id" not in cols:
            c.execute(text("ALTER TABLE document ADD COLUMN user_id INTEGER"))


def get_session():
    with Session(engine) as s:
        yield s
