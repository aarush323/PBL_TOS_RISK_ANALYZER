import React, { useState, useEffect, useRef } from 'react';
import { FileText, Link, Upload, Scale, Bell, Settings as SettingsIcon, HelpCircle, History, Plus, BrainCircuit, Activity, ChevronRight, Zap, Maximize2, Minimize2, Menu, X } from 'lucide-react';
import { marked } from 'marked';
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion } from 'framer-motion';
import LoadingOverlay from './components/LoadingOverlay.jsx';
import SkeletonList from './components/SkeletonList.jsx';
import TypingDots from './components/TypingDots.jsx';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');

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
    { role: 'bot', content: 'Hello. I am the Digital Jurist Assistant. Extract a document first, and I can help you navigate the findings!' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatTyping, setIsChatTyping] = useState(false);
  const chatBoxRef = useRef(null);

  const [toasts, setToasts] = useState([]);
  const [historyItems, setHistoryItems] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState(null);
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('jurist_settings');
      return saved ? JSON.parse(saved) : { autoOpenResults: true, compactRiskCards: false };
    } catch {
      return { autoOpenResults: true, compactRiskCards: false };
    }
  });
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [resultsSplit, setResultsSplit] = useState(64);
  const [chatPanelHeight, setChatPanelHeight] = useState(140);

  const [comparisonData, setComparisonData] = useState(null);
  const [showCompareSelector, setShowCompareSelector] = useState(false);
  const [compareDocA, setCompareDocA] = useState(null);
  const [compareDocB, setCompareDocB] = useState(null);
  const [isComparing, setIsComparing] = useState(false);

  const isDesktop = () => window.innerWidth > 1024;

  const startSidebarResize = (e) => {
    if (!isDesktop()) return;
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const onMove = (moveEvent) => {
      const next = startWidth + (moveEvent.clientX - startX);
      setSidebarWidth(Math.max(220, Math.min(420, next)));
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const startResultsResize = (e) => {
    if (!isDesktop()) return;
    e.preventDefault();
    const rect = e.currentTarget.parentElement.getBoundingClientRect();

    const onMove = (moveEvent) => {
      const percentage = ((moveEvent.clientX - rect.left) / rect.width) * 100;
      setResultsSplit(Math.max(40, Math.min(75, percentage)));
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const startChatResize = (e) => {
    if (!isDesktop()) return;
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = chatPanelHeight;

    const onMove = (moveEvent) => {
      const next = startHeight - (moveEvent.clientY - startY);
      setChatPanelHeight(Math.max(110, Math.min(260, next)));
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

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
          { role: 'bot', content: 'Chat is now enabled for this analysis. Ask a follow-up question about any clause.' }
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
      setActiveView('results');
    } catch {
      addToast('Could not open selected history item', true);
    }
  };

  const pollAnalysisResults = async (jobId) => {
    try {
      const res = await fetch(`${API}/analyze/status/${jobId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.status === 'complete') {
        setAnalysisResult(data.result);
        setIsProcessing(false);
        loadHistory();
        if (settings.autoOpenResults) {
          setActiveView('results');
        }

        if (data.result.clauses && data.result.clauses.some(c => c.is_risky)) {
          const count = data.result.clauses.filter(c => c.is_risky).length;
          setChatMessages(prev => [...prev, { role: 'bot', content: `I've analyzed the document and found ${count} flagged clauses. The overarching risk profile is **${data.result.overall_risk}**. How can I assist you?` }]);
        }
      } else if (data.status === 'failed') {
        setIsProcessing(false);
        addToast('Analysis failed: ' + data.error, true);
      } else {
        setTimeout(() => pollAnalysisResults(jobId), 2000);
      }
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
      addToast('Failed to poll analysis', true);
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
    if (!msg || !sessionId) return;

    setChatInput('');
    const newChat = [...chatMessages, { role: 'user', content: msg }];
    setChatMessages(newChat);
    setIsChatTyping(true);

    try {
      const res = await fetch(`${API}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ session_id: sessionId, message: msg, history: [] })
      });
      const data = await res.json();

      if (data.comparison_result && data.structured) {
        setComparisonData(data.structured);
        setChatMessages([...newChat, { role: 'bot', content: data.reply + "\n\n💡 I've loaded the comparison details. Switch to the Compare view for the full side-by-side analysis!" }]);
        addToast('Comparison complete! Check the Compare page for details.');
      } else if (data.comparison_needed) {
        setChatMessages([...newChat, { role: 'bot', content: data.reply }]);
        if (data.comparison_options) {
          setShowCompareSelector(true);
        }
      } else {
        setChatMessages([...newChat, { role: 'bot', content: data.reply }]);
      }
    } catch (err) {
      console.error(err);
      setChatMessages([...newChat, { role: 'bot', content: "Sorry, I couldn't connect." }]);
    } finally {
      setIsChatTyping(false);
    }
  };

  const performComparison = async (sessionIdA, sessionIdB) => {
    try {
      const res = await fetch(`${API}/chat/compare`, {
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
      addToast('Failed to compare documents', true);
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

    setChatMessages(prev => [...prev, { role: 'bot', content: chatDetail }]);
  };

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const calculateScore = () => {
    if (!analysisResult) return 100;

    const totalSeverity = analysisResult.total_severity_score || 0;
    const avgSeverity = analysisResult.avg_severity_score || 0;
    const riskyCount = analysisResult.risky_clause_count || 0;
    const totalCount = analysisResult.total_clauses || 1;
    const overallRisk = analysisResult.overall_risk || 'Low';

    if (riskyCount === 0) return 100;

    let score = 100;

    if (totalSeverity <= 2) {
      score = 95;
    } else if (totalSeverity <= 5) {
      score = 90 - ((totalSeverity - 2) * 6.67);
    } else if (totalSeverity <= 10) {
      score = 80 - ((totalSeverity - 5) * 4);
    } else if (totalSeverity <= 20) {
      score = 60 - ((totalSeverity - 10) * 3);
    } else if (totalSeverity <= 40) {
      score = 40 - ((totalSeverity - 20) * 1.5);
    } else {
      score = Math.max(10, 25 - ((totalSeverity - 40) * 0.5));
    }

    if (overallRisk === 'High') {
      score = Math.max(10, score - 15);
    } else if (overallRisk === 'Medium') {
      score = Math.max(20, score - 8);
    }

    const riskyRatio = riskyCount / totalCount;
    if (riskyRatio > 0.5) {
      score = Math.max(10, score - 15);
    } else if (riskyRatio > 0.3) {
      score = Math.max(20, score - 8);
    } else if (riskyRatio > 0.15) {
      score = Math.max(30, score - 3);
    }

    return Math.floor(Math.max(10, Math.min(100, score)));
  };

  const renderFauxHTML = (htmlString) => {
    return { __html: htmlString };
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
    <div className="app-container">
      <LoadingOverlay
        show={isProcessing}
        title="Processing"
        detail="Extracting and analyzing clauses. You can press STOP anytime."
      />

      <AnimatePresence>
        {showSourcePopup && (
          <motion.div
            className="popup-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSourcePopup(false)}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <motion.div
              className="popup-content"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: 'var(--surface, #1e1e2e)',
                padding: (sourceInfo.type === 'pdf' && sourceInfo.blobUrl) || sourceInfo.type === 'url' ? '0' : '24px',
                borderRadius: '12px',
                maxWidth: (sourceInfo.type === 'pdf' && sourceInfo.blobUrl) || sourceInfo.type === 'url' ? '1200px' : '600px',
                width: '90%',
                height: (sourceInfo.type === 'pdf' && sourceInfo.blobUrl) || sourceInfo.type === 'url' ? '90vh' : 'auto',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid var(--border)',
                overflow: 'hidden',
                position: 'relative'
              }}
            >
              {((sourceInfo.type === 'pdf' && sourceInfo.blobUrl) || sourceInfo.type === 'url') && (
                <button
                  onClick={() => setShowSourcePopup(false)}
                  style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}
                >
                  &times;
                </button>
              )}

              {sourceInfo.type === 'pdf' ? (
                sourceInfo.blobUrl ? (
                  <iframe src={sourceInfo.blobUrl} width="100%" height="100%" style={{ flex: 1, border: 'none', background: '#fff' }} title="PDF Preview" />
                ) : (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '16px', color: 'var(--text-heading)' }}>Source Content</h3>
                    <FileText size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                    <p style={{ color: 'var(--text-body)' }}><strong>{sourceInfo.value}</strong></p>
                    <p style={{ fontSize: '13px', marginTop: '12px', maxWidth: '400px', lineHeight: 1.5 }}>
                      The original PDF file is not available for historical analyses. It is only stored locally during your active upload session.
                    </p>
                    <div style={{ marginTop: '24px', textAlign: 'center', width: '100%' }}>
                      <button className="nav-btn primary" onClick={() => setShowSourcePopup(false)} style={{ padding: '8px 16px', background: 'var(--primary)', border: 'none', borderRadius: '4px', cursor: 'pointer', color: '#fff' }}>Close</button>
                    </div>
                  </div>
                )
              ) : sourceInfo.type === 'url' ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                  <h3 style={{ marginTop: 0, marginBottom: '16px', color: 'var(--text-heading)' }}>Source URL</h3>
                  <Link size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                  <p style={{ color: 'var(--text-body)', wordBreak: 'break-all', maxWidth: '80%' }}>
                    <strong><a href={sourceInfo.value} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none' }}>{sourceInfo.value}</a></strong>
                  </p>
                  <p style={{ fontSize: '13px', marginTop: '12px', maxWidth: '400px', lineHeight: 1.5 }}>
                    For security and performance reasons, live web pages are not loaded in an iframe preview. Click the link above to open it in a new tab.
                  </p>
                  <div style={{ marginTop: '24px', textAlign: 'center', width: '100%' }}>
                    <button className="nav-btn primary" onClick={() => setShowSourcePopup(false)} style={{ padding: '8px 16px', background: 'var(--primary)', border: 'none', borderRadius: '4px', cursor: 'pointer', color: '#fff' }}>Close</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: 'calc(90vh - 48px)' }}>
                  <h3 style={{ marginTop: 0, marginBottom: '16px', color: 'var(--text-heading)' }}>Source Content</h3>
                  <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-body)', fontSize: '14px', lineHeight: 1.5, overflowY: 'auto', flex: 1, padding: '12px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    {sourceInfo.value || 'No content loaded.'}
                  </div>
                  <div style={{ marginTop: '24px', textAlign: 'right' }}>
                    <button className="nav-btn primary" onClick={() => setShowSourcePopup(false)} style={{ padding: '8px 16px', background: 'var(--primary)', border: 'none', borderRadius: '4px', cursor: 'pointer', color: '#fff' }}>Close</button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Top Header */}
      <div className="mobile-top-header">
        <div className="brand" style={{ margin: 0 }}>
          <div className="brand-icon"><Scale size={18} /></div>
          <span className="brand-title" style={{ fontSize: '18px', fontWeight: 700, marginLeft: '8px' }}>Jurist AI</span>
        </div>
        <button className="mobile-menu-btn" onClick={() => setIsMobileNavOpen(true)}>
          <Menu size={24} />
        </button>
      </div>

      {isMobileNavOpen && (
        <div className="mobile-overlay" onClick={() => setIsMobileNavOpen(false)} />
      )}

      <aside className={`sidebar ${isMobileNavOpen ? 'open' : ''}`} style={{ width: isDesktop() ? `${sidebarWidth}px` : '100%' }}>
        <button className="mobile-close-btn" onClick={() => setIsMobileNavOpen(false)}>
          <X size={24} />
        </button>
        <div className="brand">
          <div className="brand-icon"><Scale size={18} /></div>
          <div className="brand-text">
            <span className="brand-title">Jurist AI</span>
            <span className="brand-subtitle">TERMS RISK REVIEW</span>
          </div>
        </div>

        <button className="nav-btn primary" onClick={() => { setActiveView('dashboard'); setSelectedHistoryId(null); setIsMobileNavOpen(false); }}>
          <Plus size={16} /> <span>New Analysis</span>
        </button>

        <div className="sidebar-history">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px 8px 8px' }}>
            <div className="sidebar-section-title">
              <History size={14} /> Recent Analyses
            </div>
            <button className="chat-sugg-btn" type="button" onClick={loadHistory}>Refresh</button>
          </div>

          <div className="history-list">
            {isHistoryLoading ? (
              <SkeletonList rows={5} />
            ) : historyItems.length === 0 ? (
              <div style={{ padding: '8px 10px', fontSize: '12px', color: 'var(--text-muted)' }}>No history yet</div>
            ) : (
              historyItems.slice(0, 8).map((item) => (
                <button
                  key={item.job_id}
                  type="button"
                  className={`history-item ${selectedHistoryId === item.job_id ? 'active' : ''}`}
                  onClick={() => { openHistoryAnalysis(item.job_id); setIsMobileNavOpen(false); }}
                >
                  <span className="history-item-main">
                    {item.source_type?.toUpperCase() || 'SRC'} | {(item.overall_risk || 'N/A')}
                  </span>
                  <span className="history-item-sub">#{item.job_id.slice(0, 4)}</span>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="sidebar-footer">
          <a className={`nav-item ${activeView === 'chat' ? 'active' : ''}`} onClick={() => { setActiveView('chat'); setIsMobileNavOpen(false); }}><BrainCircuit size={18}/> <span>Chat</span></a>
          <a className={`nav-item ${activeView === 'compare' ? 'active' : ''}`} onClick={() => { setActiveView('compare'); setIsMobileNavOpen(false); }}><Scale size={18}/> <span>Compare</span></a>
          <a className={`nav-item ${activeView === 'settings' ? 'active' : ''}`} onClick={() => { setActiveView('settings'); setIsMobileNavOpen(false); }}><SettingsIcon size={18}/> <span>Settings</span></a>
          <a className="nav-item" onClick={logout}><HelpCircle size={18}/> <span>Sign Out</span></a>

          <div className="user-profile">
            <div className="user-avatar">{user?.email?.[0].toUpperCase() || 'U'}</div>
            <div className="user-info">
              <span className="user-name">{user?.username || user?.email || 'Authenticated User'}</span>
              <span className="user-plan">Enterprise Plan</span>
            </div>
          </div>
        </div>
      </aside>
      <div className="resizer vertical" onMouseDown={startSidebarResize} />

      <div className="main-wrapper">
        <header className="topbar">
          <div className="topbar-nav"></div>
          <div className="topbar-actions">
            <Bell size={18} style={{ cursor: 'pointer' }} />
            <span style={{ fontSize: '14px', cursor: 'pointer', color: 'var(--primary)' }} onClick={logout}>Sign Out</span>
          </div>
        </header>

        <main className="content-area">
          <AnimatePresence mode="wait">
            {activeView === 'dashboard' && (
              <motion.section
                key="view-dashboard"
                className="view-section active"
                initial={viewMotion.initial}
                animate={viewMotion.animate}
                exit={viewMotion.exit}
              >
                <div className="hero">
                  <h1>Welcome, {user?.email?.split('@')[0] || 'User'}.</h1>
                  <p>Ready to deconstruct legal complexity? Initiate a new risk assessment by pasting your legal document, uploading a file, or providing a URL. Our AI provides deep structural analysis in seconds.</p>
                </div>

                <div className="input-container">
                  <div className="input-main">
                    <div className="tabs">
                      <button className={`tab-btn ${inputMode === 'upload' ? 'active' : ''}`} onClick={() => setInputMode('upload')}>Upload File</button>
                      <button className={`tab-btn ${inputMode === 'url' ? 'active' : ''}`} onClick={() => setInputMode('url')}>Provide Link</button>
                      <button className={`tab-btn ${inputMode === 'text' ? 'active' : ''}`} onClick={() => setInputMode('text')}>Paste Text</button>
                    </div>

                    <div className="input-card">
                      <div className="input-card-header">
                        <span className="input-label">
                          {inputMode === 'url' && 'TARGET RESOURCE URL'}
                          {inputMode === 'text' && 'DOCUMENT INPUT BUFFER'}
                          {inputMode === 'upload' && 'LOCAL FILE INGESTION'}
                        </span>
                        <span className="inline-chip">FORMAT: AUTO</span>
                      </div>

                      {inputMode === 'url' && (
                        <div>
                          <div className="url-input-wrapper">
                            <Link className="link-icon" size={16} />
                            <input type="url" className="url-input" placeholder="https://legal.enterprise.com/terms-of-service" value={urlInput} onChange={e => setUrlInput(e.target.value)} />
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '24px', fontSize: '13px', color: 'var(--primary)' }}>
                            <input type="checkbox" defaultChecked style={{ accentColor: 'var(--primary)' }} /> Secure SSL Encrypted Crawl ✓
                          </div>
                        </div>
                      )}

                      {inputMode === 'text' && (
                        <textarea className="text-input" placeholder="Paste your Terms of Service or Privacy Policy text here..." value={textInput} onChange={e => setTextInput(e.target.value)} />
                      )}

                      {inputMode === 'upload' && (
                        <div className="upload-zone" onClick={() => fileInputRef.current?.click()}>
                          <input type="file" ref={fileInputRef} accept=".pdf" onChange={e => setUploadedFile(e.target.files[0])} style={{ display: 'none' }} />
                          <FileText className="upload-icon" />
                          <div className="upload-title">{uploadedFile ? uploadedFile.name : 'Drag & drop legal documents here'}</div>
                          <div className="upload-desc">Support for PDF files. Up to 50MB per analysis.</div>
                          <button className="upload-btn" type="button">{uploadedFile ? 'Change File' : 'Select Files from Device'}</button>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '12px', width: '100%', flexWrap: 'wrap' }}>
                        <button className="action-btn" onClick={startAnalysis} disabled={isProcessing} style={{ flex: 1, minWidth: '200px' }}>
                          {isProcessing ? <div className="loader" style={{ display: 'block' }} /> : <Zap size={18} />}
                          {isProcessing ? 'PROCESSING...' : 'FETCH & ANALYZE'}
                        </button>
                        {isProcessing && (
                          <button className="action-btn" onClick={stopAnalysis} style={{ background: 'var(--error)', borderColor: 'var(--error)', minWidth: '100px' }}>
                            STOP
                          </button>
                        )}
                      </div>

                      <div className="supported-list">
                        <span className="supported-title">Supported:</span>
                        <span className="inline-chip">🌐 HTML 5</span>
                        <span className="inline-chip">📄 Dynamic PDF</span>
                        <span className="inline-chip">{'<>'} JSON Webhooks</span>
                      </div>
                    </div>
                  </div>

                  <div className="input-side">
                    <div className="info-card">
                      <div className="info-icon"><Activity size={18} /></div>
                      <h3 className="info-title">How To Get Better Results</h3>
                      <p className="info-desc">Use complete policy text when possible. Short excerpts may miss context and produce weaker risk explanations.</p>
                      <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                        • Prefer full ToS or Privacy Policy documents<br />
                        • Use PDF upload for long legal agreements<br />
                        • Open each flagged clause in chat for examples
                      </div>
                    </div>
                  </div>
                </div>
              </motion.section>
            )}

            {activeView === 'results' && (
              <motion.section
                key="view-results"
                className="view-section active"
                initial={viewMotion.initial}
                animate={viewMotion.animate}
                exit={viewMotion.exit}
              >
                <div className="hero hero-compact hero-row">
                  <div>
                    <h1 className="section-title">Analysis Results</h1>
                    <div className="source-badge">
                      {sourceInfo.type === 'url' ? (
                        <span className="source-link source-url" onClick={() => setShowSourcePopup(true)} style={{ cursor: 'pointer' }}>
                          <Link size={14} />
                          <span className="source-link-text">{sourceInfo.value}</span>
                        </span>
                      ) : sourceInfo.type === 'pdf' ? (
                        <span className="source-link source-pdf" onClick={() => setShowSourcePopup(true)} style={{ cursor: 'pointer' }}>
                          <FileText size={14} />
                          <span className="source-link-text">{sourceInfo.value || 'Uploaded PDF'}</span>
                        </span>
                      ) : sourceInfo.type === 'text' ? (
                        <span className="source-link source-text" onClick={() => setShowSourcePopup(true)} style={{ cursor: 'pointer' }}>
                          <FileText size={14} />
                          <span className="source-link-text">Pasted Text</span>
                        </span>
                      ) : (
                        <span className="source-link source-text">
                          <FileText size={14} />
                          <span className="source-link-text">No document loaded</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <button className="chat-sugg-btn" onClick={() => { setShowCompareSelector(true); setActiveView('compare'); }} style={{alignSelf: 'center', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <Scale size={14} /> Compare with...
                  </button>
                </div>

                <div className="results-layout">
                  <div className="results-main" style={{ width: isDesktop() ? `${resultsSplit}%` : '100%' }}>
                    <div className="score-card">
                      <div className="score-info">
                        <h2>Aggregate Risk Score</h2>
                        <p>Overall risk profile based on identified clauses within the provided document.</p>
                        <div style={{display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap'}}>
                          <span style={{
                            background: analysisResult?.overall_risk === 'High' ? 'rgba(255,85,85,0.15)' : (analysisResult?.overall_risk === 'Medium' ? 'rgba(255,200,0,0.15)' : 'rgba(0,200,100,0.15)'),
                            color: analysisResult?.overall_risk === 'High' ? 'var(--error)' : (analysisResult?.overall_risk === 'Medium' ? 'var(--warning)' : 'var(--success)'),
                            padding: '4px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase'
                          }}>{analysisResult?.overall_risk || 'Unknown'} Risk</span>
                          <span style={{background: 'var(--surface-2)', color: 'var(--text-muted)', padding: '4px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: 600}}>
                            {analysisResult?.risky_clause_count ?? 0} / {analysisResult?.total_clauses ?? 0} Clauses
                          </span>
                        </div>
                        {analysisResult?.risk_breakdown && (
                          <div style={{marginTop: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap'}}>
                            {Object.entries(analysisResult.risk_breakdown).filter(([_, count]) => count > 0).map(([cat, count]) => (
                              <span key={cat} style={{background: 'var(--surface-2)', color: 'var(--text-muted)', padding: '3px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: 500}}>
                                {cat}: {count}
                              </span>
                            ))}
                          </div>
                        )}
                        <div style={{marginTop: '12px', fontSize: '11px', color: 'var(--text-muted)'}}>
                          Severity: {analysisResult?.total_severity_score?.toFixed(1) || '0.0'} | Avg: {analysisResult?.avg_severity_score?.toFixed(2) || '0.00'}
                        </div>
                      </div>
                      <div className="score-circle">
                        <svg viewBox="0 0 100 100" width="100" height="100">
                          <circle className="bg" cx="50" cy="50" r="40" pathLength="100"></circle>
                          <circle className="progress" cx="50" cy="50" r="40" pathLength="100" style={{
                            strokeDashoffset: 100 - calculateScore(),
                            strokeLinecap: calculateScore() === 100 ? 'butt' : 'round',
                            stroke: calculateScore() < 50 ? 'var(--error)' : (calculateScore() < 75 ? 'var(--warning)' : 'var(--success)')
                          }}></circle>
                        </svg>
                        <span className="score-value">{calculateScore()}</span>
                        <span className="score-label">SCORE</span>
                      </div>
                    </div>

                    <h3 style={{ fontSize: '16px', marginBottom: '16px', color: 'var(--text-heading)' }}>Identified Risk Vectors</h3>
                    <div className="risk-cards">
                      {(!analysisResult || !analysisResult.clauses || analysisResult.clauses.length === 0) ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-sm)' }}>
                          No analysis data yet. Run an analysis from the dashboard.
                        </div>
                      ) : (
                        analysisResult.clauses.filter(c => c.is_risky).slice(0, 10).map((c, idx) => {
                          const cat = c.risk_categories && c.risk_categories.length > 0 ? c.risk_categories[0] : 'General';
                          const conf = c.confidence || 'Medium';
                          const cssClass = conf === 'High' ? 'high' : (conf === 'Medium' ? 'medium' : 'low');

                          return (
                            <div className={`risk-card ${cssClass}`} key={idx} style={{ padding: settings.compactRiskCards ? '14px' : '20px' }}>
                              <div className="risk-header">
                                <div className="risk-title-wrapper">
                                  <div className="risk-icon"><Scale size={16} /></div>
                                  <div>
                                    <div className="risk-title">{cat}</div>
                                    <div className="risk-section">Clause #{idx + 1}</div>
                                  </div>
                                </div>
                                <span className="risk-badge">{conf} RISK</span>
                              </div>
                              <div className="risk-desc">{c.explanation || c.text}</div>
                              <div className="risk-action-row">
                                <button
                                  type="button"
                                  className="chat-sugg-btn"
                                  onClick={() => explainRiskInChat(c, idx)}
                                >
                                  Explain In Chat
                                </button>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>

                  <div className="resizer vertical inner" onMouseDown={startResultsResize} />
                  <div className="results-side" style={{ width: isDesktop() ? `${100 - resultsSplit}%` : '100%' }}>
                    <div className="chat-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="chat-logo"><BrainCircuit size={18} /></div>
                        <div className="chat-title">
                          <h3>Digital Jurist Assistant</h3>
                          <p>Document Q&A</p>
                        </div>
                      </div>
                      <button
                        className="chat-sugg-btn"
                        onClick={() => setActiveView('chat')}
                        title="Expand to Full Chat"
                        style={{ padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Maximize2 size={16} />
                      </button>
                    </div>

                    <div className="chat-messages" ref={chatBoxRef}>
                      {chatMessages.map((msg, i) => (
                        <div className={`msg ${msg.role}`} key={i}>
                          <div className="msg-avatar">{msg.role === 'bot' ? <BrainCircuit size={14} /> : (user?.email?.[0].toUpperCase() || 'U')}</div>
                          <div className="msg-bubble" dangerouslySetInnerHTML={renderFauxHTML(msg.role === 'bot' ? marked.parse(msg.content) : msg.content)}></div>
                        </div>
                      ))}
                      {isChatTyping && (
                        <div className="msg bot">
                          <div className="msg-avatar"><BrainCircuit size={14} /></div>
                          <div className="msg-bubble"><TypingDots /></div>
                        </div>
                      )}
                    </div>

                    <div className="resizer horizontal" onMouseDown={startChatResize} />
                    <div className="chat-input" style={{
                      opacity: sessionId ? 1 : 0.5,
                      pointerEvents: sessionId ? 'all' : 'none',
                      height: isDesktop() ? `${chatPanelHeight}px` : 'auto'
                    }}>
                      <div className="chat-suggestions">
                        {['Summarize risks', 'Is there an opt-out?', 'Data collection terms?'].map(sugg => (
                          <div key={sugg} className="chat-sugg-btn" onClick={() => setChatInput(sugg)}>{sugg}</div>
                        ))}
                      </div>
                      <div className="chat-form">
                        <input
                          type="text"
                          className="chat-input-field"
                          placeholder="Ask about specific clauses or risks..."
                          value={chatInput}
                          onChange={e => setChatInput(e.target.value)}
                          onKeyPress={e => e.key === 'Enter' && sendChat()}
                        />
                        <button className="chat-send" onClick={sendChat} disabled={!chatInput.trim()}>
                          <ChevronRight size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.section>
            )}

            {activeView === 'settings' && (
              <motion.section
                key="view-settings"
                className="view-section active"
                initial={viewMotion.initial}
                animate={viewMotion.animate}
                exit={viewMotion.exit}
              >
                <div className="hero hero-compact">
                  <h1 className="section-title">Settings</h1>
                  <p>Customize behavior for analysis and results views.</p>
                </div>

                <div className="input-card" style={{ maxWidth: '720px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div>
                      <div className="risk-title">Auto-open Results After Analysis</div>
                      <div className="risk-section">Switch to Risk Analysis view automatically when processing completes.</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.autoOpenResults}
                      onChange={(e) => setSettings(prev => ({ ...prev, autoOpenResults: e.target.checked }))}
                      style={{ accentColor: 'var(--primary)', width: '18px', height: '18px' }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div className="risk-title">Compact Risk Cards</div>
                      <div className="risk-section">Reduce spacing in risk cards for denser reading.</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.compactRiskCards}
                      onChange={(e) => setSettings(prev => ({ ...prev, compactRiskCards: e.target.checked }))}
                      style={{ accentColor: 'var(--primary)', width: '18px', height: '18px' }}
                    />
                  </div>
                </div>
              </motion.section>
            )}

            {activeView === 'compare' && (
              <motion.section
                key="view-compare"
                className="view-section active"
                initial={viewMotion.initial}
                animate={viewMotion.animate}
                exit={viewMotion.exit}
              >
                <div className="hero hero-compact">
                  <h1 className="section-title">Document Comparison</h1>
                  <p>Compare risk profiles between two analyzed documents side-by-side.</p>
                </div>

                {showCompareSelector ? (
                  <div className="input-card" style={{maxWidth: '800px'}}>
                    <h3 style={{marginBottom: '16px'}}>Select Two Documents to Compare</h3>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px'}}>
                      <div>
                        <label style={{display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-muted)'}}>Document A</label>
                        <select
                          className="chat-input-field"
                          value={compareDocA || ''}
                          onChange={(e) => setCompareDocA(e.target.value)}
                          style={{width: '100%', padding: '12px'}}
                        >
                          <option value="">Select a document...</option>
                          {historyItems.filter(h => h.has_result).map(item => {
                            let displayName = item.source;
                            if (item.source_type === 'url') {
                              try {
                                const url = new URL(item.source);
                                displayName = url.hostname;
                              } catch (e) {
                                displayName = item.source;
                              }
                            }
                            return (
                              <option key={item.job_id} value={item.job_id}>
                                {displayName} ({item.overall_risk})
                              </option>
                            );
                          })}
                        </select>
                      </div>
                      <div>
                        <label style={{display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-muted)'}}>Document B</label>
                        <select
                          className="chat-input-field"
                          value={compareDocB || ''}
                          onChange={(e) => setCompareDocB(e.target.value)}
                          style={{width: '100%', padding: '12px'}}
                        >
                          <option value="">Select a document...</option>
                          {historyItems.filter(h => h.has_result && h.job_id !== compareDocA).map(item => {
                            let displayName = item.source;
                            if (item.source_type === 'url') {
                              try {
                                const url = new URL(item.source);
                                displayName = url.hostname;
                              } catch (e) {
                                displayName = item.source;
                              }
                            }
                            return (
                              <option key={item.job_id} value={item.job_id}>
                                {displayName} ({item.overall_risk})
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>
                    <div style={{display: 'flex', gap: '12px', marginTop: '20px'}}>
                      <button className="action-btn" onClick={() => {
                        if (compareDocA && compareDocB) {
                          setIsComparing(true);
                          performComparison(compareDocA, compareDocB);
                        }
                      }} disabled={!compareDocA || !compareDocB || isComparing}>
                        {isComparing ? 'Comparing...' : 'Compare Documents'}
                      </button>
                      <button className="action-btn" onClick={() => { setShowCompareSelector(false); }} style={{background: 'var(--surface-2)', borderColor: 'var(--border)'}}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{maxWidth: '1000px'}}>
                    <div style={{display: 'flex', gap: '12px', marginBottom: '24px'}}>
                      <button className="action-btn" onClick={() => setShowCompareSelector(true)}>
                        <Plus size={16} /> Select Documents
                      </button>
                      {historyItems.length < 2 && (
                        <span style={{color: 'var(--text-muted)', fontSize: '13px', display: 'flex', alignItems: 'center'}}>
                          Need at least 2 analyzed documents to compare
                        </span>
                      )}
                    </div>

                    {comparisonData ? (
                      <div className="comparison-results" style={{paddingBottom: '40px'}}>
                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px'}}>
                          {[
                            { doc: comparisonData.doc_a, label: comparisonData.doc_a?.label, side: 'a' },
                            { doc: comparisonData.doc_b, label: comparisonData.doc_b?.label, side: 'b' }
                          ].map(({ doc, label, side }) => {
                            const risk = doc?.risk || 'Unknown';
                            const riskColor = risk === 'High' ? 'var(--error)' : risk === 'Medium' ? 'var(--warning)' : 'var(--success)';
                            const score = doc?.score || 50;
                            const clauses = doc?.risky_clause_count || 0;
                            const total = doc?.total_clauses || 0;
                            const domain = label ? label.replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*$/, '') : 'Document';

                            return (
                              <div key={side} style={{
                                background: 'var(--surface-2)',
                                borderRadius: '8px',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderLeft: `3px solid ${riskColor}`,
                                padding: '20px 24px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '12px'
                              }}>
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                                  <div>
                                    <div style={{fontSize: '22px', fontWeight: 600, color: 'var(--text)', lineHeight: 1.2}}>{domain}</div>
                                    <div style={{fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '280px'}}>{label}</div>
                                  </div>
                                  <span style={{
                                    fontSize: '11px', fontWeight: 500, color: riskColor,
                                    background: `${riskColor}15`, padding: '4px 10px', borderRadius: '4px',
                                    textTransform: 'uppercase', letterSpacing: '0.05em'
                                  }}>{risk} Risk</span>
                                </div>
                                <div style={{marginTop: '8px'}}>
                                  <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px'}}>
                                    <span>{clauses} of {total} clauses flagged</span>
                                    <span>score {score}</span>
                                  </div>
                                  <div style={{height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden'}}>
                                    <div style={{height: '100%', width: `${score}%`, background: riskColor, borderRadius: '3px', transition: 'width 0.3s ease'}} />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div style={{background: 'var(--surface-2)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', padding: '24px', marginBottom: '24px', overflowX: 'auto'}}>
                          <h3 style={{fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginBottom: '16px', letterSpacing: '0.02em'}}>Category Comparison</h3>
                          <table style={{width: '100%', borderCollapse: 'collapse', minWidth: '500px'}}>
                            <thead>
                              <tr style={{borderBottom: '1px solid rgba(255,255,255,0.08)'}}>
                                <th style={{textAlign: 'left', padding: '12px 16px', color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500}}>Category</th>
                                <th style={{textAlign: 'center', padding: '12px 16px', color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500}}>Doc A</th>
                                <th style={{textAlign: 'center', padding: '12px 16px', color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500}}>Winner</th>
                                <th style={{textAlign: 'center', padding: '12px 16px', color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500}}>Doc B</th>
                              </tr>
                            </thead>
                            <tbody>
                              {comparisonData.categories?.map((cat, idx) => {
                                const aSev = cat.doc_a_avg_severity || 0;
                                const bSev = cat.doc_b_avg_severity || 0;
                                const winnerColor = cat.winner === 'a' ? 'var(--error)' : cat.winner === 'b' ? 'var(--success)' : 'var(--text-muted)';
                                const winnerDot = cat.winner === 'tie' ? '⚪' : '🔴';
                                const winnerText = cat.winner === 'a' ? 'A Riskier' : cat.winner === 'b' ? 'B Riskier' : 'Tie';
                                const aSummary = cat.clause_a_summary ? (cat.clause_a_summary.length > 80 ? cat.clause_a_summary.slice(0, 80) + '...' : cat.clause_a_summary) : '';
                                const bSummary = cat.clause_b_summary ? (cat.clause_b_summary.length > 80 ? cat.clause_b_summary.slice(0, 80) + '...' : cat.clause_b_summary) : '';

                                return (
                                  <tr key={idx} style={{borderBottom: '1px solid rgba(255,255,255,0.05)', background: idx % 2 === 1 ? 'rgba(255,255,255,0.02)' : 'transparent'}}>
                                    <td style={{padding: '16px', verticalAlign: 'top'}}>
                                      <div style={{fontWeight: 600, fontSize: '13px', color: 'var(--text)'}}>{cat.category}</div>
                                      {cat.key_difference && (
                                        <div style={{fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', fontStyle: 'italic', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                                          {cat.key_difference}
                                        </div>
                                      )}
                                    </td>
                                    <td style={{padding: '16px', textAlign: 'center', verticalAlign: 'top'}}>
                                      <div style={{fontSize: '20px', fontWeight: 600, color: cat.winner === 'a' ? 'var(--error)' : 'var(--text)'}}>{cat.doc_a_risk_count || 0}</div>
                                      <div style={{fontSize: '11px', color: 'var(--text-muted)'}}>avg {aSev.toFixed(1)}</div>
                                      {aSummary && <div style={{fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', fontStyle: 'italic'}}>{aSummary}</div>}
                                    </td>
                                    <td style={{padding: '16px', textAlign: 'center', verticalAlign: 'middle'}}>
                                      <span style={{fontSize: '12px', color: winnerColor, fontWeight: 500}}>{winnerDot} {winnerText}</span>
                                    </td>
                                    <td style={{padding: '16px', textAlign: 'center', verticalAlign: 'top'}}>
                                      <div style={{fontSize: '20px', fontWeight: 600, color: cat.winner === 'b' ? 'var(--error)' : 'var(--text)'}}>{cat.doc_b_risk_count || 0}</div>
                                      <div style={{fontSize: '11px', color: 'var(--text-muted)'}}>avg {bSev.toFixed(1)}</div>
                                      {bSummary && <div style={{fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', fontStyle: 'italic'}}>{bSummary}</div>}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {(() => {
                          const cats = comparisonData.categories || [];
                          const wonA = cats.filter(c => c.winner === 'a').length;
                          const wonB = cats.filter(c => c.winner === 'b').length;
                          const tied = cats.filter(c => c.winner === 'tie').length;
                          const mostDangerous = cats.length > 0 ? cats.reduce((max, c) =>
                            Math.abs(c.severity_delta || 0) > Math.abs(max?.severity_delta || 0) ? c : max, cats[0]) : null;
                          const docAName = comparisonData.doc_a?.label ? comparisonData.doc_a.label.replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*$/, '') : 'Document A';
                          const docBName = comparisonData.doc_b?.label ? comparisonData.doc_b.label.replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*$/, '') : 'Document B';
                          let summaryLine = '';
                          if (comparisonData.overall_winner === 'a') {
                            summaryLine = `${docAName} poses greater contractual and legal risk. ${docBName} has more clauses overall but lower average severity.`;
                          } else if (comparisonData.overall_winner === 'b') {
                            summaryLine = `${docBName} poses greater contractual and legal risk. ${docAName} has more clauses overall but lower average severity.`;
                          } else {
                            summaryLine = `Both documents have similar overall risk profiles across categories.`;
                          }
                          return (
                            <div style={{background: 'var(--surface-2)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', padding: '24px', textAlign: 'center'}}>
                              <h3 style={{fontSize: '20px', fontWeight: 600, color: 'var(--text)', marginBottom: '20px'}}>
                                {comparisonData.verdict || 'Analysis Complete'}
                              </h3>
                              <div style={{display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '20px'}}>
                                <div style={{textAlign: 'center'}}>
                                  <div style={{fontSize: '28px', fontWeight: 700, color: 'var(--error)'}}>{wonA}</div>
                                  <div style={{fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px'}}>A Won</div>
                                </div>
                                <div style={{textAlign: 'center'}}>
                                  <div style={{fontSize: '28px', fontWeight: 700, color: 'var(--text-muted)'}}>{tied}</div>
                                  <div style={{fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px'}}>Tied</div>
                                </div>
                                <div style={{textAlign: 'center'}}>
                                  <div style={{fontSize: '28px', fontWeight: 700, color: 'var(--success)'}}>{wonB}</div>
                                  <div style={{fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px'}}>B Won</div>
                                </div>
                              </div>
                              {mostDangerous && (
                                <div style={{fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px'}}>
                                  Most dangerous category: <span style={{color: 'var(--accent)', fontWeight: 600}}>{mostDangerous.category}</span>
                                </div>
                              )}
                              <div style={{fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', maxWidth: '500px', margin: '0 auto', lineHeight: 1.5}}>
                                {summaryLine}
                              </div>
                            </div>
                          );
                        })()}

                        <div style={{marginTop: '24px', display: 'flex', justifyContent: 'center'}}>
                          <button className="action-btn" onClick={() => { setShowCompareSelector(true); setComparisonData(null); }}>
                            Compare New Documents
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{padding: '60px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: '12px'}}>
                        <Scale size={48} style={{opacity: 0.3, marginBottom: '16px'}} />
                        <p>Select two documents above to see a detailed comparison</p>
                      </div>
                    )}
                  </div>
                )}
              </motion.section>
            )}

            {activeView === 'chat' && (
              <motion.section
                key="view-chat"
                className="view-section active"
                style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}
                initial={viewMotion.initial}
                animate={viewMotion.animate}
                exit={viewMotion.exit}
              >
                <div className="chat-header" style={{ borderBottom: '1px solid var(--border)', background: 'transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="chat-logo"><BrainCircuit size={18} /></div>
                    <div className="chat-title">
                      <h3>Digital Jurist Assistant</h3>
                      <p>Document Q&A</p>
                    </div>
                  </div>
                  {analysisResult && (
                    <button
                      className="chat-sugg-btn"
                      onClick={() => setActiveView('results')}
                      style={{ padding: '4px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '4px' }}
                    >
                      <Minimize2 size={14} /> Back to Report
                    </button>
                  )}
                </div>

                <div className="chat-messages" ref={chatBoxRef}>
                  {chatMessages.map((msg, i) => (
                    <div className={`msg ${msg.role}`} key={i}>
                      <div className="msg-avatar">{msg.role === 'bot' ? <BrainCircuit size={14} /> : (user?.email?.[0].toUpperCase() || 'U')}</div>
                      <div className="msg-bubble" dangerouslySetInnerHTML={renderFauxHTML(msg.role === 'bot' ? marked.parse(msg.content) : msg.content)}></div>
                    </div>
                  ))}
                  {isChatTyping && (
                    <div className="msg bot">
                      <div className="msg-avatar"><BrainCircuit size={14} /></div>
                      <div className="msg-bubble"><TypingDots /></div>
                    </div>
                  )}
                </div>

                <div className="chat-input" style={{
                  opacity: sessionId ? 1 : 0.5,
                  pointerEvents: sessionId ? 'all' : 'none',
                  borderTop: '1px solid var(--border)',
                  borderBottom: 'none',
                  paddingTop: '16px',
                  background: 'transparent',
                  height: 'auto',
                  flexShrink: 0
                }}>
                  <div className="chat-suggestions">
                    {['Summarize risks', 'Is there an opt-out?', 'Data collection terms?'].map(sugg => (
                      <div key={sugg} className="chat-sugg-btn" onClick={() => setChatInput(sugg)}>{sugg}</div>
                    ))}
                  </div>
                  <div className="chat-form">
                    <input
                      type="text"
                      className="chat-input-field"
                      placeholder="Ask about specific clauses or risks..."
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && sendChat()}
                    />
                    <button className="chat-send" onClick={sendChat} disabled={!chatInput.trim()}>
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </main>
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