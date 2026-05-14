"""
scoring.py — Risk Score computation for Jurist AI.

The score is an asymptotic function of severity-weighted contributions from every
flagged clause:  score = 100 * raw / (raw + 75).  This avoids the hard cap that
flattened all documents with many risky clauses to 100.

The LLM owns per-clause severity (0-4); we just apply the weight table so that a
single Critical clause (4) contributes 10 points, a High (3) contributes 6,
Medium (2) 4, Low (1) 2.

  0  = no risk at all
  approaches 100 as raw grows (but never reaches it asymptotically)
"""

# How many points each level of LLM-judged severity contributes.
# Severity 0 (not risky) is never in the risky_clauses list, but included
# as a safety net.
SEVERITY_WEIGHTS = {0: 0, 1: 2, 2: 4, 3: 6, 4: 10}


def compute_risk_score(risky_clauses: list[dict]) -> int:
    """
    Compute a 0-100 Risk Score from the LLM-judged severity of each flagged clause.

    Args:
        risky_clauses: List of clause dicts that are flagged as risky.
                       Each must have a "severity_score" key (int 0-4).

    Returns:
        Integer risk score in [0, 100]. Returns 0 for empty/clean documents.
    """
    if not risky_clauses:
        return 0

    raw = sum(
        SEVERITY_WEIGHTS.get(c.get("severity_score", 0), 0)
        for c in risky_clauses
    )
    return round(100 * raw / (raw + 75))
