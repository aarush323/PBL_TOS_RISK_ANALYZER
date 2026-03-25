import logging
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)

import asyncio
import threading
import uuid
import os
import shutil

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from extraction.input_handler import handle_input
from analysis.analyzer import analyze_document
from chat.chatbot import chat_with_document

from db.connection import engine, get_db
from db.models import Base
from db import crud

logger = logging.getLogger(__name__)

app = FastAPI(title="ToS Analyzer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# DB startup – create tables if they don't exist
# ---------------------------------------------------------------------------

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables ready.")


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class TextInput(BaseModel):
    input_type: str   # "url" or "text"
    content: str

class AnalyzeInput(BaseModel):
    input_type: str
    content: str

class ChatMessage(BaseModel):
    role: str       # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    session_id: str
    message: str
    history: list[ChatMessage] = []


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Extraction
# ---------------------------------------------------------------------------

@app.post("/extract")
def extract_text(body: TextInput):
    try:
        result = handle_input(body.input_type, body.content)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")


@app.post("/extract/pdf")
def extract_pdf(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    temp_path = f"/tmp/{file.filename}"
    try:
        with open(temp_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        result = handle_input("pdf", temp_path)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF extraction failed: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


# ---------------------------------------------------------------------------
# Async analysis (persisted to PostgreSQL)
# ---------------------------------------------------------------------------

def _run_analysis_background(job_id: str, extraction: dict):
    """Run analyze_document in a background thread then persist result."""
    async def _persist(job_id, extraction):
        from db.connection import AsyncSessionLocal
        async with AsyncSessionLocal() as db:
            try:
                result = await asyncio.to_thread(analyze_document, extraction)
                await crud.update_analysis_complete(db, job_id, result)
                logger.info(f"Job {job_id} complete, saved to DB.")
            except Exception as e:
                logger.error(f"Job {job_id} failed: {e}")
                await crud.update_analysis_failed(db, job_id, str(e))

    asyncio.run(_persist(job_id, extraction))


@app.post("/analyze/async")
async def analyze_async(body: AnalyzeInput, db: AsyncSession = Depends(get_db)):
    try:
        extraction = handle_input(body.input_type, body.content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")

    job_id = str(uuid.uuid4())

    # Persist job row immediately
    await crud.create_analysis_job(
        db, job_id,
        source=body.content[:500],
        source_type=body.input_type,
    )

    # Also store document for chat (persisted below in /chat/store)
    async with db.begin_nested():
        from db.connection import AsyncSessionLocal
        pass  # chat session created separately via /chat/store

    # Background thread to run analysis + save result
    thread = threading.Thread(
        target=_run_analysis_background,
        args=(job_id, extraction),
        daemon=True,
    )
    thread.start()

    return {
        "job_id": job_id,
        "status": "processing",
        "extraction": extraction,
    }


@app.get("/analyze/status/{job_id}")
async def analyze_status(job_id: str, db: AsyncSession = Depends(get_db)):
    job = await crud.get_analysis_job(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status.value == "complete":
        return {"status": "complete", "result": job.result}
    if job.status.value == "failed":
        return {"status": "failed", "error": job.error}
    return {"status": "processing"}


@app.get("/analyses")
async def list_analyses(limit: int = 50, db: AsyncSession = Depends(get_db)):
    """List the most recent analyses (newest first)."""
    jobs = await crud.list_analyses(db, limit=limit)
    return [
        {
            "job_id": j.job_id,
            "source": j.source,
            "source_type": j.source_type,
            "status": j.status.value,
            "overall_risk": (j.result or {}).get("overall_risk"),
            "created_at": j.created_at.isoformat(),
        }
        for j in jobs
    ]


# ---------------------------------------------------------------------------
# Document Chatbot (persisted to PostgreSQL)
# ---------------------------------------------------------------------------

@app.post("/chat/store")
async def store_document(body: dict, db: AsyncSession = Depends(get_db)):
    session_id = body.get("session_id")
    document_text = body.get("document_text", "")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id is required")
    if not document_text.strip():
        raise HTTPException(status_code=400, detail="document_text is required")

    # Upsert: if session already exists (e.g. from previous load) just overwrite
    existing = await crud.get_chat_session(db, session_id)
    if existing:
        existing.document_text = document_text
        await db.commit()
    else:
        await crud.create_chat_session(db, session_id, document_text)

    return {"status": "stored", "session_id": session_id, "char_count": len(document_text)}


@app.post("/chat")
async def chat(body: ChatRequest, db: AsyncSession = Depends(get_db)):
    session = await crud.get_chat_session(db, body.session_id)
    if not session:
        raise HTTPException(
            status_code=404,
            detail="No document found for this session. Extract a document first.",
        )

    # Build conversation from DB history + incoming request
    db_history = await crud.get_chat_history(db, body.session_id)
    conversation = [{"role": m.role, "content": m.content} for m in db_history]
    conversation.append({"role": "user", "content": body.message})

    try:
        reply = await asyncio.to_thread(chat_with_document, session.document_text, conversation)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")

    # Persist both turns
    await crud.add_chat_message(db, body.session_id, "user", body.message)
    await crud.add_chat_message(db, body.session_id, "assistant", reply)

    return {"reply": reply, "session_id": body.session_id}


@app.get("/chat/{session_id}/history")
async def chat_history(session_id: str, db: AsyncSession = Depends(get_db)):
    """Return full chat history for a session."""
    session = await crud.get_chat_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    msgs = await crud.get_chat_history(db, session_id)
    return [{"role": m.role, "content": m.content, "created_at": m.created_at.isoformat()}
            for m in msgs]
