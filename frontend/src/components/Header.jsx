import React from 'react';
import { useTheme } from './theme-context.js';

export default function Header({ activeView, analysisResult, hasActiveChat, onNavigate }) {
  const { theme } = useTheme();
  const isDark = theme !== 'light';

  const viewLabels = {
    dashboard: 'Dashboard',
    overview: 'Overview',
    clauses: 'Clauses',
    reports: 'Reports',
    compare: 'Compare',
    settings: 'Settings',
  };

  // build nav items order
  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    ...(analysisResult ? [
      { id: 'overview', label: 'Overview' },
      { id: 'clauses', label: 'Clauses' },
    ] : []),
    ...(hasActiveChat ? [{ id: 'reports', label: 'Reports' }] : []),
    { id: 'compare', label: 'Compare' },
    { id: 'settings', label: 'Settings' },
  ];

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
      </div>
    </header>
  );
}
