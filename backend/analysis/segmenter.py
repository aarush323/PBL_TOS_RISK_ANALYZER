import re
import spacy
import logging

logger = logging.getLogger(__name__)

nlp = spacy.load("en_core_web_sm")

# Headings are not clauses — they label sections
# If a paragraph matches this it gets attached to the next paragraph as context
HEADING_PATTERN = re.compile(
    r"^(\d+[\.\)]\s+|[A-Z][A-Z\s]{2,50}$|[IVXLCDM]+\.\s+)",
)

# If a paragraph contains these it likely has multiple distinct obligations
# and should be split further by spaCy sentence boundaries
SPLIT_INDICATORS = [
    "additionally,",
    "furthermore,",
    "in addition,",
    "however,",
    "notwithstanding",
    "provided that",
    "except that",
]

MIN_CLAUSE_LENGTH = 40    # chars — shorter than this is a fragment
MAX_CLAUSE_LENGTH = 1200  # chars — longer than this gets sentence-split


def is_heading(text: str) -> bool:
    stripped = text.strip()
    if len(stripped) > 120:
        return False
    if HEADING_PATTERN.match(stripped):
        return True
    # All caps short line = heading
    if stripped.isupper() and len(stripped.split()) <= 10:
        return True
    return False


def should_split(text: str) -> bool:
    if len(text) > MAX_CLAUSE_LENGTH:
        return True
    text_lower = text.lower()
    return any(indicator in text_lower for indicator in SPLIT_INDICATORS)


def split_by_sentences(text: str) -> list[str]:
    doc = nlp(text)
    sentences = [sent.text.strip() for sent in doc.sents]

    # Merge very short sentences back into previous
    merged = []
    buffer = ""
    for sent in sentences:
        if len(buffer) + len(sent) < MIN_CLAUSE_LENGTH * 2:
            buffer = (buffer + " " + sent).strip()
        else:
            if buffer:
                merged.append(buffer)
            buffer = sent
    if buffer:
        merged.append(buffer)

    return [s for s in merged if len(s) > MIN_CLAUSE_LENGTH]


def segment_clauses(paragraphs: list[str]) -> list[dict]:
    logger.info(f"Segmenting {len(paragraphs)} paragraphs into clauses")
    clauses = []
    clause_id = 0
    pending_heading = None

    for para in paragraphs:
        para = para.strip()

        if not para or len(para) < MIN_CLAUSE_LENGTH:
            continue

        if is_heading(para):
            pending_heading = para
            continue

        if should_split(para):
            sub_clauses = split_by_sentences(para)
            for sub in sub_clauses:
                clauses.append({
                    "id": clause_id,
                    "text": sub,
                    "section_heading": pending_heading,
                    "char_length": len(sub)
                })
                clause_id += 1
            pending_heading = None
        else:
            clauses.append({
                "id": clause_id,
                "text": para,
                "section_heading": pending_heading,
                "char_length": len(para)
            })
            clause_id += 1
            pending_heading = None

    logger.info(f"Segmentation complete: {len(clauses)} clauses produced")
    return clauses
