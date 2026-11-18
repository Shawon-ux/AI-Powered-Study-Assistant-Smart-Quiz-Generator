from datetime import date, datetime, timezone
from typing import Optional
from sqlmodel import Field, SQLModel, create_engine, Session

engine = create_engine("sqlite:///study.db", connect_args={"check_same_thread": False})


class Document(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
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


def get_session():
    with Session(engine) as s:
        yield s
