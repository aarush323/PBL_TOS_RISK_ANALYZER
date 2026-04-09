"""
Indexes document clauses into pgvector for RAG retrieval.
Called automatically in background after store_document().
"""

import logging
import re
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import ClauseEmbedding, ChatSession, Analysis
from analysis.segmenter import segment_clauses
from analysis.nlp_features import extract_features
from .embeddings import embed_batch

logger = logging.getLogger(__name__)

RISK_CATEGORIES = {
    "Privacy Risk",
    "Legal Risk",
    "User Rights Risk",
    "Security Risk",
    "Financial Risk",
}


def _extract_clause_metadata(clause: dict) -> dict:
    """Extract risk-related metadata from a clause."""
    features = extract_features(clause["text"])

    risk_categories = features.get("triggered_categories", [])
    risk_categories = [c for c in risk_categories if c in RISK_CATEGORIES]

    return {
        "section_heading": clause.get("section_heading"),
        "risk_categories": risk_categories,
        "risk_score": features.get("risk_score", 0.0),
        "is_risky": len(risk_categories) > 0 or features.get("risk_score", 0) >= 1.0,
        "has_negation": features.get("has_negation", False),
    }


def _get_analysis_risk_data(
    session_id: str, db: AsyncSession, clause_id: int
) -> Optional[dict]:
    """Pull risk data from existing analysis results if available."""
    result = db.execute(select(Analysis.result).where(Analysis.user_id == None))
    analysis_result = result.scalar()

    if not analysis_result or "clauses" not in analysis_result:
        return None

    for clause in analysis_result.get("clauses", []):
        if clause.get("id") == clause_id:
            return {
                "risk_categories": clause.get("risk_categories", []),
                "severity_score": clause.get("severity_score", 0.0),
                "is_risky": clause.get("is_risky", False),
            }

    return None


async def index_document(session_id: str, document_text: str, db: AsyncSession) -> int:
    """
    Full pipeline to index a document:
    1. Segment document into clauses (reuse segmenter.py)
    2. Extract NLP features (reuse nlp_features.py)
    3. Pull risk data from analysis_results if available
    4. Embed all clauses in batch
    5. Store in clause_embeddings table
    6. Update chat_sessions.is_indexed

    Returns:
        Number of clauses indexed
    """
    logger.info(f"Starting indexing for session {session_id}")

    doc_len = len(document_text or "")
    preview = (document_text or "").strip().replace("\n", " ")[:200]
    logger.info("Index input chars=%s preview=%r", doc_len, preview)

    # More robust than `split("\n\n")`: handles any number of blank lines.
    normalized = (document_text or "").replace("\r\n", "\n").replace("\r", "\n")
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n+", normalized) if p.strip()]
    clauses = segment_clauses(paragraphs)

    if not clauses:
        logger.warning(f"No clauses found for session {session_id}")
        return 0

    logger.info(f"Segmented {len(clauses)} clauses for session {session_id}")

    texts_to_embed = [c["text"] for c in clauses]
    embeddings = embed_batch(texts_to_embed)

    existing = await db.execute(
        select(ChatSession).where(ChatSession.session_id == session_id)
    )
    session = existing.scalar_one_or_none()

    if not session:
        logger.error(f"Session {session_id} not found")
        return 0

    await db.execute(
        delete(ClauseEmbedding).where(ClauseEmbedding.session_id == session_id)
    )

    clause_embeddings = []
    for clause, embedding in zip(clauses, embeddings):
        metadata = _extract_clause_metadata(clause)

        severity = 0.0
        if metadata["is_risky"]:
            severity = 0.5 + metadata["risk_score"] * 0.5

        clause_emb = ClauseEmbedding(
            session_id=session_id,
            clause_id=clause["id"],
            clause_text=clause["text"],
            section_heading=metadata["section_heading"],
            risk_categories=metadata["risk_categories"],
            severity_score=severity,
            is_risky=metadata["is_risky"],
            has_negation=metadata.get("has_negation", False),
            embedding=embedding,
        )
        clause_embeddings.append(clause_emb)

    db.add_all(clause_embeddings)

    session.is_indexed = True
    session.indexed_at = datetime.now(timezone.utc)
    session.clause_count = len(clauses)

    await db.commit()

    logger.info(f"Indexed {len(clauses)} clauses for session {session_id}")
    return len(clauses)


async def get_index_status(session_id: str, db: AsyncSession) -> dict:
    """
    Returns index status for a session.

    Returns:
        {
            "is_indexed": bool,
            "clause_count": int,
            "indexed_at": datetime or None,
            "risky_clause_count": int
        }
    """
    result = await db.execute(
        select(ChatSession).where(ChatSession.session_id == session_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        return {
            "is_indexed": False,
            "clause_count": 0,
            "indexed_at": None,
            "risky_clause_count": 0,
        }

    risky_count = await db.execute(
        select(ClauseEmbedding).where(
            ClauseEmbedding.session_id == session_id,
            ClauseEmbedding.is_risky == True,
        )
    )
    risky_clause_count = len(risky_count.scalars().all())

    return {
        "is_indexed": session.is_indexed,
        "clause_count": session.clause_count,
        "indexed_at": session.indexed_at.isoformat() if session.indexed_at else None,
        "risky_clause_count": risky_clause_count,
    }


async def delete_index(session_id: str, db: AsyncSession) -> bool:
    """
    Deletes all embeddings for a session.
    Called automatically on session delete (cascade), but can be called manually.

    Returns:
        True if deleted, False if session not found
    """
    result = await db.execute(
        select(ChatSession).where(ChatSession.session_id == session_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        return False

    await db.execute(
        delete(ClauseEmbedding).where(ClauseEmbedding.session_id == session_id)
    )

    session.is_indexed = False
    session.indexed_at = None
    session.clause_count = 0

    await db.commit()

    logger.info(f"Deleted index for session {session_id}")
    return True


async def reindex_document(session_id: str, db: AsyncSession) -> int:
    """
    Force re-index a document. Deletes existing and re-creates.

    Returns:
        Number of clauses indexed
    """
    await delete_index(session_id, db)

    result = await db.execute(
        select(ChatSession).where(ChatSession.session_id == session_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        return 0

    return await index_document(session_id, session.document_text, db)
