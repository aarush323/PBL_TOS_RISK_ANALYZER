# ToS Risk Analyzer

AI-powered Terms of Service / Privacy Policy analyzer with extraction, risk classification, and document chat.

## Key Features

- URL, raw text, and PDF extraction
- Clause segmentation + NLP pre-filtering (spaCy)
- Risk classification with Cerebras, with Ollama local fallback
- Async analysis jobs with polling
- User auth (register/login/JWT) and per-user saved analysis history
- Document-aware chat over extracted text

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | FastAPI, SQLAlchemy async, PostgreSQL |
| NLP | spaCy (`en_core_web_sm`) |
| LLM | Cerebras API + Ollama fallback |
| Extraction | requests, BeautifulSoup4, lxml, pdfplumber |
| Frontend | React + Vite |

## Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL 14+

## Quick Start

```bash
# from repository root

# 1) Backend environment
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
python -m spacy download en_core_web_sm

# 2) Backend config
cp backend/.env.example backend/.env
# edit backend/.env and set at least:
# - DATABASE_URL
# - SECRET_KEY
# - CEREBRAS_API_KEY (optional if using Ollama only)
# optional rate limiting:
# - API_RATE_LIMIT_MAX_REQUESTS (default: 120)
# - API_RATE_LIMIT_WINDOW_SECONDS (default: 60)

# 3) Run backend
cd backend
uvicorn main:app --reload

# 4) Run frontend (new terminal)
cd frontend
npm install
npm run dev
```

Frontend default URL: `http://localhost:5173`  
Backend default URL: `http://localhost:8000`

## API Rate Limiting

The backend applies IP-based rate limiting to all API routes except `/health`.

- `API_RATE_LIMIT_MAX_REQUESTS`: maximum requests allowed per client IP in a window (default `120`)
- `API_RATE_LIMIT_WINDOW_SECONDS`: window length in seconds (default `60`)

When the limit is exceeded, the API returns `429 Too Many Requests` with `Retry-After` and `X-RateLimit-*` headers.

## Backend API Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/auth/register` | Create account |
| `POST` | `/auth/login` | Get JWT token |
| `GET` | `/auth/me` | Get current user |
| `POST` | `/extract` | Extract from URL or text |
| `POST` | `/extract/pdf` | Extract from uploaded PDF |
| `POST` | `/analyze/async` | Start async analysis |
| `GET` | `/analyze/status/{job_id}` | Poll analysis status/result |
| `POST` | `/analyze/stop/{job_id}` | Cancel in-flight analysis |
| `GET` | `/analyses` | List user analyses |
| `GET` | `/analyses/{job_id}` | Fetch one saved analysis |
| `POST` | `/chat/store` | Store source document for chat |
| `POST` | `/chat` | Ask questions about stored document |
| `GET` | `/chat/{session_id}/history` | Read chat history |

## Testing

```bash
cd backend
pytest -q
```

Note: current tests use live external URLs and can be network-dependent.
