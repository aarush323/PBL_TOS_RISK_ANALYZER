"""
Embedding utilities.

Default: ONNX embeddings via `fastembed` (Hugging Face models, CPU-friendly).
Fallback: spaCy document vectors (kept for safety / minimal environments).
"""

import logging
import os
from functools import lru_cache

logger = logging.getLogger(__name__)

DEFAULT_FASTEMBED_MODEL = os.getenv("FASTEMBED_MODEL", "BAAI/bge-small-en-v1.5")
EMBEDDINGS_PROVIDER = os.getenv("EMBEDDINGS_PROVIDER", "fastembed").lower().strip()

def _should_use_fastembed() -> bool:
    if EMBEDDINGS_PROVIDER in {"spacy"}:
        return False
    # Default to fastembed if installed.
    try:
        import fastembed  # noqa: F401

        return True
    except Exception:
        return False


def get_model():
    """
    Backwards-compatible accessor for the active embedding backend.

    Historically this returned a spaCy `nlp` object; now it may return a
    `fastembed.TextEmbedding` instance when `EMBEDDINGS_PROVIDER=fastembed`.
    """
    return _get_fastembed() if _should_use_fastembed() else _get_spacy()


@lru_cache(maxsize=1)
def _get_fastembed():
    from fastembed import TextEmbedding

    model_name = DEFAULT_FASTEMBED_MODEL
    logger.info("Loading fastembed model: %s", model_name)
    return TextEmbedding(model_name=model_name)


@lru_cache(maxsize=1)
def _get_spacy():
    import spacy

    logger.info("Loading spaCy model: en_core_web_sm")
    return spacy.load("en_core_web_sm")


def _doc_vector(text: str) -> list[float]:
    """
    Compute an embedding vector for a single string.
    """
    if _should_use_fastembed():
        embedder = _get_fastembed()
        # fastembed returns an iterator of numpy arrays
        vec = next(embedder.embed([text]))
        return vec.tolist()

    nlp = _get_spacy()
    doc = nlp(text)
    return doc.vector.tolist()


def embed_text(text: str) -> list[float]:
    """
    Embed a single string.
    """
    if not text:
        return []
    return _doc_vector(text)


def embed_batch(texts: list[str]) -> list[list[float]]:
    """
    Embed multiple strings at once.
    """
    if not texts:
        return []

    if _should_use_fastembed():
        embedder = _get_fastembed()
        return [vec.tolist() for vec in embedder.embed(texts)]

    nlp = _get_spacy()
    docs = list(nlp.pipe(texts))
    return [doc.vector.tolist() for doc in docs]


def cosine_similarity(a: list[float], b: list[float]) -> float:
    """Compute cosine similarity between two vectors."""
    import math

    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)
