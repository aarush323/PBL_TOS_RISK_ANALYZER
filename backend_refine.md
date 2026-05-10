# Backend Refinements Plan

## 1. Chatbot Bugs — Identified Issues & Fixes

### Bug 1: Chat Not Immediately Available After Analysis Starts

**Root Cause:** In `App.jsx` line 458, `initChatSession()` is called **without `await`**:

```js
// App.jsx:458 — MISSING await
initChatSession(data.extraction.cleaned_text, data.job_id);
```

This means the `sessionId` state may not be set by the time the user tries to chat, and the `POST /chat/store` request races with the UI render.

**Additionally:** The chat session is only initialized **after** extraction succeeds (line 457-459). If extraction is slow (URL), the chat is blocked until extraction completes AND the `POST /chat/store` call finishes AND the background indexing starts.

**Fix:**
- Add `await` to the `initChatSession` call in `startAnalysis()`
- Set `sessionId` **immediately** when `job_id` is created (line 454), not after `/chat/store` completes
- This allows the chat popup to show as enabled instantly, even if RAG indexing is still in progress (the backend already falls back to full-doc mode when `is_indexed=false`)

**Files:** `frontend/src/App.jsx` (line 458), `backend/main.py` (no change needed — fallback already works)

---

### Bug 2: RAG Indexing Takes Minutes, No User Feedback

**Root Cause:** `_index_document_background()` (main.py:390) calls `index_document()` which generates embeddings via Gemini API. The comment on line 392-393 says it takes **~3.5 minutes**. During this time:
- `session.is_indexed = False`
- Chat falls back to full-doc context (truncated to 12000 chars)
- User has **no visibility** into indexing progress
- No indicator that RAG mode will activate later

**Fix:**
- Add a `GET /chat/{session_id}/index/status` polling mechanism on the frontend (endpoint already exists at line 942!)
- Show a subtle badge in the chat popup: "🔄 Indexing for smart retrieval..." → "✅ Smart retrieval active"
- The endpoint returns `is_indexed`, `clause_count`, `indexed_at`, `risky_clause_count`

**Files:** `frontend/src/components/ChatPopup.jsx` (add status polling), `frontend/src/App.jsx` (trigger polling)

---

### Bug 3: Chat Session 404 on History Reload

**Root Cause:** When opening a history item (`openHistoryAnalysis`, App.jsx:275), the code tries to:
1. Load chat history (`loadChatHistory`, line 290)
2. If no history exists, call `initChatSession` with fallback text (line 293)

But `initChatSession` uses `data.source` as the document text (line 292), which is just the URL/filename — **not the actual document content**. So the chat session is created with a garbage document, making LLM responses useless.

```js
// App.jsx:292 — THIS IS WRONG
const fallbackText = data.source || 'Loaded from saved analysis.';
await initChatSession(fallbackText, data.job_id);
```

**Fix:**
- The `/analyses/{job_id}` endpoint should also return the document text (or at minimum, confirm a chat session exists)
- If no chat session exists for a historical analysis, create one from the stored document in the DB
- Add a backend endpoint `POST /chat/restore/{job_id}` that recreates the chat session from the analysis's original document text

**Files:** `backend/main.py` (new endpoint or modify `/analyses/{job_id}`), `frontend/src/App.jsx`

---

### Bug 4: Narrative Verdict Pollutes Chat History

**Root Cause:** `fetchNarrativeVerdict()` (App.jsx:602-634) sends a system-like prompt through the **regular chat endpoint** (`POST /chat`). This means:
- The verdict prompt gets **saved to chat history** in the DB (main.py:729-730)
- When user reopens this analysis, they see the verdict prompt as a "user" message
- It pollutes the actual conversation flow
- The LLM sees the verdict prompt in its conversation context for subsequent messages

**Fix:**
- Move summary generation to a **dedicated backend endpoint** (as described in `refinements_pbl.md`)
- Short-term: Add a `skip_history: bool` field to the `ChatRequest` model and skip `add_chat_message()` when true
- Long-term: Use the new `POST /analyze/summary/{job_id}` endpoint instead

**Files:** `backend/main.py` (ChatRequest model + chat endpoint logic)

---

### Bug 5: `chat_with_document` Legacy Sync — Blocks Event Loop

**Root Cause:** When RAG is not available, the fallback at main.py:722 uses:

```python
reply = await asyncio.to_thread(chat_with_document, session.document_text, conversation)
```

`chat_with_document` in `chatbot.py` (line 221) is a synchronous function using `httpx.Client()` (not async). While `asyncio.to_thread` prevents blocking the event loop, it still ties up a thread pool worker for the entire HTTP call to Cerebras/Groq.

**Fix:**
- Convert `chat_with_document` to use `httpx.AsyncClient` (like `chat_with_document_rag` already does)
- Remove the `asyncio.to_thread` wrapper
- This is straightforward since `chat_with_document_rag` already shows the async pattern

**Files:** `backend/chat/chatbot.py` (refactor `chat_with_document` to async)

---

### Bug 6: RAG Re-Indexing Fires Every Time You Visit a History Item

**Root Cause:** Two issues working together:

1. **Frontend:** `openHistoryAnalysis` (App.jsx:275) calls `initChatSession(fallbackText, data.job_id)` whenever chat history is empty (line 293). The `fallbackText` is `data.source` (the URL/filename), **not** the actual document text.

2. **Backend:** `POST /chat/store` (main.py:536) **always** resets `is_indexed = False` and **always** triggers `_index_document_background()`, even if the session was already fully indexed:

```python
# main.py:551-559 — THE BUG
existing = await crud.get_chat_session(db, session_id)
if existing:
    existing.document_text = document_text    # ← overwrites with garbage URL
    existing.is_indexed = False               # ← RESETS indexed status!
    await db.commit()
# ...
background_tasks.add_task(_index_document_background, ...)  # ← ALWAYS re-indexes!
```

**Impact:**
- Every time user opens a previously analyzed document, a ~3.5 minute Gemini embedding job fires
- The already-indexed embeddings get deleted and recreated with garbage text (URL string)
- RAG quality degrades because the document text is now "https://discord.com/terms" instead of actual ToS content
- Unnecessary API costs and server load

**Fix (Backend — `main.py`, `/chat/store` endpoint):**
```python
existing = await crud.get_chat_session(db, session_id)
if existing:
    # Skip re-indexing if already indexed with the same (or longer) document
    if existing.is_indexed and len(existing.document_text or '') >= len(document_text):
        return {
            "status": "already_indexed",
            "session_id": session_id,
            "char_count": len(existing.document_text),
            "indexing": "skipped",
        }
    existing.document_text = document_text
    existing.is_indexed = False
    await db.commit()
```

**Fix (Frontend — `App.jsx`, `openHistoryAnalysis`):**
- Before calling `initChatSession`, first check if a chat session already exists by calling `GET /chat/{session_id}/index/status`
- If session exists (200 response), **don't** call `/chat/store` again — just set `sessionId` state
- Only call `initChatSession` if the session truly doesn't exist (404 response)

```js
// App.jsx — openHistoryAnalysis, BEFORE calling initChatSession:
try {
  const statusRes = await fetch(`${API}/chat/${data.job_id}/index/status`, { headers });
  if (statusRes.ok) {
    // Session exists, just set sessionId — DON'T re-store
    setSessionId(data.job_id);
    return;
  }
} catch (e) { /* session doesn't exist, proceed to create */ }
```

**Files:** `backend/main.py` (guard in `/chat/store`), `frontend/src/App.jsx` (guard in `openHistoryAnalysis`)

**Risk:** None — this only prevents redundant re-indexing. New analyses and genuinely updated documents still index normally.

---

## 2. Summary Generation — Move to Backend

> Full details in `refinements_pbl.md`. Summary of backend changes:

### New: `backend/analysis/summary_generator.py`
- `aggregate_signals(analysis_result)` → computes confidence distribution, critical phrase inventory, NLP aggregates, category cross-correlations
- `generate_executive_summary(analysis_result)` → builds a rich LLM prompt with ALL signals, returns structured JSON with `professional_summary`, `executive_summary`, `key_findings`, `top_concern`, `recommendation`

### Modify: `backend/main.py`
- New endpoint: `POST /analyze/summary/{job_id}` (on-demand)
- Integrate into `_run_analysis_background()` — auto-generate after analysis completes
- Include summaries in `analyze_status` response

### Modify: `backend/analysis/analyzer.py`
- Add `aggregate_signals()` that computes enriched metadata from analysis results

---

## 3. Report Generation — Backend Endpoint

> Full details in `refinements_pbl.md`. Summary of backend changes:

### New: `backend/analysis/report_generator.py`
- `generate_full_report(analysis_result, source_info)` → multi-section report via LLM
- Sections: Executive Summary, Key Findings, Category Deep Dives, Compliance Assessment, Critical Clauses, Action Plan
- Returns structured JSON so frontend can render each section independently

### Modify: `backend/main.py`
- New endpoint: `POST /report/generate/{job_id}` — triggers report generation
- New endpoint: `GET /report/{job_id}` — retrieves cached report
- Report generation is on-demand (heavier than summaries)

---

## 4. Other Backend Quick Fixes

### Fix A: Missing `severity_score` on NLP-skipped clauses

**Issue:** Clauses that pass NLP filter but are skipped by LLM (`skipped_llm: true`) have no `severity_score` field set. The frontend defaults to `0`, which is correct, but it causes issues in the severity heatmap visualization.

**Fix:** In `analyzer.py`, explicitly set `severity_score: 0.0` for skipped clauses (line 148-156).

### Fix B: `_calc_score_from_result` duplicated logic

**Issue:** Score calculation exists in **two places**: `App.jsx:636` (frontend) and `main.py:896` (backend). They use different formulas and produce different numbers for the same data.

**Fix:** Remove the frontend calculation entirely. Have the backend include `safety_score` in the analysis result during `_run_analysis_background()`.

### Fix C: Missing error handling in comparison flow

**Issue:** `_handle_comparison` (main.py:740) can crash if `compare_service.run()` throws — it catches the Exception but returns a dict without `session_id`, which the frontend doesn't handle well.

**Fix:** Ensure all error return dicts include `session_id: body.session_id`.

### Fix D: Temp file cleanup race condition

**Issue:** `extract_pdf` (main.py:358) writes to `/tmp/{file.filename}`. Two concurrent uploads with the same filename will overwrite each other.

**Fix:** Use `uuid.uuid4()` in the temp filename: `/tmp/{uuid4()}_{file.filename}`.

---

## Implementation Priority

| Priority | Task | Risk | Effort |
|----------|------|------|--------|
| 🔴 P0 | Bug 1: Add `await` to initChatSession | None | 1 min |
| 🔴 P0 | Bug 6: Stop RAG re-indexing on history visit | None | 15 min |
| 🔴 P0 | Bug 4: Stop verdict from polluting chat history | Low | 15 min |
| 🟡 P1 | Fix B: Unify score calculation in backend | Low | 30 min |
| 🟡 P1 | Bug 3: Fix history chat session restore | Low | 45 min |
| 🟡 P1 | Fix A: Add severity_score to skipped clauses | None | 5 min |
| 🟢 P2 | Bug 2: Show RAG indexing status in chat | None | 30 min |
| 🟢 P2 | Bug 5: Convert chat_with_document to async | Low | 20 min |
| 🟢 P2 | Fix D: UUID temp filenames | None | 5 min |
| 🔵 P3 | Summary generation backend | Low | 2-3 hrs |
| 🔵 P3 | Report generation backend | Low | 3-4 hrs |
