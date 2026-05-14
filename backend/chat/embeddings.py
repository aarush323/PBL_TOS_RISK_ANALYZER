import logging
import os

from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

from settings import EMBEDDING_MODEL, EMBEDDING_DIM, GEMINI_API_KEY

_client = None


def _get_client():
    global _client
    if _client is None:
        if not GEMINI_API_KEY:
            raise RuntimeError(
                "GEMINI_API_KEY environment variable is not set. "
                "Get one from https://aistudio.google.com/app/apikey"
            )
        _client = genai.Client(api_key=GEMINI_API_KEY)
        logger.info(f"Gemini embedding configured: {EMBEDDING_MODEL} (dim={EMBEDDING_DIM})")
    return _client


def get_model():
    _get_client()
    return EMBEDDING_MODEL


def embed_text(text: str) -> list[float]:
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


def embed_batch(texts: list[str], batch_size: int = 20) -> list[list[float]]:
    if not texts:
        return []

    import time

    client = _get_client()
    all_embeddings = []
    max_retries = 3

    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]

        for attempt in range(max_retries):
            try:
                result = client.models.embed_content(
                    model=EMBEDDING_MODEL,
                    contents=batch,
                    config=types.EmbedContentConfig(
                        task_type="RETRIEVAL_DOCUMENT",
                        output_dimensionality=EMBEDDING_DIM,
                    ),
                )
                all_embeddings.extend([e.values for e in result.embeddings])
                break
            except Exception as e:
                if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                    wait = 16 * (attempt + 1)
                    logger.warning(f"Rate limited, waiting {wait}s (attempt {attempt + 1}/{max_retries})")
                    time.sleep(wait)
                else:
                    raise

        if i + batch_size < len(texts):
            time.sleep(13)

    return all_embeddings


def cosine_similarity(a: list[float], b: list[float]) -> float:
    import math

    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)
