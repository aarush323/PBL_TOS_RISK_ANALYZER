from .chatbot import chat_with_document, chat_with_document_rag, chat_comparison
from .embeddings import embed_text, embed_batch, get_model
from .indexer import index_document, get_index_status, reindex_document, delete_index
from .retriever import (
    retrieve_for_session,
    retrieve_for_comparison,
    get_clauses_by_category,
    get_clause_by_id,
    get_risks_summary,
)
from .context_builder import (
    build_single_doc_context,
    build_fallback_context,
    build_comparison_context,
)

__all__ = [
    "chat_with_document",
    "chat_with_document_rag",
    "chat_comparison",
    "embed_text",
    "embed_batch",
    "get_model",
    "index_document",
    "get_index_status",
    "reindex_document",
    "delete_index",
    "retrieve_for_session",
    "retrieve_for_comparison",
    "get_clauses_by_category",
    "get_clause_by_id",
    "get_risks_summary",
    "build_single_doc_context",
    "build_fallback_context",
    "build_comparison_context",
]
