"""
Builds system prompt with retrieved clauses for LLM calls.
Replaces the current hardcoded SYSTEM_PROMPT in chatbot.py.
"""

import logging

logger = logging.getLogger(__name__)

MAX_CONTEXT_CLAUSES = 8
MAX_CLAUSE_TEXT_LEN = 800


def _format_clause_for_context(clause: dict) -> str:
    """Format a single clause for inclusion in the system prompt."""
    clause_id = clause.get("clause_id", "?")
    section = clause.get("section_heading") or "General"
    risks = clause.get("risk_categories", [])
    severity = clause.get("severity_score", 0)

    risk_str = ", ".join(risks) if risks else "No risk detected"
    severity_str = f"Severity: {severity:.1f}" if severity > 0 else ""

    header_parts = [f"Clause {clause_id}"]
    if risks:
        header_parts.append(f"[{risk_str}]")
    if severity_str:
        header_parts.append(f"[{severity_str}]")
    header_parts.append(f"- {section}")

    header = " ".join(header_parts)

    text = clause.get("clause_text", "")
    if len(text) > MAX_CLAUSE_TEXT_LEN:
        text = text[:MAX_CLAUSE_TEXT_LEN] + "..."

    return f'[{header}]\n"{text}"\n'


def _build_relevant_clauses_section(clauses: list[dict]) -> str:
    """Build the relevant clauses section of the system prompt."""
    if not clauses:
        return "No relevant clauses found in the document."

    sections = []
    for clause in clauses:
        sections.append(_format_clause_for_context(clause))

    return "\n".join(sections)


SYSTEM_PROMPT_TEMPLATE = """You are a helpful legal document assistant for Jurist AI. Your job is to answer user questions about Terms of Service and Privacy Policy documents accurately and clearly.

RULES:
- Only answer based on information present in the retrieved clauses
- If the answer is not in the clauses, say so clearly
- Use simple, plain English that a non-lawyer can understand
- When referencing specific clauses, quote the relevant text briefly
- Be concise but thorough
- If the user asks about risks, explain them in practical terms — what it means for the user
- Do not make up information that is not in the document
- Cite clause numbers when referencing specific information

RELEVANT CLAUSES FROM THE DOCUMENT:
{relevant_clauses}

CONVERSATION HISTORY:
{conversation_history}

USER'S QUESTION: {user_question}

Your answer:"""


FALLBACK_PROMPT_TEMPLATE = """You are a helpful legal document assistant for Jurist AI. You have been given the full text of a Terms of Service / Privacy Policy document. Your job is to answer user questions about this document accurately and clearly.

RULES:
- Only answer based on information present in the document
- If the answer is not in the document, say so
- Use simple, plain English that a non-lawyer can understand
- When referencing specific clauses, quote the relevant text briefly
- Be concise but thorough
- If the user asks about risks, explain them in practical terms
- Do not make up information that is not in the document

DOCUMENT:
{document_text}

CONVERSATION HISTORY:
{conversation_history}

USER'S QUESTION: {user_question}

Your answer:"""


COMPARISON_PROMPT_TEMPLATE = """You are comparing two legal documents for Jurist AI. Your job is to analyze and compare specific aspects of both documents based on the user's question.

RULES:
- Compare directly and objectively based on the retrieved clauses
- State which document is riskier per category when applicable
- Cite specific clause numbers from each document (e.g., "Doc A, Clause 3")
- Use simple, plain English that a non-lawyer can understand
- If a document doesn't address a topic, note that explicitly
- Be thorough but concise in your comparison

DOCUMENT A: {source_a}
{clauses_a}

DOCUMENT B: {source_b}
{clauses_b}

CONVERSATION HISTORY:
{conversation_history}

COMPARISON QUESTION: {question}

Your comparison:"""


def build_single_doc_context(
    clauses: list[dict],
    conversation_history: list[dict],
    user_question: str,
) -> list[dict]:
    """
    Build messages array for single-doc RAG chat.

    Args:
        clauses: Retrieved clauses from pgvector
        conversation_history: List of {"role": str, "content": str}
        user_question: Current user question

    Returns:
        List of message dicts for LLM
    """
    relevant_clauses = _build_relevant_clauses_section(clauses[:MAX_CONTEXT_CLAUSES])

    history_str = ""
    if conversation_history:
        history_lines = []
        for msg in conversation_history[-6:]:
            role = "User" if msg["role"] == "user" else "Assistant"
            history_lines.append(f"{role}: {msg['content'][:200]}")
        history_str = "\n".join(history_lines)
    else:
        history_str = "(First question - no history)"

    system_content = SYSTEM_PROMPT_TEMPLATE.format(
        relevant_clauses=relevant_clauses,
        conversation_history=history_str,
        user_question=user_question,
    )

    messages = [
        {"role": "system", "content": system_content},
        {"role": "user", "content": user_question},
    ]

    return messages


def build_fallback_context(
    document_text: str,
    conversation_history: list[dict],
    user_question: str,
) -> list[dict]:
    """
    Build messages array using full document (fallback when not indexed).

    Args:
        document_text: Full document text
        conversation_history: List of messages
        user_question: Current user question

    Returns:
        List of message dicts for LLM
    """
    MAX_DOC_CHARS = 12000
    truncated_doc = document_text[:MAX_DOC_CHARS]
    if len(document_text) > MAX_DOC_CHARS:
        truncated_doc += "\n\n... [Document truncated for context length]"

    history_str = ""
    if conversation_history:
        history_lines = []
        for msg in conversation_history[-6:]:
            role = "User" if msg["role"] == "user" else "Assistant"
            history_lines.append(f"{role}: {msg['content'][:200]}")
        history_str = "\n".join(history_lines)
    else:
        history_str = "(First question - no history)"

    system_content = FALLBACK_PROMPT_TEMPLATE.format(
        document_text=truncated_doc,
        conversation_history=history_str,
        user_question=user_question,
    )

    messages = [
        {"role": "system", "content": system_content},
        {"role": "user", "content": user_question},
    ]

    return messages


def build_comparison_context(
    doc_a_clauses: list[dict],
    doc_b_clauses: list[dict],
    source_a: str,
    source_b: str,
    conversation_history: list[dict],
    question: str,
) -> list[dict]:
    """
    Build messages array for document comparison.

    Args:
        doc_a_clauses: Clauses from first document
        doc_b_clauses: Clauses from second document
        source_a: Name/label for document A
        source_b: Name/label for document B
        conversation_history: List of messages
        question: Comparison question

    Returns:
        List of message dicts for LLM
    """
    clauses_a_str = _build_relevant_clauses_section(doc_a_clauses[:MAX_CONTEXT_CLAUSES])
    clauses_b_str = _build_relevant_clauses_section(doc_b_clauses[:MAX_CONTEXT_CLAUSES])

    history_str = ""
    if conversation_history:
        history_lines = []
        for msg in conversation_history[-6:]:
            role = "User" if msg["role"] == "user" else "Assistant"
            history_lines.append(f"{role}: {msg['content'][:200]}")
        history_str = "\n".join(history_lines)
    else:
        history_str = "(First question - no history)"

    system_content = COMPARISON_PROMPT_TEMPLATE.format(
        source_a=source_a,
        clauses_a=clauses_a_str,
        source_b=source_b,
        clauses_b=clauses_b_str,
        conversation_history=history_str,
        question=question,
    )

    messages = [
        {"role": "system", "content": system_content},
        {"role": "user", "content": question},
    ]

    return messages
