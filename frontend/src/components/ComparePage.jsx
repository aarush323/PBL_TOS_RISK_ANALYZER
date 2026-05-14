import React from 'react';
import { Scale, Plus, MessageSquare, ArrowLeft, Trophy, Hash, ChevronRight, Zap } from 'lucide-react';
import { useTheme } from './theme-context.js';

export default function ComparePage({
  comparisonData, historyItems, isComparing, compareHistory,
  onOpenCompareHistory, onSelectDocuments, onNewComparison, onDiscussInChat,
}) {
  const { theme } = useTheme();
  const isDark = theme !== 'light';
  const s = {
    font: 'Anthropic Sans, sans-serif',
    mono: 'Anthropic Mono, monospace',
    serif: 'Anthropic Serif, serif',
    border: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)',
    surface: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
    surfaceCard: 'var(--bg-surface)',
  };

  const getRiskColor = (score) => score >= 50 ? '#ef4444' : score >= 20 ? '#f59e0b' : '#22c55e';

  if (isComparing) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', textAlign: 'center' }}>
        <div style={{ width: '48px', height: '48px', border: '3px solid var(--text-tertiary)', borderTopColor: 'var(--text-primary)',
          borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '20px' }} />
        <h2 style={{ fontFamily: s.serif, fontSize: '22px', fontWeight: '400', color: 'var(--text-primary)', margin: '0 0 6px' }}>
          Cross-referencing terms…
        </h2>
        <p style={{ fontFamily: s.font, fontSize: '13px', fontWeight: '300', color: 'var(--text-secondary)', margin: 0 }}>
          This takes about 15–20 seconds.
        </p>
      </div>
    );
  }

  if (!comparisonData) {
    return (
      <div className="compare-page compare-empty-page" style={{ maxWidth: '800px', margin: '0 auto', padding: '48px 24px' }}>
        <div style={{ padding: '56px 32px', textAlign: 'center', borderRadius: '16px',
          border: `2px dashed ${s.border}`, background: s.surfaceCard }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: s.surface,
            border: `1px solid ${s.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px' }}>
            <Scale size={28} style={{ color: 'var(--text-secondary)' }} />
          </div>
          <h2 style={{ fontFamily: s.serif, fontSize: '26px', fontWeight: '400', color: 'var(--text-primary)',
            margin: '0 0 8px', letterSpacing: '-0.02em' }}>Document Comparison</h2>
          <p style={{ fontFamily: s.font, fontSize: '14px', fontWeight: '300', color: 'var(--text-secondary)',
            lineHeight: '1.6', maxWidth: '420px', margin: '0 auto 28px' }}>
            Select two analyzed documents to generate a side-by-side risk assessment.
          </p>
          {historyItems.length < 2 ? (
            <div style={{ padding: '12px 20px', borderRadius: '10px', background: 'rgba(245,158,11,0.05)',
              border: '1px solid rgba(245,158,11,0.1)', display: 'inline-block' }}>
              <p style={{ fontFamily: s.font, fontSize: '13px', fontWeight: '500', color: '#f59e0b', margin: 0 }}>
                You need at least 2 analyzed documents to compare.
              </p>
            </div>
          ) : (
            <button onClick={onSelectDocuments} style={{
              padding: '12px 24px', borderRadius: '10px',
              background: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)', border: 'none',
              color: isDark ? '#000' : '#fff', fontFamily: s.font, fontSize: '14px', fontWeight: '500',
              cursor: 'pointer', transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', gap: '6px',
            }}>
              <Plus size={16} /> Select Documents
            </button>
          )}
        </div>

        {compareHistory?.length > 0 && (
          <div style={{ marginTop: '40px' }}>
            <h3 style={{ fontFamily: s.mono, fontSize: '10px', color: 'var(--text-tertiary)', letterSpacing: '0.1em',
              textTransform: 'uppercase', margin: '0 0 16px' }}>Recent Comparisons</h3>
            <div className="compare-history-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {compareHistory.map(c => (
                <button key={c.compare_id} onClick={() => onOpenCompareHistory(c.compare_id)} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px',
                  borderRadius: '12px', background: s.surface, border: `1px solid ${s.border}`,
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                }}>
                  <div>
                    <span style={{ fontFamily: s.font, fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>
                      {c.source_a} vs {c.source_b}
                    </span>
                    <span style={{ display: 'block', fontFamily: s.mono, fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '3px' }}>
                      {new Date(c.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <ChevronRight size={14} style={{ color: 'var(--text-tertiary)' }} />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const { doc_a, doc_b, categories, overall_winner, verdict } = comparisonData || {};
  if (!doc_a || !doc_b) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '48px 24px', textAlign: 'center' }}>
        <div style={{ padding: '56px 32px', borderRadius: '16px', border: `2px dashed ${s.border}`, background: s.surfaceCard }}>
          <h2 style={{ fontFamily: s.serif, fontSize: '24px', fontWeight: '400', color: 'var(--text-primary)', marginBottom: '8px' }}>Incomplete comparison data</h2>
          <p style={{ fontFamily: s.font, fontSize: '13px', fontWeight: '300', color: 'var(--text-secondary)' }}>This comparison could not be loaded. Try running a new comparison.</p>
        </div>
      </div>
    );
  }
  const winner = overall_winner === 'a' ? 'A' : overall_winner === 'b' ? 'B' : 'tie';

  return (
    <div className="compare-page" style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px 80px' }}>
      {/* Header */}
      <div className="page-header-row compare-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <button onClick={onNewComparison} style={{
            display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none',
            fontFamily: s.font, fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: '8px',
          }}><ArrowLeft size={13} /> New Comparison</button>
          <h1 style={{ fontFamily: s.serif, fontSize: '32px', fontWeight: '400', fontStyle: 'italic',
            color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>Legal Differential</h1>
        </div>
        <button className="mobile-full-button" onClick={onDiscussInChat} style={{
          display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', borderRadius: '10px',
          background: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)', border: 'none',
          color: isDark ? '#000' : '#fff', fontFamily: s.font, fontSize: '13px', fontWeight: '500',
          cursor: 'pointer', transition: 'all 0.2s',
        }}><MessageSquare size={15} /> Discuss Findings</button>
      </div>

      {/* Verdict banner */}
      <div className="compare-verdict" style={{ padding: '28px', borderRadius: '16px', border: `1px solid ${s.border}`,
        background: winner === 'tie' ? s.surface : 'rgba(34,197,94,0.04)', marginBottom: '28px' }}>
        <div className="compare-verdict-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="compare-verdict-copy" style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', minWidth: 0 }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              background: winner === 'tie' ? 'rgba(245,158,11,0.1)' : 'rgba(34,197,94,0.1)',
              color: winner === 'tie' ? '#f59e0b' : '#22c55e' }}>
              {winner === 'tie' ? <Scale size={22} /> : <Trophy size={22} />}
            </div>
            <div style={{ minWidth: 0 }}>
              <h2 className="compare-verdict-title" style={{ fontFamily: s.serif, fontSize: '22px', fontWeight: '400', color: 'var(--text-primary)', margin: '0 0 6px' }}>
                {winner === 'tie' ? 'Inconclusive' : `${winner === 'A' ? doc_a.label : doc_b.label} is safer`}
              </h2>
              <p style={{ fontFamily: s.font, fontSize: '13px', fontWeight: '300', color: 'var(--text-secondary)',
                lineHeight: '1.6', margin: 0, maxWidth: '600px' }}>{verdict}</p>
            </div>
          </div>
          {winner !== 'tie' && (
            <span className="compare-recommendation-badge" style={{ fontFamily: s.mono, fontSize: '9px', color: '#22c55e', letterSpacing: '0.1em',
              textTransform: 'uppercase', padding: '4px 12px', borderRadius: '6px',
              background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)' }}>Recommended</span>
          )}
        </div>
      </div>

      {/* Head-to-head */}
      <div className="compare-doc-grid mobile-one-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
        {[doc_a, doc_b].map((doc, idx) => {
          const isDocA = idx === 0;
          const isWinner = (isDocA && winner === 'A') || (!isDocA && winner === 'B');
          const score = doc.score || 0;
          return (
            <div key={idx} style={{ padding: '28px', borderRadius: '16px', background: s.surfaceCard,
              border: `1px solid ${isWinner ? 'rgba(34,197,94,0.2)' : s.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%',
                    background: isWinner ? '#22c55e' : 'var(--text-tertiary)',
                    boxShadow: isWinner ? '0 0 8px rgba(34,197,94,0.4)' : 'none' }} />
                  <span style={{ fontFamily: s.mono, fontSize: '10px', color: 'var(--text-tertiary)', letterSpacing: '0.1em',
                    textTransform: 'uppercase' }}>{isDocA ? 'Document A' : 'Document B'}</span>
                </div>
                {isWinner && <span style={{ fontFamily: s.mono, fontSize: '9px', fontWeight: '500',
                  background: '#22c55e', color: '#000', padding: '2px 8px', borderRadius: '4px' }}>WINNER</span>}
              </div>
              <h3 className="compare-doc-title" style={{ fontFamily: s.font, fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)',
                margin: '0 0 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.label}</h3>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '20px' }}>
                <span style={{ fontFamily: s.serif, fontSize: '48px', fontWeight: '400', color: getRiskColor(score) }}>{score}</span>
                <span style={{ fontFamily: s.mono, fontSize: '11px', color: 'var(--text-tertiary)' }}>/ 100 risk</span>
              </div>
                <div className="compare-doc-metrics" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {[
                  { l: 'Risky Clauses', v: doc.risky_count || doc.risky_clause_count },
                  { l: 'Total Clauses', v: doc.total_clauses },
                ].map((m, i) => (
                  <div key={i} style={{ padding: '12px', borderRadius: '10px', background: s.surface }}>
                    <div style={{ fontFamily: s.mono, fontSize: '9px', color: 'var(--text-tertiary)', letterSpacing: '0.08em',
                      textTransform: 'uppercase', marginBottom: '4px' }}>{m.l}</div>
                    <div style={{ fontFamily: s.font, fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' }}>{m.v}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Categories */}
      <div>
        <h3 style={{ fontFamily: s.mono, fontSize: '10px', color: 'var(--text-tertiary)', letterSpacing: '0.1em',
          textTransform: 'uppercase', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Hash size={12} /> Sectional Differential
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {categories?.map((cat, idx) => (
            <div key={idx} style={{ borderRadius: '14px', overflow: 'hidden', background: s.surfaceCard, border: `1px solid ${s.border}` }}>
              <div className="compare-category-header" style={{ padding: '16px 24px', borderBottom: `1px solid ${s.border}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ fontFamily: s.font, fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>{cat.category}</h4>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {[{ l: 'A', v: cat.a_count, w: cat.winner === 'a' }, { l: 'B', v: cat.b_count, w: cat.winner === 'b' }].map(d => (
                    <span key={d.l} style={{ fontFamily: s.mono, fontSize: '11px', color: d.w ? '#22c55e' : 'var(--text-tertiary)' }}>
                      Doc {d.l}: {d.v}
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ padding: '20px 24px' }}>
                <div style={{ width: '100%', height: '4px', background: s.surface, borderRadius: '4px',
                  display: 'flex', overflow: 'hidden', marginBottom: '20px' }}>
                  <div style={{ height: '100%', transition: 'width 1s',
                    background: cat.winner === 'a' ? '#22c55e' : 'var(--text-tertiary)', opacity: cat.winner === 'a' ? 1 : 0.3,
                    width: `${(cat.a_count / (cat.a_count + cat.b_count || 1)) * 100}%` }} />
                  <div style={{ height: '100%', transition: 'width 1s',
                    background: cat.winner === 'b' ? '#22c55e' : 'var(--text-tertiary)', opacity: cat.winner === 'b' ? 1 : 0.3,
                    width: `${(cat.b_count / (cat.a_count + cat.b_count || 1)) * 100}%` }} />
                </div>
                <div className="compare-category-grid mobile-one-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '16px' }}>
                  {[{ l: 'A Summary', t: cat.clause_a_summary }, { l: 'B Summary', t: cat.clause_b_summary }].map(d => (
                    <div key={d.l}>
                      <div style={{ fontFamily: s.mono, fontSize: '9px', color: 'var(--text-tertiary)', letterSpacing: '0.08em',
                        textTransform: 'uppercase', marginBottom: '6px' }}>{d.l}</div>
                      <p style={{ fontFamily: s.font, fontSize: '13px', fontWeight: '300', fontStyle: 'italic',
                        color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>
                        "{d.t || 'No significant risks identified.'}"
                      </p>
                    </div>
                  ))}
                </div>
                <div style={{ padding: '14px 16px', borderRadius: '10px', background: s.surface,
                  border: `1px solid ${s.border}`, display: 'flex', gap: '12px' }}>
                  <Zap size={16} style={{ color: 'var(--text-secondary)', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <div style={{ fontFamily: s.mono, fontSize: '9px', color: 'var(--text-tertiary)', letterSpacing: '0.08em',
                      textTransform: 'uppercase', marginBottom: '4px' }}>Key Difference</div>
                    <p style={{ fontFamily: s.font, fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)',
                      margin: '0 0 4px' }}>{cat.key_difference}</p>
                    <p style={{ fontFamily: s.font, fontSize: '12px', fontWeight: '300', color: 'var(--text-tertiary)',
                      lineHeight: '1.5', margin: 0 }}>{cat.reasoning}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
