from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Text,
    DateTime,
    ForeignKey,
    Enum as SAEnum,
    Boolean,
    Integer,
    Float,
)
from sqlalchemy.dialects.postgresql import JSONB, ARRAY, UUID
from sqlalchemy.orm import relationship
from .connection import Base
from pgvector.sqlalchemy import Vector

import enum
import uuid


class JobStatus(str, enum.Enum):
    processing = "processing"
    complete = "complete"
    failed = "failed"
    blocked = "blocked"


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    analyses = relationship(
        "Analysis", back_populates="user", cascade="all, delete-orphan"
    )
    chat_sessions = relationship(
        "ChatSession", back_populates="user", cascade="all, delete-orphan"
    )
    compare_sessions = relationship(
        "CompareSession", back_populates="user", cascade="all, delete-orphan"
    )


class Analysis(Base):
    __tablename__ = "analyses"

    job_id = Column(String(36), primary_key=True, index=True)
    user_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    source = Column(Text, nullable=True)
    source_type = Column(String(32), nullable=True)
    status = Column(
        SAEnum(JobStatus, name="job_status"),
        nullable=False,
        default=JobStatus.processing,
    )
    error = Column(Text, nullable=True)
    result = Column(JSONB, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user = relationship("User", back_populates="analyses")


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    session_id = Column(String(36), primary_key=True, index=True)
    user_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    document_text = Column(Text, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    is_indexed = Column(Boolean, default=False, nullable=False)
    indexed_at = Column(DateTime(timezone=True), nullable=True)
    clause_count = Column(Integer, default=0, nullable=False)

    user = relationship("User", back_populates="chat_sessions")
    messages = relationship(
        "ChatMessage",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="ChatMessage.created_at",
    )
    clauses = relationship(
        "ClauseEmbedding",
        back_populates="session",
        cascade="all, delete-orphan",
    )


class ClauseEmbedding(Base):
    __tablename__ = "clause_embeddings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(
        String(36),
        ForeignKey("chat_sessions.session_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    clause_id = Column(Integer, nullable=False)
    clause_text = Column(Text, nullable=False)
    section_heading = Column(Text, nullable=True)
    risk_categories = Column(JSONB, default=list, nullable=False)
    severity_score = Column(Float, default=0.0, nullable=False)
    is_risky = Column(Boolean, default=False, nullable=False)
    has_negation = Column(Boolean, default=False, nullable=False)
    embedding = Column(Vector(384), nullable=False)

    session = relationship("ChatSession", back_populates="clauses")


class CompareSession(Base):
    __tablename__ = "compare_sessions"

    compare_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    session_id_a = Column(UUID(as_uuid=True), nullable=False)
    session_id_b = Column(UUID(as_uuid=True), nullable=False)
    job_id_a = Column(UUID(as_uuid=True), nullable=False)
    job_id_b = Column(UUID(as_uuid=True), nullable=False)
    source_a = Column(Text, nullable=True)
    source_b = Column(Text, nullable=True)
    result = Column(JSONB, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user = relationship("User")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(String(36), primary_key=True, index=True)
    session_id = Column(
        String(36),
        ForeignKey("chat_sessions.session_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role = Column(String(16), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    session = relationship("ChatSession", back_populates="messages")
