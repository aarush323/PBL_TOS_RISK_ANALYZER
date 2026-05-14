import React, { useState, useMemo, useEffect } from 'react';
import { Filter, AlertTriangle, Activity, Info, MessageSquare, Shield, FileText, Zap, Check } from 'lucide-react';
import { useTheme } from './theme-context.js';
import {
  filterClauses,
  getSeveritySeries,
  getConfidenceCounts,
} from '@/features/analysis/model/selectors';

export default function ClausesPage({
  analysisResult,
  sourceInfo,
  onExplainRiskInChat,
  onToggleChat
}) {
  const { theme } = useTheme();
  const isDark = theme !== 'light';
  const [filters, setFilters] = useState({ riskLevel: 'all', severity: 'all', confidence: 'all' });
  const [expandedCardId, setExpandedCardId] = useState(null);
  const [visibleCount, setVisibleCount] = useState(50);

  useEffect(() => { setVisibleCount(50); }, [filters, analysisResult]);

  const clauses = useMemo(() => filterClauses(analysisResult, filters), [analysisResult, filters]);
  const severitySeries = useMemo(() => getSeveritySeries(analysisResult), [analysisResult]);
  const totalClauses = analysisResult?.clauses?.length || 0;
  const filteredCount = clauses.length;
  const selectedCategoryCounts = useMemo(() => getConfidenceCounts(analysisResult), [analysisResult]);

  const s = {
    font: 'Geist, system-ui, sans-serif',
    mono: 'DM Mono, monospace',
    serif: 'DM Serif Display, serif',
    border: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)',
    borderStrong: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    surfaceDim: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
    surface: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
    surfaceHover: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
  };

  const renderConfidenceRing = (confidence) => {
    const confValue = confidence === 'High' ? 90 : confidence === 'Medium' ? 60 : 30;
    const color = confidence === 'High' ? '#ef4444' : confidence === 'Medium' ? '#f59e0b' : '#22c55e';
    return (
      <div style={{ position: 'relative', width: '44px', height: '44px' }}>
        <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
          <circle cx="18" cy="18" r="15" fill="none" stroke={s.border} strokeWidth="2.5" />
          <circle cx="18" cy="18" r="15" fill="none" stroke={color} strokeWidth="2.5"
            strokeDasharray={`${confValue} 100`} strokeLinecap="round" />
        </svg>
        <span style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: s.mono, fontSize: '10px', fontWeight: '500', color: 'var(--text-primary)',
        }}>{confValue}</span>
      </div>
    );
  };

  const renderSeverityBar = () => {
    const data = severitySeries;
    if (!data.length) return (
      <div style={{ height: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        border: `1px solid ${s.border}`, background: s.surfaceDim, borderRadius: '10px' }}>
        <Info size={20} style={{ color: 'var(--text-tertiary)', marginBottom: '6px' }} />
        <p style={{ fontFamily: s.font, fontSize: '11px', color: 'var(--text-tertiary)', margin: 0 }}>No clauses to map</p>
      </div>
    );
    const maxSev = Math.max(...data.map(d => d.severity), 1);
    const avgSev = data.reduce((sum, d) => sum + d.severity, 0) / (data.length || 1);
    const highRisk = data.filter(d => d.severity >= 3).length;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: s.mono, fontSize: '9px',
          color: 'var(--text-tertiary)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          <span>Start</span><span>End</span>
        </div>
        <div style={{ height: '64px', display: 'flex', alignItems: 'flex-end', gap: '1px' }}>
          {data.map((d, i) => (
            <div key={i} style={{
              flex: 1, borderRadius: '2px 2px 0 0', transition: 'all 0.2s',
              height: `${Math.max(8, (d.severity / maxSev) * 100)}%`,
              backgroundColor: d.isRisky ? (d.severity >= 3 ? '#ef4444' : '#f59e0b') : s.surface,
              opacity: d.isRisky ? 1 : 0.5,
            }} title={`Clause ${i+1}: ${d.severity.toFixed(1)}`} />
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
          {[
            { label: 'Avg Sev', val: avgSev.toFixed(1) },
            { label: 'Max', val: maxSev.toFixed(1) },
            { label: 'Critical', val: highRisk, color: '#ef4444' },
          ].map((m, i) => (
            <div key={i} style={{ padding: '8px 10px', borderRadius: '8px', background: s.surfaceDim, border: `1px solid ${s.border}` }}>
              <p style={{ fontFamily: s.mono, fontSize: '9px', color: 'var(--text-tertiary)', letterSpacing: '0.08em',
                textTransform: 'uppercase', margin: '0 0 2px' }}>{m.label}</p>
              <p style={{ fontFamily: s.font, fontSize: '13px', fontWeight: '600', color: m.color || 'var(--text-primary)', margin: 0 }}>{m.val}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const selectStyle = {
    height: '34px', padding: '0 12px', borderRadius: '8px',
    background: s.surfaceDim, border: `1px solid ${s.border}`,
    fontFamily: s.font, fontSize: '11px', fontWeight: '500',
    color: 'var(--text-secondary)', outline: 'none', cursor: 'pointer',
    transition: 'all 0.2s',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Severity map header */}
      <div style={{ padding: '32px 32px 24px', borderBottom: `1px solid ${s.border}`,
        background: `linear-gradient(to bottom, ${isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.01)'}, transparent)` }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div>
              <h2 style={{ fontFamily: s.serif, fontSize: '32px', fontWeight: '400', color: 'var(--text-primary)',
                margin: '0 0 6px', letterSpacing: '-0.02em' }}>Clause Review</h2>
              <p style={{ fontFamily: s.font, fontWeight: '300', fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                Severity across the document — {sourceInfo?.value || 'Current Analysis'}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontFamily: s.mono, fontSize: '9px', color: 'var(--text-tertiary)', letterSpacing: '0.1em',
                  textTransform: 'uppercase', margin: '0 0 4px' }}>Filtered Scope</p>
                <p style={{ fontFamily: s.font, fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>
                  {filteredCount} of {totalClauses}
                </p>
              </div>
              <div style={{ height: '32px', width: '1px', background: s.border }} />
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontFamily: s.mono, fontSize: '9px', color: 'var(--text-tertiary)', letterSpacing: '0.1em',
                  textTransform: 'uppercase', margin: '0 0 4px' }}>Risk Profile</p>
                <div style={{ width: '100px', height: '4px', background: s.surface, borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: '4px', transition: 'width 1s ease',
                    background: 'linear-gradient(90deg, #ef4444, #f59e0b)',
                    width: `${totalClauses > 0 ? (clauses.filter(c => c.is_risky).length / totalClauses) * 100 : 0}%`,
                  }} />
                </div>
              </div>
            </div>
          </div>

          {/* Severity chart card */}
          <div style={{ padding: '24px', borderRadius: '14px', background: 'var(--bg-surface)',
            border: `1px solid ${s.border}`, position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontFamily: s.mono, fontSize: '10px', color: 'var(--text-tertiary)', letterSpacing: '0.1em',
                textTransform: 'uppercase', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Activity size={13} style={{ color: 'var(--text-secondary)' }} /> Severity by position
              </h3>
              <div style={{ display: 'flex', gap: '12px', fontFamily: s.mono, fontSize: '9px', color: 'var(--text-tertiary)', letterSpacing: '0.08em' }}>
                {[{ c: '#ef4444', l: 'Critical' }, { c: '#f59e0b', l: 'Moderate' }, { c: s.surface, l: 'Safe' }].map(x => (
                  <span key={x.l} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: x.c }} />{x.l}
                  </span>
                ))}
              </div>
            </div>
            {renderSeverityBar()}
          </div>
        </div>
      </div>

      {/* Filters + clause list */}
      <div style={{ flex: 1, padding: '24px 32px', overflowY: 'auto' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Filter size={14} style={{ color: 'var(--text-tertiary)' }} />
              {['riskLevel', 'severity', 'confidence'].map(fk => (
                <select key={fk} value={filters[fk]}
                  onChange={e => setFilters(p => ({ ...p, [fk]: e.target.value }))} style={selectStyle}>
                  <option value="all">{fk === 'riskLevel' ? 'All Risk' : fk === 'severity' ? 'All Severity' : 'All Confidence'}</option>
                  {fk === 'riskLevel' && <><option value="risky">Risky Only</option><option value="safe">Safe Only</option></>}
                  {fk === 'severity' && <><option value="high">High (≥5)</option><option value="medium">Medium (2-5)</option><option value="low">Low (&lt;2)</option></>}
                  {fk === 'confidence' && <><option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option></>}
                </select>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '8px',
                background: s.surfaceDim, border: `1px solid ${s.border}` }}>
                <span style={{ fontFamily: s.mono, fontSize: '9px', color: 'var(--text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Confidence:</span>
                <div style={{ display: 'flex', gap: '3px' }}>
                  {Object.entries(selectedCategoryCounts).map(([conf, count]) => (
                    <div key={conf} style={{
                      width: '18px', height: '4px', borderRadius: '4px',
                      background: conf === 'High' ? '#ef4444' : conf === 'Medium' ? '#f59e0b' : '#22c55e',
                      opacity: count > 0 ? 1 : 0.2,
                    }} title={`${conf}: ${count}`} />
                  ))}
                </div>
              </div>
              <button onClick={onToggleChat} style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 16px', borderRadius: '8px',
                background: s.surfaceDim, border: `1px solid ${s.border}`,
                fontFamily: s.font, fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}>
                <MessageSquare size={13} /> Ask about clauses
              </button>
            </div>
          </div>

          {/* Clause cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {clauses.length === 0 ? (
              <div style={{ padding: '64px 24px', textAlign: 'center', borderRadius: '14px',
                border: `2px dashed ${s.border}`, background: s.surfaceDim }}>
                <Shield size={48} style={{ color: 'var(--text-tertiary)', margin: '0 auto 16px', display: 'block', opacity: 0.3 }} />
                <h3 style={{ fontFamily: s.serif, fontSize: '20px', fontWeight: '400', color: 'var(--text-secondary)', margin: '0 0 6px' }}>No Matching Clauses</h3>
                <p style={{ fontFamily: s.font, fontSize: '13px', fontWeight: '300', color: 'var(--text-tertiary)', margin: 0 }}>
                  Try adjusting your filters to see more analysis.
                </p>
              </div>
            ) : (
              clauses.slice(0, visibleCount).map((clause, idx) => {
                const isRisky = clause.is_risky;
                const isExpanded = expandedCardId === idx;
                const sevLevel = clause.severity_score >= 3 ? 'High' : clause.severity_score >= 2 ? 'Medium' : 'Low';
                const sevColor = clause.severity_score >= 3 ? '#ef4444' : clause.severity_score >= 2 ? '#f59e0b' : 'var(--text-secondary)';
                const borderLeft = isRisky ? `3px solid ${sevColor}` : `3px solid ${isDark ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.2)'}`;

                return (
                  <div key={idx} id={`clause-${idx}`} style={{
                    borderRadius: '14px', overflow: 'hidden', background: 'var(--bg-surface)',
                    border: `1px solid ${s.border}`, borderLeft, transition: 'all 0.3s ease',
                  }}>
                    {isRisky ? (
                      <div style={{ padding: '20px 24px' }}>
                        {/* Risky header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{
                              fontFamily: s.mono, fontSize: '9px', fontWeight: '500', padding: '3px 10px', borderRadius: '6px',
                              letterSpacing: '0.06em', textTransform: 'uppercase',
                              background: `${sevColor}15`, color: sevColor, border: `1px solid ${sevColor}25`,
                            }}>{sevLevel} Risk</span>
                            <span style={{ fontFamily: s.font, fontSize: '11px', fontWeight: '500', color: 'var(--text-tertiary)',
                              textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                              {clause.risk_categories?.[0] || 'General'}
                            </span>
                            <span style={{ fontFamily: s.mono, fontSize: '10px', color: 'var(--text-tertiary)',
                              padding: '2px 8px', borderRadius: '4px', background: s.surfaceDim, border: `1px solid ${s.border}` }}>
                              {clause.severity_score?.toFixed(1) || '0.0'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ textAlign: 'right' }}>
                              <p style={{ fontFamily: s.mono, fontSize: '8px', color: 'var(--text-tertiary)', letterSpacing: '0.1em',
                                textTransform: 'uppercase', margin: '0 0 2px' }}>Confidence</p>
                              <p style={{ fontFamily: s.font, fontSize: '11px', fontWeight: '600', margin: 0,
                                color: clause.confidence === 'High' ? '#ef4444' : clause.confidence === 'Medium' ? '#f59e0b' : '#22c55e' }}>
                                {clause.confidence}
                              </p>
                            </div>
                            {renderConfidenceRing(clause.confidence)}
                          </div>
                        </div>

                        {/* Explanation */}
                        <p style={{
                          fontFamily: 'Georgia, serif', fontSize: '16px', fontWeight: '400', lineHeight: '1.6',
                          color: 'var(--text-primary)', margin: '0 0 4px', letterSpacing: '-0.01em',
                          ...(isExpanded ? {} : { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }),
                        }}>{clause.explanation}</p>

                        {/* Expanded details */}
                        {isExpanded && (
                          <div style={{ paddingTop: '16px', marginTop: '16px', borderTop: `1px solid ${s.border}`,
                            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div>
                              <h4 style={{ fontFamily: s.mono, fontSize: '9px', color: 'var(--text-tertiary)', letterSpacing: '0.1em',
                                textTransform: 'uppercase', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <FileText size={11} /> Source Provision
                              </h4>
                              <div style={{ padding: '16px', borderRadius: '10px', background: s.surfaceDim,
                                border: `1px solid ${s.border}`, fontFamily: s.mono, fontSize: '12px',
                                color: 'var(--text-secondary)', lineHeight: '1.7', maxHeight: '240px', overflowY: 'auto' }}>
                                {clause.text}
                              </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              {clause.recommendation && (
                                <div>
                                  <h4 style={{ fontFamily: s.mono, fontSize: '9px', color: '#f59e0b', letterSpacing: '0.1em',
                                    textTransform: 'uppercase', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Zap size={11} /> Recommendation
                                  </h4>
                                  <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(245,158,11,0.04)',
                                    border: '1px solid rgba(245,158,11,0.1)', fontFamily: s.font, fontSize: '13px',
                                    fontWeight: '300', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                                    {clause.recommendation}
                                  </div>
                                </div>
                              )}
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                <div style={{ padding: '12px', borderRadius: '8px', background: s.surfaceDim, border: `1px solid ${s.border}` }}>
                                  <p style={{ fontFamily: s.mono, fontSize: '9px', color: 'var(--text-tertiary)', letterSpacing: '0.08em',
                                    textTransform: 'uppercase', margin: '0 0 4px' }}>Category</p>
                                  <p style={{ fontFamily: s.font, fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                                    {(clause.risk_categories || ['General']).join(', ')}
                                  </p>
                                </div>
                                <div style={{ padding: '12px', borderRadius: '8px', background: s.surfaceDim, border: `1px solid ${s.border}` }}>
                                  <p style={{ fontFamily: s.mono, fontSize: '9px', color: 'var(--text-tertiary)', letterSpacing: '0.08em',
                                    textTransform: 'uppercase', margin: '0 0 4px' }}>Confidence</p>
                                  <p style={{ fontFamily: s.font, fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                                    {clause.confidence || 'N/A'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Footer actions */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          marginTop: '16px', paddingTop: '14px', borderTop: `1px solid ${s.border}` }}>
                          <span style={{ fontFamily: s.mono, fontSize: '9px', color: 'var(--text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                            Clause {idx + 1}
                          </span>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={e => { e.stopPropagation(); onExplainRiskInChat?.(clause, idx); onToggleChat?.(); }}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 14px', borderRadius: '8px',
                                background: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)', border: 'none',
                                color: isDark ? '#000' : '#fff', fontFamily: s.font, fontSize: '11px', fontWeight: '500',
                                cursor: 'pointer', transition: 'all 0.15s',
                              }}>
                              <MessageSquare size={12} /> Ask about this
                            </button>
                            <button onClick={e => { e.stopPropagation(); setExpandedCardId(isExpanded ? null : idx); }}
                              style={{
                                padding: '6px 14px', borderRadius: '8px', border: `1px solid ${s.border}`,
                                background: isExpanded ? s.surfaceHover : s.surfaceDim,
                                color: 'var(--text-secondary)', fontFamily: s.font, fontSize: '11px', fontWeight: '400',
                                cursor: 'pointer', transition: 'all 0.15s',
                              }}>
                              {isExpanded ? 'Hide details' : 'Show details'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Safe clause */
                      <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(34,197,94,0.08)',
                            border: '1px solid rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <Check size={16} strokeWidth={2.5} style={{ color: '#22c55e' }} />
                          </div>
                          <div>
                            <p style={{ fontFamily: s.mono, fontSize: '9px', color: 'var(--text-tertiary)', letterSpacing: '0.08em',
                              textTransform: 'uppercase', margin: '0 0 3px' }}>Clause {idx + 1}</p>
                            <p style={{ fontFamily: s.font, fontSize: '13px', fontWeight: '300', fontStyle: 'italic',
                              color: 'var(--text-secondary)', margin: 0, maxWidth: '600px',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              "{clause.text?.slice(0, 100)}…"
                            </p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontFamily: s.mono, fontSize: '9px', color: 'rgba(34,197,94,0.5)', letterSpacing: '0.06em',
                            textTransform: 'uppercase', padding: '3px 10px', borderRadius: '6px',
                            border: '1px solid rgba(34,197,94,0.15)' }}>No risk flag</span>
                          {renderConfidenceRing(clause.confidence)}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {clauses.length > visibleCount && (
            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center' }}>
              <button onClick={() => setVisibleCount(p => p + 50)} style={{
                padding: '10px 24px', borderRadius: '10px', background: s.surfaceDim,
                border: `1px solid ${s.border}`, fontFamily: s.font, fontSize: '12px', fontWeight: '500',
                color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.15s',
              }}>Load More Clauses</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
