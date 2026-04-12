"""
Embedding service using Google Gemini text-embedding-004 API.
Configured to output 384 dimensions to match existing DB schema.
"""

import logging
import os

import google.generativeai as genai

logger = logging.getLogger(__name__)

_configured = False
EMBEDDING_MODEL = "models/text-embedding-004"
EMBEDDING_DIM = 384


def _ensure_configured():
    global _configured
    if not _configured:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError(
                "GEMINI_API_KEY environment variable is not set. "
                "Get one from https://aistudio.google.com/app/apikey"
            )
        genai.configure(api_key=api_key)
        _configured = True
        logger.info(f"Gemini embedding configured: {EMBEDDING_MODEL} (dim={EMBEDDING_DIM})")


def get_model():
    """Kept for backward compatibility. Returns the model name string."""
    _ensure_configured()
    return EMBEDDING_MODEL


def embed_text(text: str) -> list[float]:
    """
    Embed a single string. Returns list of 384 floats.

    Args:
        text: Single text string to embed

    Returns:
        List of 384 float values
    """
    _ensure_configured()
    result = genai.embed_content(
        model=EMBEDDING_MODEL,
        content=text,
        task_type="retrieval_document",
        output_dimensionality=EMBEDDING_DIM,
    )
    return result["embedding"]


def embed_batch(texts: list[str], batch_size: int = 32) -> list[list[float]]:
    """
    Embed multiple strings at once via Gemini API.

    Args:
        texts: List of text strings to embed
        batch_size: Batch size for processing (default 32)

    Returns:
        List of embedding lists (each 384 floats)
    """
    if not texts:
        return []

    _ensure_configured()
    all_embeddings = []

    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        result = genai.embed_content(
            model=EMBEDDING_MODEL,
            content=batch,
            task_type="retrieval_document",
            output_dimensionality=EMBEDDING_DIM,
        )
        all_embeddings.extend(result["embedding"])

    return all_embeddings


def cosine_similarity(a: list[float], b: list[float]) -> float:
    """Compute cosine similarity between two vectors."""
    import math

    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)
