import re
import logging

logger = logging.getLogger(__name__)

BOILERPLATE_PATTERNS = [
    r"last updated[:\s]+[\w\s,]+\d{4}",
    r"effective date[:\s]+[\w\s,]+\d{4}",
    r"print this page",
    r"back to top",
    r"table of contents",
    r"jump to section",
    r"skip to (main )?content",
    r"©\s*\d{4}.*?(inc|llc|ltd|corp)[\.\s]",
    r"all rights reserved",
    r"^\s*page \d+\s*$",
    r"^\s*\d+\s*$",
]

ENCODING_REPLACEMENTS = {
    "\u2019": "'",
    "\u2018": "'",
    "\u201c": '"',
    "\u201d": '"',
    "\u2013": "-",
    "\u2014": "-",
    "\u00a0": " ",
    "\u2022": "-",
    "\u00b7": "-",
}

def fix_encoding_artifacts(text: str) -> str:
    for char, replacement in ENCODING_REPLACEMENTS.items():
        text = text.replace(char, replacement)
    return text

def remove_boilerplate(text: str) -> str:
    for pattern in BOILERPLATE_PATTERNS:
        text = re.sub(pattern, "", text, flags=re.IGNORECASE | re.MULTILINE)
    return text

def remove_urls_and_emails(text: str) -> str:
    text = re.sub(r"http[s]?://\S+", "", text)
    text = re.sub(r"\S+@\S+\.\S+", "", text)
    return text

def normalize_whitespace(text: str) -> str:
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    lines = [line.rstrip() for line in text.split("\n")]
    return "\n".join(lines)

def clean_text(raw: dict) -> dict:
    logger.info("Cleaning text...")
    text = raw["raw_text"]
    char_count_before = len(text)
    logger.info(f"Characters before cleaning: {char_count_before}")

    text = fix_encoding_artifacts(text)
    text = remove_boilerplate(text)
    text = remove_urls_and_emails(text)
    text = normalize_whitespace(text)
    text = text.strip()

    paragraphs = [
        p.strip()
        for p in text.split("\n\n")
        if len(p.strip()) > 40
    ]

    char_count_after = len(text)
    logger.info(f"Characters after cleaning: {char_count_after}")
    logger.info(f"Paragraphs generated: {len(paragraphs)}")

    return {
        **raw,
        "cleaned_text": text,
        "paragraphs": paragraphs,
        "char_count": char_count_after,
        "line_count": len(text.split("\n")),
        "paragraph_count": len(paragraphs)
    }
