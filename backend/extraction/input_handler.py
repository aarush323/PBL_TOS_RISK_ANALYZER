from .url_extractor import extract_from_url
from .pdf_extractor import extract_from_pdf
from .text_cleaner import clean_text
import logging

logger = logging.getLogger(__name__)

def handle_input(input_type: str, content: str) -> dict:
    logger.info("Starting extraction pipeline")
    logger.info(f"Input type: {input_type}")
    """
    input_type: "url" | "pdf" | "text"
    content:    URL string | filepath string | raw text string

    Returns:
    {
        source_type: str,
        source: str,
        raw_text: str,
        cleaned_text: str,
        paragraphs: list[str],
        char_count: int,
        line_count: int,
        paragraph_count: int
    }
    """
    if input_type == "url":
        raw = extract_from_url(content)
    elif input_type == "pdf":
        raw = extract_from_pdf(content)
    elif input_type == "text":
        logger.info("Direct text input received")
        raw = {
            "source_type": "text",
            "source": "direct_input",
            "raw_text": content
        }
    else:
        raise ValueError(
            f"Unknown input_type: '{input_type}'. Must be 'url', 'pdf', or 'text'."
        )

    result = clean_text(raw)
    logger.info("Extraction pipeline completed")
    return result
