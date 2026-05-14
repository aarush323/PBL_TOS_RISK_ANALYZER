import React from 'react';
import { Scale, LogOut, HelpCircle, Plus, Sun, Moon } from 'lucide-react';
import { useTheme } from './theme-context.js';
import { getRiskClass } from '../utils/colorUtils';

export default function Sidebar({
  user, onLogout,
  historyItems, onOpenHistory, isHistoryLoading, selectedHistoryId, onNewAnalysis
}) {
  const { theme, toggle } = useTheme();

  const truncateLabel = (label, maxLen = 20) => {
    if (!label) return 'Untitled';
    return label.length > maxLen ? label.slice(0, maxLen) + '...' : label;
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-[#0a0a0a] border-r border-white/5 flex flex-col z-10">
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
            <Scale size={16} className="text-white/80" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Jurist AI</h1>
            <p className="text-[10px] text-white/50 uppercase tracking-wider">Free Policy Analyzer</p>
          </div>
        </div>

        <button
          onClick={onNewAnalysis}
          className="mt-6 w-full flex items-center justify-center gap-2 h-9 rounded-lg bg-white/5 border border-white/10 text-white/90 text-[13px] font-medium hover:bg-white/10 transition-all"
        >
          <Plus size={14} />
          New Analysis
        </button>
      </div>

      <nav className="flex-1 px-3 overflow-y-auto">
        <div className="mt-4 mb-2">
          <div className="px-4 py-2">
            <h3 className="text-[10px] text-white/30 uppercase tracking-[0.05em] font-medium">Recent Analyses</h3>
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
            <div className="px-2 space-y-0.5">
              {historyItems.slice(0, 10).map((item) => {
                let displayLabel = item.source_label || item.source || 'Untitled';
                if (displayLabel.startsWith('http')) {
                  try { displayLabel = new URL(displayLabel).hostname; } catch(e) {}
                }
                return (
                  <button
                    key={item.job_id}
                    onClick={() => onOpenHistory(item.job_id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${selectedHistoryId === item.job_id
                      ? 'bg-white/[0.04] text-white/90'
                      : 'text-white/50 hover:text-white/80 hover:bg-white/[0.02]'
                      }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${getRiskClass(item.overall_risk)} opacity-60`} />
                    <span className="text-[13px] truncate">{truncateLabel(displayLabel)}</span>
                  </button>
                );
              })}
            </div>
          )}

        </div>
      </nav>

      <div className="p-3 border-t border-white/5">
        <button
          onClick={toggle}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-white/50 hover:text-white/80 hover:bg-white/[0.02] transition-colors group"
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          <div className="relative w-[18px] h-[18px]">
            <Sun size={18} className={`absolute inset-0 transition-all duration-300 ${theme === 'light' ? 'opacity-100 rotate-0' : 'opacity-0 -rotate-90'}`} />
            <Moon size={18} className={`absolute inset-0 transition-all duration-300 ${theme === 'dark' ? 'opacity-100 rotate-0' : 'opacity-0 rotate-90'}`} />
          </div>
          <span className="text-[13px] font-medium">
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </span>
        </button>

        <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-white/50 hover:text-white/80 hover:bg-white/[0.02] transition-colors">
          <HelpCircle size={16} />
          <span className="text-[13px] font-medium">Support</span>
        </button>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-white/50 hover:text-white/80 hover:bg-white/[0.02] transition-colors"
        >
          <LogOut size={16} />
          <span className="text-[13px] font-medium">Logout</span>
        </button>

        <div className="mt-3 p-3 rounded-lg bg-white/[0.02] border border-white/5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/80 font-medium text-xs">
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
