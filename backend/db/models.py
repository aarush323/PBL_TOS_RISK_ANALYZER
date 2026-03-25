"""
db/models.py
SQLAlchemy ORM models for the ToS Risk Analyzer.
"""
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Text, DateTime, ForeignKey, Enum as SAEnum
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from .connection import Base

import enum


class JobStatus(str, enum.Enum):
    processing = "processing"
    complete = "complete"
    failed = "failed"


class Analysis(Base):
    """One row per analysis job.  result stores the full analyze_document() output."""
    __tablename__ = "analyses"

    job_id      = Column(String(36),  primary_key=True, index=True)
    source      = Column(Text,        nullable=True)   # URL or "text" or "pdf"
    source_type = Column(String(32),  nullable=True)
    status      = Column(SAEnum(JobStatus, name="job_status"), nullable=False,
                         default=JobStatus.processing)
    error       = Column(Text,        nullable=True)
    result      = Column(JSONB,       nullable=True)   # full analysis dict
    created_at  = Column(DateTime(timezone=True),
                         default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at  = Column(DateTime(timezone=True),
                         default=lambda: datetime.now(timezone.utc),
                         onupdate=lambda: datetime.now(timezone.utc), nullable=False)


class ChatSession(Base):
    """One row per chat session.  document_text is the ToS text the user uploaded."""
    __tablename__ = "chat_sessions"

    session_id    = Column(String(36), primary_key=True, index=True)
    document_text = Column(Text,       nullable=False)
    created_at    = Column(DateTime(timezone=True),
                           default=lambda: datetime.now(timezone.utc), nullable=False)

    messages = relationship("ChatMessage", back_populates="session",
                            cascade="all, delete-orphan", order_by="ChatMessage.created_at")


class ChatMessage(Base):
    """One row per message in a chat session."""
    __tablename__ = "chat_messages"

    id         = Column(String(36),  primary_key=True, index=True)
    session_id = Column(String(36),  ForeignKey("chat_sessions.session_id",
                                                 ondelete="CASCADE"), nullable=False, index=True)
    role       = Column(String(16),  nullable=False)   # "user" | "assistant"
    content    = Column(Text,        nullable=False)
    created_at = Column(DateTime(timezone=True),
                        default=lambda: datetime.now(timezone.utc), nullable=False)

    session = relationship("ChatSession", back_populates="messages")
