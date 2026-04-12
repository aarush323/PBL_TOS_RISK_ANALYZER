"""
Embedding service using Google Gemini Embedding API.
Model: gemini-embedding-001 (384 dimensions via output_dimensionality).
"""

import logging
import os

from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

_client = None
EMBEDDING_MODEL = "gemini-embedding-001"
EMBEDDING_DIM = 384


def _get_client():
    global _client
    if _client is None:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError(
                "GEMINI_API_KEY environment variable is not set. "
                "Get one from https://aistudio.google.com/app/apikey"
            )
        _client = genai.Client(api_key=api_key)
        logger.info(f"Gemini embedding configured: {EMBEDDING_MODEL} (dim={EMBEDDING_DIM})")
    return _client


def get_model():
    """Kept for backward compatibility. Returns the model name string."""
    _get_client()
    return EMBEDDING_MODEL


def embed_text(text: str) -> list[float]:
    """
    Embed a single string. Returns list of 384 floats.

    Args:
        text: Single text string to embed

    Returns:
        List of 384 float values
    """
    client = _get_client()
    result = client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=text,
        config=types.EmbedContentConfig(
            task_type="RETRIEVAL_DOCUMENT",
            output_dimensionality=EMBEDDING_DIM,
        ),
    )
    return result.embeddings[0].values


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

    client = _get_client()
    all_embeddings = []

    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        result = client.models.embed_content(
            model=EMBEDDING_MODEL,
            contents=batch,
            config=types.EmbedContentConfig(
                task_type="RETRIEVAL_DOCUMENT",
                output_dimensionality=EMBEDDING_DIM,
            ),
        )
        all_embeddings.extend([e.values for e in result.embeddings])

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
