import React, { useState, useRef, useMemo } from 'react';
import { Search, Bell, X } from 'lucide-react';
import { useTheme } from './theme-context.js';

export default function Header({ activeView, analysisResult, hasActiveChat, onNavigate, onHighlightClause }) {
  const { theme } = useTheme();
  const isDark = theme !== 'light';
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
    <header style={{
      position: 'sticky',
      top: 0,
      height: '52px',
      background: isDark ? 'rgba(10,10,11,0.85)' : 'rgba(250,250,250,0.85)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      zIndex: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        {/* Breadcrumb */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontFamily: 'var(--font-family-sans)',
          fontSize: '13px',
        }}>
          <span style={{ color: 'var(--text-tertiary)', fontWeight: '500' }}>Jurist</span>
          <span style={{ color: 'var(--text-tertiary)', fontSize: '10px' }}>/</span>
          <span style={{
            color: 'var(--text-primary)',
            fontWeight: '500',
          }}>{viewLabels[activeView] || 'Dashboard'}</span>
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          {navItems.map(item => {
            const isActive = activeView === item.id || (item.id === 'overview' && activeView === 'dashboard');
            return (
              <button
                key={item.id}
                onClick={() => onNavigate && onNavigate(item.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontFamily: 'var(--font-family-sans)',
                  fontSize: '13px',
                  fontWeight: '500',
                  border: 'none',
                  background: 'transparent',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => {
                  if (!isActive) e.target.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={e => {
                  if (!isActive) e.target.style.color = 'var(--text-secondary)';
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Search */}
        <div ref={searchRef} style={{ position: 'relative' }}>
          <Search size={13} style={{
            position: 'absolute',
            left: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-tertiary)',
          }} />
          <input
            type="text"
            placeholder="Search clauses…"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowDropdown(e.target.value.length > 0);
            }}
            onFocus={() => searchQuery.length > 0 && setShowDropdown(true)}
            style={{
              width: '200px',
              height: '32px',
              paddingLeft: '30px',
              paddingRight: '28px',
              borderRadius: '8px',
              background: 'transparent',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'}`,
              fontFamily: 'var(--font-family-sans)',
              fontSize: '12px',
              color: 'var(--text-primary)',
              outline: 'none',
              transition: 'all 0.2s ease',
            }}
            onFocusCapture={(e) => {
              e.target.style.borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)';
              e.target.style.width = '240px';
            }}
            onBlurCapture={(e) => {
              e.target.style.borderColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)';
              e.target.style.width = '200px';
            }}
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); setShowDropdown(false); }}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--text-tertiary)',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <X size={13} />
            </button>
          )}

          {showDropdown && filteredClauses.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              marginTop: '6px',
              width: '100%',
              background: isDark ? '#111113' : '#FFFFFF',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'}`,
              borderRadius: '10px',
              boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 32px rgba(0,0,0,0.12)',
              overflow: 'hidden',
              zIndex: 50,
            }}>
              {filteredClauses.map((clause, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectMatch(idx)}
                  style={{
                    width: '100%',
                    padding: '8px 14px',
                    textAlign: 'left',
                    fontFamily: 'var(--font-family-sans)',
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: idx < filteredClauses.length - 1
                      ? `1px solid ${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)'}`
                      : 'none',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={e => e.target.style.background = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'}
                  onMouseLeave={e => e.target.style.background = 'transparent'}
                >
                  <span style={{
                    fontFamily: 'Anthropic Mono, monospace',
                    fontSize: '10px',
                    color: 'var(--text-tertiary)',
                    marginRight: '6px',
                  }}>CL-{idx + 1}</span>
                  <p style={{
                    margin: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: 'var(--text-primary)',
                  }}>{clause.text?.slice(0, 50)}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notification */}
        <button style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}>
          <Bell size={15} />
        </button>
      </div>
    </header>
  );
}
