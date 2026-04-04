"""
Retrieval logic using pgvector.
Given a query and session_id, returns relevant clauses.
"""

import logging
from typing import Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from db.models import ClauseEmbedding, ChatSession
from .embeddings import embed_text

logger = logging.getLogger(__name__)

RISK_CATEGORY_MAP = {
    "privacy": "Privacy Risk",
    "legal": "Legal Risk",
    "user rights": "User Rights Risk",
    "security": "Security Risk",
    "financial": "Financial Risk",
}


async def _expand_with_neighbors(
    clauses: list[dict],
    session_id: str,
    db: AsyncSession,
    max_expanded: int = 8,
) -> list[dict]:
    """
    NLP-guided neighbor expansion.

    Rules:
    - has_negation = true → grab previous clause
    - triggered_categories overlap with neighbor → grab that neighbor
    - severity_score > 0.75 → grab both neighbors
    - zero_tolerance match → grab 2 each side

    Args:
        clauses: Retrieved clauses
        session_id: Session ID
        db: Database session
        max_expanded: Max total clauses after expansion

    Returns:
        Expanded list of clauses
    """
    if not clauses:
        return clauses

    expanded_ids = {c["clause_id"] for c in clauses}
    neighbor_ids_to_add = set()

    for clause in clauses:
        clause_id = clause["clause_id"]
        risk_cats = set(clause.get("risk_categories", []))
        severity = clause.get("severity_score", 0)
        has_neg = clause.get("has_negation", False)

        candidates = [clause_id - 1, clause_id + 1]
        if clause.get("is_risky") and severity > 0.75:
            candidates.extend([clause_id - 2, clause_id + 2])

        for cand_id in candidates:
            if cand_id <= 0:
                continue
            if cand_id in expanded_ids:
                continue

            neighbor_result = await db.execute(
                select(ClauseEmbedding).where(
                    ClauseEmbedding.session_id == session_id,
                    ClauseEmbedding.clause_id == cand_id,
                )
            )
            neighbor = neighbor_result.scalar_one_or_none()
            if not neighbor:
                continue

            should_add = False

            if has_neg and cand_id == clause_id - 1:
                should_add = True
                logger.info(
                    f"Expanding clause {clause_id}: has_negation → adding {cand_id}"
                )

            neighbor_risk_cats = set(neighbor.risk_categories or [])
            if risk_cats and neighbor_risk_cats and risk_cats & neighbor_risk_cats:
                should_add = True
                logger.info(
                    f"Expanding clause {clause_id}: category overlap → adding {cand_id}"
                )

            if severity > 0.75 and cand_id in [clause_id - 1, clause_id + 1]:
                should_add = True
                logger.info(
                    f"Expanding clause {clause_id}: high severity → adding {cand_id}"
                )

            if should_add:
                neighbor_ids_to_add.add(cand_id)
                expanded_ids.add(cand_id)

    if not neighbor_ids_to_add:
        return clauses

    result = await db.execute(
        select(ClauseEmbedding).where(
            ClauseEmbedding.session_id == session_id,
            ClauseEmbedding.clause_id.in_(neighbor_ids_to_add),
        )
    )
    neighbors = result.scalars().all()

    new_clauses = [
        {
            "clause_id": n.clause_id,
            "clause_text": n.clause_text,
            "section_heading": n.section_heading,
            "risk_categories": n.risk_categories,
            "severity_score": n.severity_score,
            "is_risky": n.is_risky,
            "has_negation": n.has_negation,
            "similarity_score": 0.0,
            "is_expanded": True,
        }
        for n in neighbors
    ]

    all_clauses = clauses + new_clauses
    all_clauses = all_clauses[:max_expanded]

    logger.info(f"Expanded from {len(clauses)} to {len(all_clauses)} clauses")
    return all_clauses


def _normalize_risk_category(query: str) -> Optional[str]:
    """Map user query terms to risk categories."""
    query_lower = query.lower()
    for term, category in RISK_CATEGORY_MAP.items():
        if term in query_lower:
            return category
    return None


async def retrieve_for_session(
    query: str,
    session_id: str,
    db: AsyncSession,
    top_k: int = 5,
    risk_category: Optional[str] = None,
) -> list[dict]:
    """
    Hybrid retrieval for a single session:
    1. Embed the query
    2. Cosine similarity search in pgvector (filtered by session_id)
    3. If risk_category provided, also filter by that category
    4. Apply NLP-guided neighbor expansion
    5. Return top_k clauses with metadata

    Args:
        query: User's question
        session_id: Chat session ID
        db: Database session
        top_k: Number of clauses to retrieve
        risk_category: Optional filter by risk category

    Returns:
        List of clause dicts with metadata and similarity score:
        [
            {
                "clause_id": int,
                "clause_text": str,
                "section_heading": str | None,
                "risk_categories": list[str],
                "severity_score": float,
                "is_risky": bool,
                "has_negation": bool,
                "similarity_score": float
            },
            ...
        ]
    """
    detected_category = _normalize_risk_category(query)
    filter_category = risk_category or detected_category

    logger.info(
        f"Retrieving for session {session_id}, query: '{query[:50]}...', category: {filter_category}"
    )

    query_embedding = embed_text(query)

    base_query = (
        select(
            ClauseEmbedding,
            ClauseEmbedding.embedding.cosine_distance(query_embedding).label(
                "distance"
            ),
        )
        .where(ClauseEmbedding.session_id == session_id)
        .order_by("distance")
        .limit(top_k * 2)
    )

    if filter_category:
        base_query = base_query.where(
            ClauseEmbedding.risk_categories.contains([filter_category])
        )

    result = await db.execute(base_query)
    rows = result.all()

    clauses = []
    seen_ids = set()

    for clause_emb, distance in rows:
        if clause_emb.clause_id in seen_ids:
            continue
        seen_ids.add(clause_emb.clause_id)

        similarity = 1 - distance if distance is not None else 0.0

        if filter_category and filter_category not in clause_emb.risk_categories:
            similarity *= 0.3

        if clause_emb.is_risky:
            similarity *= 1.2

        clauses.append(
            {
                "clause_id": clause_emb.clause_id,
                "clause_text": clause_emb.clause_text,
                "section_heading": clause_emb.section_heading,
                "risk_categories": clause_emb.risk_categories,
                "severity_score": clause_emb.severity_score,
                "is_risky": clause_emb.is_risky,
                "has_negation": clause_emb.has_negation,
                "similarity_score": round(similarity, 4),
            }
        )

    clauses.sort(key=lambda x: x["similarity_score"], reverse=True)
    clauses = clauses[:top_k]

    clauses = await _expand_with_neighbors(clauses, session_id, db)

    logger.info(f"Retrieved {len(clauses)} clauses for query")
    return clauses


async def _expand_with_neighbors(
    clauses: list[dict],
    session_id: str,
    db: AsyncSession,
    max_expanded: int = 8,
) -> list[dict]:
    """
    NLP-guided neighbor expansion.

    Rules:
    - has_negation = true → grab previous clause
    - triggered_categories overlap with neighbor → grab that neighbor
    - severity_score > 0.75 → grab both neighbors
    - zero_tolerance match → grab 2 each side

    Args:
        clauses: Retrieved clauses
        session_id: Session ID
        db: Database session
        max_expanded: Max total clauses after expansion

    Returns:
        Expanded list of clauses
    """
    if not clauses:
        return clauses

    expanded_ids = {c["clause_id"] for c in clauses}
    neighbor_ids_to_add = set()

    for clause in clauses:
        clause_id = clause["clause_id"]
        risk_cats = set(clause.get("risk_categories", []))
        severity = clause.get("severity_score", 0)
        has_neg = clause.get("has_negation", False)

        candidates = [clause_id - 1, clause_id + 1]
        if clause.get("is_risky") and severity > 0.75:
            candidates.extend([clause_id - 2, clause_id + 2])

        for cand_id in candidates:
            if cand_id <= 0:
                continue
            if cand_id in expanded_ids:
                continue

            neighbor_result = await db.execute(
                select(ClauseEmbedding).where(
                    ClauseEmbedding.session_id == session_id,
                    ClauseEmbedding.clause_id == cand_id,
                )
            )
            neighbor = neighbor_result.scalar_one_or_none()
            if not neighbor:
                continue

            should_add = False

            if has_neg and cand_id == clause_id - 1:
                should_add = True
                logger.info(
                    f"Expanding clause {clause_id}: has_negation → adding {cand_id}"
                )

            neighbor_risk_cats = set(neighbor.risk_categories or [])
            if risk_cats and neighbor_risk_cats and risk_cats & neighbor_risk_cats:
                should_add = True
                logger.info(
                    f"Expanding clause {clause_id}: category overlap → adding {cand_id}"
                )

            if severity > 0.75 and cand_id in [clause_id - 1, clause_id + 1]:
                should_add = True
                logger.info(
                    f"Expanding clause {clause_id}: high severity → adding {cand_id}"
                )

            if should_add:
                neighbor_ids_to_add.add(cand_id)
                expanded_ids.add(cand_id)

    if not neighbor_ids_to_add:
        return clauses

    result = await db.execute(
        select(ClauseEmbedding).where(
            ClauseEmbedding.session_id == session_id,
            ClauseEmbedding.clause_id.in_(neighbor_ids_to_add),
        )
    )
    neighbors = result.scalars().all()

    new_clauses = [
        {
            "clause_id": n.clause_id,
            "clause_text": n.clause_text,
            "section_heading": n.section_heading,
            "risk_categories": n.risk_categories,
            "severity_score": n.severity_score,
            "is_risky": n.is_risky,
            "has_negation": n.has_negation,
            "similarity_score": 0.0,
            "is_expanded": True,
        }
        for n in neighbors
    ]

    all_clauses = clauses + new_clauses
    all_clauses = all_clauses[:max_expanded]

    logger.info(f"Expanded from {len(clauses)} to {len(all_clauses)} clauses")
    return all_clauses


async def retrieve_for_comparison(
    query: str,
    session_id_a: str,
    session_id_b: str,
    db: AsyncSession,
    top_k_each: int = 4,
) -> dict:
    """
    Retrieves relevant clauses from BOTH documents for comparison.

    Args:
        query: Comparison question
        session_id_a: First document session ID
        session_id_b: Second document session ID
        db: Database session
        top_k_each: Clauses per document (default 4)

    Returns:
        {
            "doc_a": {
                "session_id": str,
                "source": str,
                "clauses": [ ... ]
            },
            "doc_b": {
                "session_id": str,
                "source": str,
                "clauses": [ ... ]
            }
        }
    """
    logger.info(f"Comparison retrieval: {session_id_a} vs {session_id_b}")

    session_a_result = await db.execute(
        select(ChatSession).where(ChatSession.session_id == session_id_a)
    )
    session_b_result = await db.execute(
        select(ChatSession).where(ChatSession.session_id == session_id_b)
    )

    session_a = session_a_result.scalar_one_or_none()
    session_b = session_b_result.scalar_one_or_none()

    clauses_a = await retrieve_for_session(query, session_id_a, db, top_k=top_k_each)
    clauses_b = await retrieve_for_session(query, session_id_b, db, top_k=top_k_each)

    return {
        "doc_a": {
            "session_id": session_id_a,
            "source": session_a.source[:100] if session_a else session_id_a,
            "clauses": clauses_a,
        },
        "doc_b": {
            "session_id": session_id_b,
            "source": session_b.source[:100] if session_b else session_id_b,
            "clauses": clauses_b,
        },
    }


async def get_clauses_by_category(
    session_id: str,
    db: AsyncSession,
    risk_category: Optional[str] = None,
    risky_only: bool = False,
) -> list[dict]:
    """
    Get all clauses for a session, optionally filtered.

    Args:
        session_id: Chat session ID
        db: Database session
        risk_category: Filter by specific category
        risky_only: Only return risky clauses

    Returns:
        List of all matching clauses with metadata
    """
    query = select(ClauseEmbedding).where(ClauseEmbedding.session_id == session_id)

    if risky_only:
        query = query.where(ClauseEmbedding.is_risky == True)

    if risk_category:
        query = query.where(ClauseEmbedding.risk_categories.contains([risk_category]))

    query = query.order_by(ClauseEmbedding.clause_id)

    result = await db.execute(query)
    clauses = result.scalars().all()

    return [
        {
            "clause_id": c.clause_id,
            "clause_text": c.clause_text,
            "section_heading": c.section_heading,
            "risk_categories": c.risk_categories,
            "severity_score": c.severity_score,
            "is_risky": c.is_risky,
        }
        for c in clauses
    ]


async def get_clause_by_id(
    session_id: str,
    clause_id: int,
    db: AsyncSession,
) -> Optional[dict]:
    """
    Get a specific clause by ID.

    Returns:
        Clause dict or None if not found
    """
    result = await db.execute(
        select(ClauseEmbedding).where(
            ClauseEmbedding.session_id == session_id,
            ClauseEmbedding.clause_id == clause_id,
        )
    )
    clause = result.scalar_one_or_none()

    if not clause:
        return None

    return {
        "clause_id": clause.clause_id,
        "clause_text": clause.clause_text,
        "section_heading": clause.section_heading,
        "risk_categories": clause.risk_categories,
        "severity_score": clause.severity_score,
        "is_risky": clause.is_risky,
    }


async def get_risks_summary(session_id: str, db: AsyncSession) -> dict:
    """
    Get risk summary for a session organized by category.

    Returns:
        {
            "by_category": {
                "Privacy Risk": [ ... clauses ... ],
                "Legal Risk": [ ... clauses ... ],
                ...
            },
            "overall_risk": "High" | "Medium" | "Low",
            "risky_clause_count": int,
            "total_clause_count": int
        }
    """
    result = await db.execute(
        select(ClauseEmbedding).where(ClauseEmbedding.session_id == session_id)
    )
    all_clauses = result.scalars().all()

    by_category = {
        "Privacy Risk": [],
        "Legal Risk": [],
        "User Rights Risk": [],
        "Security Risk": [],
        "Financial Risk": [],
    }

    risky_count = 0
    high_severity_count = 0

    for clause in all_clauses:
        if clause.is_risky:
            risky_count += 1
            if clause.severity_score >= 1.5:
                high_severity_count += 1

        for cat in clause.risk_categories:
            if cat in by_category:
                by_category[cat].append(
                    {
                        "clause_id": clause.clause_id,
                        "clause_text": clause.clause_text,
                        "severity_score": clause.severity_score,
                    }
                )

    if high_severity_count >= 3 or (risky_count > 0 and high_severity_count >= 1):
        overall_risk = "High"
    elif risky_count >= 2:
        overall_risk = "Medium"
    else:
        overall_risk = "Low"

    return {
        "by_category": by_category,
        "overall_risk": overall_risk,
        "risky_clause_count": risky_count,
        "total_clause_count": len(all_clauses),
    }
