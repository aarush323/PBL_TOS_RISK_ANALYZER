# ToS Risk Analyzer - Technical Documentation

<p align="center">
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI">
  <img src="https://img.shields.io/badge/spaCy-09A3FF?style=for-the-badge&logo=spacy&logoColor=white" alt="spaCy">
  <img src="https://img.shields.io/badge/LLMs-Cerebras_+_Groq-orange?style=for-the-badge" alt="LLM">
  <img src="https://img.shields.io/badge/Gemini_Embeddings-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Gemini">
  <img src="https://img.shields.io/badge/PostgreSQL_+_pgvector-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React">
  <img src="https://img.shields.io/badge/Railway-0B0D0E?style=for-the-badge&logo=railway&logoColor=white" alt="Railway">
</p>

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture](#system-architecture)
3. [Backend Deep Dive](#backend-deep-dive)
   - [Core Framework](#core-framework-fastapi)
   - [Database Layer](#database-layer)
   - [Authentication System](#authentication-system)
   - [Text Extraction Pipeline](#text-extraction-pipeline)
   - [NLP Pre-processing](#nlp-pre-processing)
   - [LLM Integration](#llm-integration)
   - [Analysis Pipeline](#analysis-pipeline)
   - [Document Chatbot](#document-chatbot)
4. [Workflow Diagrams](#workflow-diagrams)
5. [Frontend Overview](#frontend-overview)
6. [Why This Architecture Works](#why-this-architecture-works)

---

## Executive Summary

**ToS Risk Analyzer** is an AI-powered legal document analysis platform that extracts, classifies, and explains risks in Terms of Service and Privacy Policy documents.

### Key Capabilities

- **Multi-format extraction** — URL, raw text, PDF upload
- **NLP pre-filtering** — spaCy-based risk signal detection before LLM calls
- **LLM risk classification** — Cerebras + Groq round-robin (Llama 3.1 8B) with Ollama local fallback
- **5 risk categories** — Privacy, Legal, User Rights, Security, Financial
- **Batched + parallel processing** — 5-10 clauses/batch, 3 concurrent workers
- **Async analysis** — Instant extraction, LLM runs in background
- **RAG-powered chat** — Gemini embedding + pgvector semantic search with clause citations
- **Document comparison** — Side-by-side RAG-retrieval across two policies
- **Production-deployed** — Railway (Docker) with PostgreSQL + pgvector

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                    SYSTEM OVERVIEW                                   │
└─────────────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────────────┐
                              │     FRONTEND        │
                              │    (React + Vite)   │
                              └──────────┬──────────┘
                                         │
                                         │ HTTP/REST
                                         │
                                         ▼
                              ┌─────────────────────┐
                              │   FASTAPI BACKEND   │
                              │    (Uvicorn)        │
                              └──────────┬──────────┘
                                         │
            ┌──────────────────────────────┼──────────────────────────────┐
            │                              │                              │
            ▼                              ▼                              ▼
┌─────────────────────┐      ┌─────────────────────┐      ┌─────────────────────┐
│   EXTRACTION       │      │     ANALYSIS        │      │      CHAT          │
│   PIPELINE         │      │     PIPELINE        │      │    PIPELINE        │
│                    │      │                     │      │                    │
│ • URL (Beautiful   │      │ • NLP Pre-filter    │      │ • Gemini embed     │
│   Soup + lxml)    │      │ • Clause Segment    │      │ • pgvector search  │
│ • PDF (pdfplumber)│      │ • LLM Classification │      │ • Context building │
│ • Text (direct)   │      │ • Risk Aggregation   │      │ • LLM Chat (RAG)   │
└─────────┬─────────┘      └──────────┬────────────┘      └─────────┬─────────┘
          │                           │                           │
          ▼                           ▼                           ▼
┌─────────────────────┐      ┌─────────────────────────────────────────────────┐
│  POSTGRESQL         │      │           LLM PROVIDERS (Round-Robin)           │
│  DATABASE           │      │                                                 │
│  + pgvector         │      │  ┌────────────┐  ┌────────────┐  ┌───────────┐  │
│                     │      │  │  CEREBRAS  │  │   GROQ     │  │  OLLAMA   │  │
│ • Users             │      │  │ llama3.1   │  │ llama-3.1  │  │ phi3.5 /  │  │
│ • Analyses          │      │  │ -8b        │  │ -8b-instant│  │ qwen3.5   │  │
│ • Chat Sessions     │      │  │ (Primary)  │  │ (Secondary)│  │ (Fallback)│  │
│ • Clause Embeddings │      │  └────────────┘  └────────────┘  └───────────┘  │
│   (vector search)  │      └─────────────────────────────────────────────────┘
└─────────────────────┘
                              ┌─────────────────────┐
            ┌─────────────────│   GEMINI EMBED API  │
            │                 │  gemini-embedding-001│
            │                 │  (384 dim vectors)  │
            │                 └─────────────────────┘
            │ Used by RAG indexing + retrieval
            ▼
  clause_embeddings table (pgvector cosine search)
```

---

## Backend Deep Dive

### Core Framework: FastAPI

**FastAPI** is a modern Python web framework built on top of Starlette for routing and Pydantic for data validation.

#### Why FastAPI?

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FASTAPI ADVANTAGES                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │   NATIVE    │    │   BUILT-IN  │    │   TYPE      │    │   EASY      │  │
│  │   ASYNC     │    │   OPENAPI    │    │   SAFETY    │    │   MIDDLEWARE│  │
│  │   SUPPORT   │    │   DOCS       │    │   (Pydantic)│    │   (CORS)    │  │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘  │
│         │                  │                  │                  │         │
│         ▼                  ▼                  ▼                  ▼         │
│  • Non-blocking I/O  • Auto-generated   • Validation,     • Cross-origin │
│  • High concurrency   docs at /docs      serialization     requests      │
│  • Scale to 1000s    • Interactive API  • IDE support     • Security      │
│    of concurrent      testing                                               │
│    requests                                                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Async Analysis Pattern

The most important architectural decision is handling **long-running LLM operations**:

```python
# Backend immediately returns, LLM runs in background
@app.post("/analyze/async")
async def analyze_async(
    body: AnalyzeInput,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    # 1. Extract text (fast)
    extraction = handle_input(body.input_type, body.content)
    
    # 2. Create job in database
    job_id = str(uuid.uuid4())
    await crud.create_analysis_job(db, job_id, ...)
    
    # 3. Schedule background task
    background_tasks.add_task(_run_analysis_background, job_id, extraction)
    
    # 4. Return immediately with job_id
    return {"job_id": job_id, "status": "processing", "extraction": extraction}
```

**Why this matters:**
- HTTP requests won't timeout on long LLM calls
- Users can poll for results via `/analyze/status/{job_id}`
- Server handles many concurrent analysis requests

---

### Database Layer

#### Technology Stack

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATABASE ARCHITECTURE                                │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌──────────────────────────────────┐
                    │       POSTGRESQL DATABASE         │
                    │                                  │
                    │  ┌────────────────────────────┐  │
                    │  │      SQLAlchemy 2.0        │  │
                    │  │    (Async Engine)          │  │
                    │  └─────────────┬──────────────┘  │
                    │                │                 │
                    │    ┌───────────┴───────────┐      │
                    │    │   asyncpg driver      │      │
                    │    │   (async postgres)    │      │
                    │    └───────────┬───────────┘      │
                    └────────────────┼──────────────────┘
                                     │
                                     ▼
                    ┌──────────────────────────────────┐
                    │     CONNECTION POOLING            │
                    │                                    │
                    │   pool_size = 5                   │
                    │   max_overflow = 10               │
                    │   pool_pre_ping = True            │
                    └──────────────────────────────────┘
```

#### Data Models

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            ER DIAGRAM                                        │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
    │    USER     │          │  ANALYSIS   │          │CHAT_SESSION│
    ├─────────────┤          ├─────────────┤          ├─────────────┤
    │ id (PK)     │◄─────────│ user_id (FK)│          │session_id  │
    │ username    │   1:N    │ job_id (PK)  │          │ (PK)       │
    │ email       │          │ source       │          │user_id (FK)│
    │ hashed_pw   │          │ source_type  │          │document_   │
    │ is_active   │          │ status       │          │ text       │
    │ created_at  │          │ result (JSON)│          │is_indexed  │
    └─────────────┘          │ error        │          │indexed_at  │
                            │ created_at   │          │clause_count│
                            └──────┬───────┘          └──────┬──────┘
                                   │                        │
                                   │ 1:N                    │ 1:N
                                   ▼                        ▼
                            ┌─────────────┐          ┌─────────────┐
                            │CHAT_MESSAGE │          │CLAUSE_EMBED│
                            ├─────────────┤          ├─────────────┤
                            │ id (PK)     │          │ id (PK)    │
                            │session_id(FK)          │session_id(FK)
                            │ role        │          │clause_id   │
                            │ content     │          │clause_text │
                            │ created_at  │          │embedding   │
                            └─────────────┘          │(vector)    │
                                                    │risk_cat    │
                                                    │severity    │
                                                    └─────────────┘
```

#### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Async SQLAlchemy** | Non-blocking DB ops, essential for high-concurrency FastAPI |
| **JSONB for results** | Store complex analysis without separate tables |
| **Nullable user_id** | Supports both authenticated and anonymous users |
| **Cascade deletes** | Automatic cleanup of related records |
| **Job status enum** | Enables polling workflow (`processing` → `complete`/`failed`) |

---

### Authentication System

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      AUTHENTICATION FLOW                                     │
└─────────────────────────────────────────────────────────────────────────────┘

   ┌──────────┐                                    ┌──────────┐
   │  CLIENT  │                                    │  SERVER  │
   └────┬─────┘                                    └────┬─────┘
        │                                                │
        │  1. POST /auth/register                       │
        │  { username, email, password }                │
        │───────────────────────────────────────────────►
        │                                                │
        │                                          ┌─────┴─────┐
        │                                          │ Hash      │
        │                                          │ password  │
        │                                          │ (bcrypt)  │
        │                                          └─────┬─────┘
        │                                                │
        │  201 Created                                 │
        │  { message: "Welcome to Jurist AI!" }          │
        │◄──────────────────────────────────────────────
        │                                                │
        │  2. POST /auth/login                          │
        │  { username (email), password }               │
        │───────────────────────────────────────────────►
        │                                                │
        │                                          ┌─────┴─────┐
        │                                          │ Verify    │
        │                                          │ password  │
        │                                          │ + JWT     │
        │                                          └─────┬─────┘
        │                                                │
        │  200 OK                                       │
        │  { access_token: "eyJ...", token_type }       │
        │◄──────────────────────────────────────────────
        │                                                │
        │  3. GET /auth/me                              │
        │  Authorization: Bearer eyJ...                 │
        │───────────────────────────────────────────────►
        │                                                │
        │  200 OK                                       │
        │  { id, username, email, created_at }          │
        │◄──────────────────────────────────────────────
```

#### JWT + bcrypt Implementation

```python
# Password Hashing (with SHA256 pre-hash to bypass 72-char bcrypt limit)
def hash_password(plain: str) -> str:
    pre_hashed = hashlib.sha256(plain.encode("utf-8")).hexdigest()
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pre_hashed.encode("utf-8"), salt)
    return hashed.decode("utf-8")

# JWT Token Creation
def create_access_token(user_id: str, email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=60)
    payload = {"sub": user_id, "email": email, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
```

#### Dual Auth Dependency Pattern

```python
# Requires authentication - returns 401 if not logged in
async def get_current_user(token: str = Depends(oauth2_scheme)):
    ...

# Optional authentication - returns None if not logged in
async def get_optional_user(token: str | None = Depends(oauth2_scheme)):
    ...
```

**Why both?** Allows anonymous analysis while supporting user-specific history.

---

### Text Extraction Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    TEXT EXTRACTION PIPELINE                                 │
└─────────────────────────────────────────────────────────────────────────────┘

   ┌────────────────────────────────────────────────────────────────────┐
   │                     INPUT TYPES                                     │
   └────────────────────────────────────────────────────────────────────┘
   
           │                      │                      │
           ▼                      ▼                      ▼
    ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
    │     URL      │      │     PDF      │      │    TEXT     │
    │  (string)    │      │   (file)     │      │   (string)   │
    └──────┬───────┘      └──────┬───────┘      └──────┬───────┘
           │                     │                     │
           ▼                     ▼                     ▼
    ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
    │url_extractor │      │pdf_extractor │      │    direct    │
    │   .py        │      │    .py       │      │   pass-through
    └──────┬───────┘      └──────┬───────┘      └──────┬───────┘
           │                     │                     │
           └─────────────────────┼─────────────────────┘
                                 │
                                 ▼
                    ┌──────────────────────┐
                    │   text_cleaner.py    │
                    │                      │
                    │ • Normalize whitespace│
                    │ • Split into paragraphs│
                    │ • Compute statistics  │
                    └───────────┬────────────┘
                                │
                                ▼
                    ┌──────────────────────┐
                    │   OUTPUT STRUCTURE   │
                    │                      │
                    │ {                    │
                    │   source_type,       │
                    │   source,            │
                    │   raw_text,          │
                    │   cleaned_text,      │
                    │   paragraphs[],      │
                    │   char_count,        │
                    │   line_count,        │
                    │   paragraph_count    │
                    │ }                    │
                    └──────────────────────┘
```

#### URL Extraction (`url_extractor.py`)

**Workflow:**
```
URL → HTTP GET (with Chrome UA) → BeautifulSoup(lxml) → Remove noise → Extract content → Text
```

**Smart Content Detection:**
```python
def find_main_content(soup):
    # 1. Try semantic HTML5 tags
    semantic = soup.find("main") or soup.find("article")
    if semantic and len(semantic.get_text(strip=True)) > 1000:
        return semantic
    
    # 2. Try ID/class pattern matching
    pattern_match = soup.find(id=re.compile(r"content|terms|policy|main|legal"))
    if pattern_match and len(pattern_match.get_text(strip=True)) > 1000:
        return pattern_match
    
    # 3. Fallback: largest div/section
    candidates = soup.find_all(["div", "section", "article"])
    best = max(candidates, key=lambda x: len(x.get_text(strip=True)))
    return best
```

**Why this approach?**
- **User-Agent spoofing** - Bypasses bot detection
- **lxml parser** - Faster and more lenient than html.parser
- **Noise removal** - Removes scripts, nav, footer, ads, cookie popups
- **Multi-strategy detection** - Semantic → Pattern → Heuristic

#### PDF Extraction (`pdf_extractor.py`)

**Why pdfplumber?**
- Pure Python (no system dependencies)
- Better layout handling than PyPDF2
- Simple API with good defaults

```python
with pdfplumber.open(filepath) as pdf:
    for page in pdf.pages:
        text = page.extract_text(x_tolerance=3, y_tolerance=3)
        if text and len(text.strip()) > 10:
            full_text.append(text)
```

---

### NLP Pre-processing

#### The Problem

Legal documents are long paragraphs containing multiple clauses. Each clause needs individual risk assessment.

#### Solution: Two-Stage NLP Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    NLP PRE-PROCESSING PIPELINE                               │
└─────────────────────────────────────────────────────────────────────────────┘

   EXTRACTED TEXT                                               
   (paragraphs[])                                               
         │                                                      
         ▼                                                      
┌─────────────────────────────────────────────────────────────┐
│  STAGE 1: Clause Segmentation (segmenter.py)                │
│                                                             │
│  Input: ["Privacy Policy. We collect data..."]               │
│         ↓                                                    │
│  ┌────────────────────────────────────────────────────┐     │
│  │  1. Heading Detection (regex patterns)             │     │
│  │     - Numbered: "1.2.3", "IV.", "SECTION ONE"      │     │
│  │     - All caps with <10 words                       │     │
│  └────────────────────────────────────────────────────┘     │
│  ┌────────────────────────────────────────────────────┐     │
│  │  2. Sentence Splitting (spaCy)                      │     │
│  │     - Uses linguistic rules for boundaries         │     │
│  └────────────────────────────────────────────────────┘     │
│  ┌────────────────────────────────────────────────────┐     │
│  │  3. Clause Merging                                  │     │
│  │     - Min length: 40 chars                          │     │
│  │     - Max length: 1200 chars                        │     │
│  │     - Split on: "however", "additionally", etc.    │     │
│  └────────────────────────────────────────────────────┘     │
│                                                             │
│  Output: [{id: 0, text: "...", section_heading: "..."}, ...]│
└─────────────────────────────────────────────────────────────┘
         │                                                      
         ▼                                                      
┌─────────────────────────────────────────────────────────────┐
│  STAGE 2: Feature Extraction (nlp_features.py)               │
│                                                             │
│  For each clause, extract:                                  │
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │  MODAL VERBS     │  │   NEGATION       │                 │
│  │                  │  │                  │                 │
│  │  may, might,     │  │  not, never,     │                 │
│  │  can, could,    │  │  waive, disclaim │                 │
│  │  will, reserve  │  │                  │                 │
│  └────────┬─────────┘  └────────┬─────────┘                 │
│           │                    │                            │
│           └──────────┬─────────┘                            │
│                      ▼                                      │
│           ┌──────────────────────┐                          │
│           │    RISK KEYWORDS     │                          │
│           │                      │                          │
│           │  50+ regex patterns  │                          │
│           │  across 5 categories │                          │
│           └──────────┬───────────┘                          │
│                      │                                      │
│                      ▼                                      │
│           ┌──────────────────────┐                          │
│           │   RISK SCORING       │                          │
│           │                      │                          │
│           │  Keyword match: +1.0 │                          │
│           │  Has negation: +0.5  │                          │
│           │  Has modal: +0.5     │                          │
│           │  Boilerplate: -1.0   │                          │
│           │                      │                          │
│           │  Threshold: >= 2.0   │                          │
│           │  = Send to LLM        │                          │
│           └──────────────────────┘                          │
│                                                             │
│  Output: {modal_verbs: [...], has_negation: bool,           │
│           triggered_categories: [...], risk_score: float}   │
└─────────────────────────────────────────────────────────────┘
```

#### Risk Categories & Keywords

| Category | Keywords |
|----------|----------|
| **Privacy Risk** | collect, personal data, third-party, sell, track, cookie, profiling, data retention |
| **Legal Risk** | arbitration, class action, waiver, jurisdiction, indemnify, liability, lawsuit, dispute resolution |
| **User Rights Risk** | terminate, suspend, ban, at our discretion, content ownership, irrevocable, opt-out |
| **Security Risk** | data breach, encryption, unauthorized access, as is, best efforts, not responsible |
| **Financial Risk** | auto-renew, automatically charged, non-refundable, subscription fee, price change, billing |

#### Why This Hybrid Approach?

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    COST-BENEFIT ANALYSIS                                     │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────┐       ┌─────────────────────┐
                    │  WITHOUT PRE-FILTER  │       │  WITH PRE-FILTER    │
                    └──────────┬────────────┘       └──────────┬────────────┘
                               │                                 │
                               ▼                                 ▼
                    ┌─────────────────────┐       ┌─────────────────────┐
                    │   100% to LLM       │       │   ~25% to LLM       │
                    │                     │       │                     │
                    │   Cost: $1.00       │       │   Cost: $0.25       │
                    │   Time: 100s        │       │   Time: 25s         │
                    │                     │       │                     │
                    └─────────────────────┘       └─────────────────────┘
                               │                                 │
                               │          ┌─────────────────────┐│
                               │          │  ADDITIONAL         ││
                               │          │  BENEFITS           ││
                               │          │                     ││
                               │          │ • Better prompts   ││
                               │          │   (pre-detected    ││
                               │          │    features)       ││
                               │          │ • Faster response  ││
                               │          │ • Cancellable       ││
                               │          │   jobs              ││
                               │          └─────────────────────┘│
                               │                                 │
                               ▼                                 ▼
                    ┌─────────────────────────────────────────────────────┐
                    │                     RESULT                           │
                    │                                                       │
                    │   75% SAVINGS in cost and time + better accuracy    │
                    │                                                       │
                    └─────────────────────────────────────────────────────┘
```

---

### LLM Integration

#### Architecture: Dual Provider System

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    LLM PROVIDER ARCHITECTURE                                 │
└─────────────────────────────────────────────────────────────────────────────┘

                           ┌─────────────────┐
                           │  CLASSIFY.CLAUSE│
                           │     OR          │
                           │  CLASSIFY.BATCH │
                           └────────┬────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────────┐
                    │  CHECK: CEREBRAS OR GROQ KEYS     │
                    │  Round-Robin between providers    │
                    └───────────────┬───────────────────┘
                                    │
                ┌───────────────────┴───────────────────┐
                │                                       │
                ▼ YES                                   ▼ NO (or error)
    ┌───────────────────────┐   ┌───────────────────────┐   ┌───────────────────────┐
    │    CEREBRAS API       │   │       GROQ API        │   │    OLLAMA FALLBACK    │
    │    (Primary 1)        │   │     (Primary 2)       │   │        (Local)        │
    │                       │   │                       │   │                       │
    │ • llama3.1-8b         │   │ • llama-3.1-8b-instant│   │ • phi3.5 (classify)   │
    │ • Fast inference      │   │ • Lightning fast      │   │ • qwen3.5:9b (chat)   │
    │ • JSON mode           │   │ • JSON mode           │   │ • No API cost         │
    │ • Low latency         │   │ • High throughput     │   │ • Offline support     │
    └─────────┬─────────────┘   └─────────┬─────────────┘   └─────────┬─────────────┘
              │                           │                           │
              └───────────────────────────┴───────────────────────────┘
                                          │
                                          ▼
    ┌───────────────────────┐
    │  RESPONSE PARSING    │
    │                       │
    │ • Strip markdown     │
    │ • Extract JSON       │
    │ • Validate fields    │
    │ • Normalize output   │
    └─────────┬─────────────┘
              │
              ▼
    ┌───────────────────────┐
    │  RETURN RESULT       │
    │                      │
    │ { is_risky,          │
    │   risk_categories,   │
    │   confidence,        │
    │   explanation }      │
    └───────────────────────┘
```

#### Cerebras API

**Why Cerebras?**

| Factor | Benefit |
|--------|---------|
| **Fast inference** | Specialized hardware (Wafer-Scale Engine) |
| **Cost-effective** | Significantly cheaper than OpenAI |
| **JSON mode** | Native structured output, no parsing hacks |
| **Open-source model** | Llama 3.1 is well-documented |

**API Call:**
```python
response = httpx.post(
    "https://api.cerebras.ai/v1/chat/completions",
    headers={"Authorization": f"Bearer {api_key}"},
    json={
        "model": "llama3.1-8b",
        "messages": [{"role": "user", "content": prompt}],
        "response_format": {"type": "json_object"},
        "temperature": 0.1,
        "max_completion_tokens": 200
    }
)
```

#### Ollama Fallback

**Why local fallback?**

- **Zero API cost** after hardware investment
- **Offline capability** - Works when internet/API is down
- **Privacy** - Documents never leave your infrastructure
- **Dev flexibility** - Test without API keys

**Models:**
- `phi3.5` - Lightweight, fast classification
- `qwen3.5:9b` - Better conversational understanding for chat

#### Classification Prompt Engineering

```python
PROMPT_TEMPLATE = """You are a legal risk analyst specializing in Terms of Service.

Analyze the following clause and classify any risks present.

CLAUSE:
{clause_text}

NLP SIGNALS DETECTED:
- Modal verbs found: {modal_verbs}
- Negation present: {has_negation}
- Pre-flagged categories: {triggered_categories}
- Named entity types: {entity_types}

RISK CATEGORY DEFINITIONS:
- Privacy Risk: data collection, sharing, selling, tracking user data
- Legal Risk: mandatory arbitration, class action waiver, jurisdiction
- User Rights Risk: account termination, content ownership transfer
- Security Risk: data breach, no encryption, "as is" disclaimers
- Financial Risk: auto-renewal, non-refundable charges

Respond ONLY with valid JSON:
{{
  "is_risky": true or false,
  "risk_categories": ["Privacy Risk"] or [],
  "confidence": "High" or "Medium" or "Low",
  "explanation": "one sentence in plain English"
}}"""
```

#### Batch Classification

Process 5-10 clauses in a single LLM call for **5-10x speedup**:

```python
BATCH_PROMPT_TEMPLATE = """Analyze EACH of the following clauses...

CLAUSES:
[Clause 0]
{clause_0_text}
NLP SIGNALS: ...

[Clause 1]
{clause_1_text}
NLP SIGNALS: ...

...

Respond with JSON:
{{
  "results": [
    {{"clause_id": 0, "is_risky": ..., ...}},
    {{"clause_id": 1, "is_risky": ..., ...}}
  ]
}}"""
```

---

### Analysis Pipeline

#### End-to-End Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ANALYSIS PIPELINE (FULL)                                 │
└─────────────────────────────────────────────────────────────────────────────┘

   USER INPUT                                                              
   (URL / PDF / Text)                                                      
         │                                                                  
         ▼                                                                  
┌──────────────────────────────────────────────────────────────────────────┐
│ 1. EXTRACTION                                                             │
│                                                                             │
│ handle_input(input_type, content) → {                                     │
│   raw_text, cleaned_text, paragraphs[],                                   │
│   char_count, paragraph_count                                            │
│ }                                                                         │
└──────────────────────────────────────────────────────────────────────────┘
         │                                                                  
         ▼                                                                  
┌──────────────────────────────────────────────────────────────────────────┐
│ 2. SEGMENTATION (spaCy)                                                   │
│                                                                             │
│ segment_clauses(paragraphs) → [                                           │
│   {id: 0, text: "...", section_heading: "..."},                          │
│   {id: 1, text: "...", ...},                                              │
│   ...                                                                     │
│ ]                                                                         │
│                                                                             │
│ ~10-50 clauses per document                                               │
└──────────────────────────────────────────────────────────────────────────┘
         │                                                                  
         ▼                                                                  
┌──────────────────────────────────────────────────────────────────────────┐
│ 3. NLP FEATURE EXTRACTION                                                 │
│                                                                             │
│ For each clause:                                                          │
│   extract_features(clause_text) → {                                      │
│     modal_verbs: [...],                                                   │
│     has_negation: bool,                                                   │
│     triggered_categories: [...],                                         │
│     risk_score: float                                                     │
│   }                                                                       │
│                                                                             │
│ Filter: is_likely_risky(features) → risk_score >= 2.0                   │
│                                                                             │
│ ~25% pass to LLM, ~75% skipped (low risk)                                │
└──────────────────────────────────────────────────────────────────────────┘
         │                                                                  
         ▼                                                                  
┌──────────────────────────────────────────────────────────────────────────┐
│ 4. LLM CLASSIFICATION (Adaptive Batching)                                 │
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────┐   │
│ │ START: batch_size = 10                                              │   │
│ └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                             │
│                              ▼                                             │
│ ┌─────────────────────────────────────────────────────────────────────┐   │
│ │ SPLIT clauses into batches of batch_size                           │   │
│ │ e.g., 25 clauses → 3 batches [10, 10, 5]                          │   │
│ └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                             │
│                              ▼                                             │
│ ┌─────────────────────────────────────────────────────────────────────┐   │
│ │ PROCESS in parallel (3 ThreadPoolExecutor workers)                 │   │
│ │                                                                     │   │
│ │ Worker 1: Batch 0 → LLM → results[0]                               │   │
│ │ Worker 2: Batch 1 → LLM → results[1]                               │   │
│ │ Worker 3: Batch 2 → LLM → results[2]                               │   │
│ └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                             │
│        ┌─────────────────────┴─────────────────────┐                     │
│        │                                          │                     │
│        ▼                                          ▼                     │
│ ┌─────────────────────┐               ┌─────────────────────┐           │
│ │ SUCCESS             │               │ FAILURE (429/err)  │           │
│ │                     │               │                     │           │
│ │ batch_size += 1    │               │ batch_size //= 2   │           │
│ │ (up to MAX 10)     │               │ (down to MIN 3)     │           │
│ └─────────────────────┘               └─────────────────────┘           │
│                              │                                             │
│                              ▼                                             │
│ ┌─────────────────────────────────────────────────────────────────────┐   │
│ │ FALLBACK: Per-clause classification if all batches fail            │   │
│ └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│ Output: [                                                                 │
│   {id: 0, is_risky: true, risk_categories: [...], confidence: "High"}, │
│   {id: 1, is_risky: false, ...},                                          │
│   ...                                                                      │
│ ]                                                                         │
└──────────────────────────────────────────────────────────────────────────┘
         │                                                                  
         ▼                                                                  
┌──────────────────────────────────────────────────────────────────────────┐
│ 5. RISK AGGREGATION                                                       │
│                                                                             │
│ compute_overall_risk(risky_clauses, total):                              │
│   high_count = sum(c.confidence == "High" for c in risky)               │
│   ratio = len(risky) / total                                             │
│                                                                             │
│   if high_count >= 3 or ratio > 0.3:  return "High"                     │
│   elif high_count >= 1 or ratio > 0.15: return "Medium"                 │
│   else:                                    return "Low"                 │
│                                                                             │
│ Output:                                                                    │
│ {                                                                          │
│   source: "...",                                                           │
│   total_clauses: 47,                                                      │
│   risky_clause_count: 12,                                                │
│   skipped_llm_count: 35,                                                 │
│   overall_risk: "Medium",                                                │
│   risk_breakdown: {Privacy: 5, Legal: 3, ...},                         │
│   clauses: [...]                                                          │
│ }                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

#### Cancellation Support

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CANCELLATION MECHANISM                                   │
└─────────────────────────────────────────────────────────────────────────────┘

   USER                                              SERVER
     │                                                 │
     │  POST /analyze/async                           │
     │  { input_type, content }                      │
     │───────────────────────────────────────────────►
     │                                                 │
     │                                         Job starts in background
     │                                                 │
     │  GET /analyze/status/{job_id}                  │
     │◄──────────────────────────────────────────────
     │  { status: "processing" }
     │                                                 │
     │                                                 │
     │  POST /analyze/stop/{job_id}                   │◄── User cancels
     │───────────────────────────────────────────────►
     │                                                 │
     │                         ┌──────────────────────┘
     │                         │
     │                         ▼
     │                  ┌─────────────────┐
     │                  │ set_cancelled  │
     │                  │ (job_id)        │
     │                  └────────┬────────┘
     │                           │
     │                           ▼
     │                  ┌─────────────────┐
     │                  │ Thread checks   │
     │                  │ is_cancelled()  │
     │                  │ before each     │
     │                  │ LLM call        │
     │                  └────────┬────────┘
     │                           │
     │                           │ YES → Raise Exception
     │                           │     → Update DB: failed
     │                           │
     │  { status: "cancelled" } │
     │◄──────────────────────────
```

---

### Document Chatbot

#### RAG Architecture (2026)

The chatbot now uses **Retrieval-Augmented Generation (RAG)** with pgvector for semantic search:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    RAG CHATBOT PIPELINE                                    │
└─────────────────────────────────────────────────────────────────────────────┘

   USER QUESTION + SESSION
          │
          ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ 1. CHECK INDEXING STATUS                                                  │
│                                                                             │
│ ChatSession.is_indexed?                                                   │
│   ├── YES → Use RAG (retrieve relevant clauses)                           │
│   └── NO  → Fall back to full document (backward compatible)             │
└──────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ 2. EMBEDDING + RETRIEVAL (if indexed)                                     │
│                                                                             │
│ • Embed user query (all-MiniLM-L6-v2, 384 dim)                           │
│ • Cosine similarity search in pgvector                                    │
│ • Filter by session_id                                                    │
│ • Optional: filter by risk category                                       │
│ • Return top-5 relevant clauses                                           │
│                                                                             │
│ clause_embeddings table:                                                  │
│   - clause_id, clause_text, section_heading                               │
│   - risk_categories (JSONB), severity_score, is_risky                     │
│   - embedding (vector(384))                                               │
└──────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ 3. BUILD CONTEXT                                                          │
│                                                                             │
│ System prompt includes:                                                   │
│ • Top 5-8 relevant clauses with clause IDs                                │
│ • Section headings and risk categories                                    │
│ • Conversation history (last 6 messages)                                  │
│                                                                             │
│ Format:                                                                   │
│ [Clause 3 | Privacy Risk | Severity: 0.8]                               │
│ "We may share your data with third parties..."                            │
└──────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ 4. LLM REQUEST (Cerebras → Ollama fallback)                              │
│                                                                             │
│ try Cerebras:                                                             │
│   response = httpx.post(CEREBRAS_API, json={                              │
│     model: "llama3.1-8b",                                                │
│     messages: messages,                                                   │
│     temperature: 0.3,                                                     │
│     max_completion_tokens: 800                                            │
│   })                                                                      │
│ except: fallback to Ollama (qwen3.5:9b)                                   │
└──────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ 5. SAVE + RETURN                                                          │
│                                                                             │
│ • Save chat message to history                                            │
│ • Return: { reply, session_id, rag_enabled, clauses_retrieved }          │
└──────────────────────────────────────────────────────────────────────────┘
```

#### Auto-Indexing Flow

When a document is stored for chat, it is automatically indexed in the background:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    AUTO-INDEXING PIPELINE                                  │
└─────────────────────────────────────────────────────────────────────────────┘

   POST /chat/store
          │
          ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ 1. STORE DOCUMENT                                                         │
│                                                                             │
│ • Save to chat_sessions table                                             │
│ • Set is_indexed = FALSE initially                                        │
│ • Return immediately to client                                            │
└──────────────────────────────────────────────────────────────────────────┘
          │
          ▼ (background task)
┌──────────────────────────────────────────────────────────────────────────┐
│ 2. INDEX IN BACKGROUND                                                    │
│                                                                             │
│ • Segment document into clauses (reuse segmenter.py)                      │
│ • Extract NLP features (reuse nlp_features.py)                            │
│ • Embed all clauses (Google Gemini Embedding API, batched)                │
│ • INSERT into clause_embeddings                                           │
│ • UPDATE chat_sessions SET is_indexed = TRUE                             │
└──────────────────────────────────────────────────────────────────────────┘
```

#### Comparison Feature

New in 2026: Compare two documents side-by-side:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DOCUMENT COMPARISON                                      │
└─────────────────────────────────────────────────────────────────────────────┘

   POST /chat/compare
   { session_id_a, session_id_b, question }
          │
          ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ • Retrieve top-4 clauses from each document (semantic search)             │
│ • Build comparison context with clause citations                          │
│ • LLM compares directly, states which is riskier per category           │
│ • Return: { reply, doc_a_clauses, doc_b_clauses }                       │
└──────────────────────────────────────────────────────────────────────────┘
```

#### Clause Browsing API

Users can browse document clauses directly:

| Endpoint | Description |
|----------|-------------|
| `GET /chat/{id}/clauses` | List all clauses (filter by risk/category) |
| `GET /chat/{id}/clauses/{cid}` | Get specific clause |
| `GET /chat/{id}/risks` | Get risk summary by category |
| `GET /chat/{id}/index/status` | Check indexing progress |
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CHATBOT PIPELINE                                         │
└─────────────────────────────────────────────────────────────────────────────┘

   USER QUESTION + SESSION
         │
         ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ 1. LOAD SESSION                                                           │
│                                                                             │
│ crud.get_chat_session(session_id) → ChatSession {                         │
│   document_text, user_id, created_at                                     │
│ }                                                                         │
│                                                                             │
│ If not found → 404 Error                                                   │
└──────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ 2. BUILD MESSAGES                                                          │
│                                                                             │
│ SYSTEM_PROMPT = """                                                        │
│ You are a legal document assistant.                                       │
│ Answer user questions about this document accurately.                      │
│ Only answer based on information in the document.                          │
│ Use plain English that a non-lawyer can understand.                         │
│                                                                             
│ DOCUMENT:                                                                  │
│ {document_text}  ← truncated to 12,000 chars                              │
│ """                                                                        │
│                                                                             │
│ messages = [                                                               │
│   {"role": "system", "content": SYSTEM_PROMPT},                          │
│   {"role": "user", "content": "What data do they collect?"},             │
│   {"role": "assistant", "content": "They collect..."},                   │
│   {"role": "user", "content": "Can I delete it?"},                       │
│ ]                                                                         │
│                                                                             │
│ (Last 20 messages for context)                                            │
└──────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ 3. LLM REQUEST (Cerebras → Ollama fallback)                              │
│                                                                             │
│ Same dual-provider pattern as classifier:                                 │
│                                                                             │
│ try Cerebras:                                                              │
│   response = httpx.post(CEREBRAS_API, json={                              │
│     model: "llama3.1-8b",                                                 │
│     messages: messages,                                                  │
│     temperature: 0.3,                                                     │
│     max_completion_tokens: 800                                           │
│   })                                                                      │
│ except: fallback to Ollama (qwen3.5:9b)                                  │
└──────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ 4. SAVE TO HISTORY                                                         │
│                                                                             │
│ crud.add_chat_message(session_id, "user", question)                     │
│ crud.add_chat_message(session_id, "assistant", answer)                  │
└──────────────────────────────────────────────────────────────────────────┘
         │
         ▼
   RETURN { reply: "...", session_id: "..." }

```


---

## Workflow Diagrams

### Complete User Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    COMPLETE USER WORKFLOW                                   │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
    │  FRONTEND │     │  FASTAPI │     │  EXTRACT │     │ ANALYSIS │
    │   (React) │     │  (Uvicorn)│     │  (Text)  │     │  (LLM)   │
    └─────┬─────┘     └─────┬─────┘     └─────┬─────┘     └─────┬─────┘
          │                 │                 │                 │
          │ 1. User enters  │                 │                 │
          │    URL/PDF/Text │                 │                 │
          │                 │                 │                 │
          ├────────────────►│                 │                 │
          │                 │                 │                 │
          │                 │ 2. Call /extract │                 │
          │                 ├────────────────►│                 │
          │                 │                 │                 │
          │                 │◄────────────────┤ (extracts text) │
          │                 │                 │                 │
          │  Show extracted │ 3. Call /analyze│                 │
          │    text (preview)│  /async         │                 │
          │◄────────────────┤◄────────────────►│                 │
          │                 │                 │                 │
          │                 │ job_id + status │                 │
          │◄────────────────┤◄────────────────┤                 │
          │                 │                 │                 │
          │ 4. Poll /status │                 │                 │
          │    every 2s     │                 │                 │
          ├────────────────►│                 │                 │
          │                 │                 │                 │
          │◄────────────────┤ (while status    │                 │
          │  status: "proc"│  is processing) │                 │
          │                 │                 │                 │
          │                 │                 │   LLM processes │
          │                 │                 │   clauses...   │
          │                 │                 │                 │
          │                 │                 │                 │
          │ 5. GET /status │                 │                 │
          │◄────────────────│                 │                 │
          │                 │                 │                 │
          │ 6. Display      │◄────────────────┤ status: complete │
          │    results      │◄────────────────┤ result: {...}    │
          │◄────────────────┤                 │                 │
          │                 │                 │                 │
          │                 │                 │                 │
          ▼                 ▼                 ▼                 ▼
```

### Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION WORKFLOW                                   │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌──────────┐                                    ┌──────────┐
    │  USER    │                                    │  SYSTEM  │
    │ (Browser)│                                    │ (Backend)│
    └────┬─────┘                                    └────┬─────┘
         │                                               │
         │ 1. POST /auth/register                        │
         │    { username, email, password }               │
         ├───────────────────────────────────────────────►
         │                                               │
         │                                        bcrypt.hash(password)
         │                                        Save to PostgreSQL
         │                                               │
         │ 201: "Welcome to Jurist AI!"                  │
         ◄───────────────────────────────────────────────┤
         │                                               │
         │ 2. POST /auth/login                           │
         │    (form: username=email, password)            │
         ├───────────────────────────────────────────────►
         │                                               │
         │                                        bcrypt.verify(password)
         │                                        jwt.encode({sub: user_id})
         │                                               │
         │ 200: { access_token: "eyJ...", token_type }  │
         ◄───────────────────────────────────────────────┤
         │                                               │
         │ 3. Store token in localStorage                 │
         │                                               │
         │ 4. Any protected request:                     │
         │    GET /auth/me                              │
         │    Authorization: Bearer eyJ...              │
         ├──────────────────────────────────────────────►
         │                                               │
         │                                        jwt.decode(token)
         │                                        Get user from DB
         │                                               │
         │ 200: { id, username, email, created_at }    │
         ◄───────────────────────────────────────────────┤
         │                                               │
         │ 5. JWT expires after 60 minutes               │
         │    → 401 Unauthorized → redirect to login    │
         │                                               │
         ▼                                               ▼
```

### Analysis Job Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ASYNC ANALYSIS JOB FLOW                                  │
└─────────────────────────────────────────────────────────────────────────────┘

    TIME ─────────────────────────────────────────────────────────────────────▶

    0s                    1s                  30s                 60s
    │                      │                    │                    │
    │  POST /analyze/async │                    │                    │
    ├──────────────────────┤                    │                    │
    │                      │                    │                    │
    │◄─────────────────────┤                    │                    │
    │ job_id: "abc-123"    │                    │                    │
    │ status: "processing"│                    │                    │
    │                      │                    │                    │
    │                      │ ┌──────────────────┴──────────────┐
    │                      │ │ BACKGROUND TASK                │
    │                      │ │                                 │
    │                      │ │ 1. handle_input() → text       │
    │                      │ │ 2. segment_clauses() → clauses│
    │                      │ │ 3. extract_features() → ...   │
    │                      │ │ 4. is_likely_risky() filter    │
    │                      │ │ 5. classify_batch() → LLM      │
    │                      │ │ 6. Aggregate results           │
    │                      │ │                                 │
    │                      │ │         ┌──────────┐            │
    │                      │ │         │ UPDATE DB│            │
    │                      │ │         │ complete │            │
    │                      │ │         └──────────┘            │
    │                      │ │                                 │
    ├─ GET /status/abc-123 │ │                    │             │
    │◄─────────────────────┤ │                    │             │
    │ status: "processing"│ │                    │             │
    │                      │ │                    │             │
    ├─ GET /status/abc-123│ │                    │             │
    │◄─────────────────────┤ │                    │             │
    │ status: "processing"│ │                    │             │
    │                      │ │                    │             │
    ├─ GET /status/abc-123│ │                    │             │
    │◄─────────────────────┤ │                    │             │
    │ status: "complete"   │ │                    │             │
    │ result: { ... }      │ │                    │             │
    │                      │ │                    │             │
    │  DISPLAY RESULTS     │ │                    │             │
    │◄─────────────────────┤ │                    │             │
    │                      │ │                    │             │
```

---

## Frontend Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND ARCHITECTURE                                │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────────┐
                              │   REACT 19      │
                              │   (Components)  │
                              └────────┬────────┘
                                       │
           ┌───────────────────────────┼───────────────────────────┐
           │                           │                           │
           ▼                           ▼                           ▼
    ┌─────────────┐            ┌─────────────┐            ┌─────────────┐
    │   Analyze   │            │    Chat     │            │   History   │
    │    Tab      │            │    Tab      │            │    Tab      │
    │             │            │             │            │             │
    │ • URL input │            │ • Message   │            │ • Past      │
    │ • PDF upload│            │   list      │            │   analyses  │
    │ • Text area │            │ • Input box  │            │ • Results   │
    │ • Results   │            │ • Typing     │            │             │
    │   display  │            │   indicator │            │             │
    └─────────────┘            └─────────────┘            └─────────────┘
           │                           │                           │
           └───────────────────────────┼───────────────────────────┘
                                       │
                                       ▼
                              ┌─────────────────┐
                              │   API LAYER     │
                              │   (fetch)       │
                              └────────┬────────┘
                                       │
                                       ▼
                              ┌─────────────────┐
                              │  FASTAPI BACKEND│
                              │  (Port 8000)    │
                              └─────────────────┘
```

### Technology Stack

| Component | Technology | Version |
|-----------|------------|---------|
| **Framework** | React | 19.x |
| **Build Tool** | Vite | 8.x |
| **Animations** | Framer Motion | 12.x |
| **Icons** | Lucide React | 1.6.x |
| **Markdown** | Marked | 17.x |

### Key Features

- **Tabbed Interface** — Analyze | Chat | History
- **Real-time Feedback** — Loading overlays, skeleton loaders
- **Responsive Design** — Works on mobile and desktop
- **Dark Theme** — Modern, eye-friendly UI
- **Markdown Rendering** — Chat responses rendered as Markdown

---

## Why This Architecture Works

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ARCHITECTURE STRENGTHS                                    │
└─────────────────────────────────────────────────────────────────────────────┘

 ┌─────────────────────────────────────────────────────────────────────────┐
 │ 1. ASYNC-FIRST DESIGN                                                    │
 │                                                                          │
 │   FastAPI + asyncpg + httpx = Non-blocking I/O                         │
 │                                                                          │
 │   ✓ Handles 1000s of concurrent requests                                │
 │   ✓ No thread blocking on LLM API calls                                 │
 │   ✓ Efficient resource utilization                                     │
 └─────────────────────────────────────────────────────────────────────────┘

 ┌─────────────────────────────────────────────────────────────────────────┐
 │ 2. COST-OPTIMIZED NLP                                                   │
 │                                                                          │
 │   spaCy regex filter → Only ~25% of clauses go to LLM                  │
 │                                                                          │
 │   ✓ 75% savings on LLM API costs                                       │
 │   ✓ Faster overall processing                                           │
 │   ✓ Pre-detected features improve LLM accuracy                          │
 └─────────────────────────────────────────────────────────────────────────┘

 ┌─────────────────────────────────────────────────────────────────────────┐
 │ 3. RELIABLE LLM INTEGRATION                                             │
 │                                                                          │
 │   Cerebras/Groq round-robin → Ollama (fallback) → Per-clause check      │
 │                                                                          │
 │   ✓ High availability with multi-provider failover                      │
 │   ✓ High throughput via batch processing                                │
 │   ✓ Offline capability / zero cost option via Ollama local fallback     │
 └─────────────────────────────────────────────────────────────────────────┘

 ┌─────────────────────────────────────────────────────────────────────────┐
 │ 4. FLEXIBLE DATA STORAGE                                                │
 │                                                                          │
 │   PostgreSQL + JSONB                                                     │
 │                                                                          │
 │   ✓ ACID compliance for transactions                                     │
 │   ✓ JSONB for flexible schema (analysis results)                        │
 │   ✓ Async driver for performance                                        │
 └─────────────────────────────────────────────────────────────────────────┘

 ┌─────────────────────────────────────────────────────────────────────────┐
 │ 5. SCALABLE AUTHENTICATION                                              │
 │                                                                          │
 │   JWT + bcrypt                                                           │
 │                                                                          │
 │   ✓ Stateless (no session storage)                                      │
 │   ✓ Password security (bcrypt + SHA256 pre-hash)                       │
 │   ✓ Optional auth (anonymous analysis supported)                        │
 └─────────────────────────────────────────────────────────────────────────┘

 ┌─────────────────────────────────────────────────────────────────────────┐
 │ 6. USER EXPERIENCE                                                      │
 │                                                                          │
 │   Async jobs + polling + cancellation                                   │
 │                                                                          │
 │   ✓ No request timeouts                                                  │
 │   ✓ Real-time status updates                                             │
 │   ✓ User can cancel long jobs                                            │
 └─────────────────────────────────────────────────────────────────────────┘
```

---

## Technology Summary

| Layer | Technology | Why |
|-------|------------|-----|
| **Web Framework** | FastAPI + Uvicorn | High-performance async API |
| **Database** | PostgreSQL + SQLAlchemy async + pgvector | Robust + scalable + vector search |
| **Embeddings** | Google Gemini API (gemini-embedding-001) | State-of-the-art semantic representations |
| **Auth** | JWT + bcrypt | Stateless + secure |
| **NLP** | spaCy (en_core_web_sm) | Sentence segmentation, linguistic features |
| **LLM (Primary)** | Cerebras + Groq APIs (Llama 3.1 8B) | Fast inference, JSON mode, round-robin load balancing |
| **LLM (Fallback)** | Ollama (phi3.5, qwen3.5) | Local, offline capable |
| **URL / PDF Extraction**| BeautifulSoup4 + lxml / pdfplumber | Robust HTML and Pure Python PDF parsing |
| **Frontend** | React 19 + Vite + Framer Motion | Modern, dynamic component-based UI |
| **Deployment** | Railway (Docker) | Managed production environment |

---

<p align="center">
  <strong>Built with FastAPI • spaCy • Cerebras • Groq • pgvector • React • Railway</strong>
</p>
