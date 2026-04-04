"""
Embedding service using sentence-transformers.
Model: all-MiniLM-L6-v2 (384 dimensions, CPU-friendly, fast)
"""

import logging
from functools import lru_cache
from typing import Optional

logger = logging.getLogger(__name__)

_model = None
_model_name = "sentence-transformers/all-MiniLM-L6-v2"


def _load_model():
    global _model
    if _model is None:
        try:
            from sentence_transformers import SentenceTransformer

            logger.info(f"Loading embedding model: {_model_name}")
            _model = SentenceTransformer(_model_name)
            logger.info("Embedding model loaded successfully")
        except ImportError:
            logger.error(
                "sentence-transformers not installed. Run: pip install sentence-transformers"
            )
            raise
    return _model


def get_model():
    return _load_model()


def embed_text(text: str) -> list[float]:
    """
    Embed a single string. Returns list of 384 floats.

    Args:
        text: Single text string to embed

    Returns:
        List of 384 float values (normalized)
    """
    model = get_model()
    embedding = model.encode(text, normalize_embeddings=True)
    return embedding.tolist()


def embed_batch(texts: list[str], batch_size: int = 32) -> list[list[float]]:
    """
    Embed multiple strings at once. More efficient than looping.

    Args:
        texts: List of text strings to embed
        batch_size: Batch size for processing (default 32)

    Returns:
        List of embedding lists (each 384 floats)
    """
    if not texts:
        return []

    model = get_model()
    embeddings = model.encode(
        texts,
        normalize_embeddings=True,
        batch_size=batch_size,
        show_progress_bar=False,
    )
    return embeddings.tolist()


def cosine_similarity(a: list[float], b: list[float]) -> float:
    """Compute cosine similarity between two vectors."""
    import math

    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)
