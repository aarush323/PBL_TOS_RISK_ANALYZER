"""
`chat` package public API.

This module intentionally avoids eager imports because some submodules
initialize database connections at import time (via `db.connection`).
We expose the same API via lazy imports to keep import side-effects minimal.
"""

from __future__ import annotations

import importlib
from typing import Any

_EXPORTS: dict[str, tuple[str, str]] = {
    # chatbot
    "chat_with_document": (".chatbot", "chat_with_document"),
    "chat_with_document_rag": (".chatbot", "chat_with_document_rag"),
    "chat_comparison": (".chatbot", "chat_comparison"),
    # embeddings
    "embed_text": (".embeddings", "embed_text"),
    "embed_batch": (".embeddings", "embed_batch"),
    "get_model": (".embeddings", "get_model"),
    # indexer
    "index_document": (".indexer", "index_document"),
    "get_index_status": (".indexer", "get_index_status"),
    "reindex_document": (".indexer", "reindex_document"),
    "delete_index": (".indexer", "delete_index"),
    # retriever
    "retrieve_for_session": (".retriever", "retrieve_for_session"),
    "retrieve_for_comparison": (".retriever", "retrieve_for_comparison"),
    "get_clauses_by_category": (".retriever", "get_clauses_by_category"),
    "get_clause_by_id": (".retriever", "get_clause_by_id"),
    "get_risks_summary": (".retriever", "get_risks_summary"),
    # context builder
    "build_single_doc_context": (".context_builder", "build_single_doc_context"),
    "build_fallback_context": (".context_builder", "build_fallback_context"),
    "build_comparison_context": (".context_builder", "build_comparison_context"),
}

__all__ = list(_EXPORTS.keys())


def __getattr__(name: str) -> Any:
    if name not in _EXPORTS:
        raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
    module_name, attr_name = _EXPORTS[name]
    mod = importlib.import_module(module_name, __name__)
    return getattr(mod, attr_name)


def __dir__() -> list[str]:
    return sorted(list(globals().keys()) + list(_EXPORTS.keys()))
