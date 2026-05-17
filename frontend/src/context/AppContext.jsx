import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { marked } from 'marked';
import { apiFetch, apiFetchJson, withJsonHeaders } from '@/shared/api/client';
import { getAccessToken } from '@/shared/api/auth-storage';
import { getRiskScore } from '@/features/analysis/model/score';
import { useAuthActions } from '@/features/auth/hooks/useAuthActions';
import { useHistoryActions } from '@/features/history/hooks/useHistoryActions';
import { AppContext } from './app-context.js';

const parseMarkdown = (content) => {
    try { return marked.parse(content || ''); }
    catch { return content || ''; }
};

export function AppProvider({ children }) {
    const navigate = useNavigate();

    // Auth state
    const [token, setToken] = useState(() => getAccessToken());
    const [user, setUser] = useState(null);
    const [isAuthLoading, setIsAuthLoading] = useState(false);
    const [authMode, setAuthMode] = useState('login');

    // Analysis state
    const [isProcessing, setIsProcessing] = useState(false);
    const [analysisJobId, setAnalysisJobId] = useState(null);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [sourceInfo, setSourceInfo] = useState({ type: null, value: null });

    // Input state
    const [inputMode, setInputMode] = useState('url');
    const [urlInput, setUrlInput] = useState('');
    const [textInput, setTextInput] = useState('');
    const [uploadedFile, setUploadedFile] = useState(null);
    const fileInputRef = useRef(null);

    // Chat state
    const [sessionId, setSessionId] = useState(null);
    const [chatMessages, setChatMessages] = useState([
        { role: 'bot', content: 'Hello. I am the Digital Jurist Assistant. Extract a document first, and I can help you navigate the findings!', html: '<p>Hello. I am the Digital Jurist Assistant. Extract a document first, and I can help you navigate the findings!</p>' }
    ]);
    const [chatInput, setChatInput] = useState('');
    const [isChatTyping, setIsChatTyping] = useState(false);
    const [isChatPopupOpen, setIsChatPopupOpen] = useState(false);

    // UI state
    const [toasts, setToasts] = useState([]);
    const [historyItems, setHistoryItems] = useState([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [selectedHistoryId, setSelectedHistoryId] = useState(null);
    const [isHistoryItemLoading, setIsHistoryItemLoading] = useState(false);
    const [showSourcePopup, setShowSourcePopup] = useState(false);

    // Settings
    const [settings, setSettings] = useState(() => {
        try {
            const saved = localStorage.getItem('jurist_settings');
            return saved ? JSON.parse(saved) : { autoOpenResults: true, compactRiskCards: false };
        } catch { return { autoOpenResults: true, compactRiskCards: false }; }
    });

    // Compare state
    const [showCompareSelector, setShowCompareSelector] = useState(false);
    const [compareDocA, setCompareDocA] = useState(null);
    const [compareDocB, setCompareDocB] = useState(null);
    const [isComparing, setIsComparing] = useState(false);
    const [comparisonData, setComparisonData] = useState(null);
    const [compareHistory, setCompareHistory] = useState([]);
    const [isCompareHistoryLoading, setIsCompareHistoryLoading] = useState(false);

    const pollRetryCount = useRef(0);
    const sessionIdRef = useRef(sessionId);
    const chatInFlightRef = useRef(false);
    const activeChatRequestRef = useRef(0);
    const chatAbortControllerRef = useRef(null);

    // ─── Toasts ───

    const addToast = (message, isError = false) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, isError }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 5000);
    };

    const { fetchUser, loginUser, registerUser, logout } = useAuthActions({
        token,
        setToken,
        setUser,
        setHistoryItems,
        addToast,
        navigate,
    });

    const { loadHistory, fetchHistoryItem, renameHistoryItem, deleteHistoryItem } = useHistoryActions({
        token,
        setHistoryItems,
        setIsHistoryLoading,
        addToast,
    });

    // ─── Effects ───

    useEffect(() => {
        if (token) fetchUser();
    }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        localStorage.setItem('jurist_settings', JSON.stringify(settings));
    }, [settings]);

    useEffect(() => {
        if (token) {
            loadHistory();
        }
    }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (token) {
            loadCompareHistory(sessionId);
        } else {
            setCompareHistory([]);
        }
    }, [token, sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        sessionIdRef.current = sessionId;
        if (chatAbortControllerRef.current) {
            chatAbortControllerRef.current.abort();
            chatAbortControllerRef.current = null;
        }
        chatInFlightRef.current = false;
        activeChatRequestRef.current += 1;
        setIsChatTyping(false);
    }, [sessionId]);

    // ─── Auth ───

    const handleAuth = async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
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
                const { res, data } = await loginUser({ email, password });
                if (res.ok) {
                    form.reset();
                } else {
                    addToast(data?.detail || 'Login failed', true);
                }
            } else {
                const { res, data } = await registerUser({ username, email, password });
                if (res.ok) {
                    form.reset();
                    setAuthMode('login');
                } else {
                    addToast(data?.detail || 'Registration failed', true);
                }
            }
        } catch (error) {
            console.error('Auth error:', error);
            addToast('Authentication service unavailable', true);
        } finally {
            setIsAuthLoading(false);
        }
    };

    // ─── History ───

    const loadCompareHistory = async (targetSessionId) => {
        setIsCompareHistoryLoading(true);
        try {
            const query = targetSessionId ? `?session_id=${encodeURIComponent(targetSessionId)}` : '';
            const { res, data } = await apiFetchJson(`/compare/history${query}`, { token });
            if (res.ok) {
                setCompareHistory(data?.compares || []);
            }
        } catch (err) { console.error(err); }
        finally { setIsCompareHistoryLoading(false); }
    };

    const openCompareHistory = async (compareId) => {
        try {
            const { res, data } = await apiFetchJson(`/compare/${compareId}`, { token });
            if (!res.ok || !data) { addToast('Failed to load comparison', true); return; }
            let result = data.structured || data.result || data.comparison || data;
            if (result && !result.doc_a && !result.document_a) {
                const nested = data.structured || result.structured || result.comparison || result.result || result.data;
                if (nested) result = nested;
            }
            if (result && (result.doc_a || result.document_a)) {
                const normalize = (d) => ({
                    score: d.score ?? d.risk_score ?? 0,
                    label: d.label || d.name || d.title || '',
                    risky_count: d.risky_count ?? d.risky_clause_count ?? 0,
                    total_clauses: d.total_clauses ?? 0,
                });
                setComparisonData({
                    doc_a: normalize(result.doc_a || result.document_a),
                    doc_b: normalize(result.doc_b || result.document_b),
                    categories: result.categories || [],
                    overall_winner: result.overall_winner || 'tie',
                    verdict: result.verdict || '',
                });
                navigate('/app/compare');
            } else {
                addToast('Comparison data is incomplete', true);
            }
        } catch { addToast('Failed to load comparison', true); }
    };

    // ─── Chat ───

    const loadChatHistory = async (targetSessionId) => {
        try {
            const { res, data } = await apiFetchJson(`/chat/${targetSessionId}/history`, { token });
            if (!res.ok) return false;
            if (!Array.isArray(data) || data.length === 0) return false;

            const mapped = data.map((m) => ({
                role: m.role === 'assistant' ? 'bot' : m.role,
                content: m.content,
                html: parseMarkdown(m.content),
            }));
            setChatMessages(mapped);
            return true;
        } catch { return false; }
    };

    const loadAnalysisById = async (jobId) => {
        setIsHistoryItemLoading(true);
        try {
            const { res, data } = await fetchHistoryItem(jobId);
            if (!res.ok) { addToast(data?.detail || 'Failed to load analysis', true); return false; }
            if (!data.result) { addToast('Selected analysis is not complete yet.', true); return false; }

            const restored = await loadChatHistory(data.job_id);
            if (!restored) {
                try {
                    const statusRes = await apiFetch(`/chat/${data.job_id}/index/status`, { token });
                    if (statusRes.ok) {
                        setSessionId(data.job_id);
                    } else {
                        await apiFetch(`/chat/restore/${data.job_id}`, {
                            method: 'POST',
                            token
                        });
                        setSessionId(data.job_id);
                    }
                } catch {
                    setSessionId(data.job_id);
                }
                setChatMessages([
                    { role: 'bot', content: 'Chat is now enabled for this analysis. Ask a follow-up question about any clause.', html: '<p>Chat is now enabled for this analysis. Ask a follow-up question about any clause.</p>' }
                ]);
            } else {
                setSessionId(data.job_id);
            }

            const sType = data.source_type || 'text';
            if (sType === 'url') setSourceInfo({ type: 'url', value: data.source || '' });
            else if (sType === 'pdf') setSourceInfo({ type: 'pdf', value: data.source || 'Uploaded PDF' });
            else setSourceInfo({ type: 'text', value: data.source || '' });

            setAnalysisJobId(data.job_id);
            setAnalysisResult(data.result);
            setSelectedHistoryId(data.job_id);
            return true;
        } catch {
            addToast('Could not open selected history item', true);
            return false;
        } finally {
            setIsHistoryItemLoading(false);
        }
    };

    const openHistoryAnalysis = async (jobId) => {
        const ok = await loadAnalysisById(jobId);
        if (ok) navigate(`/app/c/${jobId}/overview`);
    };

    const renameHistoryAnalysis = async (jobId, title) => {
        const nextTitle = title.trim();
        if (!nextTitle) return addToast('Analysis name cannot be empty', true);

        try {
            const { res, data } = await renameHistoryItem(jobId, nextTitle);
            if (!res.ok) return addToast(data?.detail || 'Failed to rename analysis', true);

            setHistoryItems(prev => prev.map(item => (
                item.job_id === jobId
                    ? { ...item, source: data.source, source_label: data.source_label || data.source }
                    : item
            )));
            if (selectedHistoryId === jobId) {
                setSourceInfo(prev => ({ ...prev, value: data.source || nextTitle }));
            }
            addToast('Analysis renamed.');
        } catch (error) {
            console.error('Rename analysis error:', error);
            addToast('Could not rename analysis', true);
        }
    };

    const deleteHistoryAnalysis = async (jobId) => {
        try {
            const { res, data } = await deleteHistoryItem(jobId);
            if (!res.ok) return addToast(data?.detail || 'Failed to delete analysis', true);

            setHistoryItems(prev => prev.filter(item => item.job_id !== jobId));
            if (selectedHistoryId === jobId) {
                setSelectedHistoryId(null);
                setAnalysisJobId(null);
                setAnalysisResult(null);
                setSessionId(null);
                setSourceInfo({ type: null, value: null });
                setChatMessages([
                    { role: 'bot', content: 'Hello. I am the Digital Jurist Assistant. Extract a document first, and I can help you navigate the findings!', html: '<p>Hello. I am the Digital Jurist Assistant. Extract a document first, and I can help you navigate the findings!</p>' }
                ]);
                navigate('/app');
            }
            addToast('Analysis deleted.');
        } catch (error) {
            console.error('Delete analysis error:', error);
            addToast('Could not delete analysis', true);
        }
    };

    // ─── Analysis ───

    const pollAnalysisResults = async (jobId) => {
        try {
            const { res, data } = await apiFetchJson(`/analyze/status/${jobId}`, { token });
            if (!res.ok) throw new Error(`Server returned ${res.status}`);
            pollRetryCount.current = 0;

            if (data.status === 'complete') {
                setAnalysisResult(data.result);
                setIsProcessing(false);
                loadHistory();
                setSelectedHistoryId(jobId);
                if (settings.autoOpenResults) navigate(`/app/c/${jobId}/overview`);

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
            await apiFetch(`/analyze/stop/${analysisJobId}`, {
                method: 'POST',
                token
            });
            setIsProcessing(false);
            addToast('Analysis stopped by user.', true);
        } catch (err) {
            console.error(err);
            addToast('Failed to stop analysis', true);
        }
    };

    const initChatSession = async (text, targetSessionId = null) => {
        const newSessionId = targetSessionId || crypto.randomUUID();
        setSessionId(newSessionId);
        try {
            await apiFetch('/chat/store', {
                method: 'POST',
                headers: withJsonHeaders(),
                body: JSON.stringify({ session_id: newSessionId, document_text: text }),
                token
            });
        } catch (e) {
            console.error('Chat init fail', e);
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
                const extractRes = await apiFetch('/extract/pdf', {
                    method: 'POST',
                    body: formData,
                    token
                });
                if (!extractRes.ok) throw new Error('File extraction failed. Ensure it is a valid PDF.');
                const extractData = await extractRes.json();
                analyzeType = 'text';
                analyzeContent = extractData.cleaned_text || extractData.raw_text;
            }

            if (inputMode === 'url') setSourceInfo({ type: 'url', value: content });
            else if (inputMode === 'upload') setSourceInfo({ type: 'pdf', value: pdfFileName, blobUrl: URL.createObjectURL(uploadedFile) });
            else setSourceInfo({ type: 'text', value: content });

            const requestBody = { input_type: analyzeType, content: analyzeContent };
            if (inputMode === 'upload') requestBody.source_label = pdfFileName;

            const res = await apiFetch('/analyze/async', {
                method: 'POST',
                headers: withJsonHeaders(),
                body: JSON.stringify(requestBody),
                token
            });
            if (!res.ok) throw new Error('Analysis initialization failed');
            const data = await res.json();

            setAnalysisJobId(data.job_id);
            setSelectedHistoryId(data.job_id);

            if (data.extraction && data.extraction.cleaned_text) {
                await initChatSession(data.extraction.cleaned_text, data.job_id);
            }
            pollAnalysisResults(data.job_id);
        } catch (err) {
            addToast(err.message, true);
            setIsProcessing(false);
        }
    };

    // ─── Chat send ───

    const sendChat = async () => {
        const msg = chatInput.trim();
        const requestSessionId = sessionId;
        if (!msg || !requestSessionId || isChatTyping || chatInFlightRef.current) return;

        chatInFlightRef.current = true;
        const requestId = activeChatRequestRef.current + 1;
        activeChatRequestRef.current = requestId;
        const abortController = new AbortController();
        chatAbortControllerRef.current = abortController;
        setChatInput('');
        setChatMessages(prev => [...prev, { role: 'user', content: msg }]);
        setIsChatTyping(true);

        const appendReplyIfCurrent = (content) => {
            if (activeChatRequestRef.current !== requestId || sessionIdRef.current !== requestSessionId) return false;
            setChatMessages(prev => [...prev, { role: 'bot', content, html: parseMarkdown(content) }]);
            return true;
        };

        try {
            const res = await apiFetch('/chat', {
                method: 'POST',
                headers: withJsonHeaders(),
                body: JSON.stringify({ session_id: requestSessionId, message: msg, history: [] }),
                token,
                retries: 3,
                retryDelayMs: 3000,
                signal: abortController.signal
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.detail || `Server error (${res.status})`);
            }
            const data = await res.json();

            if (data.comparison_result && data.structured) {
                const replyText = (data.reply || '') + "\n\nI've loaded the comparison details. Switch to the Compare view for the full side-by-side analysis.";
                if (appendReplyIfCurrent(replyText)) {
                    setComparisonData(data.structured);
                    addToast('Comparison complete! Check the Compare page for details.');
                    loadCompareHistory(requestSessionId);
                }
            } else if (data.comparison_needed) {
                if (appendReplyIfCurrent(data.reply || '') && data.comparison_options) {
                    setShowCompareSelector(true);
                }
            } else {
                appendReplyIfCurrent(data.reply || '');
            }
        } catch (err) {
            if (err.name === 'AbortError') return;
            console.error(err);
            const errMsg = err.message && err.message !== 'Failed to fetch'
                ? `Sorry, something went wrong: ${err.message}`
                : "Sorry, I couldn't connect. The server may be waking up — please try again in a few seconds.";
            appendReplyIfCurrent(errMsg);
        } finally {
            if (activeChatRequestRef.current === requestId) {
                chatInFlightRef.current = false;
                chatAbortControllerRef.current = null;
                setIsChatTyping(false);
            }
        }
    };

    // ─── Compare ───

    const performComparison = async (sessionIdA, sessionIdB) => {
        try {
            const res = await apiFetch('/chat/compare', {
                method: 'POST',
                headers: withJsonHeaders(),
                body: JSON.stringify({
                    session_id_a: sessionIdA,
                    session_id_b: sessionIdB,
                    question: "Compare the risk profiles of both documents",
                    history: []
                }),
                token,
                retries: 3,
                retryDelayMs: 3000
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
                if (sessionId) loadCompareHistory(sessionId);
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

    // ─── Clause explainer ───

    const explainRiskInChat = (clause, index) => {
        const category = clause.risk_categories && clause.risk_categories.length > 0
            ? clause.risk_categories[0] : 'General';
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

    // ─── Score (reads server-computed risk_score) ───

    const calculateScore = () => getRiskScore(analysisResult);

    const value = {
        // Auth
        token, user, isAuthLoading, authMode, setAuthMode,
        handleAuth, logout, fetchUser,
        // Analysis
        isProcessing, analysisJobId, analysisResult, sourceInfo,
        startAnalysis, stopAnalysis, pollAnalysisResults,
        // Inputs
        inputMode, setInputMode, urlInput, setUrlInput,
        textInput, setTextInput, uploadedFile, setUploadedFile, fileInputRef,
        // Chat
        sessionId, chatMessages, chatInput, setChatInput,
        isChatTyping, isChatPopupOpen, setIsChatPopupOpen,
        sendChat, explainRiskInChat, initChatSession,
        // History
        historyItems, isHistoryLoading, selectedHistoryId, setSelectedHistoryId,
        isHistoryItemLoading, openHistoryAnalysis, loadAnalysisById, renameHistoryAnalysis, deleteHistoryAnalysis, loadHistory,
        // Compare
        showCompareSelector, setShowCompareSelector,
        compareDocA, setCompareDocA, compareDocB, setCompareDocB,
        isComparing, setIsComparing, comparisonData, setComparisonData,
        compareHistory, isCompareHistoryLoading, openCompareHistory, performComparison,
        // UI
        toasts, addToast, showSourcePopup, setShowSourcePopup,
        settings, setSettings, calculateScore, navigate,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
