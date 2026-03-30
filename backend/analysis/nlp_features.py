"""
nlp_features.py  ·  ToS Risk Pre-Filter
Strategy: Lenient inclusion — prefer false positives (send to LLM) over
false negatives (silently discard risky clauses).
"""

import re
from typing import Optional
import logging

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────
#  RISK LEXICON  (weight, category, patterns)
#  Weights reflect severity of a single match:
#    2.0 → near-certain risk on its own
#    1.5 → strong signal
#    1.0 → moderate signal
#    0.5 → weak / supporting signal
# ─────────────────────────────────────────────
_RISK_LEXICON: list[tuple[re.Pattern, float, str]] = [

    # ── Privacy ──────────────────────────────────────────────────────────
    (re.compile(
        r'\b(?:collect(?:s|ing|ion)?|personal (?:data|information)|'
        r'third[- ]part(?:y|ies)|share your|sell(?:s|ing)?|'
        r'track(?:s|ing)?|monitor(?:s|ing)?|location(?: data)?|'
        r'cookie(?:s)?|advertising|data retention|retain your|'
        r'profil(?:e|ing)|cross[- ]device|behavioral(?:ly)?|'
        r'fingerprint(?:ing)?|infer(?:red|ring)?|aggregate(?:d)?|'
        r'de[- ]?identif(?:y|ied|ication)|biometric|'
        r'demographic(?:s)?|browsing history|usage data)\b',
        re.IGNORECASE,
    ), 1.5, "Privacy Risk"),

    # ── Legal / Dispute ───────────────────────────────────────────────────
    (re.compile(
        r'\b(?:arbitrat(?:e|ion|or)|class[- ]action|waiv(?:e|er|ing)|'
        r'jurisdiction|governing law|indemnif(?:y|ication|ied)|'
        r'liabilit(?:y|ies)|lawsuit|litigat(?:e|ion)|legal action|'
        r'dispute resolution|binding|sole[- ]and[- ]exclusive remedy|'
        r'attorneys? fees?|court(?:s)?|forum|venue|'
        r'without limitation|to the fullest extent|'
        r'applicable law)\b',
        re.IGNORECASE,
    ), 1.5, "Legal Risk"),

    # ── User Rights ───────────────────────────────────────────────────────
    (re.compile(
        r'\b(?:terminat(?:e|ion|ed)|suspend(?:s|ed|ing)?|ban(?:ned)?|'
        r'at (?:our|its) (?:sole )?discretion|without notice|'
        r'without (?:cause|reason)|content ownership|'
        r'licen(?:se|ce) to use|irrevocable|perpetual licen(?:se|ce)|'
        r'royalty[- ]free|opt[- ]out|unilateral(?:ly)?|'
        r'modify (?:these )?terms|change (?:these )?terms|'
        r'update (?:these )?terms|reserve the right|'
        r'at any time|in our sole)\b',
        re.IGNORECASE,
    ), 1.5, "User Rights Risk"),

    # ── Security / Liability Disclaimer ───────────────────────────────────
    (re.compile(
        r'\b(?:data breach|security incident|encryption|'
        r'unauthorized access|cannot guarantee|no guarantee|'
        r'best efforts|not responsible for|as[- ]is|'
        r'at your own risk|no warrant(?:y|ies)|disclaim(?:s|er)?|'
        r'limitation of liability|consequential damages|'
        r'indirect damages|incidental damages|'
        r'to the maximum extent)\b',
        re.IGNORECASE,
    ), 1.5, "Security Risk"),

    # ── Financial ─────────────────────────────────────────────────────────
    (re.compile(
        r'\b(?:auto[- ]renew(?:al|s)?|automatic(?:ally)? (?:charged|renewed|billed)|'
        r'non[- ]refundable|no refund|subscription fee|'
        r'price (?:change|increase)|billing|charg(?:e|es|ing)|'
        r'cancellation fee|early termination|'
        r'without (?:prior )?notice|retroactive(?:ly)?)\b',
        re.IGNORECASE,
    ), 1.5, "Financial Risk"),

    # ── IP / Content Ownership ────────────────────────────────────────────
    (re.compile(
        r'\b(?:intellectual property|user[- ]generated content|'
        r'grant(?:s|ing)? (?:us )?a licen(?:se|ce)|'
        r'sublicen(?:se|ce)|assign(?:ment|s|ing)|'
        r'work[- ]for[- ]hire|moral rights|'
        r'all rights reserved|transfer of rights|'
        r'worldwide licen(?:se|ce))\b',
        re.IGNORECASE,
    ), 1.0, "IP Risk"),
]

# ─────────────────────────────────────────────
#  AMPLIFIER signals (raise score when present)
# ─────────────────────────────────────────────
_MODAL_REGEX = re.compile(
    r'\b(?:may|might|can|could|shall|will|must|'
    r'reserve|discretion|sole discretion|elect to)\b',
    re.IGNORECASE,
)
_NEGATION_REGEX = re.compile(
    r'\b(?:not|no\b|never|neither|nor|cannot|won\'t|don\'t|'
    r"doesn't|isn't|aren't|waive|disclaim|except|exclude|limit)\b",
    re.IGNORECASE,
)
# Broad rights / power language that amplifies any matched risk
_POWER_LANGUAGE_REGEX = re.compile(
    r'\b(?:solely|exclusively|unilaterally|unconditionally|'
    r'in perpetuity|irrevocably|without limitation|'
    r'absolute(?:ly)?|at any time|for any reason)\b',
    re.IGNORECASE,
)

# ─────────────────────────────────────────────
#  NOISE FILTERS  (reduce score for junk text)
# ─────────────────────────────────────────────
_BOILERPLATE_REGEX = re.compile(
    r'\b(?:pursuant|herein|aforementioned|hereinafter|'
    r'whereas|witnesseth|recital)\b',
    re.IGNORECASE,
)
# Table of contents / navigation lines are usually short and page-numbered
_TOC_LINE_REGEX = re.compile(
    r'(?:\.{3,}|\s{3,})\d+\s*$'   # "Section 4 ......... 12"
    r'|^\s*\d+\s*\.\s+[A-Z][^.]{0,60}$',  # "1. Introduction"
    re.MULTILINE,
)
_MIN_CLAUSE_LENGTH = 30   # anything shorter is likely a heading or stub

# ─────────────────────────────────────────────
#  ZERO TOLERANCE
#  Critical phrases that always pass, no scoring.
# ─────────────────────────────────────────────
_ZERO_TOLERANCE = re.compile(
    r'\b(?:class[- ]action waiver|binding arbitration|'
    r'irrevocable licen(?:se|ce)|sell(?:s|ing)? (?:your )?data|'
    r'no refund|non[- ]refundable|terminate (?:your )?account|'
    r'at our sole discretion|as[- ]is)\b',
    re.IGNORECASE,
)

# ─────────────────────────────────────────────
#  THRESHOLDS
# ─────────────────────────────────────────────
RISK_SCORE_THRESHOLD = 1.0
LONG_CLAUSE_FALLBACK_CHARS = 300


def extract_features(clause_text: str) -> dict:
    """
    Score a clause for risk. Returns a feature dict with:
      - risk_score       float  (higher = riskier)
      - triggered_categories  list[str]
      - modal_verbs      list[str]
      - has_negation     bool
      - has_power_lang   bool
      - is_noise         bool  (ToC line, stub, boilerplate)
    """
    text = clause_text.strip()

    # ── Noise pre-check ──────────────────────────────────────────────────
    is_toc_line   = bool(_TOC_LINE_REGEX.search(text))
    is_stub       = len(text) < _MIN_CLAUSE_LENGTH
    is_boilerplate = bool(_BOILERPLATE_REGEX.search(text))
    is_noise = is_toc_line or is_stub

    # ── Risk lexicon scan ─────────────────────────────────────────────────
    triggered_categories: set[str] = set()
    risk_score = 0.0

    for pattern, weight, category in _RISK_LEXICON:
        if pattern.search(text):
            triggered_categories.add(category)
            risk_score += weight

    # ── Amplifiers ───────────────────────────────────────────────────────
    modal_hits   = list(set(_MODAL_REGEX.findall(text)))
    has_negation = bool(_NEGATION_REGEX.search(text))
    has_power    = bool(_POWER_LANGUAGE_REGEX.search(text))

    if triggered_categories:          # only amplify when a risk was found
        if modal_hits:   risk_score += 0.3
        if has_negation: risk_score += 0.3
        if has_power:    risk_score += 0.5   # strong power language is high signal

    # ── Penalties ────────────────────────────────────────────────────────
    if is_noise:
        risk_score = 0.0   # hard-zero ToC lines and stubs
    elif is_boilerplate and not triggered_categories:
        risk_score -= 0.5  # soft penalty only when no real risk fired

    return {
        "risk_score":            round(risk_score, 3),
        "triggered_categories":  sorted(list(triggered_categories)),
        "modal_verbs":           modal_hits,
        "has_negation":          has_negation,
        "has_power_language":    has_power,
        "is_noise":              is_noise,
        "entity_types":          [],
    }


def is_likely_risky(features: dict, original_text: str = "") -> bool:
    """
    Returns True if the clause should be sent to the LLM.
    Combines scored risk, zero-tolerance phrases, and length-based fallbacks.
    """
    if features.get("is_noise"):
        return False
        
    if original_text and _ZERO_TOLERANCE.search(original_text):
        return True   # always send, no scoring needed
        
    if features.get("risk_score", 0.0) >= RISK_SCORE_THRESHOLD:
        return True
        
    # Long clauses that contain *any* legal/modal language get a second chance
    if (len(original_text) >= LONG_CLAUSE_FALLBACK_CHARS
            and (features.get("modal_verbs") or features.get("has_negation"))):
        return True
        
    return False
