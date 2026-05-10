# Frontend Improvements Plan

## 0. Project Setup — Prerequisites

The current frontend stack is:
- **Vite 8** + **React 19** + **JSX** (no TypeScript)
- **Tailwind CSS v4** via `@tailwindcss/vite` plugin
- **No shadcn/ui**, no `@/` path alias, no `components/ui` folder
- **No TypeScript** — all files are `.jsx`

### What Needs to Happen Before Component Integration

> [!IMPORTANT]
> The provided components are TypeScript (`.tsx`) with shadcn conventions (`@/components/ui`, `@/lib/utils`, `@/hooks`). Since this project is **vanilla JSX with no TypeScript**, we have two options:

#### Option A: Keep JSX — Convert components to JSX (Recommended for PBL timeline)
- Strip all TypeScript types from copied components
- Rename `.tsx` → `.jsx`
- Create the `@/` path alias in `vite.config.js`:
  ```js
  resolve: {
    alias: { '@': '/src' }
  }
  ```
- Create `src/lib/utils.js` with `cn()` helper (using `clsx` + `tailwind-merge`)
- Create `src/hooks/` directory for custom hooks
- Create `src/components/ui/` directory for shadcn-style primitives

#### Option B: Migrate to TypeScript (Better long-term, bigger effort)
- Add `typescript` and `@types/react` as dev dependencies
- Create `tsconfig.json` with path aliases
- Rename all `.jsx` → `.tsx` files
- Add type annotations incrementally

**Recommendation: Option A** — keep JSX, convert components. TypeScript migration is too risky mid-PBL.

### Required NPM Installs

```bash
npm install @radix-ui/react-slot class-variance-authority @radix-ui/react-avatar clsx tailwind-merge
```

### Required File Structure

```
src/
├── lib/
│   └── utils.js            # cn() helper
├── hooks/
│   └── use-textarea-resize.js
├── components/
│   └── ui/
│       ├── button.jsx
│       ├── textarea.jsx
│       ├── input.jsx
│       ├── avatar.jsx
│       ├── icons.jsx
│       ├── chat-input.jsx
│       └── grid-background.jsx
```

> [!NOTE]
> **Why `/components/ui`?** This is the shadcn convention. All primitive/atomic components go here. Page-level components stay in `/components`. This separation prevents circular dependencies and makes imports predictable.

---

## 1. Chatbot UI — Chat Input Component Integration

### Component: `chat-input.jsx`

**What it is:** A composable chat input with auto-resizing textarea and submit button. Uses Context API for state sharing between sub-components.

**Sub-components:**
- `ChatInput` — wrapper with border/styling
- `ChatInputTextArea` — auto-resizing textarea
- `ChatInputSubmit` — submit button with loading/stop states

### Dependencies to Copy

| File | Source | Destination |
|------|--------|-------------|
| `button.jsx` | originui/button (converted to JSX) | `src/components/ui/button.jsx` |
| `textarea.jsx` | originui/textarea (converted to JSX) | `src/components/ui/textarea.jsx` |
| `use-textarea-resize.js` | Alwurts hook (converted to JS) | `src/hooks/use-textarea-resize.js` |
| `chat-input.jsx` | Main component (converted to JSX) | `src/components/ui/chat-input.jsx` |

### Integration Plan for ChatPopup.jsx

**Current state:** `ChatPopup.jsx` uses a basic `<input type="text">` with manual form submission.

**New state:** Replace with `<ChatInput>` composite component:

```jsx
// BEFORE (ChatPopup.jsx:137-160)
<form onSubmit={(e) => { e.preventDefault(); onSendChat(); }} className="flex gap-2">
  <input type="text" value={chatInput} onChange={...} placeholder="Ask about your document..." />
  <button type="submit"><Send size={16} /></button>
</form>

// AFTER
<ChatInput
  variant="default"
  value={chatInput}
  onChange={(e) => onChatInputChange(e.target.value)}
  onSubmit={onSendChat}
  loading={isChatTyping}
  onStop={() => {/* cancel typing */}}
>
  <ChatInputTextArea placeholder="Ask about your document..." />
  <ChatInputSubmit />
</ChatInput>
```

**Benefits:**
- Auto-resizing textarea (multi-line messages)
- Enter to submit, Shift+Enter for new line
- Loading state with stop button
- Better accessibility

### Styling Considerations

The chat input component uses shadcn's CSS variables (`--input`, `--ring`, `--background`). Since the existing app uses a custom dark theme, we need to add these CSS variables to `index.css`:

```css
:root {
  --background: 0 0% 2%;
  --foreground: 0 0% 95%;
  --input: 0 0% 15%;
  --ring: 213 94% 50%;
  --primary: 213 94% 50%;
  --primary-foreground: 0 0% 100%;
  --muted-foreground: 0 0% 45%;
  /* ... etc */
}
```

---

## 2. Landing Page — Full Design Plan

### Design System: Modern SaaS Dark Mode

**Constraints:**
- `bg-zinc-950` base, `text-zinc-50` text
- Thin borders: `border-zinc-800/50`
- Subtle animations only (opacity fades, 10px Y-axis slides)
- `rounded-lg` or `rounded-xl` — no cartoonish `rounded-3xl`
- Lucide React icons throughout
- Framer Motion for animations

### Component Architecture

```
src/
├── components/
│   ├── landing/
│   │   ├── Navbar.jsx
│   │   ├── HeroSection.jsx          # Uses grid-background.jsx
│   │   ├── FeaturesGrid.jsx         # Bento grid
│   │   ├── TechnicalProof.jsx       # Code snippet / JSON output
│   │   ├── PricingSection.jsx       # Two-tier pricing
│   │   ├── Footer.jsx
│   │   └── LandingPage.jsx          # Assembles all sections
│   └── ui/
│       ├── grid-background.jsx
│       ├── input.jsx
│       ├── button.jsx
│       ├── avatar.jsx
│       └── icons.jsx
```

### Section 1: Glassmorphic Navbar

```
┌─────────────────────────────────────────────────────────────────┐
│  ToS Analyzer     Features  Compare  Pricing  API Docs    [Sign In] [Get Started] │
└─────────────────────────────────────────────────────────────────┘
```

- Sticky, `backdrop-blur-md bg-zinc-950/80`
- Thin bottom border `border-zinc-800`
- Logo: "Jurist AI" text in `font-bold tracking-tight`
- Center nav links: `text-zinc-400` → `hover:text-white`
- Right: Ghost "Sign In" + Primary "Get Started" (`bg-white text-black`)
- On click "Get Started" → scrolls to or routes to `/dashboard` (auth page)

### Section 2: Hero (Using Grid Background Component)

```
┌─────────────────────────────────────────────────────────────────┐
│                    ░░ GRID BACKGROUND ░░                        │
│                                                                 │
│            Decode Legal Risk in Seconds.                        │
│            Not Hours.                                           │
│                                                                 │
│     AI-powered Terms of Service analysis that finds             │
│     what companies hide in the fine print.                      │
│                                                                 │
│          [Enter URL or paste text...]  [Analyze →]              │
│                                                                 │
│          👤👤👤  2,400+ documents analyzed                      │
│                                                                 │
│          🐦  📦                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Uses:** `GridBackground` component + `Input` + `Button` + `Avatar` + `Icons`

**Customization from provided demo:**
- Change headline to Jurist AI branding
- Change subtext to legal analysis pitch
- Input placeholder: "Paste a ToS URL to analyze..."
- Button: "Analyze →" instead of "Get Notified"
- Avatar fallbacks: random user initials
- Stats: "2,400+ documents analyzed" or similar
- Social icons: Twitter (X) + GitHub

### Section 3: Bento Grid Features

```
┌──────────────────────────────────────────────────────┐
│  Built for scale, not for show.                       │
│  A heavily optimized NLP pipeline that skips the      │
│  fluff and finds the risk.                            │
│                                                       │
│  ┌──────────────────────┐  ┌──────────┐  ┌──────────┐ │
│  │  🧠 Hybrid NLP +     │  │  ⚡ 75%   │  │  🔒 Local │ │
│  │  LLM Pipeline         │  │  Cheaper  │  │  Fallback│ │
│  │                        │  │  Inference│  │  Ready   │ │
│  │  NLP pre-filters 70%  │  │           │  │          │ │
│  │  of clauses, LLM deep │  └──────────┘  └──────────┘ │
│  │  scans only flagged    │  ┌──────────────────────┐  │
│  │  ones.                 │  │  🗄️ RAG-Powered Chat   │  │
│  └──────────────────────┘  │  pgvector embeddings    │  │
│                             │  for clause retrieval   │  │
│                             └──────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

**Cards (4 cards, 1 spanning 2 cols):**
1. **Hero Card (2-col):** "Hybrid NLP + LLM Pipeline" — Icon: `BrainCircuit`. "NLP pre-filters 70% of clauses, sending only flagged ones to the LLM for deep analysis."
2. **"75% Cheaper Inference"** — Icon: `Zap`. "Cerebras + Groq inference with automatic round-robin and local Ollama fallback."
3. **"Local Fallback Ready"** — Icon: `Shield`. "Supports local Ollama models. Your data never leaves your machine."
4. **"RAG-Powered Chat"** — Icon: `MessageSquare`. "Ask questions about any clause. pgvector embeddings for precise clause retrieval."

### Section 4: Technical Proof (JSON Output)

```
┌──────────────────────────────────────────────────────┐
│                                                       │
│  Structured output.          ┌─── macOS window ───┐  │
│  Zero parsing hacks.         │ ● ● ●              │  │
│                               │                    │  │
│  Our API returns strictly     │ {                  │  │
│  validated JSON directly      │   "is_risky": true,│  │
│  from Cerebras.               │   "category":      │  │
│                               │     "Financial",   │  │
│                               │   "confidence":    │  │
│                               │     0.98,          │  │
│                               │   "explanation":   │  │
│                               │     "Waives..."    │  │
│                               │ }                  │  │
│                               └────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

### Section 5: Pricing Table

```
┌──────────────────────────────────────────────────────┐
│  Transparent pricing. No billable hours.              │
│                                                       │
│  ┌─────────────────┐    ┌─────────────────┐          │
│  │  Hobby           │    │  ✨ Pro          │          │
│  │  Free             │    │  $15/mo         │          │
│  │                   │    │  MOST POPULAR   │          │
│  │  ✓ 5 analyses/mo │    │  ✓ Unlimited    │          │
│  │  ✓ URL extraction │    │  ✓ PDF upload   │          │
│  │  ✓ Basic chat     │    │  ✓ RAG chat     │          │
│  │  ✓ Risk scoring   │    │  ✓ Comparisons  │          │
│  │                   │    │  ✓ Full reports  │          │
│  │  [Get Started]    │    │  [Upgrade]      │          │
│  └─────────────────┘    └─────────────────┘          │
└──────────────────────────────────────────────────────┘
```

### Section 6: Minimalist Footer

```
┌──────────────────────────────────────────────────────┐
│  Product      Resources     Legal       Social       │
│  Features     Documentation Privacy     Twitter      │
│  Pricing      API Docs      Terms       GitHub       │
│  Compare      Blog          Cookies                  │
│                                                       │
│  © 2025 Jurist AI            🟢 All systems online   │
└──────────────────────────────────────────────────────┘
```

### Routing Plan

See **§5. React Router Integration** below for the full routing plan. The landing page lives at `/` and the dashboard at `/app/*`.

---

## 3. Report Page Frontend Rewrite

> Backend changes documented in `refinements_pbl.md` and `backend_refine.md`

### Current Problems
- Just a data dump of existing dashboard info
- No new AI-generated insights
- Copy produces bare text
- Print produces unstyled browser output

### New Report Page Design

**Trigger flow:**
1. User clicks "Generate Report" on Overview page
2. Frontend calls `POST /report/generate/{job_id}`
3. Show loading animation while backend generates (30-60 seconds)
4. Render multi-section report with table of contents

**UI sections:**
- Sticky mini TOC sidebar (scrollspy)
- §1 Executive Dashboard (stats row)
- §2 Executive Summary (AI-generated narrative)
- §3 Key Findings (bullet cards)
- §4 Category Deep Dives (collapsible per-category panels)
- §5 Compliance Checklist (GDPR/CCPA ✅/⚠️/❌ grid)
- §6 Critical Clauses (expanded cards)
- §7 Action Plan (color-coded priority tiers)
- §8 Analysis Methodology
- Print button → `@media print` optimized CSS
- Copy button → well-formatted markdown

---

## 4. ChatPopup.jsx Improvements (Beyond Component Swap)

### 4a. Show RAG indexing status
- Poll `GET /chat/{session_id}/index/status` every 5 seconds
- Show badge: "🔄 Indexing..." → "✅ Smart mode active"

### 4b. Better suggestion chips
- Make suggestions context-aware (based on actual risk categories found)
- Example: If Privacy Risk found → "explain the privacy concerns"

### 4c. Message rendering improvements
- Use proper markdown rendering (already using `marked`)
- Add code block styling for any JSON/code in responses
- Add "copy message" button on hover

### 4d. Chat persistence indicator
- Show green dot when chat history is saved
- Show message count badge on closed chat button

### 4e. Fix: Stop redundant `initChatSession` on history visits (Bug 6)

**Problem:** Every time you open an already-analyzed document from history, `openHistoryAnalysis` calls `initChatSession` → `POST /chat/store` → triggers a full re-indexing cycle (~3.5 min Gemini API call), even if the session was already indexed. The `fallbackText` is also wrong — it uses the URL string (`data.source`) instead of actual document text, so re-indexing produces garbage embeddings.

**Frontend fix in `App.jsx`:**
- In `openHistoryAnalysis`, **before** calling `initChatSession`, check if the session already exists:
  ```js
  const statusRes = await fetch(`${API}/chat/${data.job_id}/index/status`, { headers });
  if (statusRes.ok) {
    setSessionId(data.job_id);  // session exists, skip /chat/store
    return;
  }
  ```
- This prevents the redundant `/chat/store` call entirely
- Backend-side guard is documented in `backend_refine.md` Bug 6

**Files:** `frontend/src/App.jsx` (in `openHistoryAnalysis`, around line 290-293)

---

## 5. React Router Integration — Multi-Page URLs

### Why It's Worth Doing

- **Shareability:** Users can bookmark `/app/reports` or share `/app/compare` links
- **Browser navigation:** Back/forward buttons work naturally
- **Deep linking:** Open a specific analysis via `/app/analysis/:jobId`
- **Landing page separation:** Clean `/` vs `/app` split
- **SEO:** Landing page at `/` is crawlable

### Why It's NOT a Huge Overhaul

The app already has a clean `activeView` state with 6 discrete views (App.jsx:50):

```js
const [activeView, setActiveView] = useState('dashboard');
// Used at lines: 792, 913, 940, 967, 985, 1028
```

Each view is a simple conditional block:
```jsx
{activeView === 'overview' && <OverviewPage ... />}
{activeView === 'clauses' && <ClausesPage ... />}
{activeView === 'reports' && <ReportsPage ... />}
```

This maps **1:1** to `<Route>` elements — it's a mechanical swap.

### Route Map

| URL | Component | Current `activeView` |
|-----|-----------|---------------------|
| `/` | `LandingPage` | *(new — replaces auth overlay)* |
| `/app` | `DashboardPage` | `'dashboard'` |
| `/app/overview` | `OverviewPage` | `'overview'` |
| `/app/clauses` | `ClausesPage` | `'clauses'` |
| `/app/reports` | `ReportsPage` | `'reports'` |
| `/app/compare` | `ComparePage` | `'compare'` |
| `/app/settings` | `SettingsPage` | `'settings'` |
| `/app/analysis/:jobId` | `OverviewPage` | *(new — deep link)* |

### Implementation Steps

**Step 1: Install** (2 min)
```bash
npm install react-router-dom
```

**Step 2: Wrap app** — `main.jsx` (2 min)
```jsx
import { BrowserRouter } from 'react-router-dom';
// ...
<BrowserRouter><App /></BrowserRouter>
```

**Step 3: Create `AppLayout.jsx`** — extract the sidebar + header shell (30 min)
- Move the sidebar, header, and chat popup into a layout wrapper
- This becomes the parent route that wraps all `/app/*` routes
- Shared state (user, analysisResult, sessionId) lives here via Context

**Step 4: Convert view conditionals to routes** — `App.jsx` (30 min)
```jsx
// BEFORE:
{activeView === 'overview' && <OverviewPage ... />}
{activeView === 'clauses' && <ClausesPage ... />}

// AFTER:
<Routes>
  <Route path="/" element={<LandingPage />} />
  <Route path="/app" element={<ProtectedLayout />}>
    <Route index element={<DashboardPage />} />
    <Route path="overview" element={<OverviewPage />} />
    <Route path="clauses" element={<ClausesPage />} />
    <Route path="reports" element={<ReportsPage />} />
    <Route path="compare" element={<ComparePage />} />
    <Route path="settings" element={<SettingsPage />} />
    <Route path="analysis/:jobId" element={<OverviewPage />} />
  </Route>
</Routes>
```

**Step 5: Update sidebar links** — `Sidebar.jsx` (10 min)
```jsx
// BEFORE:
<button onClick={() => setActiveView('overview')}>Overview</button>

// AFTER:
<NavLink to="/app/overview">Overview</NavLink>
```

**Step 6: Create `ProtectedLayout.jsx`** — auth guard (15 min)
```jsx
function ProtectedLayout() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" />;
  return (
    <AppLayout>
      <Outlet />   {/* child routes render here */}
    </AppLayout>
  );
}
```

**Step 7: State management** — `AppContext.jsx` (20 min)
- Move shared state (`analysisResult`, `sessionId`, `chatMessages`, etc.) into a React Context
- Currently these are threaded through 15+ props — context makes them accessible to any route
- This is the most impactful part: **reduces App.jsx from ~1190 lines to ~200**

### What Changes, What Doesn't

| ✅ Changes | ❌ Stays the Same |
|-----------|------------------|
| URL updates on navigation | All page components (OverviewPage, etc.) |
| Sidebar uses `<NavLink>` | Backend API calls |
| Auth check via route guard | ChatPopup behavior |
| Landing page at `/` | Analysis flow |
| App.jsx shrinks dramatically | Component props/state |

### Risk Assessment

- **Risk: Low** — purely structural, no logic changes
- **Breakage surface:** Sidebar navigation, auth flow redirect
- **Rollback:** Revert the 5 changed files, remove `react-router-dom`
- **Total effort: ~2 hours** for a clean implementation

---

## Implementation Priority

| Priority | Task | Effort |
|----------|------|--------|
| 🔴 P0 | Setup: Create `src/lib/utils.js`, `src/components/ui/`, path alias | 15 min |
| 🔴 P0 | Install npm dependencies | 2 min |
| 🔴 P0 | Copy + convert chat-input component (JSX) | 30 min |
| 🔴 P0 | Integrate chat-input into ChatPopup.jsx | 30 min |
| 🔴 P0 | Fix: Guard initChatSession on history visits (Bug 6) | 10 min |
| 🟡 P1 | React Router: Install + wrap app + create routes | 45 min |
| 🟡 P1 | React Router: Extract AppLayout + ProtectedLayout | 30 min |
| 🟡 P1 | React Router: Create AppContext for shared state | 30 min |
| 🟡 P1 | React Router: Update Sidebar to use NavLink | 15 min |
| 🟡 P1 | Copy + convert landing page components (JSX) | 30 min |
| 🟡 P1 | Build Navbar component | 45 min |
| 🟡 P1 | Build Hero section (using grid-background) | 45 min |
| 🟡 P1 | Build Features bento grid | 1 hr |
| 🟡 P1 | Build Technical Proof section | 30 min |
| 🟡 P1 | Build Pricing section | 45 min |
| 🟡 P1 | Build Footer | 20 min |
| 🟡 P1 | Assemble LandingPage at `/` route | 30 min |
| 🟢 P2 | Report page rewrite (after backend endpoints ready) | 3-4 hrs |
| 🟢 P2 | Chat improvements (RAG status, context-aware suggestions) | 1 hr |
| 🟢 P2 | Add shadcn CSS variables to index.css | 20 min |
