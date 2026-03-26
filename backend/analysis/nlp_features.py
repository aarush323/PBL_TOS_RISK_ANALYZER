import logging
import re

logger = logging.getLogger(__name__)

_RISK_LEXICON = [
    (re.compile(r'\b(?:collect|personal data|personal information|third[- ]party|share your|sell|track|monitor|location|cookie|advertising|data retention|retain your|profiling)\b', re.IGNORECASE), 1.0, "Privacy Risk"),
    (re.compile(r'\b(?:arbitration|arbitrate|class action|waive|waiver|jurisdiction|governing law|indemnify|indemnification|liability|lawsuit|litigation|legal action|dispute resolution|binding)\b', re.IGNORECASE), 1.0, "Legal Risk"),
    (re.compile(r'\b(?:terminate|termination|suspend|ban|at our discretion|without notice|without reason|content ownership|license to use|irrevocable|perpetual license|royalty-free|opt-out|opt out)\b', re.IGNORECASE), 1.0, "User Rights Risk"),
    (re.compile(r'\b(?:data breach|security incident|encryption|unauthorized access|cannot guarantee|no guarantee|best efforts|not responsible for|as is)\b', re.IGNORECASE), 1.0, "Security Risk"),
    (re.compile(r'\b(?:auto-renew|automatic renewal|automatically charged|non-refundable|no refund|subscription fee|price change|price increase|billing|charge)\b', re.IGNORECASE), 1.0, "Financial Risk")
]

BOILERPLATE_REGEX = re.compile(r'\b(?:pursuant|herein|aforementioned)\b', re.IGNORECASE)
MODAL_REGEX = re.compile(r'\b(?:may|might|can|could|shall|will|reserve|discretion|sole discretion)\b', re.IGNORECASE)
NEGATION_REGEX = re.compile(r'\b(?:not|no|never|neither|nor|cannot|won\'t|don\'t|doesn\'t|isn\'t|aren\'t|waive|waiver|disclaim|disclaimer)\b', re.IGNORECASE)

RISK_SCORE_THRESHOLD = 2.0

def extract_features(clause_text: str) -> dict:
    clause_lower = clause_text.lower()
    
    modal_hits = list(set(MODAL_REGEX.findall(clause_lower)))
    has_negation = bool(NEGATION_REGEX.search(clause_lower))
    
    triggered_categories = set()
    risk_score = 0.0
    matched_any_risk = False
    
    for pattern, weight, category in _RISK_LEXICON:
        if pattern.search(clause_lower):
            matched_any_risk = True
            triggered_categories.add(category)
            risk_score += weight
            
    if matched_any_risk and has_negation:
        risk_score += 0.5  # amplify slightly
        
    if modal_hits:
        risk_score += 0.5  # small bonus for modal verbs
        
    if not matched_any_risk:
        if BOILERPLATE_REGEX.search(clause_lower):
            risk_score -= 1.0  # boilerplate penalty
            
    return {
        "modal_verbs": modal_hits,
        "has_negation": has_negation,
        "triggered_categories": list(triggered_categories),
        "entity_types": [],
        "risk_score": risk_score
    }

def is_likely_risky(features: dict) -> bool:
    return features.get("risk_score", 0.0) >= RISK_SCORE_THRESHOLD
