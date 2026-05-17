import React, { useState, useEffect } from 'react';
import { MoreHorizontal, Pencil, Scale, LogOut, Plus, Sun, Moon, Trash2 } from 'lucide-react';
import { useTheme } from './theme-context.js';
import { getRiskClass } from '../utils/colorUtils';

export default function Sidebar({
  user, onLogout,
  historyItems, onOpenHistory, isHistoryLoading, selectedHistoryId, onNewAnalysis,
  onRenameHistory, onDeleteHistory,
}) {
  const { theme, toggle } = useTheme();
  const isDark = theme !== 'light';
  const [openMenuId, setOpenMenuId] = useState(null);

  useEffect(() => {
    if (!openMenuId) return;
    const handleClick = () => setOpenMenuId(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [openMenuId]);

  const truncateLabel = (label, maxLen = 22) => {
    if (!label) return 'Untitled';
    return label.length > maxLen ? label.slice(0, maxLen) + '…' : label;
  };

  const handleRename = (item, displayLabel) => {
    setOpenMenuId(null);
    const nextTitle = window.prompt('Rename analysis', displayLabel);
    if (nextTitle === null) return;
    onRenameHistory?.(item.job_id, nextTitle);
  };

  const handleDelete = (item, displayLabel) => {
    setOpenMenuId(null);
    if (!window.confirm(`Delete "${displayLabel}"? This removes the analysis and its chat history.`)) return;
    onDeleteHistory?.(item.job_id);
  };

  return (
    <aside style={{
      position: 'fixed',
      left: 0,
      top: 0,
      height: '100vh',
      width: '256px',
      background: isDark ? '#09090B' : '#FAFAFA',
      borderRight: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'}`,
      display: 'flex',
      flexDirection: 'column',
      zIndex: 10,
    }}>
      {/* Brand */}
      <div style={{ padding: '24px 24px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Scale size={15} style={{ color: 'var(--text-secondary)' }} />
          </div>
          <div>
            <h1 style={{
              fontFamily: 'Anthropic Serif, serif',
              fontSize: '18px',
              fontWeight: '400',
              color: 'var(--text-primary)',
              margin: 0,
              letterSpacing: '-0.02em',
            }}>Jurist AI</h1>
            <p style={{
              fontFamily: 'Anthropic Mono, monospace',
              fontSize: '9px',
              color: 'var(--text-tertiary)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              margin: 0,
            }}>Free Policy Analyzer</p>
          </div>
        </div>

        <button
          onClick={onNewAnalysis}
          style={{
            marginTop: '20px',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            height: '36px',
            borderRadius: '10px',
            background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-family-sans)',
            fontSize: '13px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => {
            e.target.style.background = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
          }}
          onMouseLeave={e => {
            e.target.style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
          }}
        >
          <Plus size={14} />
          New Analysis
        </button>
      </div>

      {/* History */}
      <nav style={{ flex: 1, padding: '0 12px', overflowY: 'auto' }}>
        <div style={{ marginTop: '8px' }}>
          <div style={{ padding: '8px 12px' }}>
            <h3 style={{
              fontFamily: 'Anthropic Mono, monospace',
              fontSize: '9px',
              color: 'var(--text-tertiary)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              margin: 0,
            }}>Recent Analyses</h3>
          </div>

          {isHistoryLoading ? (
            <div style={{ padding: '0 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{
                  height: '36px',
                  background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                  borderRadius: '8px',
                  animation: 'pulse 2s ease-in-out infinite',
                }} />
              ))}
            </div>
          ) : historyItems.length === 0 ? (
            <div style={{ padding: '12px 12px' }}>
              <p style={{
                fontFamily: 'var(--font-family-sans)',
                fontSize: '12px',
                fontWeight: '300',
                color: 'var(--text-tertiary)',
                margin: 0,
              }}>No analyses yet. Start your first one!</p>
            </div>
          ) : (
            <div style={{ padding: '0 4px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
              {historyItems.slice(0, 10).map((item) => {
                let displayLabel = item.source_label || item.source || 'Untitled';
                if (displayLabel.startsWith('http')) {
                  try { displayLabel = new URL(displayLabel).hostname; } catch { /* keep original label */ }
                }
                const isSelected = selectedHistoryId === item.job_id;
                return (
                  <div
                    key={item.job_id}
                    className="analysis-history-row"
                    style={{
                      position: 'relative',
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '0 6px 0 12px',
                      borderRadius: '8px',
                      background: isSelected
                        ? (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)')
                        : 'transparent',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => onOpenHistory(item.job_id)}
                      style={{
                        minWidth: 0,
                        flex: 1,
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        border: 'none',
                        background: 'transparent',
                        color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontFamily: 'var(--font-family-sans)',
                        fontSize: '13px',
                        fontWeight: isSelected ? '500' : '400',
                        cursor: 'pointer',
                        textAlign: 'left',
                        overflow: 'hidden',
                      }}
                    >
                      <div className={`${getRiskClass(item.overall_risk)}`} style={{
                        width: '5px',
                        height: '5px',
                        borderRadius: '50%',
                        opacity: 0.6,
                        flexShrink: 0,
                      }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {truncateLabel(displayLabel)}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="analysis-history-menu-trigger"
                      aria-label={`Open actions for ${displayLabel}`}
                      aria-expanded={openMenuId === item.job_id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === item.job_id ? null : item.job_id);
                      }}
                      style={{
                        width: '28px',
                        height: '28px',
                        flexShrink: 0,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '7px',
                        border: 'none',
                        background: openMenuId === item.job_id ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)') : 'transparent',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                      }}
                    >
                      <MoreHorizontal size={15} />
                    </button>
                    {openMenuId === item.job_id && (
                      <div
                        className="analysis-history-menu"
                        style={{
                          position: 'absolute',
                          top: '34px',
                          right: '4px',
                          zIndex: 30,
                          width: '156px',
                          padding: '6px',
                          borderRadius: '10px',
                          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                          background: isDark ? '#141416' : '#FFFFFF',
                          boxShadow: isDark ? '0 14px 34px rgba(0,0,0,0.35)' : '0 14px 34px rgba(0,0,0,0.14)',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => handleRename(item, displayLabel)}
                          className="analysis-history-menu-item"
                        >
                          <Pencil size={14} />
                          Rename
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item, displayLabel)}
                          className="analysis-history-menu-item danger"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </nav>

      {/* Footer */}
      <div style={{
        padding: '12px',
        borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'}`,
      }}>
        <button
          onClick={(e) => toggle(e)}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 14px',
            borderRadius: '8px',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-family-sans)',
            fontSize: '13px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{ position: 'relative', width: '16px', height: '16px' }}>
            <Sun size={16} style={{
              position: 'absolute',
              inset: 0,
              transition: 'all 0.3s ease',
              opacity: theme === 'light' ? 1 : 0,
              transform: theme === 'light' ? 'rotate(0deg)' : 'rotate(-90deg)',
            }} />
            <Moon size={16} style={{
              position: 'absolute',
              inset: 0,
              transition: 'all 0.3s ease',
              opacity: theme === 'dark' ? 1 : 0,
              transform: theme === 'dark' ? 'rotate(0deg)' : 'rotate(90deg)',
            }} />
          </div>
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </button>

        <button
          onClick={onLogout}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 14px',
            borderRadius: '8px',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-family-sans)',
            fontSize: '13px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <LogOut size={15} />
          Logout
        </button>

        <div style={{
          marginTop: '12px',
          padding: '10px 12px',
          borderRadius: '10px',
          background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <div style={{
            width: '30px',
            height: '30px',
            borderRadius: '50%',
            background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)',
            fontFamily: 'Anthropic Mono, monospace',
            fontSize: '11px',
            fontWeight: '500',
          }}>
            {user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontFamily: 'var(--font-family-sans)',
              fontSize: '13px',
              fontWeight: '500',
              color: 'var(--text-primary)',
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>{user?.username || user?.email || 'User'}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
