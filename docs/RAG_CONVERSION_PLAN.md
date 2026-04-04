# Jurist AI Chatbot RAG Conversion Plan

## Executive Summary
Convert the existing simple document-retrieval chatbot to a full **Retrieval-Augmented Generation (RAG)** system that leverages the existing NLP infrastructure, integrates seamlessly with the privacy policy detector, and provides a valuable supplementary feature for users analyzing legal documents.

---

## 1. Current Architecture Analysis

### 1.1 Existing Chatbot (chatbot.py)
- **Retrieval Method**: Full document concatenation (truncated to 12K chars)
- **Context Window**: Limited to ~12,000 characters
- **Storage**: PostgreSQL - stores raw document text per session
- **LLM**: Cerebras (primary) → Ollama (fallback)
- **History**: Last 20 messages retained

### 1.2 Existing NLP Infrastructure (to leverage)
1. **spaCy** (`en_core_web_sm`) - sentence segmentation, NER
2. **Risk Lexicon** (`nlp_features.py`) - 5 risk categories with weighted keywords
3. **NLP Feature Extraction** - modal verbs, negation, power language detection
4. **Clause Segmenter** (`segmenter.py`) - document → structured clauses with headings
5. **5-Risk Classification System** - Privacy, Legal, User Rights, Security, Financial

### 1.3 Deployment Stack
- FastAPI backend on Railway/Render
- PostgreSQL database
- Cerebras API for LLM
- Optional: local Ollama fallback

---

## 2. RAG Architecture Design

### 2.1 System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER QUERY                                  │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     QUERY PROCESSING LAYER                          │
│  • Intent Detection (general question vs. clause-specific)         │
│  • NLP Feature Extraction (reuse from existing code)              │
│  • Risk Category Mapping (if user mentions risk type)              │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      RETRIEVAL ENGINE                               │
│  ┌─────────────────┐    ┌─────────────────┐    ┌────────────────┐  │
│  │ Clause Index   │    │  Heading Index │    │  Risk Index    │  │
│  │ (semantic)     │    │  (keyword)     │    │  (category)    │  │
│  └─────────────────┘    └─────────────────┘    └────────────────┘  │
│           │                     │                    │             │
│           └─────────────────────┼────────────────────┘             │
│                                 ▼                                    │
│                    HYBRID RETRIEVAL + RERANKING                     │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    CONTEXT COMPOSITION                              │
│  • Top-K relevant clauses                                           │
│  • Clause metadata (section, risk categories, severity)           │
│  • Conversation history                                             │
│  • System prompt with citation instructions                        │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         LLM RESPONSE                                │
│  • Cite specific clause numbers                                     │
│  • Reference risk categories                                       │
│  • Plain English explanations                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Component Design

#### 2.2.1 Vector Store (per-document)
Since each user's document is separate, use an **in-memory vector store** per session:
- **Embedding Model**: `sentence-transformers/all-MiniLM-L6-v2` (fast, 384 dimensions)
- **Storage**: SQLite file per session in `/tmp/` or PostgreSQL JSONB
- **Index**: Clause-level granularity (not document-level)

#### 2.2.2 Clause Metadata Schema
```python
ClauseMetadata:
  - clause_id: int
  - text: str
  - section_heading: str | None
  - char_length: int
  - risk_categories: list[str]  # from classifier
  - risk_score: float           # from nlp_features
  - is_risky: bool
  - severity_score: float       # from classifier
  - nlp_features: dict          # modal verbs, negation, entities
```

#### 2.2.3 Multi-Index Strategy
| Index | Purpose | Retrieval Method |
|-------|---------|-------------------|
| Clause Index | Semantic similarity | Dense embeddings (sentence-transformers) |
| Heading Index | Section navigation | Keyword matching + embeddings |
| Risk Index | Category-specific | Filter by risk category |

#### 2.2.4 Hybrid Retrieval Pipeline
1. **Route Query**: Detect if user wants:
   - General summary/explanation
   - Specific clause lookup
   - Risk-focused question
   - Navigation ("show me section about...")

2. **Retrieve**:
   - Semantic: Top 5 clauses via embeddings
   - Keyword: Exact matches on risk terms
   - Risk-aware: Filter by category if mentioned

3. **Rerank**: Combine scores, boost:
   - Clauses with higher severity
   - Clauses from earlier sections (position weight)
   - Clauses matching user's mentioned risk category

---

## 3. Feature Enhancement (Product Value)

### 3.1 Conversational Capabilities

#### 3.1.1 Clause-Level Q&A
- "What does clause 12 say about data retention?"
- "Find the arbitration clause"
- "Show me the privacy risk clauses"

#### 3.1.2 Risk-Focused Queries
- "What are the security risks?"
- "Summarize all financial obligations"
- "List privacy concerns in this document"

#### 3.1.3 Comparative Context
- "Explain this in simple terms"
- "What are the user's rights under this?"
- "What's the overall risk level?"

### 3.2 New API Capabilities

```python
# New endpoints to add
GET  /chat/{session_id}/clauses        # List all clauses with metadata
GET  /chat/{session_id}/clauses/{id}   # Get specific clause
GET  /chat/{session_id}/risks          # Get all risky clauses by category
GET  /chat/{session_id}/summary        # Document-level summary
POST /chat/{session_id}/reindex        # Force re-indexing
```

### 3.3 Integration with Privacy Policy Detector

| Chatbot Feature | Detector Integration |
|-----------------|----------------------|
| Show risky clauses | Pre-computed from analysis |
| Risk categories | Reuse 5-category system |
| Severity scores | Display alongside answers |
| Section navigation | Use segmentation from analyzer |
| NLP features | Reuse modal verb/negation detection |

---

## 4. Technical Implementation Plan

### 4.1 Phase 1: Foundation (Weeks 1-2)

**Goal**: Minimal viable RAG with no deployment risk

#### 4.1.1 Components
1. **Embedding Service** (`chat/embeddings.py`)
   - Sentence transformer wrapper
   - Batch encoding for clauses
   - Fallback to TF-IDF if needed

2. **Vector Store** (`chat/vector_store.py`)
   - Simple in-memory with pickle persistence
   - Per-session indexes
   - CRUD operations

3. **Clause Indexer** (`chat/indexer.py`)
   - Convert document → clauses (reuse segmenter)
   - Extract metadata (reuse analyzer data if available)
   - Build vector index

#### 4.1.2 API Changes
- Modify `store_document` to trigger indexing
- Add `reindex` endpoint for manual refresh

#### 4.1.3 Backward Compatibility
- **Keep existing chat endpoint working** - graceful degradation
- If indexing fails, fall back to full-document retrieval

### 4.2 Phase 2: Retrieval Engine (Weeks 2-3)

**Goal**: Full retrieval capabilities with hybrid search

#### 4.2.1 Components
1. **Query Processor** (`chat/query_processor.py`)
   - Intent detection (semantic vs. specific vs. risk-focused)
   - Extract filters (risk category, clause number, section)
   - Query refinement

2. **Retrieval Pipeline** (`chat/retriever.py`)
   - Multi-index lookup
   - Score fusion (RRF - Reciprocal Rank Fusion)
   - Metadata-based boosting

3. **Context Builder** (`chat/context_builder.py`)
   - Compose context from retrieved clauses
   - Add clause metadata to prompt
   - Citation formatting

### 4.3 Phase 3: Intelligence (Weeks 3-4)

**Goal**: Smart features using existing NLP

#### 4.3.1 Components
1. **Risk-Aware Responses**
   - Map user questions to risk categories
   - Filter/clusters retrieved by category

2. **NLP-Enhanced Prompts**
   - Include NLP features in context
   - Use modal verbs/negation for explanation

3. **Conversational Context**
   - Track mentioned clauses
   - Follow-up handling

### 4.4 Phase 4: Polish (Week 4-5)

**Goal**: Production-ready features

- Caching layer (Redis optional)
- Performance optimization (batch retrieval)
- Error handling & logging
- Documentation

---

## 5. Database Schema Changes

### 5.1 New Tables

```sql
-- Clause index cache (optional, can be file-based)
CREATE TABLE clause_indexes (
    session_id VARCHAR(255) PRIMARY KEY,
    indexed_at TIMESTAMP,
    clause_count INT,
    index_data JSONB  -- serialized vector index
);

-- Chat conversation enhancements
ALTER TABLE chat_messages ADD COLUMN mentioned_clauses JSONB;
ALTER TABLE chat_messages ADD COLUMN query_intent VARCHAR(50);
```

### 5.2 Existing Tables to Leverage
- `analysis_results` - Already has clause data with risk categories
- `chat_sessions` - Already stores document text

---

## 6. Integration Points

### 6.1 Reuse Existing Code

| Component | File | Reuse Strategy |
|-----------|------|---------------|
| spaCy | `analysis/segmenter.py` | Import `nlp` object |
| Risk Lexicon | `analysis/nlp_features.py` | Import `_RISK_LEXICON` |
| Clause Segmentation | `analysis/segmenter.py` | Call `segment_clauses()` |
| Risk Categories | `analysis/classifier.py` | Reuse 5 categories |
| NLP Features | `analysis/nlp_features.py` | Call `extract_features()` |
| Severity Scoring | `analysis/analyzer.py` | Call `compute_clause_severity()` |

### 6.2 Chat Endpoints to Add

```python
@app.get("/chat/{session_id}/clauses")
async def list_clauses(session_id: str, db: AsyncSession = Depends(get_db)):
    """List all clauses with metadata"""
    
@app.get("/chat/{session_id}/risks")
async def get_risks(session_id: str, category: str = None, db: AsyncSession = Depends(get_db)):
    """Get risky clauses filtered by category"""

@app.get("/chat/{session_id}/clauses/{clause_id}")
async def get_clause(session_id: str, clause_id: int, db: AsyncSession = Depends(get_db)):
    """Get specific clause with full details"""
```

---

## 7. Deployment Strategy

### 7.1 Zero-Downtime Migration

1. **Feature Flags**: 
   - Wrap new RAG logic behind flag `USE_RAG=true/false`
   - Default to existing method, enable gradually

2. **Gradual Rollout**:
   - Deploy code with RAG disabled
   - Enable for 10% of users
   - Monitor errors, scale up

3. **Fallback Chain**:
   ```
   RAG retrieval → 
   Full document context → 
   Simple keyword match → 
   "I couldn't find that"
   ```

### 7.2 Resource Considerations

| Resource | Estimate | Mitigation |
|----------|----------|------------|
| Embedding CPU | ~1s per document | Async indexing |
| Memory (vectors) | ~50KB per 100 clauses | Session-based cleanup |
| Latency | +200-500ms | Pre-index on store |

### 7.3 Railway/Render Compatibility

- Add `sentence-transformers` to requirements.txt
- Use CPU-based embeddings (no GPU needed)
- SQLite for vector storage (file-based, no additional DB)

---

## 8. Testing Plan

### 8.1 Unit Tests
- Clause indexer accuracy
- Query routing logic
- Retrieval scoring

### 8.2 Integration Tests
- End-to-end chat flow
- Fallback behavior
- Session persistence

### 8.3 A/B Testing
- RAG vs. simple retrieval response quality
- User satisfaction metrics

---

## 9. Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Embedding model fails to load | Low | High | Fallback to TF-IDF |
| Vector index corruption | Medium | Medium | Rebuild from clauses |
| Increased latency | Medium | Low | Caching, async |
| Memory issues with large docs | Low | Medium | Chunk limits, cleanup |

---

## 10. Success Metrics

### 10.1 Technical
- Query relevance (retrieved clauses match intent)
- Response accuracy (correct citations)
- Latency (< 3s end-to-end)

### 10.2 Product
- Chat engagement (messages per session)
- Feature discovery (clause browsing)
- Integration with analyzer (cross-usage)

---

## 11. Implementation Priority Matrix

| Priority | Feature | Effort | Impact |
|----------|---------|--------|--------|
| P0 | Basic RAG with embeddings | Medium | High |
| P0 | Clause metadata extraction | Low | High |
| P1 | Hybrid retrieval (semantic + keyword) | Medium | High |
| P1 | Risk category filtering | Low | High |
| P2 | Query intent detection | Medium | Medium |
| P2 | Clause browsing UI endpoints | Low | Medium |
| P3 | Caching layer | Medium | Low |
| P3 | Advanced reranking | High | Medium |

---

## 12. Summary

This plan transforms the chatbot from a simple document-retrieval system into a sophisticated RAG-powered assistant that:

1. **Leverages existing NLP**: Reuses risk lexicon, spaCy, classifier
2. **Integrates with detector**: Shares clause data, risk categories, severity
3. **No deployment risk**: Gradual rollout with fallbacks
4. **Valuable product**: Clause-level Q&A, risk filtering, section navigation
5. **Scalable**: Session-based indexes, minimal resource overhead

The chatbot becomes a **natural supplement** to the privacy policy detector - after users analyze a document, they can chat with it to explore specific clauses, understand risks, and get plain-English explanations.

---

*Plan created: April 2026*
*Next steps: Start Phase 1 implementation*