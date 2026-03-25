"""
db/models.py
SQLAlchemy ORM models for the ToS Risk Analyzer.
"""
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Text, DateTime, ForeignKey, Enum as SAEnum, Boolean
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from .connection import Base

import enum


class JobStatus(str, enum.Enum):
    processing = "processing"
    complete = "complete"
    failed = "failed"


# ---------------------------------------------------------------------------
# User accounts
# ---------------------------------------------------------------------------

class User(Base):
    """Registered user account."""
    __tablename__ = "users"

    id              = Column(String(36),  primary_key=True, index=True)
    email           = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(Text,        nullable=False)
    is_active          = Column(Boolean,     default=True, nullable=False)
    is_verified        = Column(Boolean,     default=False, nullable=False)
    verification_token = Column(String(64),  unique=True, index=True, nullable=True)
    created_at         = Column(DateTime(timezone=True),
                             default=lambda: datetime.now(timezone.utc), nullable=False)

    analyses      = relationship("Analysis",    back_populates="user",
                                 cascade="all, delete-orphan")
    chat_sessions = relationship("ChatSession", back_populates="user",
                                 cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# Analysis jobs
# ---------------------------------------------------------------------------

class Analysis(Base):
    """One row per analysis job.  result stores the full analyze_document() output."""
    __tablename__ = "analyses"

    job_id      = Column(String(36),  primary_key=True, index=True)
    user_id     = Column(String(36),  ForeignKey("users.id", ondelete="CASCADE"),
                         nullable=True, index=True)   # nullable = anonymous allowed
    source      = Column(Text,        nullable=True)
    source_type = Column(String(32),  nullable=True)
    status      = Column(SAEnum(JobStatus, name="job_status"), nullable=False,
                         default=JobStatus.processing)
    error       = Column(Text,        nullable=True)
    result      = Column(JSONB,       nullable=True)
    created_at  = Column(DateTime(timezone=True),
                         default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at  = Column(DateTime(timezone=True),
                         default=lambda: datetime.now(timezone.utc),
                         onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="analyses")


# ---------------------------------------------------------------------------
# Chat sessions & messages
# ---------------------------------------------------------------------------

class ChatSession(Base):
    """One row per chat session."""
    __tablename__ = "chat_sessions"

    session_id    = Column(String(36), primary_key=True, index=True)
    user_id       = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"),
                           nullable=True, index=True)
    document_text = Column(Text,       nullable=False)
    created_at    = Column(DateTime(timezone=True),
                           default=lambda: datetime.now(timezone.utc), nullable=False)

    user     = relationship("User", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session",
                            cascade="all, delete-orphan", order_by="ChatMessage.created_at")


class ChatMessage(Base):
    """One row per message in a chat session."""
    __tablename__ = "chat_messages"

    id         = Column(String(36),  primary_key=True, index=True)
    session_id = Column(String(36),  ForeignKey("chat_sessions.session_id",
                                                 ondelete="CASCADE"), nullable=False, index=True)
    role       = Column(String(16),  nullable=False)
    content    = Column(Text,        nullable=False)
    created_at = Column(DateTime(timezone=True),
                        default=lambda: datetime.now(timezone.utc), nullable=False)

    session = relationship("ChatSession", back_populates="messages")
