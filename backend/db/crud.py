"""
db/crud.py
All database read/write helpers (no SQL in main.py).
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import Analysis, ChatSession, ChatMessage, JobStatus


# ---------------------------------------------------------------------------
# Analysis jobs
# ---------------------------------------------------------------------------

async def create_analysis_job(db: AsyncSession, job_id: str, source: str,
                               source_type: str | None = None) -> Analysis:
    job = Analysis(
        job_id=job_id,
        source=source,
        source_type=source_type,
        status=JobStatus.processing,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return job


async def update_analysis_complete(db: AsyncSession, job_id: str, result: dict) -> None:
    job = await db.get(Analysis, job_id)
    if job:
        job.status = JobStatus.complete
        job.result = result
        job.updated_at = datetime.now(timezone.utc)
        await db.commit()


async def update_analysis_failed(db: AsyncSession, job_id: str, error: str) -> None:
    job = await db.get(Analysis, job_id)
    if job:
        job.status = JobStatus.failed
        job.error = error
        job.updated_at = datetime.now(timezone.utc)
        await db.commit()


async def get_analysis_job(db: AsyncSession, job_id: str) -> Analysis | None:
    return await db.get(Analysis, job_id)


async def list_analyses(db: AsyncSession, limit: int = 50) -> list[Analysis]:
    result = await db.execute(
        select(Analysis).order_by(Analysis.created_at.desc()).limit(limit)
    )
    return result.scalars().all()


# ---------------------------------------------------------------------------
# Chat sessions
# ---------------------------------------------------------------------------

async def create_chat_session(db: AsyncSession, session_id: str,
                               document_text: str) -> ChatSession:
    session = ChatSession(session_id=session_id, document_text=document_text)
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


async def get_chat_session(db: AsyncSession, session_id: str) -> ChatSession | None:
    return await db.get(ChatSession, session_id)


# ---------------------------------------------------------------------------
# Chat messages
# ---------------------------------------------------------------------------

async def add_chat_message(db: AsyncSession, session_id: str,
                            role: str, content: str) -> ChatMessage:
    msg = ChatMessage(
        id=str(uuid.uuid4()),
        session_id=session_id,
        role=role,
        content=content,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    return msg


async def get_chat_history(db: AsyncSession, session_id: str) -> list[ChatMessage]:
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
    )
    return result.scalars().all()
