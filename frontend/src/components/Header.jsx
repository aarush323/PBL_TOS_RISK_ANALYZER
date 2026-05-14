import React, { useState, useRef, useMemo } from 'react';
import { Search, Bell, X } from 'lucide-react';

export default function Header({ activeView, analysisResult, hasActiveChat, onNavigate, onHighlightClause }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef(null);

  const viewLabels = {
    dashboard: 'Dashboard',
    overview: 'Overview',
    clauses: 'Clauses',
    compare: 'Compare',
    reports: 'Reports',
    settings: 'Settings',
  };

  const navItems = [
    { id: 'overview', label: 'Overview' },
    { id: 'clauses', label: 'Clauses' },
    ...(hasActiveChat ? [{ id: 'compare', label: 'Compare' }, { id: 'reports', label: 'Reports' }] : []),
    { id: 'settings', label: 'Settings' },
  ];

  const filteredClauses = useMemo(() => {
    if (!analysisResult?.clauses || !searchQuery) return [];
    return analysisResult.clauses.filter(clause => {
      const matchesText = clause.text?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = clause.risk_categories?.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesText || matchesCat;
    }).slice(0, 5);
  }, [analysisResult, searchQuery]);

  const handleSelectMatch = (clauseIndex) => {
    setSearchQuery('');
    setShowDropdown(false);
    if (onNavigate) onNavigate('clauses');
    if (onHighlightClause) onHighlightClause(clauseIndex);
  };

  return (
    <header className="sticky top-0 h-16 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-6 z-20">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-white/60">🏠</span>
          <span className="text-white/40">/</span>
          <span className="text-white font-medium">{viewLabels[activeView] || 'Dashboard'}</span>
        </div>

        <div className="flex items-center gap-1">
          {navItems.map(item => {
            const isActive = activeView === item.id || (item.id === 'overview' && activeView === 'dashboard');
            return (
              <button
                key={item.id}
                onClick={() => onNavigate && onNavigate(item.id)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[#007AFF]/20 text-[#007AFF] border border-[#007AFF]'
                    : 'text-white/60 hover:text-white hover:bg-white/10 border border-transparent'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative" ref={searchRef}>
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            placeholder="Search clauses..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowDropdown(e.target.value.length > 0);
            }}
            onFocus={() => searchQuery.length > 0 && setShowDropdown(true)}
            className="w-56 focus:w-64 h-8 pl-8 pr-4 rounded-md bg-transparent border border-white/5 text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-white/20 focus:bg-white/[0.02] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); setShowDropdown(false); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
          
          {showDropdown && filteredClauses.length > 0 && (
            <div className="absolute top-full mt-2 w-full bg-[#0a0a0a] border border-white/10 rounded-lg shadow-xl overflow-hidden z-50">
              {filteredClauses.map((clause, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectMatch(idx)}
                  className="w-full px-4 py-2 text-left text-sm text-white/80 hover:bg-white/5 border-b border-white/5 last:border-0"
                >
                  <span className="text-xs text-white/40">CL-{idx + 1}</span>
                  <p className="truncate">{clause.text?.slice(0, 50)}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button className="relative w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all">
            <Bell size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
