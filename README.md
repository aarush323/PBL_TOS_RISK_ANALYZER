<div align="center">

# ⚖️ Jurist AI

### *AI-Powered Terms of Service Risk Analyzer*

**You agreed to what, exactly?**

AI-powered legal intelligence that dissects Terms of Service and Privacy Policies — extracting, classifying, and explaining risks in plain English so you actually know what you're signing.

<br/>

[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![spaCy](https://img.shields.io/badge/spaCy_NLP-09A3FF?style=for-the-badge&logo=spacy&logoColor=white)](https://spacy.io)
[![RAG](https://img.shields.io/badge/RAG-FF6B35?style=for-the-badge&logo=ai&logoColor=white)]()
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL_+_pgvector-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://github.com/pgvector/pgvector)
[![NeonDB](https://img.shields.io/badge/NeonDB-00E599?style=for-the-badge&logo=neon&logoColor=white)](https://neon.tech)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://docker.com)
[![Railway](https://img.shields.io/badge/Railway-0B0D0E?style=for-the-badge&logo=railway&logoColor=white)](https://railway.app)

<br/>

**[🚀 Live Demo](https://frontend-production-43d9.up.railway.app)** · **[📖 Technical Docs](docs/DOCUMENTATION.md)** · **[🐛 Issues](../../issues)**

> ⚠️ *The live demo is hosted on Railway's free tier and may be inactive. See [Quick Start](#-quick-start) to run locally.*

</div>

---

## 📸 Preview

<!-- Replace these with actual screenshots once captured -->
![Dashboard](docs/screenshots/dashboard.png)
![Analysis Results](docs/screenshots/analysis.png)
![RAG Chat](docs/screenshots/chat.png)
![Document Comparison](docs/screenshots/compare.png)

> 💡 *To add screenshots: capture them, save to `docs/screenshots/`, and commit.*

---

## ⚡ What Jurist AI Does

Most people click *"I Agree"* without reading. Jurist AI reads for you — and tells you exactly what you're signing away.

```
Input:  https://discord.com/terms                    (or paste text / upload PDF)
        ↓
Output: 132 clauses analyzed · 43% flagged risky · Overall: HIGH RISK
        ↓
Chat:   "Can Discord terminate my account without warning?"
        → "Yes. Clause #94 [Legal Risk, High] states Discord may suspend or
           terminate access if they 'reasonably believe' you violated terms —
           no prior notice required, no appeal process defined."
```

**The answer isn't "maybe" — it's a cited clause with severity score.**

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔍 **Multi-format Input** | Analyze from URL, raw text paste, or PDF upload |
| 🧠 **Hybrid NLP + LLM Pipeline** | spaCy pre-filters 75% of clauses → only risky ones hit the LLM |
| 🔄 **3-Tier LLM Failover** | Cerebras → Groq (round-robin) → Ollama local fallback |
| 💬 **RAG-Powered Chat** | Ask questions about any analyzed document with cited clause references |
| ⚖️ **Document Comparison** | Side-by-side risk comparison of two ToS documents |
| 📊 **Risk Overview Dashboard** | Visual breakdown by category with severity scoring |
| 📋 **Clause-Level Review** | Browse every clause with risk tags, explanations, and filtering |
| 📄 **PDF Report Export** | Generate downloadable PDF reports of analysis results |
| 🔐 **JWT Authentication** | Secure auth with SHA256+bcrypt password hashing |
| 📜 **Analysis History** | Save, rename, delete, and revisit past analyses |
| 🎨 **Light & Dark Theme** | Full theme support across all pages |
| ⚙️ **Settings** | Configurable behavior (auto-open results, compact risk cards) |
| 🐳 **Docker Compose** | One-command local setup with PostgreSQL health checks |
| 🚀 **Railway Deployment** | Production-ready multi-service Docker deployment |

---

## 🏗️ Architecture

```mermaid
graph TD
    React["React 19 Frontend<br/>(Vite + Tailwind v4)"] -->|HTTP / REST| FastAPI["FastAPI Backend"]

    FastAPI --> Ext["Extraction Pipeline<br/>URL · PDF · Text"]
    FastAPI --> NLP["Analysis Pipeline<br/>spaCy NLP + LLM"]
    FastAPI --> RAG["RAG Chat Pipeline"]
    FastAPI --> Compare["Compare Service"]
    FastAPI --> Reports["Report Generator<br/>+ Executive Summary"]
    
    NLP --> Cerebras["Cerebras API"]
    NLP --> Groq["Groq API"]
    NLP --> Ollama["Ollama (Local)"]
    
    Gemini["Gemini Embeddings"] --> RAG
    
    Ext --> DB[("PostgreSQL + pgvector<br/>(NeonDB)")]
    NLP --> DB
    RAG --> DB
    Compare --> DB
```

---

## 🧠 The Tech Stack (and Why It's Actually Impressive)

### 3-Tier LLM Classification

Not one provider. Three — with automatic failover:

```
Request → Cerebras (Wafer-Scale Engine, primary)
               ↓ fails?
          Groq API (secondary, round-robin)
               ↓ fails?
           Ollama local (phi3.5 / qwen3.5:9b, offline fallback)
               ↓ all fail?
          Per-clause individual calls (last resort)
```

Zero single point of failure. Runs offline. Costs nothing as a fallback.

### Hybrid NLP + LLM Pipeline

Raw LLM on every clause = slow and expensive. Instead:

```
All clauses (100%)
    │
    ▼ spaCy: modal verbs, negation, 50+ risk keyword patterns
    │
    ├── Score < 2.0 → SKIP (75% of clauses, instant)
    │
    └── Score ≥ 2.0 → LLM batch classification (25%)
                        NLP signals injected into prompt
                        for higher accuracy
```

**Result: 75% fewer LLM calls. 4× faster. More accurate (pre-detected signals in prompt).**

### RAG with Context Expansion

Not just vector similarity search — the retriever is smart:

```python
# Retrieved clause 58 about data sharing?
# Check: has negation? high severity? category overlap with neighbors?
# If yes → pull adjacent clauses 57 and 59 for full context
#
# Result: 5 retrieved clauses → expanded to 8 semantically complete chunks
```

The chatbot cites exact clause IDs, risk categories, and severity scores. No hallucination — grounded in the document.

### Async Job Architecture

LLM calls take 30–60 seconds. HTTP requests time out in 30. Solution:

```python
POST /analyze/async → returns job_id instantly (< 200ms)
GET  /analyze/status/{job_id} → poll every 2s
POST /analyze/stop/{job_id} → cancel mid-flight
```

Background tasks check cancellation flag before every LLM batch call. Clean shutdown, no orphaned threads.

### pgvector Semantic Search

No external vector database. No Pinecone. No Chroma. Just PostgreSQL:

```sql
-- cosine similarity search, filtered by session
SELECT clause_text, risk_categories, severity_score
FROM clause_embeddings
WHERE session_id = $1
ORDER BY embedding <=> $2  -- cosine distance operator
LIMIT 5;
```

Same DB, same connection pool, same ACID guarantees. One fewer service to keep alive.

### Security You Actually Thought About

```python
# bcrypt has a 72-character limit — passwords longer than 72 chars
# hash identically. Fix: SHA256 pre-hash before bcrypt.
def hash_password(plain: str) -> str:
    pre_hashed = hashlib.sha256(plain.encode("utf-8")).hexdigest()
    return bcrypt.hashpw(pre_hashed.encode(), bcrypt.gensalt()).decode()
```

JWT + stateless auth + optional anonymous analysis (nullable user_id pattern).

---

## 📊 Risk Classification

Five categories. Cited clause-level granularity. Confidence scoring.

| Category | What We Catch |
|----------|---------------|
| 🔒 **Privacy Risk** | Data collection, third-party sharing, tracking, profiling |
| ⚖️ **Legal Risk** | Mandatory arbitration, class action waivers, jurisdiction clauses |
| 👤 **User Rights Risk** | Account termination, content ownership transfers, irrevocable licenses |
| 🛡️ **Security Risk** | "As-is" disclaimers, breach liability waivers, no encryption guarantees |
| 💰 **Financial Risk** | Auto-renewal, non-refundable charges, unilateral price changes |

> **Spotify**: 78/145 clauses flagged · High risk · Severity 3.22
> **YouTube**: 29/89 clauses flagged · High risk · Severity 3.01
> **Discord**: 132/313 clauses flagged · High risk · Severity 2.98

Spoiler: they're all high risk.

---

## 📁 Project Structure

```
PBL_TOS_RISK_ANALYZER/
├── backend/
│   ├── main.py                 # FastAPI app — all routes (1300+ lines)
│   ├── analysis/
│   │   ├── analyzer.py         # Core analysis orchestrator
│   │   ├── classifier.py       # LLM classification (Cerebras/Groq/Ollama)
│   │   ├── nlp_features.py     # spaCy NLP feature extraction
│   │   ├── segmenter.py        # Clause segmentation
│   │   ├── scoring.py          # Risk scoring logic
│   │   ├── summary_generator.py # Executive summary generation
│   │   ├── report_generator.py  # Report generation
│   │   └── cancellation.py     # Job cancellation support
│   ├── chat/
│   │   ├── chatbot.py          # RAG chatbot logic
│   │   ├── retriever.py        # Vector similarity search
│   │   ├── indexer.py          # Document indexing pipeline
│   │   ├── embeddings.py       # Gemini embedding client
│   │   └── context_builder.py  # Context expansion logic
│   ├── extraction/
│   │   ├── url_extractor.py    # URL scraping (BeautifulSoup)
│   │   ├── pdf_extractor.py    # PDF parsing (pdfplumber)
│   │   ├── text_cleaner.py     # Text normalization
│   │   └── input_handler.py    # Input routing
│   ├── auth/                   # JWT + bcrypt authentication
│   ├── db/                     # SQLAlchemy models + CRUD
│   ├── compare_service.py      # Document comparison logic
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/         # All page components
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── OverviewPage.jsx
│   │   │   ├── ClausesPage.jsx
│   │   │   ├── ComparePage.jsx
│   │   │   ├── ReportsPage.jsx
│   │   │   ├── ChatPopup.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   └── ...
│   │   ├── app/router/         # React Router v7 config
│   │   ├── context/            # App-wide state (React Context)
│   │   ├── features/           # Feature modules (auth, analysis, etc.)
│   │   ├── hooks/              # Custom React hooks
│   │   └── index.css           # Global styles + design tokens
│   ├── package.json
│   ├── vite.config.js
│   └── Dockerfile
├── docs/
│   └── DOCUMENTATION.md        # Full technical documentation (800 lines)
├── docker-compose.yml          # 3-service local setup
├── railway.toml                # Railway deployment config
└── README.md                   # ← This file
```

---

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/aarush323/PBL_TOS_RISK_ANALYZER
cd PBL_TOS_RISK_ANALYZER

# Backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r backend/requirements.txt
python -m spacy download en_core_web_sm
cp backend/.env.example backend/.env

# Frontend
cd frontend && npm install
```

### Environment Variables

```env
# ─── Required ───
DATABASE_URL=postgresql+asyncpg://user:password@host:5432/tos_analyzer?sslmode=require
SECRET_KEY=your-secret-key-here        # openssl rand -hex 32
CEREBRAS_API_KEY=...                    # https://cloud.cerebras.ai/
GEMINI_API_KEY=...                      # For RAG embeddings (gemini-embedding-001)

# ─── Optional (Recommended) ───
GROQ_API_KEY=...                        # Groq LLM fallback (round-robin with Cerebras)
ACCESS_TOKEN_EXPIRE_MINUTES=60          # JWT expiry (default: 60)

# ─── Production Only ───
ENVIRONMENT=production
CORS_ORIGINS=https://your-frontend.up.railway.app
FRONTEND_URL=https://your-frontend.up.railway.app

# ─── Docker Compose Only ───
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password_here
POSTGRES_DB=tos_analyzer
```

```bash
# Run backend
cd backend && uvicorn main:app --reload

# Run frontend (new terminal)
cd frontend && npm run dev
```

Frontend: `http://localhost:5173` · Backend + Swagger docs: `http://localhost:8000/docs`

---

## 🌐 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/stats/cerebras` | Cerebras API usage stats |
| | | |
| `POST` | `/auth/register` | Create account |
| `POST` | `/auth/login` | Get JWT token |
| `GET` | `/auth/me` | Current user info |
| | | |
| `POST` | `/extract` | Extract text from URL or raw text |
| `POST` | `/extract/pdf` | Extract text from PDF upload |
| | | |
| `POST` | `/analyze/async` | Start analysis job (returns job_id) |
| `GET` | `/analyze/status/{id}` | Poll job status |
| `GET` | `/analyze/summary/{id}` | Get executive summary |
| `POST` | `/analyze/stop/{id}` | Cancel running job |
| | | |
| `GET` | `/analyses` | List saved analyses (auth required) |
| `GET` | `/analyses/{id}` | Get specific analysis |
| `PATCH` | `/analyses/{id}` | Rename analysis |
| `DELETE` | `/analyses/{id}` | Delete analysis + related data |
| | | |
| `POST` | `/chat/store` | Store document + trigger RAG indexing |
| `POST` | `/chat/restore/{id}` | Restore chat from completed analysis |
| `POST` | `/chat` | RAG-powered Q&A (auto-detects comparisons) |
| `GET` | `/chat/{id}/history` | Chat message history |
| `GET` | `/chat/{id}/clauses` | Browse clauses (filter by risk/category) |
| `GET` | `/chat/{id}/clauses/{cid}` | Get specific clause |
| `GET` | `/chat/{id}/risks` | Risk summary by category |
| `GET` | `/chat/{id}/index/status` | Check indexing progress |
| `POST` | `/chat/compare` | Compare two documents side-by-side |

Full interactive docs at `/docs` (Swagger UI).

---

## 🐳 Deployment

### Railway (Recommended)

Two services, same repo, zero cold starts on free tier:

```toml
# backend/railway.toml
[build]
builder = "dockerfile"
dockerfilePath = "Dockerfile"

[deploy]
healthcheckPath = "/health"
```

```bash
# Set these in Railway dashboard:
# Backend:  DATABASE_URL, SECRET_KEY, CEREBRAS_API_KEY, GEMINI_API_KEY,
#           CORS_ORIGINS, FRONTEND_URL, ENVIRONMENT=production
# Frontend: VITE_API_URL=https://your-backend.up.railway.app
```

### Docker Compose (Local)

Three services: backend (FastAPI), frontend (Nginx), and PostgreSQL 16 with health checks.

```bash
cp .env.example .env  # fill in your keys
docker compose up --build

# Services:
# Backend:  http://localhost:8000   (Swagger docs: /docs)
# Frontend: http://localhost:5173
# Database: localhost:5432
```

---

## 📐 Database Schema

```mermaid
erDiagram
    users ||--o{ analyses : has
    users ||--o{ chat_sessions : has
    chat_sessions ||--o{ chat_messages : contains
    chat_sessions ||--o{ clause_embeddings : has

    users {
        int id PK
        string username
        string email
        string hashed_password
        timestamp created_at
    }
    
    analyses {
        int job_id PK
        int user_id FK "nullable"
        string source
        string source_type
        string status "processing/complete/failed"
        jsonb result
        string error
        timestamp created_at
        timestamp updated_at
    }
    
    chat_sessions {
        string session_id PK
        int user_id FK
        text document_text
        boolean is_indexed
        int clause_count
        timestamp indexed_at
    }
    
    chat_messages {
        int id PK
        string session_id FK
        string role "user/assistant"
        text content
        timestamp created_at
    }
    
    clause_embeddings {
        int id PK
        string session_id FK
        int clause_id
        text clause_text
        jsonb risk_categories
        float severity_score
        boolean is_risky
        vector embedding "(384)"
    }
```

---

## 🏆 What Makes This Different

| Feature | Typical RAG app | Jurist AI |
|---------|----------------|-----------|
| Embedding | Load model into RAM | Gemini API (zero RAM) |
| Vector DB | Separate service (Pinecone) | pgvector in PostgreSQL |
| LLM calls | 100% of clauses | ~25% (NLP pre-filter) |
| Failover | Single provider | 3-tier automatic failover |
| Context | Top-k retrieval | Smart expansion (negation/severity aware) |
| Auth | Session-based | JWT + SHA256+bcrypt |
| Jobs | Blocking request | Async + cancellation |
| Comparison | N/A | Side-by-side document comparison |
| Reports | N/A | PDF export + executive summary |
| Theme | Dark only | Light + Dark theme support |
| Deployment | Single service | Multi-service Docker on Railway |

---

## 🛣️ URLs to Test

Works great with these (they don't block scrapers):

```
https://discord.com/terms
https://policies.google.com/terms
https://www.youtube.com/t/terms
https://github.com/site/terms
https://store.steampowered.com/subscriber_agreement
https://slack.com/terms-of-service
https://www.netflix.com/legal/termsofuse
https://www.spotify.com/us/legal/end-user-agreement
https://zoom.us/terms
https://www.reddit.com/policies/user-agreement
```

---

## 📄 License

MIT — do whatever you want with it.

---

<div align="center">

```
Built with FastAPI · React 19 · Tailwind CSS v4 · spaCy · Cerebras · Groq · Gemini · pgvector · Railway
```

*Read the terms. Or let Jurist AI do it.*

</div>