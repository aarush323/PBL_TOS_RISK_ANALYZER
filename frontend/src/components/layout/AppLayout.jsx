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
        <div className="min-h-screen bg-[#050505]">
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
                        if (['overview', 'clauses', 'reports', 'compare'].includes(view) && !analysisResult) {
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
                    <ErrorBoundary navigate={navigate} onReset={() => navigate('/app')}>
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
                            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] flex items-center justify-center p-4">
                                <Motion.div
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
