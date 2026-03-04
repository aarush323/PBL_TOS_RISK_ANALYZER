import pdfplumber
import logging

logger = logging.getLogger(__name__)

def extract_from_pdf(filepath: str) -> dict:
    logger.info(f"Starting PDF extraction: {filepath}")
    full_text = []

    with pdfplumber.open(filepath) as pdf:
        num_pages = len(pdf.pages)
        logger.info(f"PDF loaded: {num_pages} pages")
        skipped_pages = 0
        for page_num, page in enumerate(pdf.pages):
            text = page.extract_text(
                x_tolerance=3,
                y_tolerance=3
            )
            if not text or len(text.strip()) < 10:
                skipped_pages += 1
                continue
            full_text.append(text)
        
        if skipped_pages > 0:
            logger.info(f"Pages skipped: {skipped_pages}")

    if not full_text:
        raise ValueError(
            "PDF appears to be empty or image-based (no extractable text). "
            "Please upload a text-based PDF."
        )

    extracted_text = "\n".join(full_text)
    logger.info(f"Final extracted text length: {len(extracted_text)}")
    return {
        "source_type": "pdf",
        "source": filepath,
        "raw_text": extracted_text
    }
