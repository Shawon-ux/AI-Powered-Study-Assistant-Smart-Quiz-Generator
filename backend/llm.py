import json
import os
import re
from typing import Type, TypeVar
from anthropic import Anthropic
from dotenv import load_dotenv
from pydantic import BaseModel, ValidationError, Field

load_dotenv()
KEY = os.getenv("ANTHROPIC_API_KEY", "")
GROQ = KEY.startswith("gsk_")  # Groq key -> use Groq's OpenAI-compatible API
if GROQ:
    from openai import OpenAI
    client = OpenAI(api_key=KEY, base_url="https://api.groq.com/openai/v1")
    FAST = os.getenv("FAST_MODEL_GROQ", "openai/gpt-oss-20b")
    STRONG = os.getenv("STRONG_MODEL_GROQ", "openai/gpt-oss-120b")
else:
    client = Anthropic(api_key=KEY)
    FAST = os.getenv("FAST_MODEL", "claude-haiku-5-5")
    STRONG = os.getenv("STRONG_MODEL", "claude-sonnet-5-5")
T = TypeVar("T", bound=BaseModel)


class Concept(BaseModel):
    term: str
    definition: str


class Summary(BaseModel):
    bullets: list[str]
    key_takeaways: list[str]
    key_concepts: list[Concept]


class Flashcard(BaseModel):
    front: str
    back: str


class FlashcardSet(BaseModel):
    cards: list[Flashcard]


class Question(BaseModel):
    question: str
    options: list[str] = Field(min_length=4, max_length=4)
    correct_index: int = Field(ge=0, le=3)
    explanation: str


class Quiz(BaseModel):
    questions: list[Question]


def _ask_json(model_cls: Type[T], prompt: str, model: str = FAST) -> T:
    schema = json.dumps(model_cls.model_json_schema())
    system = ("You are a study-material generator. Respond with ONLY valid JSON "
              f"matching this JSON schema, no prose, no code fences:\n{schema}")
    msgs = [{"role": "user", "content": prompt}]
    last_err = None
    for _ in range(2):
        if GROQ:
            resp = client.chat.completions.create(
                model=model, max_tokens=4096, response_format={"type": "json_object"},
                messages=[{"role": "system", "content": system}] + msgs)
            raw = resp.choices[0].message.content.strip()
        else:
            resp = client.messages.create(model=model, max_tokens=4096, system=system, messages=msgs)
            raw = resp.content[0].text.strip()
        raw = re.sub(r"^```(?:json)?|```$", "", raw, flags=re.M).strip()
        try:
            return model_cls.model_validate_json(raw)
        except ValidationError as e:
            last_err = e
            msgs = [{"role": "user", "content": prompt + f"\n\nYour previous output was invalid: {e}. Fix it."}]
    raise RuntimeError(f"LLM returned invalid JSON: {last_err}")


def summarize(chunks: list[str]) -> Summary:
    partials = []
    for c in chunks:
        s = _ask_json(Summary, f"Summarize this study material into concise bullets, takeaways and key concepts:\n\n{c}")
        partials.append(s.model_dump_json())
    if len(partials) == 1:
        return Summary.model_validate_json(partials[0])
    return _ask_json(
        Summary,
        "Merge these partial summaries of one document into a single concise summary "
        "(max ~12 bullets, ~6 takeaways, deduplicated concepts):\n\n" + "\n".join(partials),
        model=STRONG,
    )


def make_flashcards(chunks: list[str], per_chunk: int = 10) -> list[Flashcard]:
    cards: list[Flashcard] = []
    for c in chunks:
        r = _ask_json(FlashcardSet, f"Create up to {per_chunk} atomic question/answer flashcards "
                      f"(one fact each, no duplicates) from:\n\n{c}")
        cards += r.cards
    seen, out = set(), []
    for c in cards:
        k = c.front.strip().lower()
        if k not in seen:
            seen.add(k)
            out.append(c)
    return out


def make_quiz(chunks: list[str], n: int = 10) -> list[Question]:
    per = max(1, -(-n // len(chunks)))
    qs: list[Question] = []
    for c in chunks:
        r = _ask_json(Quiz, f"Write {per} multiple-choice questions (exactly 4 options, plausible distractors). "
                      "The explanation must say why the right answer is right and why the likeliest wrong "
                      f"answer is wrong. Material:\n\n{c}")
        qs += r.questions
    return qs[:n]


def _ask_text(system: str, prompt: str, model: str = FAST) -> str:
    if GROQ:
        resp = client.chat.completions.create(
            model=model, max_tokens=1024,
            messages=[{"role": "system", "content": system}, {"role": "user", "content": prompt}])
        return (resp.choices[0].message.content or "").strip()
    resp = client.messages.create(model=model, max_tokens=1024, system=system,
                                  messages=[{"role": "user", "content": prompt}])
    return resp.content[0].text.strip()


def answer(chunks: list[str], question: str) -> str:
    """Answer a question using the most keyword-relevant chunks of the document."""
    words = {w for w in re.findall(r"\w{3,}", question.lower())}
    ranked = sorted(chunks, key=lambda c: -sum(c.lower().count(w) for w in words))[:3]
    ctx = "\n\n---\n\n".join(ranked)
    return _ask_text(
        "You are a helpful tutor. Answer ONLY from the provided study material. "
        "If the answer is not in it, say so. Be concise and clear.",
        f"Study material:\n{ctx}\n\nQuestion: {question}")
