"""
Compare service - handles document comparison with caching.
"""

import logging
import json
import re
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from db import crud
from db.models import Analysis

logger = logging.getLogger(__name__)

CATEGORY_ORDER = [
    "Privacy Risk",
    "Legal Risk",
    "User Rights Risk",
    "Security Risk",
    "Financial Risk",
]

VERDICT_OPTIONS = [
    "A is riskier",
    "B is riskier",
    "Similar risk",
    "Only in A",
    "Only in B",
]

SYSTEM_PROMPT = """You are a legal risk analyst. Respond ONLY with valid JSON matching the exact schema below. No prose, no markdown.

SCHEMA:
{
  "category": string,
  "clause_a_summary": string,
  "clause_b_summary": string,
  "verdict": "A is riskier" | "B is riskier" | "Similar risk" | "Only in A" | "Only in B",
  "severity_delta": float,
  "reasoning": string,
  "doc_a_risk_count": int,
  "doc_b_risk_count": int,
  "key_difference": string
}"""


def _filter_clauses(clauses: list[dict]) -> list[dict]:
    """Filter clauses: remove skipped_llm, is_risky=false, or empty risk_categories."""
    filtered = []
    for clause in clauses:
        if clause.get("skipped_llm"):
            continue
        if not clause.get("is_risky", False):
            continue
        if not clause.get("risk_categories"):
            continue
        filtered.append(clause)
    return filtered


def _group_by_category(clauses: list[dict]) -> dict[str, list[dict]]:
    """Group filtered clauses by category, sort by severity_score desc."""
    grouped = {}
    for clause in clauses:
        categories = clause.get("risk_categories", [])
        for cat in categories:
            if cat not in grouped:
                grouped[cat] = []
            grouped[cat].append(
                {
                    "text": clause.get("text", ""),
                    "explanation": clause.get("explanation", ""),
                    "severity_score": clause.get("severity_score", 0),
                }
            )
    for cat in grouped:
        grouped[cat].sort(key=lambda x: x["severity_score"], reverse=True)
    return grouped


def _build_pairs(doc_a_grouped: dict, doc_b_grouped: dict) -> list[dict]:
    """Build category pairs in fixed order."""
    all_categories = set(doc_a_grouped.keys()) | set(doc_b_grouped.keys())
    pairs = []
    for cat in CATEGORY_ORDER:
        if cat not in all_categories:
            continue
        clauses_a = doc_a_grouped.get(cat, [])
        clauses_b = doc_b_grouped.get(cat, [])
        pairs.append(
            {
                "category": cat,
                "clauses_a": clauses_a,
                "clauses_b": clauses_b,
            }
        )
    return pairs


def _build_pair_prompt(pair: dict, max_clauses: int = 3) -> str:
    """Build prompt for a single category pair."""
    cat = pair["category"]
    clauses_a = pair["clauses_a"][:max_clauses]
    clauses_b = pair["clauses_b"][:max_clauses]

    doc_a_block = ""
    if clauses_a:
        for i, c in enumerate(clauses_a, 1):
            doc_a_block += f"[{i}] severity: {c['severity_score']}, why risky: {c['explanation']}\n"
    else:
        doc_a_block = "(none)"

    doc_b_block = ""
    if clauses_b:
        for i, c in enumerate(clauses_b, 1):
            doc_b_block += f"[{i}] severity: {c['severity_score']}, why risky: {c['explanation']}\n"
    else:
        doc_b_block = "(none)"

    return f"""{SYSTEM_PROMPT}

Category: {cat}

Doc A — {len(clauses_a)} clauses:
{doc_a_block}

Doc B — {len(clauses_b)} clauses:
{doc_b_block}

Respond with JSON only."""


def _parse_llm_response(raw: str) -> dict:
    """Parse JSON from LLM response with fallback."""
    raw = re.sub(r"```json|```", "", raw).strip()
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if not match:
        raise ValueError(f"No JSON found: {raw[:200]}")
    parsed = json.loads(match.group())
    if parsed.get("verdict") not in VERDICT_OPTIONS:
        parsed["verdict"] = "Similar risk"
    if not isinstance(parsed.get("severity_delta"), (int, float)):
        parsed["severity_delta"] = 0.0
    parsed.setdefault("key_difference", "")
    parsed.setdefault("doc_a_risk_count", 0)
    parsed.setdefault("doc_b_risk_count", 0)
    return parsed


def _is_context_limit_error(e: Exception) -> bool:
    """Check if error is a context length exceeded error."""
    error_msg = str(e).lower()
    return any(
        phrase in error_msg
        for phrase in [
            "context_length",
            "context limit",
            "too many tokens",
            "max_tokens",
            "maximum context",
        ]
    )


async def _call_cerebras(prompt: str) -> dict:
    """Call Cerebras API with retry logic."""
    from analysis.classifier import _call_cerebras_sync

    try:
        raw = _call_cerebras_sync(prompt, max_tokens=400)
        return _parse_llm_response(raw)
    except Exception as e:
        logger.warning(f"Cerebras failed: {e}")
        raise


async def _call_cerebras_truncated(prompt: str) -> dict:
    """Call Cerebras API with reduced prompt (top 1 clause only)."""
    from analysis.classifier import _call_cerebras_sync

    try:
        raw = _call_cerebras_sync(prompt, max_tokens=300)
        return _parse_llm_response(raw)
    except Exception as e:
        logger.warning(f"Cerebras truncated failed: {e}")
        raise


async def _call_groq(prompt: str) -> dict:
    """Call Groq API as fallback."""
    from analysis.classifier import _call_groq_sync

    try:
        raw = _call_groq_sync(prompt, max_tokens=400)
        return _parse_llm_response(raw)
    except Exception as e:
        logger.warning(f"Groq failed: {e}")
        raise


async def _call_with_fallback(prompt: str, pair: dict = None) -> dict:
    """Call LLM with Cerebras → retry with truncation → Groq fallback."""
    try:
        return await _call_cerebras(prompt)
    except Exception as e:
        if _is_context_limit_error(e) and pair:
            logger.warning(f"Context limit hit, retrying with top 1 clause")
            truncated_pair = {
                "category": pair["category"],
                "clauses_a": pair["clauses_a"][:1],
                "clauses_b": pair["clauses_b"][:1],
            }
            truncated_prompt = _build_pair_prompt(truncated_pair, max_clauses=1)
            try:
                return await _call_cerebras_truncated(truncated_prompt)
            except Exception:
                pass

        try:
            return await _call_groq(prompt)
        except Exception as groq_err:
            return {
                "category": pair.get("category", "") if pair else "",
                "clause_a_summary": "",
                "clause_b_summary": "",
                "verdict": "Error",
                "severity_delta": 0.0,
                "reasoning": f"LLM failed: {e}",
                "key_difference": "",
                "doc_a_risk_count": len(pair["clauses_a"]) if pair else 0,
                "doc_b_risk_count": len(pair["clauses_b"]) if pair else 0,
            }


async def _run_comparison_pairs(pairs: list[dict]) -> list[dict]:
    """Execute LLM calls for each category pair sequentially."""
    results = []
    for pair in pairs:
        logger.info(f"Running LLM for category: {pair['category']}")
        prompt = _build_pair_prompt(pair, max_clauses=3)
        result = await _call_with_fallback(prompt, pair)
        result["category"] = pair["category"]
        result["doc_a_avg_severity"] = (
            round(
                sum(c["severity_score"] for c in pair["clauses_a"])
                / len(pair["clauses_a"]),
                2,
            )
            if pair["clauses_a"]
            else 0.0
        )

        result["doc_b_avg_severity"] = (
            round(
                sum(c["severity_score"] for c in pair["clauses_b"])
                / len(pair["clauses_b"]),
                2,
            )
            if pair["clauses_b"]
            else 0.0
        )

        result["doc_a_risk_count"] = len(pair["clauses_a"])
        result["doc_b_risk_count"] = len(pair["clauses_b"])

        verdict = result.get("verdict", "Similar risk")
        if "A is riskier" in verdict:
            result["winner"] = "a"
        elif "B is riskier" in verdict:
            result["winner"] = "b"
        else:
            result["winner"] = "tie"

        result["a_count"] = result.get("doc_a_risk_count", 0)
        result["b_count"] = result.get("doc_b_risk_count", 0)

        results.append(result)
    return results


def _compute_overall_riskier(pairs_results: list[dict]) -> str:
    """Compute overall riskier from severity_delta sum."""
    total_delta = sum(p.get("severity_delta", 0) for p in pairs_results)
    if total_delta > 0.5:
        return "A"
    elif total_delta < -0.5:
        return "B"
    return "Similar"


def _extract_categories_only(pairs_results: list[dict], doc: str) -> list[str]:
    """Extract categories only in doc A or B based on verdicts."""
    categories = []
    for p in pairs_results:
        verdict = p.get("verdict", "")
        if doc == "A" and "Only in A" in verdict:
            categories.append(p.get("category", ""))
        elif doc == "B" and "Only in B" in verdict:
            categories.append(p.get("category", ""))
    return categories


async def run(
    session_id_a: str,
    session_id_b: str,
    user_id: str | None,
    db: AsyncSession,
) -> dict:
    """
    Main entry point for comparison.
    1. Check cache
    2. Fetch and process clauses
    3. Run LLM per category pair
    4. Cache result
    """
    logger.info(f"Starting comparison: {session_id_a} vs {session_id_b}")

    cached = await crud.get_compare_by_sessions(db, user_id, session_id_a, session_id_b)
    if cached:
        logger.info(f"Cache hit: compare {cached.compare_id}")
        return cached.result

    analysis_a = await crud.get_analysis_job(db, session_id_a)
    analysis_b = await crud.get_analysis_job(db, session_id_b)

    if not analysis_a or not analysis_b:
        raise ValueError("One or both analyses not found")

    result_a = analysis_a.result or {}
    result_b = analysis_b.result or {}

    clauses_a = result_a.get("clauses", [])
    clauses_b = result_b.get("clauses", [])

    filtered_a = _filter_clauses(clauses_a)
    filtered_b = _filter_clauses(clauses_b)

    logger.info(f"Found {len(filtered_a)} risky clauses in A, {len(filtered_b)} in B")

    grouped_a = _group_by_category(filtered_a)
    grouped_b = _group_by_category(filtered_b)

    pairs = _build_pairs(grouped_a, grouped_b)

    logger.info(f"Built {len(pairs)} category pairs to compare")

    pairs_results = await _run_comparison_pairs(pairs)

    logger.info(f"Completed {len(pairs_results)} category comparisons")

    # Check for error results before caching
    has_errors = any(p.get("verdict") == "Error" for p in pairs_results)
    error_count = sum(1 for p in pairs_results if p.get("verdict") == "Error")

    if has_errors:
        logger.error(
            f"Comparison failed - {error_count}/{len(pairs_results)} categories had errors. Not caching."
        )
        raise Exception(
            f"LLM comparison failed: {error_count} categories returned errors"
        )

    source_a = analysis_a.source or session_id_a
    source_b = analysis_b.source or session_id_b

    final_result = {
        "pairs": pairs_results,
        "overall_riskier": _compute_overall_riskier(pairs_results),
        "categories_compared": len(pairs_results),
        "categories_only_in_a": _extract_categories_only(pairs_results, "A"),
        "categories_only_in_b": _extract_categories_only(pairs_results, "B"),
        "source_a": source_a,
        "source_b": source_b,
    }

    await crud.create_compare_session(
        db,
        user_id=user_id,
        session_id_a=session_id_a,
        session_id_b=session_id_b,
        job_id_a=session_id_a,
        job_id_b=session_id_b,
        source_a=source_a,
        source_b=source_b,
        result=final_result,
    )

    return final_result
