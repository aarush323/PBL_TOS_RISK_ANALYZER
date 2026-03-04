# ToS Risk Analyzer

AI-powered Terms of Service analysis tool that extracts, classifies, and explains legal risks in ToS/Privacy Policy documents.

## Features

- **Multi-format extraction** — URL, raw text, PDF upload
- **NLP pre-filtering** — spaCy-based risk signal detection (modal verbs, negation, keyword matching, NER)
- **LLM risk classification** — Cerebras API (llama3.1-8b) with Ollama local fallback
- **5 risk categories** — Privacy, Legal, User Rights, Security, Financial
- **Batched + parallel processing** — 5 clauses/batch, 3 concurrent workers
- **Async analysis** — Returns extraction instantly, LLM runs in background
- **Confidence scoring** — High/Medium/Low per clause with plain-English explanations

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | FastAPI, Uvicorn |
| NLP | spaCy (en_core_web_sm) |
| LLM | Cerebras API + Ollama (fallback) |
| Extraction | BeautifulSoup4, lxml, pdfplumber |
| Frontend | Vanilla HTML/CSS/JS |

## Setup

```bash
# 1. Clone
git clone <repo-url>
cd PBL

# 2. Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# 3. Install dependencies
pip install -r backend/requirements.txt
python -m spacy download en_core_web_sm

# 4. Configure API key
cp backend/.env.example backend/.env
# Edit backend/.env and add your Cerebras API key

# 5. Run
cd backend
uvicorn main:app --reload
```

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/health` | Health check |
| `POST` | `/extract` | Extract text from URL/text |
| `POST` | `/extract/pdf` | Extract text from PDF |
| `POST` | `/analyze` | Synchronous full analysis |
| `POST` | `/analyze/async` | Async analysis (returns job_id) |
| `GET` | `/analyze/status/{job_id}` | Poll async result |

## Project Structure

```
PBL/
├── backend/
│   ├── main.py                  # FastAPI app + routes
│   ├── requirements.txt
│   ├── .env                     # API keys (not committed)
│   ├── extraction/
│   │   ├── input_handler.py     # Routes input by type
│   │   ├── url_extractor.py     # HTML fetch + parse
│   │   ├── pdf_extractor.py     # PDF text extraction
│   │   └── text_cleaner.py      # Text normalization
│   ├── analysis/
│   │   ├── segmenter.py         # Paragraph → clause splitting
│   │   ├── nlp_features.py      # spaCy feature extraction
│   │   ├── classifier.py        # LLM classification (batch + single)
│   │   └── analyzer.py          # Pipeline orchestrator
│   └── tests/
│       ├── test_extraction.py
│       └── test_analysis.py
└── frontend/
    └── index.html               # Two-step UI: Extract → Analyze
```
