import React, { useState, useEffect, useRef } from 'react';
import { FileText, Link, Upload, Scale, Search, Bell, Settings as SettingsIcon, HelpCircle, FileCheck, History, Plus, BrainCircuit, Activity, ChevronRight, Zap } from 'lucide-react';
import { marked } from 'marked';

const API = 'http://localhost:8000';

export default function App() {
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

  const addToast = (message, isError = false) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, isError }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const pollAnalysisResults = async (jobId) => {
    try {
      const res = await fetch(`${API}/analyze/status/${jobId}`);
      const data = await res.json();
      
      if (data.status === 'complete') {
        setAnalysisResult(data.result);
        setIsProcessing(false);
        addToast('Analysis complete!');
        setActiveView('results');
        
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
          body: formData
        });
        
        if (!extractRes.ok) throw new Error('File extraction failed. Ensure it is a valid PDF.');
        const extractData = await extractRes.json();
        
        analyzeType = 'text';
        analyzeContent = extractData.cleaned_text || extractData.raw_text;
      }

      const res = await fetch(`${API}/analyze/async`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input_type: analyzeType, content: analyzeContent })
      });
      
      if (!res.ok) throw new Error('Analysis initialization failed');
      const data = await res.json();
      
      setAnalysisJobId(data.job_id);
      addToast('Analysis started. Processing risks...');
      
      if (data.extraction && data.extraction.cleaned_text) {
        initChatSession(data.extraction.cleaned_text);
      }
      
      pollAnalysisResults(data.job_id);
    } catch (err) {
      addToast(err.message, true);
      setIsProcessing(false);
    }
  };

  const initChatSession = async (text) => {
    const newSessionId = crypto.randomUUID();
    setSessionId(newSessionId);
    try {
      await fetch(`${API}/chat/store`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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

  return (
    <div className="app-container">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon"><Scale size={18} /></div>
          <div className="brand-text">
            <span className="brand-title">Jurist AI</span>
            <span className="brand-subtitle">PREMIUM LEGAL AI</span>
          </div>
        </div>
        
        <button className="nav-btn primary" onClick={() => setActiveView('dashboard')}>
          <Plus size={16} /> New Analysis
        </button>
        
        <nav className="nav-menu">
          <a className={`nav-item ${activeView === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveView('dashboard')}>
            <Activity size={18} /> Dashboard
          </a>
          <a className={`nav-item ${activeView === 'results' ? 'active' : ''}`} onClick={() => setActiveView('results')}>
            <BrainCircuit size={18} /> Risk Analysis
          </a>
          <a className="nav-item">
            <FileCheck size={18} /> Compliance
          </a>
          <a className="nav-item">
            <History size={18} /> History
          </a>
        </nav>
        
        <div className="sidebar-footer">
          <a className="nav-item"><SettingsIcon size={18}/> Settings</a>
          <a className="nav-item"><HelpCircle size={18}/> Help Center</a>
          
          <div className="user-profile">
            <div className="user-avatar">A</div>
            <div className="user-info">
              <span className="user-name">Alex Graham</span>
              <span className="user-plan">Enterprise Plan</span>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN WRAPPER */}
      <div className="main-wrapper">
        <header className="topbar">
          <div className="topbar-nav">
            <span>Documents</span>
            <span>API</span>
            <span>Enterprise</span>
          </div>
          <div className="topbar-actions">
            <input type="text" className="search-box" placeholder="Q Search analyses..." />
            <Bell size={18} style={{cursor: 'pointer'}} />
            <span style={{fontSize: '14px', cursor: 'pointer', color: 'var(--primary)'}}>Account Settings</span>
          </div>
        </header>

        <main className="content-area">
          {/* DASHBOARD VIEW */}
          {activeView === 'dashboard' && (
            <div className="view-section active">
              <div className="hero">
                <h1>Welcome, Alex.</h1>
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
                      <span style={{fontSize: '11px', color: 'var(--text-muted)', background: 'var(--surface-2)', padding: '4px 8px', borderRadius: '4px'}}>FORMAT: AUTO</span>
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
                    
                    <button className="action-btn" onClick={startAnalysis} disabled={isProcessing}>
                      {isProcessing ? <div className="loader" style={{display: 'block'}} /> : <Zap size={18} />}
                      {isProcessing ? 'PROCESSING...' : 'FETCH & ANALYZE'}
                    </button>
                    
                    <div style={{marginTop: '24px', display: 'flex', gap: '12px', alignItems: 'center'}}>
                      <span style={{fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase'}}>Supported:</span>
                      <span style={{background: 'var(--surface-2)', fontSize: '11px', padding: '4px 8px', borderRadius: '4px'}}>🌐 HTML 5</span>
                      <span style={{background: 'var(--surface-2)', fontSize: '11px', padding: '4px 8px', borderRadius: '4px'}}>📄 Dynamic PDF</span>
                      <span style={{background: 'var(--surface-2)', fontSize: '11px', padding: '4px 8px', borderRadius: '4px'}}>{'<>'} JSON Webhooks</span>
                    </div>
                  </div>
                </div>
                
                <div className="input-side">
                  <div className="info-card">
                    <div className="info-icon"><Activity size={18}/></div>
                    <h3 className="info-title">Automated Scraping</h3>
                    <p className="info-desc">Our engine utilizes headless browser technology to bypass anti-bot measures, ensuring full retrieval of dynamic content.</p>
                  </div>
                  <div className="info-card">
                    <div className="info-icon"><BrainCircuit size={18}/></div>
                    <h3 className="info-title">Risk Benchmarking</h3>
                    <p className="info-desc">Every source is cross-referenced against 50,000+ legal precedents and regulatory frameworks.</p>
                    <div style={{marginTop: '12px', height: '4px', background: 'var(--surface-3)', borderRadius: '2px', overflow: 'hidden'}}>
                      <div style={{width: '99.8%', height: '100%', background: 'var(--primary)'}}></div>
                    </div>
                    <div style={{fontSize: '10px', color: 'var(--primary)', textAlign: 'right', marginTop: '4px'}}>99.8% ACCURACY</div>
                  </div>
                  <div className="status-card">
                    <div className="status-dot"></div>
                    <span className="status-text">AI Cluster v4.2-Llama is active and ready.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* RESULTS VIEW */}
          {activeView === 'results' && (
            <div className="view-section active">
              <div className="hero" style={{marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <div>
                  <h1 style={{fontSize: '24px'}}>Analysis Results</h1>
                  <p style={{fontSize: '14px', color: 'var(--primary)'}}>{analysisJobId ? `Source ID: ${analysisJobId.split('-')[0]}` : 'No document loaded'}</p>
                </div>
              </div>
              
              <div className="results-layout">
                <div className="results-main">
                  <div className="score-card">
                    <div className="score-info">
                      <h2>Aggregate Risk Score</h2>
                      <p>Overall risk profile based on identified clauses within the provided document.</p>
                      <div style={{display: 'flex', gap: '8px', marginTop: '12px'}}>
                        <span style={{background: 'var(--error-bg)', color: 'var(--error)', padding: '4px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: 600}}>! HIGH IMPACT</span>
                        <span style={{background: 'rgba(0,240,255,0.1)', color: 'var(--primary)', padding: '4px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: 600}}>✦ AI VERIFIED</span>
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
                          <div className={`risk-card ${cssClass}`} key={idx}>
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
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
                
                <div className="results-side">
                  <div className="chat-header">
                    <div className="chat-logo"><BrainCircuit size={18}/></div>
                    <div className="chat-title">
                      <h3>Digital Jurist Assistant</h3>
                      <p>AI ANALYSIS LIVE</p>
                    </div>
                  </div>
                  
                  <div className="chat-messages" ref={chatBoxRef}>
                    {chatMessages.map((msg, i) => (
                      <div className={`msg ${msg.role}`} key={i}>
                        <div className="msg-avatar">{msg.role === 'bot' ? <BrainCircuit size={14}/> : 'A'}</div>
                        <div className="msg-bubble" dangerouslySetInnerHTML={renderFauxHTML(msg.role === 'bot' ? marked.parse(msg.content) : msg.content)}></div>
                      </div>
                    ))}
                    {isChatTyping && (
                       <div className="msg bot">
                        <div className="msg-avatar"><BrainCircuit size={14}/></div>
                        <div className="msg-bubble">...</div>
                      </div>
                    )}
                  </div>
                  
                  <div className="chat-input" style={{opacity: sessionId ? 1 : 0.5, pointerEvents: sessionId ? 'all' : 'none'}}>
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
            </div>
          )}
          
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
