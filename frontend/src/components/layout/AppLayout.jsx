import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import { BarChart3, FileText, Home, LogOut, Menu, MessageSquare, Moon, Plus, Scale, Settings, ShieldAlert, Sun, X } from 'lucide-react';
import { useAppContext } from '@/context/app-context.js';
import Sidebar from '@/components/Sidebar.jsx';
import Header from '@/components/Header.jsx';
import ChatPopup from '@/components/ChatPopup.jsx';
import LoadingOverlay from '@/components/LoadingOverlay.jsx';
import ErrorBoundary from '@/components/ErrorBoundary.jsx';
import { useTheme } from '@/components/theme-context.js';
import { useIsMobile } from '@/hooks/use-is-mobile.js';
import { getRiskClass } from '@/utils/colorUtils.js';

const viewMotion = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' } },
    exit: { opacity: 0, y: 8, transition: { duration: 0.16, ease: 'easeIn' } },
};

const viewLabels = {
    dashboard: 'Dashboard',
    overview: 'Overview',
    clauses: 'Clauses',
    reports: 'Reports',
    compare: 'Compare',
    settings: 'Settings',
};

function normalizeHistoryLabel(item) {
    let displayLabel = item.source_label || item.source || 'Untitled';
    if (displayLabel.startsWith('http')) {
        try { displayLabel = new URL(displayLabel).hostname; } catch { /* keep original label */ }
    }
    return displayLabel;
}

function MobileBottomNav({ activeView, analysisResult, hasActiveChat, onNavigate }) {
    const navItems = [
        { id: 'dashboard', label: 'Home', icon: Home },
        { id: 'overview', label: 'Overview', icon: BarChart3, requiresAnalysis: true },
        { id: 'clauses', label: 'Clauses', icon: ShieldAlert, requiresAnalysis: true },
        { id: 'reports', label: 'Reports', icon: FileText, requiresChat: true },
        { id: 'compare', label: 'Compare', icon: Scale },
        { id: 'settings', label: 'Settings', icon: Settings },
    ];

    return (
        <nav className="mobile-bottom-nav" aria-label="Primary mobile navigation">
            {navItems.map((item) => {
                const Icon = item.icon;
                const isDisabled = (item.requiresAnalysis && !analysisResult) || (item.requiresChat && !hasActiveChat);
                const isActive = activeView === item.id || (item.id === 'dashboard' && activeView === '');
                return (
                    <button
                        key={item.id}
                        type="button"
                        className={`mobile-bottom-nav-item ${isActive ? 'is-active' : ''}`}
                        aria-current={isActive ? 'page' : undefined}
                        aria-disabled={isDisabled}
                        onClick={() => onNavigate(item.id)}
                    >
                        <Icon size={18} />
                        <span>{item.label}</span>
                    </button>
                );
            })}
        </nav>
    );
}

function MobileHistoryDrawer({
    open, onClose, user, onLogout, historyItems, onOpenHistory,
    isHistoryLoading, selectedHistoryId, onNewAnalysis,
}) {
    const { theme, toggle } = useTheme();
    const isDark = theme !== 'light';

    return (
        <AnimatePresence>
            {open && (
                <Motion.div
                    className="mobile-drawer-backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <Motion.aside
                        className="mobile-history-drawer"
                        initial={{ x: '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '-100%' }}
                        transition={{ duration: 0.22, ease: 'easeOut' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="mobile-history-header">
                            <div>
                                <p className="mobile-history-kicker">Jurist AI</p>
                                <h2>Recent Analyses</h2>
                            </div>
                            <button type="button" onClick={onClose} aria-label="Close history">
                                <X size={20} />
                            </button>
                        </div>

                        <button
                            type="button"
                            className="mobile-history-primary"
                            onClick={() => {
                                onNewAnalysis();
                                onClose();
                            }}
                        >
                            New Analysis
                        </button>

                        <div className="mobile-history-list">
                            {isHistoryLoading ? (
                                [1, 2, 3].map((i) => <div key={i} className="mobile-history-skeleton" />)
                            ) : historyItems.length === 0 ? (
                                <p className="mobile-history-empty">No analyses yet. Start your first one.</p>
                            ) : (
                                historyItems.slice(0, 20).map((item) => {
                                    const isSelected = selectedHistoryId === item.job_id;
                                    return (
                                        <button
                                            key={item.job_id}
                                            type="button"
                                            className={`mobile-history-item ${isSelected ? 'is-selected' : ''}`}
                                            onClick={() => {
                                                onOpenHistory(item.job_id);
                                                onClose();
                                            }}
                                        >
                                            <span className={getRiskClass(item.overall_risk)} />
                                            <span>{normalizeHistoryLabel(item)}</span>
                                        </button>
                                    );
                                })
                            )}
                        </div>

                        <div className="mobile-history-footer">
                            <button type="button" onClick={(e) => toggle(e)}>
                                {isDark ? <Sun size={16} /> : <Moon size={16} />}
                                {isDark ? 'Light Mode' : 'Dark Mode'}
                            </button>
                            <button type="button" onClick={onLogout}>
                                <LogOut size={16} />
                                Logout
                            </button>
                            <div className="mobile-history-user">
                                <span>{user?.email?.[0]?.toUpperCase() || 'U'}</span>
                                <p>{user?.username || user?.email || 'User'}</p>
                            </div>
                        </div>
                    </Motion.aside>
                </Motion.div>
            )}
        </AnimatePresence>
    );
}

export default function AppLayout() {
    const location = useLocation();
    const isMobile = useIsMobile();
    const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
    const {
        isProcessing, isHistoryItemLoading,
        showSourcePopup, setShowSourcePopup, sourceInfo,
        analysisResult, user, logout,
        historyItems, isHistoryLoading, selectedHistoryId,
        openHistoryAnalysis, renameHistoryAnalysis, deleteHistoryAnalysis, setSelectedHistoryId,
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

    const handleNavigate = (view) => {
        if (['overview', 'clauses', 'reports'].includes(view) && !analysisResult) {
            navigate('/app');
            addToast('Please select or run an analysis first.', true);
        } else {
            navigate(view === 'dashboard' ? '/app' : `/app/${view}`);
        }
    };

    const handleNewAnalysis = () => {
        navigate('/app');
        setSelectedHistoryId(null);
    };

    return (
        <div className="app-shell min-h-screen" style={{ background: 'var(--bg-base)' }}>
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
                                className="mobile-sheet rounded-xl p-6 max-w-2xl w-full mx-4"
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

            {!isMobile && (
                <Sidebar
                    activeView={path}
                    onNavigate={handleNavigate}
                    user={user}
                    onLogout={logout}
                    historyItems={historyItems}
                    onOpenHistory={openHistoryAnalysis}
                    isHistoryLoading={isHistoryLoading}
                    selectedHistoryId={selectedHistoryId}
                    onNewAnalysis={handleNewAnalysis}
                    onRenameHistory={renameHistoryAnalysis}
                    onDeleteHistory={deleteHistoryAnalysis}
                />
            )}

            <MobileHistoryDrawer
                open={isHistoryDrawerOpen}
                onClose={() => setIsHistoryDrawerOpen(false)}
                user={user}
                onLogout={logout}
                historyItems={historyItems}
                onOpenHistory={openHistoryAnalysis}
                isHistoryLoading={isHistoryLoading}
                selectedHistoryId={selectedHistoryId}
                onNewAnalysis={handleNewAnalysis}
            />

            <div className="app-main ml-64 flex flex-col min-h-screen">
                {isMobile && (
                    <header className="mobile-header">
                        <button type="button" onClick={() => setIsHistoryDrawerOpen(true)} aria-label="Open history">
                            <Menu size={20} />
                        </button>
                        <div>
                            <p>Jurist AI</p>
                            <h1>{viewLabels[path] || 'Dashboard'}</h1>
                        </div>
                        <div className="mobile-header-actions">
                            <button
                                type="button"
                                onClick={() => setIsChatPopupOpen(!isChatPopupOpen)}
                                aria-label={isChatPopupOpen ? 'Close document chat' : 'Open document chat'}
                                aria-pressed={isChatPopupOpen}
                            >
                                <MessageSquare size={19} />
                            </button>
                            <button type="button" onClick={handleNewAnalysis} aria-label="New analysis">
                                <Plus size={19} />
                            </button>
                        </div>
                    </header>
                )}
                <Header
                    activeView={path}
                    analysisResult={analysisResult}
                    hasActiveChat={hasActiveChat}
                    onNavigate={handleNavigate}
                    onNewAnalysis={handleNewAnalysis}
                    isChatOpen={isChatPopupOpen}
                    onToggleChat={() => setIsChatPopupOpen(!isChatPopupOpen)}
                />

                <main className="app-content flex-1 overflow-y-auto">
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
                                    className="mobile-sheet compare-selector-sheet rounded-xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto"
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
                                    <div className="mobile-sheet-actions flex gap-3 mt-6">
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

            {isMobile && (
                <MobileBottomNav
                    activeView={path}
                    analysisResult={analysisResult}
                    hasActiveChat={hasActiveChat}
                    onNavigate={handleNavigate}
                />
            )}

            <div
                className="app-toasts fixed bottom-6 flex flex-col gap-3 z-[9999]"
                style={{ right: isChatPopupOpen ? '444px' : '24px' }}
            >
                {toasts.map(t => (
                    <div
                        key={t.id}
                        className={`app-toast px-4 py-3 rounded-lg text-sm ${t.isError ? 'error' : ''}`}
                    >
                        {t.message}
                    </div>
                ))}
            </div>
        </div>
    );
}
