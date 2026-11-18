# Study Assistant

Upload PDF/DOCX/TXT notes → AI summary, flashcards (SM-2 spaced repetition) and interactive quiz.

## Run
Backend (http://localhost:8000):
```
cd backend
python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env   # then add ANTHROPIC_API_KEY
uvicorn main:app --reload
```
Frontend (http://localhost:5173):
```
cd frontend
npm install
npm run dev
```
Tests: `cd backend && pytest`
