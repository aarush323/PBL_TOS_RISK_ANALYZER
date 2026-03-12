import httpx
import logging
import os
from dotenv import load_dotenv

env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env"))
load_dotenv(dotenv_path=env_path)

logger = logging.getLogger(__name__)

CEREBRAS_API_URL = "https://api.cerebras.ai/v1/chat/completions"
CEREBRAS_MODEL = "llama3.1-8b"

OLLAMA_URL = "http://localhost:11434/api/chat"
OLLAMA_MODEL = "qwen3.5:9b"

# Maximum document characters to include in context (to avoid token limits)
MAX_CONTEXT_CHARS = 12000

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


def truncate_document(text: str) -> str:
    """Truncate document text to fit within context limits."""
    if len(text) <= MAX_CONTEXT_CHARS:
        return text
    return text[:MAX_CONTEXT_CHARS] + "\n\n... [Document truncated for context length]"


def build_messages(document_text: str, conversation: list[dict]) -> list[dict]:
    """Build the messages array for the LLM with system prompt + conversation history."""
    system_msg = SYSTEM_PROMPT.format(document_text=truncate_document(document_text))

    messages = [{"role": "system", "content": system_msg}]

    # Add conversation history (last 10 exchanges max to stay within limits)
    recent = conversation[-20:]  # 20 messages = 10 user+assistant pairs
    for msg in recent:
        messages.append({
            "role": msg["role"],
            "content": msg["content"]
        })

    return messages


def chat_with_document(document_text: str, conversation: list[dict]) -> str:
    """
    Send a chat request to the LLM with the document as context.

    Args:
        document_text: The full extracted text of the ToS document
        conversation: List of {"role": "user"|"assistant", "content": "..."} messages

    Returns:
        The assistant's response string
    """
    messages = build_messages(document_text, conversation)
    cerebras_api_key = os.environ.get("CEREBRAS_API_KEY")

    # --- Try Cerebras ---
    if cerebras_api_key:
        try:
            logger.info("Chat request via Cerebras...")
            response = httpx.post(
                CEREBRAS_API_URL,
                headers={
                    "Authorization": f"Bearer {cerebras_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": CEREBRAS_MODEL,
                    "messages": messages,
                    "temperature": 0.3,
                    "max_completion_tokens": 800
                },
                timeout=120.0
            )
            response.raise_for_status()
            reply = response.json()["choices"][0]["message"]["content"]
            logger.info(f"Cerebras chat response received ({len(reply)} chars)")
            return reply.strip()
        except Exception as e:
            logger.warning(f"Cerebras chat error: {e}. Falling back to Ollama...")

    # --- Fallback to Ollama ---
    try:
        logger.info("Chat request via Ollama...")
        response = httpx.post(
            OLLAMA_URL,
            json={
                "model": OLLAMA_MODEL,
                "messages": messages,
                "stream": False,
                "options": {
                    "temperature": 0.3,
                    "num_predict": 800
                }
            },
            timeout=120.0
        )
        response.raise_for_status()
        reply = response.json()["message"]["content"]
        logger.info(f"Ollama chat response received ({len(reply)} chars)")
        return reply.strip()
    except Exception as e:
        logger.error(f"Ollama chat error: {e}")
        raise RuntimeError(f"Both LLM providers failed. Last error: {e}")
