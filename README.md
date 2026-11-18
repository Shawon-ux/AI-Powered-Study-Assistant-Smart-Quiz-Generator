# 🎓 AI-Powered Study Assistant & Smart Quiz Generator

Turn your notes, lecture slides and textbook chapters into **summaries, flashcards and quizzes** with AI, then
remember them for good with **spaced repetition**. Sign in, upload a document, and study smarter.

## ✨ Features

| Area | What you get |
| --- | --- |
| **Accounts** | Registration and login with an animated sign-in/sign-up switch, password-strength meter, and secure sessions |
| **Profile** | Profile picture upload, editable name, account details, and change password (signs out other devices) |
| **Upload** | PDF, DOCX, TXT and MD files up to 20 MB, with drag and drop |
| **AI Summary** | Bullet summary, key takeaways and key concepts with definitions |
| **Flashcards** | AI-generated Q&A cards with a flip animation and keyboard shortcuts (`Space` to flip, `1`–`4` to rate) |
| **Spaced repetition** | The SM-2 algorithm schedules each card for the best moment to review it |
| **Quiz** | Multiple-choice questions with explanations, a score screen, "retake missed" and "new quiz" |
| **Ask AI** | Chat with a document and get answers based only on its text |
| **Daily review** | One queue of every card due today, across all documents |
| **Dashboard** | Day streak, cards due, mastered cards, average quiz score, weekly review chart and recent quizzes |
| **Polish** | Dark mode, responsive layout (mobile friendly), document search and delete |

## 🧱 Tech stack

- **Frontend:** React 18, Vite 6, Tailwind CSS 4
- **Backend:** Python, FastAPI, SQLModel (SQLite)
- **AI:** [Groq](https://groq.com) (OpenAI-compatible API) **or** Anthropic Claude, chosen automatically from your API key
- **Parsing:** `pypdf` and `python-docx`

## 📁 Project structure

```
.
├── backend/
│   ├── main.py          # FastAPI app and all routes
│   ├── auth.py          # password hashing, session tokens, auth dependency
│   ├── db.py            # SQLModel tables and lightweight migration
│   ├── llm.py           # summary / flashcard / quiz / Q&A generation
│   ├── parsing.py       # text extraction and chunking
│   ├── srs.py           # SM-2 spaced-repetition algorithm
│   ├── test_srs.py      # unit tests for SM-2
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── index.html
    ├── vite.config.js
    └── src/
        ├── App.jsx          # auth gate, sidebar shell, theme
        ├── api.js           # API client with token handling
        ├── index.css        # design tokens (light/dark) and animations
        └── components/      # AuthPage, Dashboard, DocView, Summary, Flashcards,
                             # Quiz, Chat, Upload, Profile, Avatar
```

## 🚀 Getting started

### Prerequisites

- Python 3.10+
- Node.js 18+
- An API key from [Groq](https://console.groq.com/keys) (free tier available) **or** [Anthropic](https://console.anthropic.com/)

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env        # then edit .env and add your key (see below)
python -m uvicorn main:app --port 8000
```

The API runs at http://127.0.0.1:8000 (interactive docs at `/docs`). The SQLite database (`study.db`) is created
automatically on first start.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173, create an account, and upload your first document.

> **Windows note:** if the project folder name contains an `&` (for example
> `AI-Powered Study Assistant & Smart Quiz Generator`), `npm run dev` fails because cmd cannot parse the path.
> Either rename the folder, or start Vite directly: `node node_modules/vite/bin/vite.js`.

## ⚙️ Configuration

Create `backend/.env`:

```env
# Required. The key type picks the provider:
#   gsk_...  -> Groq     (OpenAI-compatible API)
#   sk-ant-… -> Anthropic Claude
ANTHROPIC_API_KEY=your-key-here

# Optional model overrides
FAST_MODEL=claude-haiku-5-5            # Anthropic: used for per-chunk generation
STRONG_MODEL=claude-sonnet-5-5         # Anthropic: used to merge long summaries
FAST_MODEL_GROQ=openai/gpt-oss-20b     # Groq equivalents
STRONG_MODEL_GROQ=openai/gpt-oss-120b
```

**Never commit `.env` or share your key.** If a key was ever pushed to a repository, revoke it and create a new one.

## 🔌 API overview

All routes except `/auth/register` and `/auth/login` require `Authorization: Bearer <token>`.

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/auth/register`, `/auth/login` | Create an account / sign in (returns a token) |
| GET | `/auth/me` | Current user |
| POST | `/auth/logout` | Invalidate the current session |
| PUT | `/auth/profile` | Change name |
| PUT | `/auth/password` | Change password (signs out other sessions) |
| PUT / DELETE | `/auth/avatar` | Set or remove profile picture |
| POST | `/upload` | Upload a document |
| GET | `/documents` | List your documents with card counts |
| DELETE | `/documents/{id}` | Delete a document and its study data |
| POST | `/docs/{id}/summary` | Generate (and cache) a summary |
| POST | `/docs/{id}/flashcards` | Generate flashcards |
| POST | `/docs/{id}/quiz?n=10&regenerate=false` | Generate (and cache) a quiz |
| POST | `/docs/{id}/quiz/result` | Record a finished quiz score |
| POST | `/docs/{id}/ask` | Ask a question about a document |
| GET | `/study/due?doc_id=` | Cards due for review (all documents if omitted) |
| POST | `/cards/{id}/review` | Submit a review rating (0–5) |
| GET | `/stats` | Dashboard data |

## 🔒 Security notes

- Passwords are hashed with **scrypt** and a per-user salt; plain passwords are never stored.
- Session tokens are random and only their **SHA-256 hash** is stored.
- Every document, card and quiz is scoped to its owner; other users get a 404.
- Uploads are capped at 20 MB and 300,000 characters to limit AI cost.
- CORS only allows `http://localhost:5173`. Update `allow_origins` in `backend/main.py` for deployment.

## 🧪 Tests

```bash
cd backend
pip install pytest
pytest
```

## 🛠️ Troubleshooting

| Problem | Fix |
| --- | --- |
| "Cannot reach the server" in the UI | Start the backend on port 8000 |
| "AI generation failed" | Check `ANTHROPIC_API_KEY` in `backend/.env`, then restart the backend |
| "No readable text found" | The PDF is probably scanned images; OCR is not supported yet |
| `npm run dev` fails with `'Smart' is not recognized` | The `&` in the folder name; see the Windows note above |
| Backend changes don't apply | Restart it, or run with `--reload` |

## 🗺️ Ideas for the future

Password reset by email, OCR for scanned PDFs, export flashcards to Anki/CSV, shared decks, and a mobile app.

## 📄 License

Add a license of your choice (for example MIT) before publishing.
