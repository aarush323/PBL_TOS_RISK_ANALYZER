import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useAppContext } from '@/context/app-context.js';
import Sidebar from '@/components/Sidebar.jsx';
import Header from '@/components/Header.jsx';
import ChatPopup from '@/components/ChatPopup.jsx';
import LoadingOverlay from '@/components/LoadingOverlay.jsx';
import ErrorBoundary from '@/components/ErrorBoundary.jsx';

const viewMotion = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' } },
    exit: { opacity: 0, y: 8, transition: { duration: 0.16, ease: 'easeIn' } },
};

export default function AppLayout() {
    const location = useLocation();
    const {
        isProcessing, isHistoryItemLoading,
        showSourcePopup, setShowSourcePopup, sourceInfo,
        analysisResult, user, logout,
        historyItems, isHistoryLoading, selectedHistoryId,
        openHistoryAnalysis, setSelectedHistoryId,
        toasts, isChatPopupOpen, setIsChatPopupOpen,
        chatMessages, chatInput, setChatInput, sendChat, isChatTyping, sessionId,
        navigate, addToast,
        // Compare
        showCompareSelector, setShowCompareSelector,
        compareDocA, setCompareDocA, compareDocB, setCompareDocB,
        setIsComparing, setComparisonData,
        performComparison,
    } = useAppContext();

    // Map current path to activeView label
    const path = location.pathname.replace('/app', '').replace('/', '') || 'dashboard';

    const hasActiveChat = Boolean(analysisResult);

    return (
        <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
            <LoadingOverlay
                show={isProcessing || isHistoryItemLoading}
                title={isProcessing ? "Processing" : "Loading Analysis"}
                detail={isProcessing ? "Extracting and analyzing clauses. You can press STOP anytime." : "Retrieving analysis data from Jurist AI cloud..."}
            />

            <AnimatePresence>
                {showSourcePopup && (
                    <Motion.div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowSourcePopup(false)}
                    >
                            <Motion.div
                                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
                                className="rounded-xl p-6 max-w-2xl w-full mx-4"
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: 20, opacity: 0 }}
                                onClick={e => e.stopPropagation()}
                            >
                                <div className="flex justify-between items-center mb-4">
                                    <h3 style={{ fontFamily: 'var(--font-family-sans)', color: 'var(--text-primary)' }} className="text-lg font-semibold">Source Content</h3>
                                    <button onClick={() => setShowSourcePopup(false)} style={{ color: 'var(--text-secondary)' }}>
                                        <X size={20} />
                                    </button>
                                </div>
                                <div style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', fontFamily: 'var(--font-family-mono)' }} className="p-4 rounded-lg text-sm max-h-96 overflow-y-auto">
                                    {sourceInfo.value || 'No content loaded.'}
                                </div>
                        </Motion.div>
                    </Motion.div>
                )}
            </AnimatePresence>

            <Sidebar
                activeView={path}
                onNavigate={(view) => {
                    if (view === 'overview') {
                        if (analysisResult) {
                            navigate('/app/overview');
                        } else {
                            navigate('/app');
                        }
                    } else if (view === 'dashboard') {
                        navigate('/app');
                    } else {
                        navigate(`/app/${view}`);
                    }
                }}
                user={user}
                onLogout={logout}
                historyItems={historyItems}
                onOpenHistory={openHistoryAnalysis}
                isHistoryLoading={isHistoryLoading}
                selectedHistoryId={selectedHistoryId}
                onNewAnalysis={() => {
                    navigate('/app');
                    setSelectedHistoryId(null);
                }}
            />

            <div className="ml-64 flex flex-col min-h-screen">
                <Header
                    activeView={path}
                    analysisResult={analysisResult}
                    hasActiveChat={hasActiveChat}
                    onNavigate={(view) => {
                        if (['overview', 'clauses', 'reports'].includes(view) && !analysisResult) {
                            navigate('/app');
                            addToast('Please select or run an analysis first.', true);
                        } else {
                            navigate(view === 'dashboard' ? '/app' : `/app/${view}`);
                        }
                    }}
                    onNewAnalysis={() => {
                        navigate('/app');
                        setSelectedHistoryId(null);
                    }}
                />

                <main className="flex-1 overflow-y-auto">
                    <ErrorBoundary>
                        <AnimatePresence mode="wait">
                            <Motion.section
                                key={location.pathname}
                                initial={viewMotion.initial}
                                animate={viewMotion.animate}
                                exit={viewMotion.exit}
                            >
                                <Outlet />
                            </Motion.section>
                        </AnimatePresence>

                        {showCompareSelector && (
                            <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
                                <Motion.div
                                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
                                    className="rounded-xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto"
                                    initial={{ scale: 0.95, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                >
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 style={{ fontFamily: 'var(--font-family-sans)', color: 'var(--text-primary)' }} className="text-lg font-semibold">Select Documents to Compare</h3>
                                        <button onClick={() => setShowCompareSelector(false)} style={{ color: 'var(--text-secondary)' }}>
                                            <X size={20} />
                                        </button>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <h4 style={{ fontFamily: 'var(--font-family-sans)', color: 'var(--text-primary)' }} className="text-sm font-semibold mb-2">Document A</h4>
                                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                                {historyItems.map((item) => (
                                                    <button
                                                        key={item.job_id}
                                                        onClick={() => setCompareDocA(item)}
                                                        style={{
                                                            background: compareDocA?.job_id === item.job_id ? 'var(--bg-elevated)' : 'transparent',
                                                            color: compareDocA?.job_id === item.job_id ? 'var(--text-primary)' : 'var(--text-secondary)',
                                                            fontFamily: 'var(--font-family-sans)',
                                                            border: compareDocA?.job_id === item.job_id ? '1px solid var(--border-default)' : '1px solid transparent',
                                                        }}
                                                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all`}
                                                    >
                                                        <div className={`w-2 h-2 rounded-full ${item.overall_risk === 'High' ? 'bg-red-500' : item.overall_risk === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'}`} />
                                                        <span className="truncate">{item.source_label || item.source}</span>
                                                        <span style={{ color: 'var(--text-tertiary)' }} className="text-xs">{item.overall_risk} risk</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <h4 style={{ fontFamily: 'var(--font-family-sans)', color: 'var(--text-primary)' }} className="text-sm font-semibold mb-2">Document B</h4>
                                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                                {historyItems.map((item) => (
                                                    <button
                                                        key={item.job_id}
                                                        onClick={() => setCompareDocB(item)}
                                                        style={{
                                                            background: compareDocB?.job_id === item.job_id ? 'var(--bg-elevated)' : 'transparent',
                                                            color: compareDocB?.job_id === item.job_id ? 'var(--text-primary)' : 'var(--text-secondary)',
                                                            fontFamily: 'var(--font-family-sans)',
                                                            border: compareDocB?.job_id === item.job_id ? '1px solid var(--border-default)' : '1px solid transparent',
                                                        }}
                                                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all`}
                                                    >
                                                        <div className={`w-2 h-2 rounded-full ${item.overall_risk === 'High' ? 'bg-red-500' : item.overall_risk === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'}`} />
                                                        <span className="truncate">{item.source_label || item.source}</span>
                                                        <span style={{ color: 'var(--text-tertiary)' }} className="text-xs">{item.overall_risk} risk</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 mt-6">
                                        <button
                                            onClick={() => setShowCompareSelector(false)}
                                            style={{
                                                fontFamily: 'var(--font-family-sans)',
                                                background: 'transparent',
                                                border: '1px solid var(--border-default)',
                                                color: 'var(--text-secondary)',
                                            }}
                                            className="flex-1 px-4 py-2 rounded-lg text-sm transition-all"
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
                                            style={{
                                                fontFamily: 'var(--font-family-sans)',
                                                background: 'var(--text-primary)',
                                                border: 'none',
                                                color: 'var(--bg-base)',
                                                opacity: (!compareDocA || !compareDocB || compareDocA.job_id === compareDocB.job_id) ? 0.5 : 1,
                                            }}
                                            className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer disabled:cursor-not-allowed"
                                        >
                                            Compare Now
                                        </button>
                                    </div>
                                </Motion.div>
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
