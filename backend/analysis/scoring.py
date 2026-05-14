"""
scoring.py — Unified Risk Score computation for Jurist AI.

This is the single source of truth for the Risk Score (0-100).
  0  = no risk at all (clean document)
  100 = maximum possible risk

The formula is based on Weighted Risk Density (WRD):
  1. Each risky clause contributes a normalised severity:
       norm = clause.severity_score / MAX_SEVERITY_PER_CLAUSE
     where MAX_SEVERITY_PER_CLAUSE = 8.5 (High confidence + all 5 categories)
  2. Sum those contributions and divide by total_clauses (not just risky ones)
     so that risk density (proportion of document that is risky) is baked in.
  3. Amplify and clamp to [0, 100].

No arbitrary hard floors. No magic subtractions. Fully deterministic.
"""

# Theoretical maximum a single clause can score via classifier.py:
#   confidence: High = 1.0
#   categories: Privacy=2.0 + Legal=1.8 + Security=1.5 + Financial=1.2 + UserRights=1.0 = 7.5
#   total = 1.0 + 7.5 = 8.5
MAX_SEVERITY_PER_CLAUSE: float = 8.5

# Calibration amplifier: scales so that typical real-world ToS docs
# (≈20-30% risky clauses, medium severity) land in the 30-60 range.
# Derivation:
#   At 20% density, avg severity 4.5:
#     wrd = (0.20 * (4.5/8.5)) = 0.106
#     with AMPLIFIER = 3.5 → raw = 0.106 * 3.5 = 0.37 → score = 37
#   At 40% density, avg severity 6.0 (very risky doc):
#     wrd = (0.40 * (6.0/8.5)) = 0.282
#     with AMPLIFIER = 3.5 → raw = 0.99 → score = 99  (capped at 100)
AMPLIFIER: float = 3.5


def compute_risk_score(risky_clauses: list[dict], total_clauses: int) -> int:
    """
    Compute a 0-100 Risk Score where higher = riskier.

    Args:
        risky_clauses: List of clause dicts that are flagged as risky.
                       Each must have a "severity_score" key (float).
        total_clauses: Total number of clauses in the document (including safe ones).

    Returns:
        Integer risk score in [0, 100]. Returns 0 for empty/clean documents.
    """
    if total_clauses == 0 or not risky_clauses:
        return 0

    # Sum the normalised severity contributions of every risky clause
    norm_contributions = [
        c.get("severity_score", 0.0) / MAX_SEVERITY_PER_CLAUSE
        for c in risky_clauses
    ]
    wrd = sum(norm_contributions) / total_clauses

    # Amplify and clamp to [0, 1], then scale to [0, 100]
    raw = min(1.0, wrd * AMPLIFIER)
    return round(raw * 100)
