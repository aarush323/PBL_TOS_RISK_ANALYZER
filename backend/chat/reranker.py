import json
import logging
import os
import re
from typing import Optional


logger = logging.getLogger(__name__)

RERANK_PROVIDER = os.getenv("RERANK_PROVIDER", "off").lower().strip()
RERANK_MODEL = os.getenv("RERANK_MODEL", "llama-3.1-8b-instant").strip()
RERANK_CEREBRAS_MODEL = os.getenv("RERANK_CEREBRAS_MODEL", "llama3.1-8b").strip()


def _parse_json_object(raw: str) -> dict:
    raw = re.sub(r"```json|```", "", raw).strip()
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if not match:
        raise ValueError(f"No JSON object found in rerank response: {raw[:200]}")
    return json.loads(match.group())


def _call_groq_json(prompt: str, max_tokens: int = 400) -> dict:
    """
    Calls Groq Chat Completions with `response_format=json_object` via the existing client.
    Returns parsed JSON dict.
    """
    from analysis.classifier import _call_groq_sync

    raw = _call_groq_sync(
        prompt=prompt,
        model=RERANK_MODEL,
        temperature=0.0,
        max_tokens=max_tokens,
    )
    return _parse_json_object(raw)


def _call_cerebras_json(prompt: str, max_tokens: int = 500) -> dict:
    """
    Calls Cerebras Chat Completions with `response_format=json_object` via the existing client.
    Returns parsed JSON dict.
    """
    from analysis.classifier import _call_cerebras_sync

    raw = _call_cerebras_sync(
        prompt=prompt,
        model=RERANK_CEREBRAS_MODEL,
        temperature=0.0,
        max_tokens=max_tokens,
    )
    return _parse_json_object(raw)


def rerank_clauses(
    query: str,
    clauses: list[dict],
    *,
    top_k: int,
    provider: Optional[str] = None,
) -> list[dict]:
    """
    Rerank retrieved clauses for a query.

    Clauses must include:
      - clause_id (int)
      - clause_text (str)

    Returns the same clause dicts, reordered, truncated to top_k.
    """
    if not clauses or top_k <= 0:
        return []

    provider = (provider or RERANK_PROVIDER).lower().strip()
    if provider in {"", "off", "none", "false", "0"}:
        return clauses[:top_k]

    if provider == "auto":
        if os.getenv("CEREBRAS_API_KEY"):
            provider = "cerebras"
        elif os.getenv("GROQ_API_KEY"):
            provider = "groq"
        else:
            return clauses[:top_k]

    if provider == "groq" and not os.getenv("GROQ_API_KEY"):
        logger.info("GROQ_API_KEY not set; skipping rerank")
        return clauses[:top_k]

    if provider == "cerebras" and not os.getenv("CEREBRAS_API_KEY"):
        logger.info("CEREBRAS_API_KEY not set; skipping rerank")
        return clauses[:top_k]

    if provider not in {"groq", "cerebras"}:
        logger.warning("Unknown rerank provider '%s'; skipping rerank", provider)
        return clauses[:top_k]

    # Keep prompt small-ish: cap candidates and truncate text.
    max_candidates = min(len(clauses), int(os.getenv("RERANK_MAX_CANDIDATES", "20")))
    candidates = clauses[:max_candidates]

    def _clip(s: str, n: int = 450) -> str:
        s = (s or "").strip()
        return s if len(s) <= n else s[:n] + "…"

    items = "\n".join(
        f"- id: {c['clause_id']}\n  text: {json.dumps(_clip(c.get('clause_text', '')))}"
        for c in candidates
    )

    prompt = f"""You are ranking passages for retrieval-augmented QA over a Terms of Service / Privacy Policy.

User query:
{json.dumps(query)}

Candidate clauses:
{items}

Return ONLY valid JSON in exactly this format:
{{
  "ranking": [<clause_id>, ...],
  "reasons": {{"<clause_id>": "<short reason>", "...": "..."}}
}}

Rules:
- ranking must include EACH candidate id exactly once, best first
- use only the given ids
- prefer clauses that directly answer the query with specific relevant language
"""

    try:
        if provider == "cerebras":
            parsed = _call_cerebras_json(prompt, max_tokens=600)
        else:
            parsed = _call_groq_json(prompt, max_tokens=500)
        ranking = parsed.get("ranking")
        if not isinstance(ranking, list):
            raise ValueError("Missing or invalid 'ranking' array")

        id_to_clause = {c["clause_id"]: c for c in candidates if "clause_id" in c}
        reranked = [id_to_clause[i] for i in ranking if i in id_to_clause]

        # If Groq omitted something, append leftovers in original order.
        seen = {c["clause_id"] for c in reranked}
        for c in candidates:
            if c["clause_id"] not in seen:
                reranked.append(c)

        return reranked[:top_k]
    except Exception as e:
        logger.warning("Rerank failed; using original order. Error: %s", e)
        return clauses[:top_k]

