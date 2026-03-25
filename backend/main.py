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

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from jose import JWTError

from extraction.input_handler import handle_input
from analysis.analyzer import analyze_document
from chat.chatbot import chat_with_document

from db.connection import engine, get_db
from db.models import Base, User
from db import crud
from auth.security import hash_password, verify_password, create_access_token
from auth.dependencies import get_current_user, get_optional_user

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
# Pydantic schemas
# ---------------------------------------------------------------------------

class TextInput(BaseModel):
    input_type: str
    content: str

class AnalyzeInput(BaseModel):
    input_type: str
    content: str

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    session_id: str
    message: str
    history: list[ChatMessage] = []

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserResponse(BaseModel):
    id: str
    email: str
    created_at: str


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/stats/cerebras")
def get_cerebras_stats():
    from analysis.classifier import cerebras_request_count
    return {"cerebras_total_requests": cerebras_request_count}


# ---------------------------------------------------------------------------
# Auth routes
# ---------------------------------------------------------------------------

@app.post("/auth/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = await crud.get_user_by_email(db, body.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = await crud.create_user(db, body.email, hash_password(body.password))
    token = create_access_token(user.id, user.email)
    return {"access_token": token, "token_type": "bearer"}


@app.post("/auth/login", response_model=TokenResponse)
async def login(
    form: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    user = await crud.get_user_by_email(db, form.username)  # username = email
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token(user.id, user.email)
    return {"access_token": token, "token_type": "bearer"}


@app.get("/auth/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "created_at": current_user.created_at.isoformat(),
    }


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
        from analysis.cancellation import clear_job
        async with AsyncSessionLocal() as db:
            try:
                result = await asyncio.to_thread(analyze_document, extraction, job_id)
                await crud.update_analysis_complete(db, job_id, result)
                logger.info(f"Job {job_id} complete, saved to DB.")
            except Exception as e:
                logger.error(f"Job {job_id} failed: {e}")
                await crud.update_analysis_failed(db, job_id, str(e))
            finally:
                clear_job(job_id)

    asyncio.run(_persist(job_id, extraction))


@app.post("/analyze/async")
async def analyze_async(
    body: AnalyzeInput,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    try:
        extraction = handle_input(body.input_type, body.content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")

    job_id = str(uuid.uuid4())
    user_id = current_user.id if current_user else None

    await crud.create_analysis_job(
        db, job_id,
        source=body.content[:500],
        source_type=body.input_type,
        user_id=user_id,
    )

    thread = threading.Thread(
        target=_run_analysis_background,
        args=(job_id, extraction),
        daemon=True,
    )
    thread.start()

    return {"job_id": job_id, "status": "processing", "extraction": extraction}


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


@app.post("/analyze/stop/{job_id}")
async def stop_analysis(job_id: str, db: AsyncSession = Depends(get_db)):
    from analysis.cancellation import cancel_job
    cancel_job(job_id)
    job = await crud.get_analysis_job(db, job_id)
    if job and job.status.value == "processing":
        await crud.update_analysis_failed(db, job_id, "Cancelled by user")
    return {"status": "cancelled", "job_id": job_id}


@app.get("/analyses")
async def list_analyses(
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),   # auth required
):
    """List analyses for the currently logged-in user."""
    jobs = await crud.list_analyses(db, limit=limit, user_id=current_user.id)
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
async def store_document(
    body: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    session_id = body.get("session_id")
    document_text = body.get("document_text", "")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id is required")
    if not document_text.strip():
        raise HTTPException(status_code=400, detail="document_text is required")

    user_id = current_user.id if current_user else None
    existing = await crud.get_chat_session(db, session_id)
    if existing:
        existing.document_text = document_text
        await db.commit()
    else:
        await crud.create_chat_session(db, session_id, document_text, user_id=user_id)

    return {"status": "stored", "session_id": session_id, "char_count": len(document_text)}


@app.post("/chat")
async def chat(body: ChatRequest, db: AsyncSession = Depends(get_db)):
    session = await crud.get_chat_session(db, body.session_id)
    if not session:
        raise HTTPException(
            status_code=404,
            detail="No document found for this session. Extract a document first.",
        )

    db_history = await crud.get_chat_history(db, body.session_id)
    conversation = [{"role": m.role, "content": m.content} for m in db_history]
    conversation.append({"role": "user", "content": body.message})

    try:
        reply = await asyncio.to_thread(chat_with_document, session.document_text, conversation)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")

    await crud.add_chat_message(db, body.session_id, "user", body.message)
    await crud.add_chat_message(db, body.session_id, "assistant", reply)

    return {"reply": reply, "session_id": body.session_id}


@app.get("/chat/{session_id}/history")
async def chat_history(session_id: str, db: AsyncSession = Depends(get_db)):
    session = await crud.get_chat_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    msgs = await crud.get_chat_history(db, session_id)
    return [
        {"role": m.role, "content": m.content, "created_at": m.created_at.isoformat()}
        for m in msgs
    ]
