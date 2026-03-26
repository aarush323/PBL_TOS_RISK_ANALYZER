import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import Analysis, ChatSession, ChatMessage, JobStatus, User


async def create_user(db: AsyncSession, username: str, email: str, hashed_password: str) -> User:
    user = User(
        id=str(uuid.uuid4()),
        username=username,
        email=email,
        hashed_password=hashed_password,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def get_user_by_id(db: AsyncSession, user_id: str) -> User | None:
    return await db.get(User, user_id)


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalars().first()


async def get_user_by_username(db: AsyncSession, username: str) -> User | None:
    result = await db.execute(select(User).where(User.username == username))
    return result.scalars().first()


async def create_analysis_job(db: AsyncSession, job_id: str, source: str,
                               source_type: str | None = None,
                               user_id: str | None = None) -> Analysis:
    job = Analysis(
        job_id=job_id,
        source=source,
        source_type=source_type,
        status=JobStatus.processing,
        user_id=user_id,
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


async def list_analyses(db: AsyncSession, limit: int = 50,
                        user_id: str | None = None) -> list[Analysis]:
    q = select(Analysis).order_by(Analysis.created_at.desc()).limit(limit)
    if user_id:
        q = q.where(Analysis.user_id == user_id)
    result = await db.execute(q)
    return result.scalars().all()


async def create_chat_session(db: AsyncSession, session_id: str,
                               document_text: str,
                               user_id: str | None = None) -> ChatSession:
    session = ChatSession(
        session_id=session_id,
        document_text=document_text,
        user_id=user_id,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


async def get_chat_session(db: AsyncSession, session_id: str) -> ChatSession | None:
    return await db.get(ChatSession, session_id)


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
