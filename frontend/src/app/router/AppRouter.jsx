import React from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
import { Scale } from 'lucide-react';
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
import DashboardPage from '@/components/DashboardPage.jsx';

// ─── Page wrappers that pull from context ───

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
