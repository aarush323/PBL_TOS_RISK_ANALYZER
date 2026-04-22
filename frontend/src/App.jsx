import React, { useState, useEffect, useRef } from 'react';
import {
  FileText, Link, Upload, Scale, Bell, Settings as SettingsIcon, HelpCircle,
  Plus, Activity, Zap, X
} from 'lucide-react';
import { marked } from 'marked';
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion } from 'framer-motion';
import LoadingOverlay from './components/LoadingOverlay.jsx';
import TypingDots from './components/TypingDots.jsx';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import OverviewPage from './components/OverviewPage.jsx';
import ClausesPage from './components/ClausesPage.jsx';
import ComparePage from './components/ComparePage.jsx';
import ReportsPage from './components/ReportsPage.jsx';
import ChatPopup from './components/ChatPopup.jsx';
import EmptyState from './components/EmptyState.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');

// Retry wrapper for cold-start resilience (free-tier Render/Railway sleep after inactivity)
const fetchWithRetry = async (url, options, retries = 3, delayMs = 3000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);
      return res;
    } catch (err) {
      console.warn(`Fetch attempt ${attempt}/${retries} failed:`, err.message);
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
};

// Parse markdown once, safely
const parseMarkdown = (content) => {
  try { return marked.parse(content || ''); }
  catch { return content || ''; }
};

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('tos_token'));
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authMode, setAuthMode] = useState('login');

  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');
  const [inputMode, setInputMode] = useState('url');

  const [urlInput, setUrlInput] = useState('');
  const [textInput, setTextInput] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const fileInputRef = useRef(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [analysisJobId, setAnalysisJobId] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [sourceInfo, setSourceInfo] = useState({ type: null, value: null });
  const [showSourcePopup, setShowSourcePopup] = useState(false);

  const [sessionId, setSessionId] = useState(null);
  const [chatMessages, setChatMessages] = useState([
    { role: 'bot', content: 'Hello. I am the Digital Jurist Assistant. Extract a document first, and I can help you navigate the findings!', html: '<p>Hello. I am the Digital Jurist Assistant. Extract a document first, and I can help you navigate the findings!</p>' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatTyping, setIsChatTyping] = useState(false);
  const [isChatPopupOpen, setIsChatPopupOpen] = useState(false);

  const [toasts, setToasts] = useState([]);
  const [historyItems, setHistoryItems] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState(null);
  const [isHistoryItemLoading, setIsHistoryItemLoading] = useState(false);
  const [narrativeVerdict, setNarrativeVerdict] = useState(null);
  const [isVerdictLoading, setIsVerdictLoading] = useState(false);
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('jurist_settings');
      return saved ? JSON.parse(saved) : { autoOpenResults: true, compactRiskCards: false };
    } catch {
      return { autoOpenResults: true, compactRiskCards: false };
    }
  });

  const [showCompareSelector, setShowCompareSelector] = useState(false);
  const [compareDocA, setCompareDocA] = useState(null);
  const [compareDocB, setCompareDocB] = useState(null);
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonData, setComparisonData] = useState(null);
  const [compareHistory, setCompareHistory] = useState([]);
  const [isCompareHistoryLoading, setIsCompareHistoryLoading] = useState(false);

  useEffect(() => {
    if (token) {
      fetchUser();
    }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    localStorage.setItem('jurist_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (token) {
      loadHistory();
      loadCompareHistory();
    }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchUser = async () => {
    try {
      const res = await fetch(`${API}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else if (res.status === 401) {
        logout();
      }
    } catch (error) {
      console.error('Fetch user failed', error);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    const username = e.target.username?.value?.trim();
    const email = e.target.email.value;
    const password = e.target.password.value;
    const confirmPassword = e.target.confirmPassword?.value;

    if (authMode === 'signup' && password !== confirmPassword) {
      return addToast('Passwords do not match', true);
    }

    if (authMode === 'signup' && (!username || username.length < 3)) {
      return addToast('Username must be at least 3 characters', true);
    }

    setIsAuthLoading(true);

    try {
      if (authMode === 'login') {
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        const res = await fetch(`${API}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData
        });
        const data = await res.json();
        if (res.ok) {
          localStorage.setItem('tos_token', data.access_token);
          setToken(data.access_token);
          addToast('Logged in successfully');
        } else {
          addToast(data.detail || 'Login failed', true);
        }
      } else {
        const res = await fetch(`${API}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email, password })
        });
        const data = await res.json();
        if (res.ok) {
          addToast('Registration successful!');
          setAuthMode('login');
        } else {
          addToast(data.detail || 'Registration failed', true);
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      addToast('Authentication service unavailable', true);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('tos_token');
    setToken(null);
    setUser(null);
    setActiveView('dashboard');
    setHistoryItems([]);
    addToast('Logged out');
  };

  const addToast = (message, isError = false) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, isError }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const loadHistory = async () => {
    setIsHistoryLoading(true);
    try {
      const res = await fetch(`${API}/analyses?limit=50`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setHistoryItems(Array.isArray(data) ? data : []);
      } else {
        addToast(data.detail || 'Failed to load history', true);
      }
    } catch (error) {
      console.error('Load history error:', error);
      addToast('History service unavailable', true);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const loadCompareHistory = async () => {
    setIsCompareHistoryLoading(true);
    try {
      const res = await fetch(`${API}/compare/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCompareHistory(data.compares || []);
      }
    } catch (err) { console.error(err); }
    finally { setIsCompareHistoryLoading(false); }
  };

  const openCompareHistory = async (compareId) => {
    try {
      const res = await fetch(`${API}/compare/${compareId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.result) {
          setComparisonData(data.result);
          setActiveView('compare');
        }
      }
    } catch (err) { addToast('Failed to load comparison', true); }
  };

  const loadChatHistory = async (targetSessionId) => {
    try {
      const res = await fetch(`${API}/chat/${targetSessionId}/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        return false;
      }

      const mapped = data.map((m) => ({
        role: m.role === 'assistant' ? 'bot' : m.role,
        content: m.content,
      }));
      setChatMessages(mapped);
      return true;
    } catch {
      return false;
    }
  };

  const openHistoryAnalysis = async (jobId) => {
    setIsHistoryItemLoading(true);
    try {
      const res = await fetch(`${API}/analyses/${jobId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        return addToast(data.detail || 'Failed to load analysis', true);
      }

      if (!data.result) {
        return addToast('Selected analysis is not complete yet.', true);
      }

      const restored = await loadChatHistory(data.job_id);
      if (!restored) {
        const fallbackText = data.source || 'Loaded from saved analysis.';
        await initChatSession(fallbackText, data.job_id);
        setChatMessages([
          { role: 'bot', content: 'Chat is now enabled for this analysis. Ask a follow-up question about any clause.', html: '<p>Chat is now enabled for this analysis. Ask a follow-up question about any clause.</p>' }
        ]);
      } else {
        setSessionId(data.job_id);
      }

      const sType = data.source_type || 'text';
      if (sType === 'url') {
        setSourceInfo({ type: 'url', value: data.source || '' });
      } else if (sType === 'pdf') {
        setSourceInfo({ type: 'pdf', value: data.source || 'Uploaded PDF' });
      } else {
        setSourceInfo({ type: 'text', value: data.source || '' });
      }

      setAnalysisJobId(data.job_id);
      setAnalysisResult(data.result);
      setSelectedHistoryId(data.job_id);
      setActiveView('overview');
      fetchNarrativeVerdict(data.job_id);
    } catch {
      addToast('Could not open selected history item', true);
    } finally {
      setIsHistoryItemLoading(false);
    }
  };

  const pollRetryCount = useRef(0);

  const pollAnalysisResults = async (jobId) => {
    try {
      const res = await fetch(`${API}/analyze/status/${jobId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      pollRetryCount.current = 0;

      if (data.status === 'complete') {
        setAnalysisResult(data.result);
        setIsProcessing(false);
        loadHistory();
        if (settings.autoOpenResults) {
          setActiveView('overview');
        }

        fetchNarrativeVerdict(jobId);

        if (data.result.clauses && data.result.clauses.some(c => c.is_risky)) {
          const count = data.result.clauses.filter(c => c.is_risky).length;
          const msgText = `I've analyzed the document and found ${count} flagged clauses. The overarching risk profile is **${data.result.overall_risk}**. How can I assist you?`;
          setChatMessages(prev => [...prev, { role: 'bot', content: msgText, html: parseMarkdown(msgText) }]);
        }
      } else if (data.status === 'failed') {
        setIsProcessing(false);
        addToast('Analysis failed: ' + data.error, true);
      } else {
        setTimeout(() => pollAnalysisResults(jobId), 3000);
      }
    } catch (err) {
      console.warn(`Poll attempt ${pollRetryCount.current + 1} failed:`, err.message);
      pollRetryCount.current += 1;

      if (pollRetryCount.current >= 15) {
        setIsProcessing(false);
        addToast('Analysis timed out. Please check history later.', true);
        pollRetryCount.current = 0;
      } else {
        const delay = Math.min(5000, 2000 + pollRetryCount.current * 500);
        setTimeout(() => pollAnalysisResults(jobId), delay);
      }
    }
  };

  const stopAnalysis = async () => {
    if (!analysisJobId) return;
    try {
      await fetch(`${API}/analyze/stop/${analysisJobId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setIsProcessing(false);
      addToast('Analysis stopped by user.', true);
    } catch (err) {
      console.error(err);
      addToast('Failed to stop analysis', true);
    }
  };

  const startAnalysis = async () => {
    let content = '';
    if (inputMode === 'url') {
      content = urlInput.trim();
      if (!content) return addToast('Please enter a valid URL', true);
    } else if (inputMode === 'text') {
      content = textInput.trim();
      if (!content) return addToast('Please paste some text', true);
    } else if (inputMode === 'upload') {
      if (!uploadedFile) return addToast('Please select a file to upload', true);
    }

    setIsProcessing(true);
    setNarrativeVerdict(null);

    try {
      let analyzeType = inputMode;
      let analyzeContent = content;
      let pdfFileName = null;

      if (inputMode === 'upload') {
        const formData = new FormData();
        formData.append('file', uploadedFile);
        pdfFileName = uploadedFile.name;

        const extractRes = await fetch(`${API}/extract/pdf`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });

        if (!extractRes.ok) throw new Error('File extraction failed. Ensure it is a valid PDF.');
        const extractData = await extractRes.json();

        analyzeType = 'text';
        analyzeContent = extractData.cleaned_text || extractData.raw_text;
      }

      if (inputMode === 'url') {
        setSourceInfo({ type: 'url', value: content });
      } else if (inputMode === 'upload') {
        setSourceInfo({ type: 'pdf', value: pdfFileName, blobUrl: URL.createObjectURL(uploadedFile) });
      } else {
        setSourceInfo({ type: 'text', value: content });
      }

      const requestBody = {
        input_type: analyzeType,
        content: analyzeContent,
      };
      if (inputMode === 'upload') {
        requestBody.source_label = pdfFileName;
      }

      const res = await fetch(`${API}/analyze/async`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!res.ok) throw new Error('Analysis initialization failed');
      const data = await res.json();

      setAnalysisJobId(data.job_id);
      setSelectedHistoryId(data.job_id);

      if (data.extraction && data.extraction.cleaned_text) {
        initChatSession(data.extraction.cleaned_text, data.job_id);
      }

      pollAnalysisResults(data.job_id);
    } catch (err) {
      addToast(err.message, true);
      setIsProcessing(false);
    }
  };

  const initChatSession = async (text, targetSessionId = null) => {
    const newSessionId = targetSessionId || crypto.randomUUID();
    setSessionId(newSessionId);
    try {
      await fetch(`${API}/chat/store`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ session_id: newSessionId, document_text: text })
      });
    } catch (e) {
      console.error('Chat init fail', e);
    }
  };

  const sendChat = async () => {
    const msg = chatInput.trim();
    if (!msg || !sessionId || isChatTyping) return;

    setChatInput('');
    const newChat = [...chatMessages, { role: 'user', content: msg }];
    setChatMessages(newChat);
    setIsChatTyping(true);

    try {
      const res = await fetchWithRetry(`${API}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ session_id: sessionId, message: msg, history: [] })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Server error (${res.status})`);
      }

      const data = await res.json();

      if (data.comparison_result && data.structured) {
        setComparisonData(data.structured);
        const replyText = (data.reply || '') + "\n\n💡 I've loaded the comparison details. Switch to the Compare view for the full side-by-side analysis!";
        setChatMessages([...newChat, { role: 'bot', content: replyText, html: parseMarkdown(replyText) }]);
        addToast('Comparison complete! Check the Compare page for details.');
      } else if (data.comparison_needed) {
        setChatMessages([...newChat, { role: 'bot', content: data.reply || '', html: parseMarkdown(data.reply || '') }]);
        if (data.comparison_options) {
          setShowCompareSelector(true);
        }
      } else {
        setChatMessages([...newChat, { role: 'bot', content: data.reply || '', html: parseMarkdown(data.reply || '') }]);
      }
    } catch (err) {
      console.error(err);
      const errMsg = err.message && err.message !== 'Failed to fetch'
        ? `Sorry, something went wrong: ${err.message}`
        : "Sorry, I couldn't connect. The server may be waking up — please try again in a few seconds.";
      setChatMessages([...newChat, { role: 'bot', content: errMsg, html: parseMarkdown(errMsg) }]);
    } finally {
      setIsChatTyping(false);
    }
  };

  const performComparison = async (sessionIdA, sessionIdB) => {
    try {
      const res = await fetchWithRetry(`${API}/chat/compare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          session_id_a: sessionIdA,
          session_id_b: sessionIdB,
          question: "Compare the risk profiles of both documents",
          history: []
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Comparison failed (${res.status})`);
      }

      const data = await res.json();

      if (data.structured) {
        setComparisonData(data.structured);
        setShowCompareSelector(false);
        addToast('Comparison complete!');
      } else {
        addToast(data.detail || 'Comparison failed', true);
      }
    } catch (err) {
      console.error(err);
      addToast(err.message || 'Failed to compare documents', true);
    } finally {
      setIsComparing(false);
    }
  };

  const explainRiskInChat = (clause, index) => {
    const category = clause.risk_categories && clause.risk_categories.length > 0
      ? clause.risk_categories[0]
      : 'General';
    const confidence = clause.confidence || 'Medium';
    const summary = clause.explanation || clause.text || 'No clause text available.';
    const sourceText = clause.text || '';

    const categoryExamples = {
      'Privacy Risk': 'Example: "We may share your personal data with third-party advertisers without additional consent."',
      'Legal Risk': 'Example: "You waive your right to participate in any class action against us."',
      'User Rights Risk': 'Example: "We may terminate your account at any time, without notice or appeal."',
      'Security Risk': 'Example: "We are not responsible for unauthorized access, data breaches, or account compromise."',
      'Financial Risk': 'Example: "All purchases are final and non-refundable, including accidental renewals."',
      'General': 'Example: "The provider can change terms at any time and your continued use implies acceptance."'
    };

    const chatDetail = [
      `### Clause #${index + 1}: ${category}`,
      `**Confidence:** ${confidence}`,
      `**What this means:** ${summary}`,
      sourceText ? `**Source text:** "${sourceText.slice(0, 240)}${sourceText.length > 240 ? '...' : ''}"` : '',
      `**Practical example:** ${categoryExamples[category] || categoryExamples.General}`,
      '**Why this matters:** This can reduce your control, increase liability exposure, or create unexpected obligations.'
    ].filter(Boolean).join('\n\n');

    setChatMessages(prev => [...prev, { role: 'bot', content: chatDetail, html: parseMarkdown(chatDetail) }]);
  };

  const fetchNarrativeVerdict = async (targetSessionId) => {
    if (!targetSessionId || !token) return;
    setIsVerdictLoading(true);
    try {
      const prompt = `Write 3 to 4 sentences about this document's legal risk profile. Focus on what's actually in the document — specific patterns that stand out, how severe the risks are, and what action makes sense. Be direct and factual, not formulaic.`;

      const res = await fetchWithRetry(`${API}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ session_id: targetSessionId, message: prompt, history: [] })
      });
      if (res.ok) {
        const data = await res.json();
        setNarrativeVerdict(data.reply || null);
      }
    } catch (err) {
      console.error('Verdict fetch failed:', err);
    } finally {
      setIsVerdictLoading(false);
    }
  };

  const calculateScore = () => {
    if (!analysisResult) return 100;
    const riskyCount = analysisResult.risky_clause_count || 0;
    const totalCount = analysisResult.total_clauses || 1;
    if (riskyCount === 0) return 100;

    const avgSeverity = analysisResult.avg_severity_score || 
                     ((analysisResult.total_severity_score || 0) / (riskyCount || 1));
    const overallRisk = analysisResult.overall_risk || 'Low';

    let score = 100;

    if (avgSeverity <= 1) score = 95;
    else if (avgSeverity <= 2) score = 90 - ((avgSeverity - 1) * 5);
    else if (avgSeverity <= 3) score = 85 - ((avgSeverity - 2) * 5);
    else if (avgSeverity <= 5) score = 75 - ((avgSeverity - 3) * 5);
    else if (avgSeverity <= 8) score = 60 - ((avgSeverity - 5) * 3);
    else if (avgSeverity <= 12) score = 45 - ((avgSeverity - 8) * 3);
    else score = Math.max(10, 30 - ((avgSeverity - 12) * 2));

    if (overallRisk === 'High') score = Math.max(15, score - 12);
    else if (overallRisk === 'Medium') score = Math.max(25, score - 6);

    const riskyRatio = riskyCount / totalCount;
    if (riskyRatio > 0.5) score = Math.max(15, score - 12);
    else if (riskyRatio > 0.3) score = Math.max(25, score - 6);
    else if (riskyRatio > 0.15) score = Math.max(35, score - 3);

    return Math.floor(Math.max(10, Math.min(100, score)));
  };

  const viewMotion = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' } },
    exit: { opacity: 0, y: 8, transition: { duration: 0.16, ease: 'easeIn' } },
  };

  if (!token) {
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

  return (
    <div className="min-h-screen bg-[#050505]">
      <LoadingOverlay
        show={isProcessing || isHistoryItemLoading}
        title={isProcessing ? "Processing" : "Loading Analysis"}
        detail={isProcessing ? "Extracting and analyzing clauses. You can press STOP anytime." : "Retrieving analysis data from Jurist AI cloud..."}
      />

      <AnimatePresence>
        {showSourcePopup && (
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSourcePopup(false)}
          >
            <motion.div
              className="bg-[#0a0a0a] border border-white/10 rounded-xl p-6 max-w-2xl w-full mx-4"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">Source Content</h3>
                <button onClick={() => setShowSourcePopup(false)} className="text-white/60 hover:text-white">
                  <X size={20} />
                </button>
              </div>
              <div className="bg-black/20 p-4 rounded-lg text-sm text-white/60 font-mono max-h-96 overflow-y-auto">
                {sourceInfo.value || 'No content loaded.'}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Sidebar
        activeView={activeView}
        onNavigate={(view) => {
          if (view === 'overview') {
            if (analysisResult) {
              setActiveView('overview');
            } else {
              setActiveView('dashboard');
            }
          } else {
            setActiveView(view);
          }
        }}
        user={user}
        onLogout={logout}
        historyItems={historyItems}
        onOpenHistory={openHistoryAnalysis}
        isHistoryLoading={isHistoryLoading}
        selectedHistoryId={selectedHistoryId}
        onNewAnalysis={() => {
          setActiveView('dashboard');
          setSelectedHistoryId(null);
        }}
      />

      <div className="ml-64 flex flex-col min-h-screen">
        <Header
          activeView={activeView}
          analysisResult={analysisResult}
          onNavigate={(view) => {
            if (['overview', 'clauses', 'reports'].includes(view) && !analysisResult) {
              setActiveView('dashboard');
              addToast('Please select or run an analysis first.', true);
            } else {
              setActiveView(view);
            }
          }}
          onNewAnalysis={() => {
            setActiveView('dashboard');
            setSelectedHistoryId(null);
          }}
        />

        <main className="flex-1 overflow-y-auto">
          <ErrorBoundary>
            <AnimatePresence mode="wait">
              {activeView === 'dashboard' && (
                <motion.section
                  key="view-dashboard"
                  initial={viewMotion.initial}
                  animate={viewMotion.animate}
                  exit={viewMotion.exit}
                  className="p-6"
                >
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
                </motion.section>
              )}

              {activeView === 'overview' && (
                <motion.section
                  key="view-overview"
                  initial={viewMotion.initial}
                  animate={viewMotion.animate}
                  exit={viewMotion.exit}
                >
                  {analysisResult ? (
                    <OverviewPage
                      analysisResult={analysisResult}
                      sourceInfo={sourceInfo}
                      onNavigate={setActiveView}
                      calculateScore={calculateScore}
                      historyItems={historyItems}
                      narrativeVerdict={narrativeVerdict}
                      isVerdictLoading={isVerdictLoading}
                    />
                  ) : (
                    <EmptyState
                      view="overview"
                      onNewAnalysis={() => {
                        setActiveView('dashboard');
                        setSelectedHistoryId(null);
                      }}
                    />
                  )}
                </motion.section>
              )}

              {activeView === 'clauses' && (
                <motion.section
                  key="view-clauses"
                  initial={viewMotion.initial}
                  animate={viewMotion.animate}
                  exit={viewMotion.exit}
                  className="h-full"
                >
                  {analysisResult ? (
                    <ClausesPage
                      analysisResult={analysisResult}
                      sourceInfo={sourceInfo}
                      onExplainRiskInChat={explainRiskInChat}
                      onToggleChat={() => setIsChatPopupOpen(true)}
                    />
                  ) : (
                    <EmptyState
                      view="clauses"
                      onNewAnalysis={() => {
                        setActiveView('dashboard');
                        setSelectedHistoryId(null);
                      }}
                    />
                  )}
                </motion.section>
              )}

              {activeView === 'reports' && (
                <motion.section
                  key="view-reports"
                  initial={viewMotion.initial}
                  animate={viewMotion.animate}
                  exit={viewMotion.exit}
                  className="p-6"
                >
                  <ReportsPage
                    analysisResult={analysisResult}
                    sourceInfo={sourceInfo}
                    calculateScore={calculateScore}
                  />
                </motion.section>
              )}

              {activeView === 'settings' && (
                <motion.section
                  key="view-settings"
                  initial={viewMotion.initial}
                  animate={viewMotion.animate}
                  exit={viewMotion.exit}
                  className="p-6"
                >
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
                </motion.section>
              )}

              {activeView === 'compare' && (
                <motion.section
                  key="view-compare"
                  initial={viewMotion.initial}
                  animate={viewMotion.animate}
                  exit={viewMotion.exit}
                  className="p-6"
                >
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
                </motion.section>
              )}

            </AnimatePresence>

            {showCompareSelector && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] flex items-center justify-center p-4">
                <motion.div
                  className="bg-[#0a0a0a] border border-white/10 rounded-xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto"
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                >
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-white">Select Documents to Compare</h3>
                    <button onClick={() => setShowCompareSelector(false)} className="text-white/60 hover:text-white">
                      <X size={20} />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-white mb-2">Document A</h4>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {historyItems.map((item) => (
                          <button
                            key={item.job_id}
                            onClick={() => setCompareDocA(item)}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${compareDocA?.job_id === item.job_id
                              ? 'bg-[#007AFF]/20 text-white'
                              : 'text-white/60 hover:text-white hover:bg-white/5'
                              }`}
                          >
                            <div className={`w-2 h-2 rounded-full ${item.overall_risk === 'High' ? 'bg-red-500' : item.overall_risk === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'}`} />
                            <span className="truncate">{item.source_label || item.source}</span>
                            <span className="text-xs text-white/50">{item.overall_risk} risk</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white mb-2">Document B</h4>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {historyItems.map((item) => (
                          <button
                            key={item.job_id}
                            onClick={() => setCompareDocB(item)}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${compareDocB?.job_id === item.job_id
                              ? 'bg-[#007AFF]/20 text-white'
                              : 'text-white/60 hover:text-white hover:bg-white/5'
                              }`}
                          >
                            <div className={`w-2 h-2 rounded-full ${item.overall_risk === 'High' ? 'bg-red-500' : item.overall_risk === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'}`} />
                            <span className="truncate">{item.source_label || item.source}</span>
                            <span className="text-xs text-white/50">{item.overall_risk} risk</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setShowCompareSelector(false)}
                      className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white/80 hover:bg-white/10"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (compareDocA && compareDocB) {
                          setIsComparing(true);
                          setShowCompareSelector(false);
                          setComparisonData(null);
                          performComparison(compareDocA.job_id, compareDocB.job_id);
                        }
                      }}
                      disabled={!compareDocA || !compareDocB || compareDocA.job_id === compareDocB.job_id}
                      className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-[#007AFF] to-[#0056cc] text-white text-sm font-semibold disabled:opacity-50"
                    >
                      Compare Now
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </ErrorBoundary>
        </main>
      </div>

      <ChatPopup
        isOpen={isChatPopupOpen}
        onToggle={() => setIsChatPopupOpen(!isChatPopupOpen)}
        chatMessages={chatMessages}
        chatInput={chatInput}
        onChatInputChange={setChatInput}
        onSendChat={sendChat}
        isChatTyping={isChatTyping}
        sessionId={sessionId}
        user={user}
      />

      <div className={`fixed ${isChatPopupOpen ? 'bottom-28' : 'bottom-6'} right-6 flex flex-col gap-3 z-[9999]`}>
        {toasts.map(t => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-lg text-sm ${t.isError
              ? 'bg-red-500/20 border border-red-500/30 text-red-500'
              : 'bg-green-500/20 border border-green-500/30 text-green-500'
              }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}