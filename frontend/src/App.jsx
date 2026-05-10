import React from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Scale, FileText, Link, Upload, Activity, Zap } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';

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
    isProcessing, startAnalysis, stopAnalysis, user, setSelectedHistoryId,
    navigate,
  } = useAppContext();

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-3">Welcome, {user?.email?.split('@')[0] || 'User'}.</h1>
        <p className="text-white/60 max-w-xl">Ready to deconstruct legal complexity? Initiate a new risk assessment by pasting your legal document, uploading a file, or providing a URL.</p>
      </div>

      <div className="flex gap-6">
        <div className="flex-1">
          <div className="flex gap-2 mb-6">
            {['upload', 'url', 'text'].map(mode => (
              <button
                key={mode}
                onClick={() => setInputMode(mode)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${inputMode === mode
                  ? 'bg-[#007AFF]/20 text-[#007AFF] border border-[#007AFF]'
                  : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
                  }`}
              >
                {mode === 'upload' ? 'Upload File' : mode === 'url' ? 'Provide Link' : 'Paste Text'}
              </button>
            ))}
          </div>

          <div className="glass-card p-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs text-[#007AFF] uppercase tracking-wider font-semibold">
                {inputMode === 'url' && 'TARGET RESOURCE URL'}
                {inputMode === 'text' && 'DOCUMENT INPUT BUFFER'}
                {inputMode === 'upload' && 'LOCAL FILE INGESTION'}
              </span>
              <span className="text-xs text-white/50">FORMAT: AUTO</span>
            </div>

            {inputMode === 'url' && (
              <div className="mb-4">
                <div className="relative">
                  <Link className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={16} />
                  <input
                    type="url"
                    className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#007AFF]/50"
                    placeholder="https://legal.enterprise.com/terms-of-service"
                    value={urlInput}
                    onChange={e => setUrlInput(e.target.value)}
                  />
                </div>
              </div>
            )}

            {inputMode === 'text' && (
              <textarea
                className="w-full h-48 p-4 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#007AFF]/50 mb-4"
                placeholder="Paste your Terms of Service or Privacy Policy text here..."
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
              />
            )}

            {inputMode === 'upload' && (
              <div
                className="border-2 border-dashed border-white/10 rounded-lg p-8 text-center mb-4 cursor-pointer hover:border-[#007AFF]/50 transition-all"
                onClick={() => fileInputRef.current?.click()}
              >
                <input type="file" ref={fileInputRef} accept=".pdf" onChange={e => setUploadedFile(e.target.files[0])} className="hidden" />
                <FileText className="mx-auto text-[#007AFF] mb-3" size={32} />
                <p className="text-white font-medium mb-1">
                  {uploadedFile ? uploadedFile.name : 'Drag & drop legal documents here'}
                </p>
                <p className="text-xs text-white/50">Support for PDF files. Up to 50MB per analysis.</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                className="flex-1 flex items-center justify-center gap-2 py-4 rounded-lg bg-gradient-to-r from-[#007AFF] to-[#0056cc] text-white font-semibold hover:shadow-lg hover:shadow-[#007AFF]/30 transition-all disabled:opacity-50"
                onClick={startAnalysis}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Zap size={18} />
                )}
                <span>{isProcessing ? 'PROCESSING...' : 'FETCH & ANALYZE'}</span>
              </button>
              {isProcessing && (
                <button
                  className="px-6 py-4 rounded-lg bg-red-500/20 text-red-500 border border-red-500/30 font-semibold hover:bg-red-500/30 transition-all"
                  onClick={stopAnalysis}
                >
                  STOP
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="w-80">
          <div className="glass-card p-6">
            <div className="w-9 h-9 rounded-lg bg-[#007AFF]/20 flex items-center justify-center mb-4">
              <Activity size={18} className="text-[#007AFF]" />
            </div>
            <h3 className="text-white font-semibold mb-2">How To Get Better Results</h3>
            <p className="text-sm text-white/60 mb-4">Use complete policy text when possible. Short excerpts may miss context.</p>
            <ul className="text-xs text-white/50 space-y-2">
              <li>• Prefer full ToS or Privacy Policy documents</li>
              <li>• Use PDF upload for long legal agreements</li>
              <li>• Open each flagged clause in chat for examples</li>
            </ul>
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

  // If already logged in, redirect to app
  if (token) {
    return <LandingPage onGetStarted={() => navigate('/app')} onAnalyze={(url) => navigate('/app')} />;
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
          <h2>{authMode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
          <p>{authMode === 'login' ? 'Enter your credentials to access Jurist AI' : 'Join the elite legal AI platform'}</p>
        </div>

        <form className="auth-form" onSubmit={handleAuth}>
          {authMode === 'signup' && (
            <div className="auth-field">
              <label>Username</label>
              <input type="text" name="username" className="auth-input" placeholder="choose-a-username" required minLength={3} maxLength={30} />
            </div>
          )}
          <div className="auth-field">
            <label>Email Address</label>
            <input type="email" name="email" className="auth-input" placeholder="name@company.com" required />
          </div>
          <div className="auth-field">
            <label>Password</label>
            <input type="password" name="password" className="auth-input" placeholder="••••••••" required />
          </div>
          {authMode === 'signup' && (
            <div className="auth-field">
              <label>Confirm Password</label>
              <input type="password" name="confirmPassword" className="auth-input" placeholder="••••••••" required />
            </div>
          )}
          <button className="auth-btn" type="submit" disabled={isAuthLoading}>
            {isAuthLoading ? 'Authenticating...' : (authMode === 'login' ? 'Sign In' : 'Register')}
          </button>
        </form>
        <div className="auth-toggle">
          {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
          <span onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}>
            {authMode === 'login' ? 'Create one' : 'Sign in'}
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

  const handleGetStarted = () => {
    navigate(token ? '/app' : '/auth');
  };

  const handleAnalyze = (url) => {
    if (token) {
      navigate('/app');
    } else {
      navigate('/auth');
    }
  };

  return <LandingPage onGetStarted={handleGetStarted} onAnalyze={handleAnalyze} />;
}

// ─── Main App with Routes ───

export default function App() {
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