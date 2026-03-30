import React, { useState, useEffect, useRef } from 'react';
import { FileText, Link, Upload, Scale, Bell, Settings as SettingsIcon, HelpCircle, History, Plus, BrainCircuit, Activity, ChevronRight, Zap } from 'lucide-react';
import { marked } from 'marked';
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion } from 'framer-motion';
import LoadingOverlay from './components/LoadingOverlay.jsx';
import SkeletonList from './components/SkeletonList.jsx';
import TypingDots from './components/TypingDots.jsx';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('tos_token'));
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  
  const [activeView, setActiveView] = useState('dashboard');
  const [inputMode, setInputMode] = useState('url');
  
  const [urlInput, setUrlInput] = useState('');
  const [textInput, setTextInput] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const fileInputRef = useRef(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysisJobId, setAnalysisJobId] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  
  const [sessionId, setSessionId] = useState(null);
  const [chatMessages, setChatMessages] = useState([
    { role: 'bot', content: 'Hello. I am the Digital Jurist Assistant. Extract a document first, and I can help you navigate the findings!'}
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

      setAnalysisJobId(data.job_id);
      setAnalysisResult(data.result);
      setSelectedHistoryId(data.job_id);
      setActiveView('results');
      addToast('Loaded analysis from history.');
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
        addToast('Analysis complete!');
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
    } catch(err) {
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
      
      if (inputMode === 'upload') {
        const formData = new FormData();
        formData.append('file', uploadedFile);
        
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

      const res = await fetch(`${API}/analyze/async`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ input_type: analyzeType, content: analyzeContent })
      });
      
      if (!res.ok) throw new Error('Analysis initialization failed');
      const data = await res.json();
      
      setAnalysisJobId(data.job_id);
      setSelectedHistoryId(data.job_id);
      addToast('Analysis started. Processing risks...');
      
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
    } catch(e) {
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
      
      setChatMessages([...newChat, { role: 'bot', content: data.reply }]);
    } catch (err) {
      console.error(err);
      setChatMessages([...newChat, { role: 'bot', content: "Sorry, I couldn't connect." }]);
    } finally {
      setIsChatTyping(false);
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
    addToast(`Added detailed explanation for Clause #${index + 1} to chat.`);
  };

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const calculateScore = () => {
    if (!analysisResult) return 100;
    const r_count = analysisResult.risky_clause_count || 0;
    const t_count = analysisResult.total_clauses || 1;
    let score = 100 - Math.min((r_count / t_count) * 200, 100);
    if(analysisResult.overall_risk === 'High') score = Math.max(10, score - 30);
    if(analysisResult.overall_risk === 'Medium') score = Math.max(40, score - 15);
    return Math.floor(score);
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
            <div className="brand" style={{justifyContent: 'center', marginBottom: '20px'}}>
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
              <span style={{fontSize: '18px'}}>{t.isError ? '⚠️' : '✓'}</span> {t.message}
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
      <aside className="sidebar" style={{ width: isDesktop() ? `${sidebarWidth}px` : '100%' }}>
        <div className="brand">
          <div className="brand-icon"><Scale size={18} /></div>
          <div className="brand-text">
            <span className="brand-title">Jurist AI</span>
            <span className="brand-subtitle">TERMS RISK REVIEW</span>
          </div>
        </div>
        
        <button className="nav-btn primary" onClick={() => { setActiveView('dashboard'); setSelectedHistoryId(null); }}>
          <Plus size={16} /> New Analysis
        </button>

        <div className="sidebar-history">
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px 8px 8px'}}>
            <div className="sidebar-section-title">
              <History size={14} /> Recent Analyses
            </div>
            <button className="chat-sugg-btn" type="button" onClick={loadHistory}>Refresh</button>
          </div>

          <div className="history-list">
            {isHistoryLoading ? (
              <SkeletonList rows={5} />
            ) : historyItems.length === 0 ? (
              <div style={{padding: '8px 10px', fontSize: '12px', color: 'var(--text-muted)'}}>No history yet</div>
            ) : (
              historyItems.slice(0, 8).map((item) => (
                <button
                  key={item.job_id}
                  type="button"
                  className={`history-item ${selectedHistoryId === item.job_id ? 'active' : ''}`}
                  onClick={() => openHistoryAnalysis(item.job_id)}
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
          <a className={`nav-item ${activeView === 'settings' ? 'active' : ''}`} onClick={() => setActiveView('settings')}><SettingsIcon size={18}/> Settings</a>
          <a className="nav-item" onClick={logout}><HelpCircle size={18}/> Sign Out</a>
          
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
            <Bell size={18} style={{cursor: 'pointer'}} />
            <span style={{fontSize: '14px', cursor: 'pointer', color: 'var(--primary)'}} onClick={logout}>Sign Out</span>
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
                          <div style={{display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '24px', fontSize: '13px', color: 'var(--primary)'}}>
                            <input type="checkbox" defaultChecked style={{accentColor: 'var(--primary)'}} /> Secure SSL Encrypted Crawl ✓
                          </div>
                        </div>
                      )}
                      
                      {inputMode === 'text' && (
                        <textarea className="text-input" placeholder="Paste your Terms of Service or Privacy Policy text here..." value={textInput} onChange={e => setTextInput(e.target.value)} />
                      )}

                      {inputMode === 'upload' && (
                        <div className="upload-zone" onClick={() => fileInputRef.current?.click()}>
                          <input type="file" ref={fileInputRef} accept=".pdf" onChange={e => setUploadedFile(e.target.files[0])} style={{display: 'none'}} />
                          <FileText className="upload-icon" />
                          <div className="upload-title">{uploadedFile ? uploadedFile.name : 'Drag & drop legal documents here'}</div>
                          <div className="upload-desc">Support for PDF files. Up to 50MB per analysis.</div>
                          <button className="upload-btn" type="button">{uploadedFile ? 'Change File' : 'Select Files from Device'}</button>
                        </div>
                      )}
                      
                      <div style={{display: 'flex', gap: '12px', width: '100%', flexWrap: 'wrap'}}>
                        <button className="action-btn" onClick={startAnalysis} disabled={isProcessing} style={{flex: 1, minWidth: '200px'}}>
                          {isProcessing ? <div className="loader" style={{display: 'block'}} /> : <Zap size={18} />}
                          {isProcessing ? 'PROCESSING...' : 'FETCH & ANALYZE'}
                        </button>
                        {isProcessing && (
                          <button className="action-btn" onClick={stopAnalysis} style={{background: 'var(--error)', borderColor: 'var(--error)', minWidth: '100px'}}>
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
                      <div className="info-icon"><Activity size={18}/></div>
                      <h3 className="info-title">How To Get Better Results</h3>
                      <p className="info-desc">Use complete policy text when possible. Short excerpts may miss context and produce weaker risk explanations.</p>
                      <div style={{marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6}}>
                        • Prefer full ToS or Privacy Policy documents<br/>
                        • Use PDF upload for long legal agreements<br/>
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
                    <p className="source-id">{analysisJobId ? `Source ID: ${analysisJobId.split('-')[0]}` : 'No document loaded'}</p>
                  </div>
                </div>
                
                <div className="results-layout">
                  <div className="results-main" style={{ width: isDesktop() ? `${resultsSplit}%` : '100%' }}>
                    <div className="score-card">
                      <div className="score-info">
                        <h2>Aggregate Risk Score</h2>
                        <p>Overall risk profile based on identified clauses within the provided document.</p>
                        <div style={{display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap'}}>
                          <span style={{background: 'rgba(0,240,255,0.1)', color: 'var(--primary)', padding: '4px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: 600}}>Risk Summary</span>
                          <span style={{background: 'var(--surface-2)', color: 'var(--text-muted)', padding: '4px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: 600}}>
                            Flagged Clauses: {analysisResult?.risky_clause_count ?? 0}
                          </span>
                        </div>
                      </div>
                      <div className="score-circle">
                        <svg>
                          <circle className="bg" cx="50" cy="50" r="40"></circle>
                          <circle className="progress" cx="50" cy="50" r="40" style={{
                            strokeDashoffset: 251 - (251 * calculateScore() / 100),
                            stroke: calculateScore() < 50 ? 'var(--error)' : (calculateScore() < 75 ? 'var(--warning)' : 'var(--success)')
                          }}></circle>
                        </svg>
                        <span className="score-value">{calculateScore()}</span>
                        <span className="score-label">SCORE</span>
                      </div>
                    </div>
                    
                    <h3 style={{fontSize: '16px', marginBottom: '16px', color: 'var(--text-heading)'}}>Identified Risk Vectors</h3>
                    <div className="risk-cards">
                      {(!analysisResult || !analysisResult.clauses || analysisResult.clauses.length === 0) ? (
                        <div style={{padding: '40px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-sm)'}}>
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
                                  <div className="risk-icon"><Scale size={16}/></div>
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
                    <div className="chat-header">
                      <div className="chat-logo"><BrainCircuit size={18}/></div>
                      <div className="chat-title">
                        <h3>Digital Jurist Assistant</h3>
                        <p>Document Q&A</p>
                      </div>
                    </div>
                    
                    <div className="chat-messages" ref={chatBoxRef}>
                      {chatMessages.map((msg, i) => (
                        <div className={`msg ${msg.role}`} key={i}>
                          <div className="msg-avatar">{msg.role === 'bot' ? <BrainCircuit size={14}/> : (user?.email?.[0].toUpperCase() || 'U')}</div>
                          <div className="msg-bubble" dangerouslySetInnerHTML={renderFauxHTML(msg.role === 'bot' ? marked.parse(msg.content) : msg.content)}></div>
                        </div>
                      ))}
                      {isChatTyping && (
                         <div className="msg bot">
                          <div className="msg-avatar"><BrainCircuit size={14}/></div>
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

                <div className="input-card" style={{maxWidth: '720px'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                    <div>
                      <div className="risk-title">Auto-open Results After Analysis</div>
                      <div className="risk-section">Switch to Risk Analysis view automatically when processing completes.</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.autoOpenResults}
                      onChange={(e) => setSettings(prev => ({ ...prev, autoOpenResults: e.target.checked }))}
                      style={{accentColor: 'var(--primary)', width: '18px', height: '18px'}}
                    />
                  </div>

                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <div>
                      <div className="risk-title">Compact Risk Cards</div>
                      <div className="risk-section">Reduce spacing in risk cards for denser reading.</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.compactRiskCards}
                      onChange={(e) => setSettings(prev => ({ ...prev, compactRiskCards: e.target.checked }))}
                      style={{accentColor: 'var(--primary)', width: '18px', height: '18px'}}
                    />
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
          
        </main>
      </div>

      {/* TOASTS */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast show ${t.isError ? 'error' : ''}`}>
            <span style={{fontSize: '18px'}}>{t.isError ? '⚠️' : '✓'}</span> {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}
