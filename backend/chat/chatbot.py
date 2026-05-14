import httpx
import logging
from typing import Optional

logger = logging.getLogger(__name__)

from settings import CEREBRAS_API_URL, CEREBRAS_MODEL, GROQ_API_URL, GROQ_MODEL, OLLAMA_URL, OLLAMA_MODEL, MAX_CONTEXT_CHARS


async def chat_with_document_rag(
    query: str,
    document_text: str,
    conversation: list[dict],
    clauses: list[dict],
) -> str:
    from .context_builder import build_rag_context

    context = build_rag_context(query, document_text, conversation, clauses, use_rag=True)
    return await _call_chat_llm(context)


async def chat_with_document(
    document_text: str,
    conversation: list[dict],
) -> str:
    from .context_builder import build_rag_context

    context = build_rag_context("", document_text, conversation, [], use_rag=False)
    return await _call_chat_llm(context)


async def _call_chat_llm(context: str) -> str:
    cerebras_key = os.environ.get("CEREBRAS_API_KEY")
    groq_key = os.environ.get("GROQ_API_KEY")

    if cerebras_key:
        try:
            return await _call_cerebras(context, cerebras_key)
        except Exception as e:
            logger.warning(f"Cerebras failed, trying Groq: {e}")
            if groq_key:
                return await _call_groq(context, groq_key)
            raise

    if groq_key:
        return await _call_groq(context, groq_key)

    return await _call_ollama(context)


async def _call_cerebras(context: str, api_key: str) -> str:
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            CEREBRAS_API_URL,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": CEREBRAS_MODEL,
                "messages": [{"role": "user", "content": context}],
                "max_tokens": 2048,
                "temperature": 0.3,
            },
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]


async def _call_groq(context: str, api_key: str) -> str:
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            GROQ_API_URL,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": GROQ_MODEL,
                "messages": [{"role": "user", "content": context}],
                "max_tokens": 2048,
                "temperature": 0.3,
            },
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]


async def _call_ollama(context: str) -> str:
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            f"{OLLAMA_URL}/api/chat",
            json={
                "model": OLLAMA_MODEL,
                "messages": [{"role": "user", "content": context}],
                "stream": False,
            },
        )
        resp.raise_for_status()
        return resp.json()["message"]["content"]
