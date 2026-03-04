import spacy
import logging

logger = logging.getLogger(__name__)

nlp = spacy.load("en_core_web_sm")

# Modal verbs that signal vague, unilateral power
RISK_MODALS = {
    "may", "might", "can", "could", "shall", "will",
    "reserve", "discretion", "sole discretion"
}

# Phrases that directly signal risk categories
RISK_KEYWORDS = {
    "Privacy Risk": [
        "collect", "personal data", "personal information",
        "third party", "third-party", "share your", "sell",
        "track", "monitor", "location", "cookie", "advertising",
        "data retention", "retain your", "profiling"
    ],
    "Legal Risk": [
        "arbitration", "arbitrate", "class action", "waive",
        "waiver", "jurisdiction", "governing law", "indemnify",
        "indemnification", "liability", "lawsuit", "litigation",
        "legal action", "dispute resolution", "binding"
    ],
    "User Rights Risk": [
        "terminate", "termination", "suspend", "ban",
        "at our discretion", "without notice", "without reason",
        "content ownership", "license to use", "irrevocable",
        "perpetual license", "royalty-free", "opt-out", "opt out"
    ],
    "Security Risk": [
        "data breach", "security incident", "encryption",
        "unauthorized access", "cannot guarantee", "no guarantee",
        "best efforts", "not responsible for", "as is"
    ],
    "Financial Risk": [
        "auto-renew", "automatic renewal", "automatically charged",
        "non-refundable", "no refund", "subscription fee",
        "price change", "price increase", "billing", "charge"
    ]
}

# Negation words — signals rights being taken away
NEGATION_WORDS = {
    "not", "no", "never", "neither", "nor", "cannot",
    "won't", "don't", "doesn't", "isn't", "aren't",
    "waive", "waiver", "disclaim", "disclaimer"
}


def extract_features(clause_text: str) -> dict:
    doc = nlp(clause_text.lower())
    tokens = [token.text for token in doc]
    token_set = set(tokens)

    # Modal verb detection
    modal_hits = [m for m in RISK_MODALS if m in clause_text.lower()]

    # Negation detection
    has_negation = bool(token_set & NEGATION_WORDS)

    # Named entity types present
    entity_types = list(set(ent.label_ for ent in doc.ents))

    # Risk keyword hits per category
    keyword_hits = {}
    triggered_categories = []
    for category, keywords in RISK_KEYWORDS.items():
        hits = [kw for kw in keywords if kw in clause_text.lower()]
        if hits:
            keyword_hits[category] = hits
            triggered_categories.append(category)

    # Structural signals
    has_money = any(ent.label_ == "MONEY" for ent in doc.ents)
    has_date = any(ent.label_ == "DATE" for ent in doc.ents)
    has_org = any(ent.label_ == "ORG" for ent in doc.ents)
    sentence_count = len(list(doc.sents))

    return {
        "modal_verbs": modal_hits,
        "has_negation": has_negation,
        "entity_types": entity_types,
        "has_money_entity": has_money,
        "has_date_entity": has_date,
        "has_org_entity": has_org,
        "triggered_categories": triggered_categories,
        "keyword_hits": keyword_hits,
        "sentence_count": sentence_count,
        "char_length": len(clause_text)
    }


def is_likely_risky(features: dict) -> bool:
    """
    Pre-filter: only send to LLM if clause shows some risk signal.
    Saves Ollama compute time on clearly benign clauses.
    """
    return bool(
        features["modal_verbs"] or
        features["has_negation"] or
        features["triggered_categories"]
    )
