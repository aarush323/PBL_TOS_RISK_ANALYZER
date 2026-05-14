import React, { useState } from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
import { Scale, FileText, Link, Activity, Zap } from 'lucide-react';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import { useAppContext } from '@/context/app-context.js';

// Layout
import ProtectedLayout from '@/components/layout/ProtectedLayout';

// Landing
import LandingPage from '@/components/landing/LandingPage';

// Pages
import OverviewPage from '@/components/OverviewPage.jsx';
import ClausesPage from '@/components/ClausesPage.jsx';
import ComparePage from '@/components/ComparePage.jsx';
import ReportsPage from '@/components/ReportsPage.jsx';
import EmptyState from '@/components/EmptyState.jsx';

// ─── Page wrappers that pull from context ───

function DashboardPage() {
  const {
    inputMode, setInputMode, urlInput, setUrlInput,
    textInput, setTextInput, uploadedFile, setUploadedFile, fileInputRef,
    isProcessing, startAnalysis, stopAnalysis,
  } = useAppContext();
  const [isDragging, setIsDragging] = useState(false);

  const tips = {
    url: {
      heading: 'Linking to a policy',
      body: 'Make sure the URL points directly to the ToS or Privacy Policy page, not a homepage. Some sites block scraping - PDF upload works better for those.',
      bullets: [
        'Use the canonical policy URL, not a shortened link',
        'Try PDF upload if the link scan fails',
        'Works best on static HTML policy pages',
      ],
    },
    text: {
      heading: 'Pasting raw text',
      body: 'Use the full document. Short excerpts strip the context around clauses, which reduces detection accuracy.',
      bullets: [
        'Copy from the source page directly',
        'Include headings and section titles',
        "Avoid pasting just the 'concerning' parts",
      ],
    },
    upload: {
      heading: 'Uploading a PDF',
      body: 'Best option for long legal agreements. PDFs preserve structure and work on sites that block URL scraping.',
      bullets: [
        'Max 50MB - most ToS PDFs are under 2MB',
        "Scanned image PDFs won't parse - use text-based PDFs",
        'Download the PDF from the policy page directly',
      ],
    },
  };

  const hasValidInput = (
    inputMode === 'url'
      ? urlInput.trim().length > 0
      : inputMode === 'text'
        ? textInput.trim().length > 0
        : uploadedFile !== null
  );

  const currentTips = tips[inputMode];

  const handleFileSelection = (event) => {
    setUploadedFile(event.target.files[0] || null);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer?.files?.[0] || null;
    if (file) {
      setUploadedFile(file);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-white">What are you reviewing today?</h1>
        <p className="mt-2 max-w-xl text-sm text-neutral-400">Paste a policy, drop a PDF, or link a URL - we&apos;ll flag what matters.</p>
      </div>

      <div className="flex items-start gap-8">
        <div className="flex-1">
          <div className="mb-6 flex gap-2">
            {['upload', 'url', 'text'].map(mode => (
              <button
                key={mode}
                type="button"
                onClick={() => setInputMode(mode)}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${inputMode === mode
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
                  }`}
              >
                {mode === 'upload' ? 'Upload File' : mode === 'url' ? 'Provide Link' : 'Paste Text'}
              </button>
            ))}
          </div>

          <section
            aria-label="Document input"
            className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6 ring-1 ring-inset ring-white/5"
          >
            <AnimatePresence mode="wait">
              <Motion.div
                key={inputMode}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {inputMode === 'url' && (
                  <div className="mb-5">
                    <label className="mb-1.5 block text-xs text-neutral-500" htmlFor="policy-url-input">
                      Paste a link to the policy page
                    </label>
                    <div className="relative">
                      <Link className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                      <input
                        id="policy-url-input"
                        type="url"
                        className="w-full rounded-xl border border-neutral-800 bg-neutral-900 py-3.5 pl-11 pr-4 text-white outline-none ring-1 ring-inset ring-white/5 placeholder:text-neutral-500 focus:border-blue-500"
                        placeholder="https://example.com/terms"
                        value={urlInput}
                        onChange={e => setUrlInput(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {inputMode === 'text' && (
                  <div className="mb-5">
                    <label className="mb-1.5 block text-xs text-neutral-500" htmlFor="policy-text-input">
                      Paste the document text
                    </label>
                    <textarea
                      id="policy-text-input"
                      className="h-56 w-full rounded-xl border border-neutral-800 bg-neutral-900 p-4 text-white outline-none ring-1 ring-inset ring-white/5 placeholder:text-neutral-500 focus:border-blue-500"
                      placeholder="Paste your Terms of Service or Privacy Policy text here..."
                      value={textInput}
                      onChange={e => setTextInput(e.target.value)}
                    />
                  </div>
                )}

                {inputMode === 'upload' && (
                  <div className="mb-5">
                    <label className="mb-1.5 block text-xs text-neutral-500" htmlFor="policy-file-input">
                      Upload a PDF
                    </label>
                    <label htmlFor="policy-file-input" className="sr-only">
                      Choose a PDF to analyze
                    </label>
                    <div
                      className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
                        isDragging
                          ? 'border-blue-500 bg-blue-500/5 text-blue-400'
                          : 'border-neutral-700 bg-neutral-900/50 text-neutral-400 hover:border-neutral-600'
                      }`}
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(event) => {
                        event.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragEnter={(event) => {
                        event.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleDrop}
                    >
                      <input
                        id="policy-file-input"
                        type="file"
                        ref={fileInputRef}
                        accept=".pdf"
                        onChange={handleFileSelection}
                        className="sr-only"
                      />
                      <FileText className={`mx-auto mb-3 ${isDragging ? 'text-blue-500' : 'text-neutral-500'}`} size={32} />
                      <p className="mb-1 text-sm font-medium text-white">
                        {uploadedFile ? uploadedFile.name : 'Drag and drop a legal document here'}
                      </p>
                      <p className="text-xs text-neutral-500">PDF only. Up to 50MB per analysis.</p>
                    </div>
                  </div>
                )}
              </Motion.div>
            </AnimatePresence>

            {isProcessing ? (
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-900/50 bg-neutral-800 py-3.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-900/40"
                onClick={stopAnalysis}
              >
                STOP
              </button>
            ) : (
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 active:bg-blue-700 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500"
                onClick={startAnalysis}
                disabled={!hasValidInput}
              >
                <Zap size={18} />
                <span>Analyze document</span>
              </button>
            )}

            {!isProcessing && !hasValidInput && (
              <p className="mt-2 text-center text-xs text-neutral-600">Paste or upload a document to continue</p>
            )}
          </section>
        </div>

        <div className="sticky top-6 w-72">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6 ring-1 ring-inset ring-white/5">
            <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-900 ring-1 ring-inset ring-white/5">
              <Activity size={18} className="text-blue-500" />
            </div>

            <AnimatePresence mode="wait">
              <Motion.div
                key={inputMode}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
              >
                <h3 className="text-white">{currentTips.heading}</h3>
                <p className="mt-2 text-sm text-neutral-400">{currentTips.body}</p>
                <ul className="mt-4 space-y-2 text-xs text-neutral-500">
                  {currentTips.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </Motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

function OverviewWrapper() {
  const { analysisResult, sourceInfo, calculateScore, historyItems, navigate, setSelectedHistoryId } = useAppContext();
  if (!analysisResult) {
    return <EmptyState view="overview" onNewAnalysis={() => { navigate('/app'); setSelectedHistoryId(null); }} />;
  }
  return (
    <OverviewPage
      analysisResult={analysisResult}
      sourceInfo={sourceInfo}
      onNavigate={(view) => navigate(`/app/${view}`)}
      calculateScore={calculateScore}
      historyItems={historyItems}
    />
  );
}

function ClausesWrapper() {
  const { analysisResult, sourceInfo, explainRiskInChat, setIsChatPopupOpen, navigate, setSelectedHistoryId } = useAppContext();
  if (!analysisResult) {
    return <EmptyState view="clauses" onNewAnalysis={() => { navigate('/app'); setSelectedHistoryId(null); }} />;
  }
  return (
    <ClausesPage
      analysisResult={analysisResult}
      sourceInfo={sourceInfo}
      onExplainRiskInChat={explainRiskInChat}
      onToggleChat={() => setIsChatPopupOpen(true)}
    />
  );
}

function ReportsWrapper() {
  const { analysisResult, sourceInfo, calculateScore, analysisJobId, token, navigate, setSelectedHistoryId } = useAppContext();
  if (!analysisResult) {
    return <EmptyState view="reports" onNewAnalysis={() => { navigate('/app'); setSelectedHistoryId(null); }} />;
  }
  return (
    <ReportsPage
      analysisResult={analysisResult}
      sourceInfo={sourceInfo}
      calculateScore={calculateScore}
      analysisJobId={analysisJobId}
      token={token}
    />
  );
}

function CompareWrapper() {
  const {
    comparisonData, historyItems, isComparing,
    compareHistory, openCompareHistory, setShowCompareSelector,
    setComparisonData, setCompareDocA, setCompareDocB,
    setIsChatPopupOpen, calculateScore, analysisResult,
    navigate, setSelectedHistoryId,
  } = useAppContext();
  if (!analysisResult) {
    return <EmptyState view="compare" onNewAnalysis={() => { navigate('/app'); setSelectedHistoryId(null); }} />;
  }
  return (
    <ComparePage
      comparisonData={comparisonData}
      historyItems={historyItems}
      isComparing={isComparing}
      compareHistory={compareHistory}
      onOpenCompareHistory={openCompareHistory}
      onSelectDocuments={() => setShowCompareSelector(true)}
      onNewComparison={() => {
        setComparisonData(null);
        setCompareDocA(null);
        setCompareDocB(null);
        setShowCompareSelector(true);
      }}
      onDiscussInChat={() => setIsChatPopupOpen(true)}
      calculateScore={calculateScore}
    />
  );
}

function SettingsWrapper() {
  const { settings, setSettings } = useAppContext();
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-white/60">Customize behavior for analysis and results views.</p>
      </div>
      <div className="glass-card p-6 max-w-xl">
        <div className="flex justify-between items-center py-4 border-b border-white/10">
          <div>
            <p className="text-white font-medium">Auto-open Results After Analysis</p>
            <p className="text-xs text-white/50">Switch to Risk Analysis view automatically when processing completes.</p>
          </div>
          <input
            type="checkbox"
            checked={settings.autoOpenResults}
            onChange={(e) => setSettings(prev => ({ ...prev, autoOpenResults: e.target.checked }))}
            className="w-5 h-5 accent-[#007AFF]"
          />
        </div>
        <div className="flex justify-between items-center py-4">
          <div>
            <p className="text-white font-medium">Compact Risk Cards</p>
            <p className="text-xs text-white/50">Reduce spacing in risk cards for denser reading.</p>
          </div>
          <input
            type="checkbox"
            checked={settings.compactRiskCards}
            onChange={(e) => setSettings(prev => ({ ...prev, compactRiskCards: e.target.checked }))}
            className="w-5 h-5 accent-[#007AFF]"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Auth Page (shown at / when not logged in) ───

function AuthPage() {
  const { token, isAuthLoading, authMode, setAuthMode, handleAuth, toasts, navigate } = useAppContext();
  const isLoginMode = authMode === 'login';

  // If already logged in, redirect to app
  if (token) {
    return <LandingPage onGetStarted={() => navigate('/app')} onAnalyze={() => navigate('/app')} />;
  }

  return (
    <div className="auth-overlay">
      <div className="auth-card">
        <div className="auth-header">
          <div className="brand" style={{ justifyContent: 'center', marginBottom: '20px' }}>
            <div className="brand-icon"><Scale size={18} /></div>
            <div className="brand-text">
              <span className="brand-title">Jurist AI</span>
            </div>
          </div>
          <h2>{isLoginMode ? 'Welcome Back' : 'Create Account'}</h2>
          <p>{isLoginMode ? 'Sign in to continue.' : 'Create an account to save and review analyses.'}</p>
        </div>

        <form key={authMode} className="auth-form" onSubmit={handleAuth} autoComplete="on">
          {!isLoginMode && (
            <div className="auth-field">
              <label>Username</label>
              <input type="text" name="username" className="auth-input" placeholder="choose-a-username" autoComplete="username" required minLength={3} maxLength={30} />
            </div>
          )}
          <div className="auth-field">
            <label>Email Address</label>
            <input type="email" name="email" className="auth-input" placeholder="name@company.com" autoComplete={isLoginMode ? 'username' : 'email'} required />
          </div>
          <div className="auth-field">
            <label>Password</label>
            <input type="password" name="password" className="auth-input" placeholder="••••••••" autoComplete={isLoginMode ? 'current-password' : 'new-password'} required />
          </div>
          {!isLoginMode && (
            <div className="auth-field">
              <label>Confirm Password</label>
              <input type="password" name="confirmPassword" className="auth-input" placeholder="••••••••" autoComplete="new-password" required />
            </div>
          )}
          <button className="auth-btn" type="submit" disabled={isAuthLoading}>
            {isAuthLoading ? 'Authenticating...' : (isLoginMode ? 'Sign In' : 'Register')}
          </button>
        </form>
        <div className="auth-toggle">
          {isLoginMode ? "Don't have an account? " : "Already have an account? "}
          <span onClick={() => setAuthMode(isLoginMode ? 'signup' : 'login')}>
            {isLoginMode ? 'Create one' : 'Sign in'}
          </span>
        </div>
      </div>
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast show ${t.isError ? 'error' : ''}`}>
            <span style={{ fontSize: '18px' }}>{t.isError ? '⚠️' : '✓'}</span> {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Landing page wrapper ───

function LandingWrapper() {
  const { token, navigate } = useAppContext();

  if (token) {
    return <Navigate to="/app" replace />;
  }

  const handleGetStarted = () => {
    navigate(token ? '/app' : '/auth');
  };

  const handleAnalyze = () => {
    if (token) {
      navigate('/app');
    } else {
      navigate('/auth');
    }
  };

  return <LandingPage onGetStarted={handleGetStarted} onAnalyze={handleAnalyze} />;
}

// ─── Main App with Routes ───

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<LandingWrapper />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/app" element={<ProtectedLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="overview" element={<OverviewWrapper />} />
        <Route path="clauses" element={<ClausesWrapper />} />
        <Route path="reports" element={<ReportsWrapper />} />
        <Route path="compare" element={<CompareWrapper />} />
        <Route path="settings" element={<SettingsWrapper />} />
      </Route>
    </Routes>
  );
}
