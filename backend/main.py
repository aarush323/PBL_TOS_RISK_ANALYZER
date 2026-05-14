import logging
import os
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s"
)

import asyncio
import uuid
import shutil

from fastapi import (
    FastAPI,
    UploadFile,
    File,
    HTTPException,
    Depends,
    status,
    BackgroundTasks,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession

from extraction.input_handler import handle_input
from analysis.analyzer import analyze_document
from analysis.summary_generator import generate_executive_summary
from analysis.report_generator import generate_full_report
from analysis.cancellation import cancel_job, clear_job
from chat.chatbot import chat_with_document, chat_with_document_rag
from chat.indexer import index_document, get_index_status, reindex_document
from chat.retriever import (
    retrieve_for_session,
    get_clauses_by_category,
    get_clause_by_id,
    get_risks_summary,
)

from db.connection import engine, AsyncSessionLocal, get_db
from db.models import Base, User
from db import crud
from auth.security import hash_password, verify_password, create_access_token
from auth.dependencies import get_current_user, get_optional_user
import compare_service

logger = logging.getLogger(__name__)

ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

app = FastAPI(title="ToS Analyzer API")

if ENVIRONMENT == "production":
    cors_origins = [FRONTEND_URL]
else:
    cors_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def validate_environment():
    if ENVIRONMENT == "production":
        required_vars = [
            "DATABASE_URL",
            "SECRET_KEY",
            "CEREBRAS_API_KEY",
            "FRONTEND_URL",
        ]
        missing = [var for var in required_vars if not os.getenv(var)]
        if missing:
            # We allow it to continue if a default exists, but we warn
            for var in missing:
                if globals().get(var):
                    logger.warning(
                        f"Using default value for {var} because it is not set in the environment."
                    )
                else:
                    raise RuntimeError(
                        f"CRITICAL: Missing required environment variables: {', '.join(missing)}. "
                        "Please set these in your deployment settings (e.g., Railway Dashboard)."
                    )
        logger.info("Environment validation complete.")
    else:
        logger.info(f"Running in {ENVIRONMENT} mode - CORS allowing localhost origins.")


validate_environment()


@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables ready.")


class AnalyzeInput(BaseModel):
    input_type: str
    content: str
    source_label: str | None = None


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    session_id: str
    message: str
    history: list[ChatMessage] = []
    comparison_session_id: str | None = None


COMPARISON_PATTERNS = [
    "compare",
    "comparison",
    "vs",
    "versus",
    "difference between",
    "diff between",
    "differences between",
    "which is better",
    "which is worse",
    "compare with",
    "compare to",
]


def match_document_by_name(name: str, sources: list[str]) -> int | None:
    """Match a document name against stored source URLs. Returns index or None."""
    if not name or not sources:
        return None
    name_lower = name.lower().strip()
    for idx, source in enumerate(sources):
        if not source:
            continue
        source_lower = source.lower()
        domain = (
            source_lower.split("//")[-1].split("/")[0]
            if "//" in source_lower
            else source_lower
        )
        if name_lower in domain or domain.split(".")[0] == name_lower:
            return idx
    return None


STOP_WORDS = {
    "the",
    "a",
    "an",
    "of",
    "and",
    "to",
    "in",
    "for",
    "on",
    "with",
    "by",
    "privacy",
    "policy",
    "policies",
    "terms",
    "service",
    "conditions",
    "between",
    "vs",
    "versus",
    "compare",
    "comparison",
    "difference",
    "user",
    "data",
    "collection",
    "usage",
    "information",
    "legal",
}


def extract_comparison_targets(message: str) -> tuple[str | None, str | None]:
    """Extract two document names from comparison message."""
    msg_lower = message.lower()

    for pattern in COMPARISON_PATTERNS:
        if pattern in msg_lower:
            remaining = msg_lower.split(pattern)[-1].strip()

            keywords = ["prev", "previous", "last", "two", "last two", "previous two"]
            if any(kw in remaining for kw in ["prev", "previous", "last"]) and (
                "two" in remaining or "2" in remaining
            ):
                return ("__recent_two__", None)

            words = remaining.split()
            meaningful_words = [
                w.strip(" ,;:!?.'\"")
                for w in words
                if w.strip(" ,;:!?.'\"") not in STOP_WORDS
                and len(w.strip(" ,;:!?.'\"")) > 1
            ]

            if len(meaningful_words) >= 2:
                return (meaningful_words[0], meaningful_words[1])
            elif len(meaningful_words) == 1:
                return (meaningful_words[0], None)

            if len(words) >= 2:
                filtered = [w for w in words if w.lower() not in STOP_WORDS]
                if len(filtered) >= 2:
                    return (filtered[0], filtered[1])
                elif len(filtered) == 1:
                    return (filtered[0], None)

    return (None, None)


def extract_document_names_from_message(message: str) -> list[str]:
    """Extract all potential document names from a message."""
    msg_lower = message.lower()
    words = msg_lower.split()

    potential_docs = []
    for word in words:
        clean = word.strip(" ,;:!?.'\"")
        if clean and len(clean) > 2 and clean not in STOP_WORDS:
            potential_docs.append(clean)

    return potential_docs


class CompareRequest(BaseModel):
    session_id_a: str
    session_id_b: str
    question: str = "Compare the risk profiles of both documents"
    history: list[ChatMessage] = []


class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class VerificationResponse(BaseModel):
    message: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    created_at: str


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/stats/cerebras")
def get_cerebras_stats():
    from analysis.classifier import cerebras_request_count

    return {"cerebras_total_requests": cerebras_request_count}


@app.post(
    "/auth/register",
    response_model=VerificationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    username = body.username.strip()
    if len(username) < 3 or len(username) > 30:
        raise HTTPException(
            status_code=400, detail="Username must be 3-30 characters long"
        )

    existing = await crud.get_user_by_email(db, body.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    existing_username = await crud.get_user_by_username(db, username)
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already taken")

    user = await crud.create_user(
        db, username, body.email, hash_password(body.password)
    )

    return {
        "message": f"Welcome to Jurist AI, {user.username}! Your account is active and ready to use.",
    }


@app.post("/auth/login", response_model=TokenResponse)
async def login(
    form: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    user = await crud.get_user_by_email(db, form.username)
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
        "username": current_user.username or current_user.email.split("@")[0],
        "email": current_user.email,
        "created_at": current_user.created_at.isoformat(),
    }


@app.post("/extract")
def extract_text(body: AnalyzeInput):
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
    safe_name = f"{uuid.uuid4()}_{file.filename}"
    temp_path = f"/tmp/{safe_name}"
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


async def _run_analysis_background(job_id: str, extraction: dict):
    async with AsyncSessionLocal() as db:
        try:
            result = await asyncio.to_thread(analyze_document, extraction, job_id)
            summary = await asyncio.to_thread(generate_executive_summary, result)
            result["professional_summary"] = summary.get("professional_summary", "")
            result["executive_summary"] = summary.get("executive_summary", "")
            result["key_findings"] = summary.get("key_findings", [])
            result["risk_verdict"] = summary.get("risk_verdict", result.get("overall_risk", "Low"))
            result["confidence_level"] = summary.get("confidence_level", "Medium")
            result["action_required"] = summary.get("action_required", False)
            result["top_concern"] = summary.get("top_concern", "")
            result["recommendation"] = summary.get("recommendation", "")
            result["safety_score"] = _calc_score_from_result(result)
            await crud.update_analysis_complete(db, job_id, result)
            logger.info(f"Job {job_id} complete, saved to DB.")
        except Exception as e:
            logger.error(f"Job {job_id} failed: {e}")
            await crud.update_analysis_failed(db, job_id, str(e))
        finally:
            clear_job(job_id)


async def _index_document_background(session_id: str, document_text: str):
    try:
        # Pass db=None so index_document orchestrates its own short-lived DB connection
        # AFTER it spends 3.5 minutes generating embeddings via Gemini API.
        clause_count = await index_document(session_id, document_text, db=None)
        logger.info(f"Session {session_id} indexed with {clause_count} clauses.")
    except Exception as e:
        logger.error(f"Indexing failed for session {session_id}: {e}")
        async with AsyncSessionLocal() as db:
            session = await crud.get_chat_session(db, session_id)
            if session:
                session.is_indexed = False
                session.indexed_at = None
                await db.commit()


@app.post("/analyze/async")
async def analyze_async(
    body: AnalyzeInput,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    try:
        extraction = handle_input(body.input_type, body.content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        if body.input_type == "url":
            job_id = str(uuid.uuid4())
            user_id = current_user.id if current_user else None
            db_source = body.source_label if body.source_label else body.content

            await crud.create_analysis_job(
                db,
                job_id,
                source=db_source,
                source_type=body.input_type,
                user_id=user_id,
            )

            mock_result = {
                "overall_risk": "High",
                "risky_clause_count": 1,
                "total_clauses": 1,
                "clauses": [
                    {
                        "id": 0,
                        "text": "The target website actively blocked automated extraction (e.g., via 403 Forbidden, CAPTCHA, or anti-bot measures).",
                        "explanation": f"When a company blocks automated analysis of its legal terms, it reduces transparency and makes it harder for users to independently verify their rights. Error details: {str(e)}",
                        "is_risky": True,
                        "risk_categories": ["Transparency Risk", "Accessibility Risk"],
                        "confidence": "High",
                        "skipped_llm": True,
                    }
                ],
            }
            await crud.update_analysis_complete(db, job_id, mock_result)
            return {
                "job_id": job_id,
                "status": "processing",
                "extraction": {"cleaned_text": "Content blocked by host."},
            }
        else:
            raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")

    job_id = str(uuid.uuid4())
    user_id = current_user.id if current_user else None

    db_source = body.source_label if body.source_label else body.content

    await crud.create_analysis_job(
        db,
        job_id,
        source=db_source,
        source_type=body.input_type,
        user_id=user_id,
    )

    background_tasks.add_task(_run_analysis_background, job_id, extraction)

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


@app.get("/analyze/summary/{job_id}")
async def get_analysis_summary(job_id: str, db: AsyncSession = Depends(get_db)):
    job = await crud.get_analysis_job(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status.value != "complete":
        raise HTTPException(status_code=400, detail="Analysis not yet complete")
    result = job.result or {}
    return {
        "professional_summary": result.get("professional_summary", ""),
        "executive_summary": result.get("executive_summary", ""),
        "key_findings": result.get("key_findings", []),
        "risk_verdict": result.get("risk_verdict", result.get("overall_risk", "Low")),
        "confidence_level": result.get("confidence_level", "Medium"),
        "action_required": result.get("action_required", False),
        "top_concern": result.get("top_concern", ""),
        "recommendation": result.get("recommendation", ""),
    }


@app.post("/analyze/stop/{job_id}")
async def stop_analysis(job_id: str, db: AsyncSession = Depends(get_db)):
    cancel_job(job_id)
    job = await crud.get_analysis_job(db, job_id)
    if job and job.status.value == "processing":
        await crud.update_analysis_failed(db, job_id, "Cancelled by user")
    return {"status": "cancelled", "job_id": job_id}


@app.get("/analyses")
async def list_analyses(
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    jobs = await crud.list_analyses(db, limit=limit, user_id=current_user.id)
    return [
        {
            "job_id": j.job_id,
            "source": j.source,
            "source_type": j.source_type,
            "status": j.status.value,
            "overall_risk": (j.result or {}).get("overall_risk"),
            "has_result": j.result is not None,
            "created_at": j.created_at.isoformat(),
        }
        for j in jobs
    ]


@app.get("/analyses/{job_id}")
async def get_analysis(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    job = await crud.get_analysis_job(db, job_id)
    if not job or job.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Analysis not found")

    return {
        "job_id": job.job_id,
        "status": job.status.value,
        "source": job.source,
        "source_type": job.source_type,
        "created_at": job.created_at.isoformat(),
        "result": job.result,
    }


@app.post("/chat/store")
async def store_document(
    body: dict,
    background_tasks: BackgroundTasks,
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
        if existing.is_indexed and len(existing.document_text or '') >= len(document_text):
            return {
                "status": "already_indexed",
                "session_id": session_id,
                "char_count": len(existing.document_text),
                "indexing": "skipped",
            }
        existing.document_text = document_text
        existing.is_indexed = False
        await db.commit()
    else:
        await crud.create_chat_session(db, session_id, document_text, user_id=user_id)

    background_tasks.add_task(_index_document_background, session_id, document_text)

    return {
        "status": "stored",
        "session_id": session_id,
        "char_count": len(document_text),
        "indexing": "started",
    }


@app.post("/chat/restore/{job_id}")
async def restore_chat_session(
    job_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    """Restore a chat session from a completed analysis by reconstructing document text from clauses."""
    job = await crud.get_analysis_job(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Analysis not found")
    if job.status.value != "complete":
        raise HTTPException(status_code=400, detail="Analysis not yet complete")

    result = job.result or {}
    clauses = result.get("clauses", [])
    document_text = " ".join(c.get("text", "") for c in clauses if c.get("text"))
    if not document_text.strip():
        document_text = result.get("source", job.source or "Loaded from saved analysis.")

    user_id = current_user.id if current_user else None
    existing = await crud.get_chat_session(db, job_id)
    if existing:
        if existing.is_indexed:
            return {
                "status": "restored",
                "session_id": job_id,
                "indexing": "already_indexed",
            }
        existing.document_text = document_text
        await db.commit()
    else:
        await crud.create_chat_session(db, job_id, document_text, user_id=user_id)

    background_tasks.add_task(_index_document_background, job_id, document_text)

    return {
        "status": "restored",
        "session_id": job_id,
        "char_count": len(document_text),
        "indexing": "started",
    }


@app.post("/chat")
async def chat(
    body: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    message_lower = body.message.lower()
    is_comparison = any(pattern in message_lower for pattern in COMPARISON_PATTERNS)

    if is_comparison:
        doc1_name, doc2_name = extract_comparison_targets(body.message)

        if doc1_name == "__recent_two__":
            user_analyses = await crud.list_analyses(
                db, limit=50, user_id=current_user.id if current_user else None
            )
            if len(user_analyses) >= 2:
                session_a = user_analyses[-2].job_id
                session_b = user_analyses[-1].job_id
                return await _handle_comparison(
                    body,
                    session_a,
                    session_b,
                    db,
                    current_user.id if current_user else None,
                )
            else:
                return {
                    "reply": "You need at least 2 documents to compare. Please analyze more documents first.",
                    "comparison_needed": True,
                }

        if not doc1_name:
            potential_docs = extract_document_names_from_message(body.message)
            if len(potential_docs) >= 2:
                doc1_name = potential_docs[0]
                doc2_name = potential_docs[1]
            elif len(potential_docs) == 1:
                doc1_name = potential_docs[0]
                doc2_name = None
            else:
                return {
                    "reply": "Please specify which documents to compare. For example: 'compare discord and zoom' or 'compare prev 2 docs'",
                    "comparison_needed": True,
                }

        user_analyses = await crud.list_analyses(
            db, limit=50, user_id=current_user.id if current_user else None
        )
        sources = [a.source for a in user_analyses if a.source]
        job_ids = [a.job_id for a in user_analyses if a.job_id]

        idx1 = (
            match_document_by_name(doc1_name, sources)
            if sources and doc1_name
            else None
        )
        idx2 = (
            match_document_by_name(doc2_name, sources)
            if doc2_name and sources
            else None
        )

        if idx1 is None and idx2 is None:
            potential_matches = []
            for doc_name in [doc1_name, doc2_name]:
                if not doc_name:
                    continue
                for i, source in enumerate(sources):
                    if source and doc_name in source.lower():
                        potential_matches.append(
                            (source.split("//")[-1].split("/")[0], job_ids[i])
                        )
                        break

            if potential_matches:
                session_a = potential_matches[0][1]
                session_b = (
                    potential_matches[1][1]
                    if len(potential_matches) > 1
                    else body.session_id
                )
                return await _handle_comparison(
                    body,
                    session_a,
                    session_b,
                    db,
                    current_user.id if current_user else None,
                )

            options = [
                {
                    "name": s.split("//")[-1].split("/")[0] if s else f"Doc {i}",
                    "index": i,
                }
                for i, s in enumerate(sources[:6])
            ]
            return {
                "reply": f"Couldn't find documents matching '{doc1_name}'{f' and {doc2_name}' if doc2_name else ''}. Did you mean?",
                "comparison_options": options,
                "comparison_needed": True,
            }

        if idx1 is not None:
            session_a = job_ids[idx1]
            if idx2 is not None:
                session_b = job_ids[idx2]
            else:
                session_b = body.session_id
            return await _handle_comparison(body, session_a, session_b, db)

        return {
            "reply": "Please specify both documents to compare. For example: 'compare discord and zoom'",
            "comparison_needed": True,
        }

    session = await crud.get_chat_session(db, body.session_id)
    if not session:
        raise HTTPException(
            status_code=404,
            detail="No document found for this session. Extract a document first.",
        )

    db_history = await crud.get_chat_history(db, body.session_id)
    conversation = [{"role": m.role, "content": m.content} for m in db_history]

    logger.info(f"[CHAT] Query: '{body.message[:100]}' | session={body.session_id}")
    logger.info(f"[CHAT] RAG indexed={session.is_indexed}")

    clauses = []
    use_rag = session.is_indexed

    if use_rag:
        try:
            clauses = await retrieve_for_session(
                body.message, body.session_id, db, top_k=5
            )
            logger.info(f"[RAG] Retrieved {len(clauses)} clauses for query")
            for i, c in enumerate(clauses[:3]):
                logger.info(f"[RAG]   clause[{i}]: {c.get('text', '')[:80]}...")
        except Exception as e:
            logger.warning(f"[RAG] Retrieval FAILED, falling back to full-doc: {e}")
            use_rag = False

    if not use_rag:
        logger.info("[CHAT] Using full-document context (RAG disabled)")

    try:
        if use_rag:
            reply = await chat_with_document_rag(
                body.message, session.document_text, conversation, clauses
            )
        else:
            reply = await chat_with_document(session.document_text, conversation)
        logger.info(f"[CHAT] Response generated via {'RAG' if use_rag else 'full-doc'} ({len(reply)} chars)")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")

    await crud.add_chat_message(db, body.session_id, "user", body.message)
    await crud.add_chat_message(db, body.session_id, "assistant", reply)

    return {
        "reply": reply,
        "session_id": body.session_id,
        "rag_enabled": use_rag,
        "clauses_retrieved": len(clauses),
    }


async def _handle_comparison(
    body: ChatRequest,
    session_id_a: str,
    session_id_b: str,
    db: AsyncSession,
    user_id: str | None = None,
) -> dict:
    session_a = await crud.get_chat_session(db, session_id_a)
    session_b = await crud.get_chat_session(db, session_id_b)

    if not session_a or not session_b:
        return {
            "reply": "One of the comparison documents is not available.",
            "session_id": body.session_id,
            "comparison_needed": True,
        }



    try:
        result = await compare_service.run(session_id_a, session_id_b, user_id, db)

        source_a = result.get("source_a", session_id_a[:8])
        source_b = result.get("source_b", session_id_b[:8])
        overall = result.get("overall_riskier", "Similar")

        if overall == "A":
            verdict = f"{source_a} is riskier"
        elif overall == "B":
            verdict = f"{source_b} is riskier"
        else:
            verdict = "Both documents have similar risk levels"

        reply = f"I compared **{source_a}** and **{source_b}**. {verdict}. "

        categories_compared = result.get("categories_compared", 0)
        only_a = result.get("categories_only_in_a", [])
        only_b = result.get("categories_only_in_b", [])

        if only_a:
            reply += f"Categories only in {source_a}: {', '.join(only_a)}. "
        if only_b:
            reply += f"Categories only in {source_b}: {', '.join(only_b)}. "

        reply += f"I analyzed {categories_compared} risk categories. Check the detailed comparison for more."

        # Build structured data matching frontend expectations
        analysis_a = await crud.get_analysis_job(db, session_id_a)
        analysis_b = await crud.get_analysis_job(db, session_id_b)
        result_data_a = analysis_a.result if analysis_a else {}
        result_data_b = analysis_b.result if analysis_b else {}

        structured = {
            "doc_a": {
                "label": source_a,
                "risk": result_data_a.get("overall_risk", "Unknown"),
                "risky_clause_count": result_data_a.get("risky_clause_count", 0),
                "total_clauses": result_data_a.get("total_clauses", 0),
                "score": _calc_score_from_result(result_data_a),
            },
            "doc_b": {
                "label": source_b,
                "risk": result_data_b.get("overall_risk", "Unknown"),
                "risky_clause_count": result_data_b.get("risky_clause_count", 0),
                "total_clauses": result_data_b.get("total_clauses", 0),
                "score": _calc_score_from_result(result_data_b),
            },
            "categories": result.get("pairs", []),
            "overall_winner": overall.lower() if overall else "",
            "verdict": verdict,
        }

        return {
            "reply": reply,
            "session_id": body.session_id,
            "comparison_result": True,
            "session_id_a": session_id_a,
            "session_id_b": session_id_b,
            "structured": structured,
        }
    except Exception as e:
        logger.error(f"Comparison failed: {e}")
        return {"reply": f"Comparison failed: {str(e)}", "session_id": body.session_id, "comparison_needed": True}


def _build_comparison_structured(
    result_a: dict, result_b: dict, label_a: str, label_b: str
) -> dict:
    score_a = _calc_score_from_result(result_a)
    score_b = _calc_score_from_result(result_b)

    categories = [
        "Privacy Risk",
        "Legal Risk",
        "Financial Risk",
        "User Rights Risk",
        "Security Risk",
    ]
    cat_comparison = []

    breakdown_a = result_a.get("risk_breakdown", {})
    breakdown_b = result_b.get("risk_breakdown", {})

    for cat in categories:
        val_a = breakdown_a.get(cat, 0)
        val_b = breakdown_b.get(cat, 0)
        if val_a > val_b:
            winner = "a"
        elif val_b > val_a:
            winner = "b"
        else:
            winner = "tie"
        cat_comparison.append(
            {"category": cat, "a_count": val_a, "b_count": val_b, "winner": winner}
        )

    risk_a = result_a.get("overall_risk", "Low")
    risk_b = result_b.get("overall_risk", "Low")
    risk_order = {"High": 3, "Medium": 2, "Low": 1}
    overall_winner = (
        "a"
        if risk_order.get(risk_a, 1) > risk_order.get(risk_b, 1)
        else ("b" if risk_order.get(risk_b, 1) > risk_order.get(risk_a, 1) else "tie")
    )

    diff_pct = abs(score_a - score_b)
    verdict = (
        f"{label_b} is {diff_pct}% safer"
        if score_b > score_a
        else (
            f"{label_a} is {diff_pct}% safer"
            if score_a > score_b
            else "Both have equal risk"
        )
    )

    return {
        "doc_a": {
            "label": label_a,
            "score": score_a,
            "risk": risk_a,
            "risky_count": result_a.get("risky_clause_count", 0),
            "total_clauses": result_a.get("total_clauses", 0),
        },
        "doc_b": {
            "label": label_b,
            "score": score_b,
            "risk": risk_b,
            "risky_count": result_b.get("risky_clause_count", 0),
            "total_clauses": result_b.get("total_clauses", 0),
        },
        "categories": cat_comparison,
        "overall_winner": overall_winner,
        "verdict": verdict,
    }


def _calc_score_from_result(result: dict) -> int:
    if not result:
        return 50
    severity = result.get("total_severity_score", 0)
    risky = result.get("risky_clause_count", 0)
    total = result.get("total_clauses", 1)
    risk = result.get("overall_risk", "Low")

    score = 100
    if severity <= 2:
        score = 95
    elif severity <= 5:
        score = 90 - int((severity - 2) * 6.67)
    elif severity <= 10:
        score = 80 - int((severity - 5) * 4)
    elif severity <= 20:
        score = 60 - int((severity - 10) * 3)
    else:
        score = max(10, 25 - int((severity - 40) * 0.5))

    if risk == "High":
        score = max(10, score - 15)
    elif risk == "Medium":
        score = max(20, score - 8)

    ratio = risky / max(1, total)
    if ratio > 0.5:
        score = max(10, score - 15)
    elif ratio > 0.3:
        score = max(20, score - 8)

    return score


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


@app.get("/chat/{session_id}/index/status")
async def index_status(session_id: str, db: AsyncSession = Depends(get_db)):
    """Check if a session has been indexed for RAG."""
    session = await crud.get_chat_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    status = await get_index_status(session_id, db)
    return status


@app.post("/chat/{session_id}/reindex")
async def reindex(session_id: str, db: AsyncSession = Depends(get_db)):
    """Manually trigger re-indexing for a session."""
    session = await crud.get_chat_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    try:
        clause_count = await reindex_document(session_id, db)
        return {"success": True, "clause_count": clause_count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reindexing failed: {str(e)}")


@app.get("/chat/{session_id}/clauses")
async def list_clauses(
    session_id: str,
    risk_category: str | None = None,
    risky_only: bool = False,
    db: AsyncSession = Depends(get_db),
):
    """List all clauses for a session with optional filtering."""
    session = await crud.get_chat_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    clauses = await get_clauses_by_category(
        session_id, db, risk_category=risk_category, risky_only=risky_only
    )

    return {
        "clauses": clauses,
        "total": len(clauses),
        "risky_count": sum(1 for c in clauses if c["is_risky"]),
    }


@app.get("/chat/{session_id}/clauses/{clause_id}")
async def get_clause(
    session_id: str, clause_id: int, db: AsyncSession = Depends(get_db)
):
    """Get a specific clause by ID."""
    session = await crud.get_chat_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    clause = await get_clause_by_id(session_id, clause_id, db)
    if not clause:
        raise HTTPException(status_code=404, detail="Clause not found")

    return clause


@app.get("/chat/{session_id}/risks")
async def get_risks(
    session_id: str, category: str | None = None, db: AsyncSession = Depends(get_db)
):
    """Get risk summary for a session."""
    session = await crud.get_chat_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    summary = await get_risks_summary(session_id, db)

    if category:
        filtered_clauses = summary["by_category"].get(category, [])
        return {
            "category": category,
            "clauses": filtered_clauses,
            "count": len(filtered_clauses),
            "overall_risk": summary["overall_risk"],
        }

    return summary


@app.post("/chat/compare")
async def compare_documents(
    body: CompareRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    """Compare two documents side by side."""
    session_a = await crud.get_chat_session(db, body.session_id_a)
    session_b = await crud.get_chat_session(db, body.session_id_b)

    if not session_a:
        raise HTTPException(
            status_code=404, detail=f"Session {body.session_id_a} not found"
        )
    if not session_b:
        raise HTTPException(
            status_code=404, detail=f"Session {body.session_id_b} not found"
        )



    try:
        user_id = current_user.id if current_user else None
        result = await compare_service.run(
            body.session_id_a,
            body.session_id_b,
            user_id,
            db,
        )

        result_a = await crud.get_analysis_job(db, body.session_id_a)
        result_b = await crud.get_analysis_job(db, body.session_id_b)
        analysis_a = result_a.result if result_a else {}
        analysis_b = result_b.result if result_b else {}

        overall_winner = (
            result.get("overall_riskier", "").lower()
            if result.get("overall_riskier")
            else ""
        )
        verdict = (
            f"Document {result.get('source_b', 'B') if overall_winner == 'a' else result.get('source_a', 'A')} has higher risk"
            if overall_winner
            else "Documents have similar risk"
        )

        structured = {
            "doc_a": {
                "label": result.get("source_a", "Document A"),
                "risk": analysis_a.get("overall_risk", "Unknown"),
                "risky_clause_count": analysis_a.get("risky_clause_count", 0),
                "total_clauses": analysis_a.get("total_clauses", 0),
                "score": _calc_score_from_result(analysis_a),
            },
            "doc_b": {
                "label": result.get("source_b", "Document B"),
                "risk": analysis_b.get("overall_risk", "Unknown"),
                "risky_clause_count": analysis_b.get("risky_clause_count", 0),
                "total_clauses": analysis_b.get("total_clauses", 0),
                "score": _calc_score_from_result(analysis_b),
            },
            "categories": result.get("pairs", []),
            "overall_winner": overall_winner,
            "verdict": verdict,
        }

        return {
            "structured": structured,
            "session_id_a": body.session_id_a,
            "session_id_b": body.session_id_b,
            "result": result,
        }
    except Exception as e:
        logger.error(f"Comparison failed: {e}")
        raise HTTPException(status_code=500, detail=f"Comparison failed: {str(e)}")


@app.get("/compare/history")
async def get_compare_history(
    session_id: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get user's comparison history, optionally filtered by session."""
    if session_id:
        history = await crud.get_compare_history_for_session(db, current_user.id, session_id)
    else:
        history = await crud.get_compare_history(db, current_user.id)
    return {
        "compares": [
            {
                "compare_id": str(h.compare_id),
                "source_a": h.source_a,
                "source_b": h.source_b,
                "created_at": h.created_at.isoformat(),
                "overall_riskier": h.result.get("overall_riskier")
                if h.result
                else None,
            }
            for h in history
        ]
    }


@app.get("/compare/{compare_id}")
async def get_compare(
    compare_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific comparison by ID."""
    compare = await crud.get_compare_by_id(db, compare_id, current_user.id)
    if not compare:
        raise HTTPException(status_code=404, detail="Comparison not found")
    return {"result": compare.result}


@app.post("/report/generate/{job_id}")
async def generate_report(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    """Generate a comprehensive report for a completed analysis."""
    job = await crud.get_analysis_job(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status.value != "complete":
        raise HTTPException(status_code=400, detail="Analysis not yet complete")

    if job.result and job.result.get("_report_cache"):
        logger.info(f"Returning cached report for job {job_id}")
        return {"status": "complete", "report": job.result["_report_cache"]}

    try:
        source_info = {
            "value": job.source or "Unknown",
            "type": job.source_type or "text",
        }
        report = await asyncio.to_thread(generate_full_report, job.result or {}, source_info)

        if job.result:
            job.result["_report_cache"] = report
            await db.commit()

        return {"status": "complete", "report": report}
    except Exception as e:
        logger.error(f"Report generation failed for job {job_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")


@app.get("/report/{job_id}")
async def get_report(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    """Return a previously generated report, or 404 if not yet generated."""
    job = await crud.get_analysis_job(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if not job.result or not job.result.get("_report_cache"):
        raise HTTPException(status_code=404, detail="Report not yet generated. POST /report/generate/{job_id} first.")
    return {"status": "complete", "report": job.result["_report_cache"]}
