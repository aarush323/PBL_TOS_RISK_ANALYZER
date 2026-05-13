import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Scale, LogOut, HelpCircle, Plus, Sun, Moon } from 'lucide-react';
import { useTheme } from './ThemeProvider.jsx';
import { getRiskClass } from '../utils/colorUtils';

export default function Sidebar({
  activeView, onNavigate, user, onLogout,
  historyItems, onOpenHistory, isHistoryLoading, selectedHistoryId, onNewAnalysis
}) {
  const { theme, toggle } = useTheme();
  const location = useLocation();

  // Determine active state from route path
  const currentPath = location.pathname.replace('/app', '').replace('/', '') || 'dashboard';

  const truncateLabel = (label, maxLen = 20) => {
    if (!label) return 'Untitled';
    return label.length > maxLen ? label.slice(0, maxLen) + '...' : label;
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-[#0a0a0a] border-r border-white/10 flex flex-col z-10">
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#007AFF] to-[#0056cc] flex items-center justify-center">
            <Scale size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Jurist AI</h1>
            <p className="text-[10px] text-white/50 uppercase tracking-wider">Pro Audit Suite</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 overflow-y-auto">
        <div className="mt-6 mb-2">
          <div className="px-4 py-2">
            <h3 className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Recent Analyses</h3>
          </div>

          {isHistoryLoading ? (
            <div className="px-4 space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-10 bg-white/5 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : historyItems.length === 0 ? (
            <div className="px-4 py-3">
              <p className="text-xs text-white/40">No analyses yet. Start your first one!</p>
            </div>
          ) : (
            <div className="px-2 space-y-1">
              {historyItems.slice(0, 10).map((item) => (
                <button
                  key={item.job_id}
                  onClick={() => onOpenHistory(item.job_id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${selectedHistoryId === item.job_id
                    ? 'bg-[#007AFF]/20 text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                >
                  <div className={`w-2 h-2 rounded-full ${getRiskClass(item.overall_risk)}`} />
                  <span className="text-xs truncate">{truncateLabel(item.source_label || item.source)}</span>
                </button>
              ))}
            </div>
          )}

          <div className="px-4 mt-3">
            <button
              onClick={onNewAnalysis}
              className="flex items-center gap-2 text-xs text-[#007AFF] hover:text-white transition-colors"
            >
              <Plus size={14} />
              New Analysis
            </button>
          </div>
        </div>
      </nav>

      <div className="p-3 border-t border-white/10">
        <button
          onClick={toggle}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-all group"
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          <div className="relative w-[18px] h-[18px]">
            <Sun size={18} className={`absolute inset-0 transition-all duration-300 ${theme === 'light' ? 'opacity-100 rotate-0' : 'opacity-0 -rotate-90'}`} />
            <Moon size={18} className={`absolute inset-0 transition-all duration-300 ${theme === 'dark' ? 'opacity-100 rotate-0' : 'opacity-0 rotate-90'}`} />
          </div>
          <span className="text-sm font-medium">
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </span>
        </button>

        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-all">
          <HelpCircle size={18} />
          <span className="text-sm font-medium">Support</span>
        </button>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-all"
        >
          <LogOut size={18} />
          <span className="text-sm font-medium">Logout</span>
        </button>

        <div className="mt-3 p-3 rounded-lg bg-white/5 border border-white/10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#007AFF] flex items-center justify-center text-white font-semibold text-sm">
            {user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.username || user?.email || 'User'}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
