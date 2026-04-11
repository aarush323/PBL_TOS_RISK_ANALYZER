import httpx
import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)

CEREBRAS_API_URL = "https://api.cerebras.ai/v1/chat/completions"
CEREBRAS_MODEL = "llama3.1-8b"

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.1-8b-instant"

OLLAMA_URL = "http://localhost:11434/api/chat"
OLLAMA_MODEL = "qwen3.5:9b"

MAX_CONTEXT_CHARS = 12000


async def chat_with_document_rag(
    query: str,
    document_text: str,
    conversation: list[dict],
    clauses: list[dict],
) -> str:
    """
    Send a chat request to the LLM with RAG-retrieved clauses as context.

    Args:
        query: Current user question
        document_text: Full document text (for fallback only)
        conversation: List of {"role": "user"|"assistant", "content": "..."} messages
        clauses: Retrieved clauses from pgvector

    Returns:
        The assistant's response string
    """
    from chat.context_builder import build_single_doc_context, build_fallback_context

    if clauses:
        messages = build_single_doc_context(clauses, conversation, query)
    else:
        messages = build_fallback_context(document_text, conversation, query)

    cerebras_api_key = os.environ.get("CEREBRAS_API_KEY")

    if cerebras_api_key:
        try:
            logger.info("RAG Chat request via Cerebras...")
            response = httpx.post(
                CEREBRAS_API_URL,
                headers={
                    "Authorization": f"Bearer {cerebras_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": CEREBRAS_MODEL,
                    "messages": messages,
                    "temperature": 0.3,
                    "max_completion_tokens": 800,
                },
                timeout=120.0,
            )
            response.raise_for_status()
            reply = response.json()["choices"][0]["message"]["content"]
            logger.info(f"Cerebras RAG response received ({len(reply)} chars)")
            return reply.strip()
        except Exception as e:
            logger.warning(f"Cerebras RAG error: {e}. Falling back to Groq...")

    groq_api_key = os.environ.get("GROQ_API_KEY")
    if groq_api_key:
        try:
            logger.info("RAG Chat request via Groq...")
            response = httpx.post(
                GROQ_API_URL,
                headers={"Authorization": f"Bearer {groq_api_key}"},
                json={
                    "model": GROQ_MODEL,
                    "messages": messages,
                    "temperature": 0.3,
                    "max_completion_tokens": 800,
                },
                timeout=120.0,
            )
            response.raise_for_status()
            reply = response.json()["choices"][0]["message"]["content"]
            logger.info(f"Groq RAG response received ({len(reply)} chars)")
            return reply.strip()
        except Exception as e:
            logger.warning(f"Groq RAG error: {e}. Falling back to Ollama...")

    try:
        logger.info("RAG Chat request via Ollama...")
        response = httpx.post(
            OLLAMA_URL,
            json={
                "model": OLLAMA_MODEL,
                "messages": messages,
                "stream": False,
                "options": {"temperature": 0.3, "num_predict": 800},
            },
            timeout=120.0,
        )
        response.raise_for_status()
        reply = response.json()["message"]["content"]
        logger.info(f"Ollama RAG response received ({len(reply)} chars)")
        return reply.strip()
    except Exception as e:
        logger.error(f"Ollama RAG error: {e}")
        raise RuntimeError(f"Both LLM providers failed. Last error: {e}")


async def chat_comparison(
    query: str,
    doc_a_clauses: list[dict],
    doc_b_clauses: list[dict],
    source_a: str,
    source_b: str,
    conversation: list[dict],
) -> str:
    """
    Send a comparison chat request to the LLM.

    Args:
        query: Comparison question
        doc_a_clauses: Clauses from document A
        doc_b_clauses: Clauses from document B
        source_a: Label for document A
        source_b: Label for document B
        conversation: Chat history

    Returns:
        The assistant's comparison response
    """
    from chat.context_builder import build_comparison_context

    messages = build_comparison_context(
        doc_a_clauses, doc_b_clauses, source_a, source_b, conversation, query
    )

    cerebras_api_key = os.environ.get("CEREBRAS_API_KEY")

    if cerebras_api_key:
        try:
            logger.info("Comparison chat request via Cerebras...")
            response = httpx.post(
                CEREBRAS_API_URL,
                headers={
                    "Authorization": f"Bearer {cerebras_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": CEREBRAS_MODEL,
                    "messages": messages,
                    "temperature": 0.3,
                    "max_completion_tokens": 1000,
                },
                timeout=120.0,
            )
            response.raise_for_status()
            reply = response.json()["choices"][0]["message"]["content"]
            logger.info(f"Cerebras comparison response received ({len(reply)} chars)")
            return reply.strip()
        except Exception as e:
            logger.warning(f"Cerebras comparison error: {e}. Falling back to Groq...")

    groq_api_key = os.environ.get("GROQ_API_KEY")
    if groq_api_key:
        try:
            logger.info("Comparison chat request via Groq...")
            response = httpx.post(
                GROQ_API_URL,
                headers={"Authorization": f"Bearer {groq_api_key}"},
                json={
                    "model": GROQ_MODEL,
                    "messages": messages,
                    "temperature": 0.3,
                    "max_completion_tokens": 1000,
                },
                timeout=120.0,
            )
            response.raise_for_status()
            reply = response.json()["choices"][0]["message"]["content"]
            logger.info(f"Groq comparison response received ({len(reply)} chars)")
            return reply.strip()
        except Exception as e:
            logger.warning(f"Groq comparison error: {e}. Falling back to Ollama...")

    try:
        logger.info("Comparison chat request via Ollama...")
        response = httpx.post(
            OLLAMA_URL,
            json={
                "model": OLLAMA_MODEL,
                "messages": messages,
                "stream": False,
                "options": {"temperature": 0.3, "num_predict": 1000},
            },
            timeout=120.0,
        )
        response.raise_for_status()
        reply = response.json()["message"]["content"]
        logger.info(f"Ollama comparison response received ({len(reply)} chars)")
        return reply.strip()
    except Exception as e:
        logger.error(f"Ollama comparison error: {e}")
        raise RuntimeError(f"Both LLM providers failed. Last error: {e}")


def truncate_document(text: str) -> str:
    """Truncate document text to fit within context limits."""
    if len(text) <= MAX_CONTEXT_CHARS:
        return text
    return text[:MAX_CONTEXT_CHARS] + "\n\n... [Document truncated for context length]"


def chat_with_document(document_text: str, conversation: list[dict]) -> str:
    """
    Legacy sync method for backward compatibility.
    Sends a chat request to the LLM with the document as context.

    Args:
        document_text: The full extracted text of the ToS document
        conversation: List of {"role": "user"|"assistant", "content": "..."} messages

    Returns:
        The assistant's response string
    """
    SYSTEM_PROMPT = """You are a helpful legal document assistant. You have been given the full text of a Terms of Service / Privacy Policy document. Your job is to answer user questions about this document accurately and clearly.

Rules:
- Only answer based on information present in the document. If the answer is not in the document, say so.
- Use simple, plain English that a non-lawyer can understand.
- When referencing specific clauses, quote the relevant text briefly.
- Be concise but thorough.
- If the user asks about risks, explain them in practical terms — what it means for the user.
- Do not make up information that is not in the document.

DOCUMENT:
{document_text}"""

    system_msg = SYSTEM_PROMPT.format(document_text=truncate_document(document_text))

    messages = [{"role": "system", "content": system_msg}]

    recent = conversation[-20:]
    for msg in recent:
        messages.append({"role": msg["role"], "content": msg["content"]})

    cerebras_api_key = os.environ.get("CEREBRAS_API_KEY")

    if cerebras_api_key:
        try:
            logger.info("Chat request via Cerebras...")
            response = httpx.post(
                CEREBRAS_API_URL,
                headers={
                    "Authorization": f"Bearer {cerebras_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": CEREBRAS_MODEL,
                    "messages": messages,
                    "temperature": 0.3,
                    "max_completion_tokens": 800,
                },
                timeout=120.0,
            )
            response.raise_for_status()
            reply = response.json()["choices"][0]["message"]["content"]
            logger.info(f"Cerebras chat response received ({len(reply)} chars)")
            return reply.strip()
        except Exception as e:
            logger.warning(f"Cerebras chat error: {e}. Falling back to Groq...")

    groq_api_key = os.environ.get("GROQ_API_KEY")
    if groq_api_key:
        try:
            logger.info("Chat request via Groq...")
            response = httpx.post(
                GROQ_API_URL,
                headers={"Authorization": f"Bearer {groq_api_key}"},
                json={
                    "model": GROQ_MODEL,
                    "messages": messages,
                    "temperature": 0.3,
                    "max_completion_tokens": 800,
                },
                timeout=120.0,
            )
            response.raise_for_status()
            reply = response.json()["choices"][0]["message"]["content"]
            logger.info(f"Groq chat response received ({len(reply)} chars)")
            return reply.strip()
        except Exception as e:
            logger.warning(f"Groq chat error: {e}. Falling back to Ollama...")

    try:
        logger.info("Chat request via Ollama...")
        response = httpx.post(
            OLLAMA_URL,
            json={
                "model": OLLAMA_MODEL,
                "messages": messages,
                "stream": False,
                "options": {"temperature": 0.3, "num_predict": 800},
            },
            timeout=120.0,
        )
        response.raise_for_status()
        reply = response.json()["message"]["content"]
        logger.info(f"Ollama chat response received ({len(reply)} chars)")
        return reply.strip()
    except Exception as e:
        logger.error(f"Ollama chat error: {e}")
        raise RuntimeError(f"Both LLM providers failed. Last error: {e}")
