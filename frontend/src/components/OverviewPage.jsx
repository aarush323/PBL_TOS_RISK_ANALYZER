import React from 'react';
import { Check, AlertTriangle, FileText, Link, Share2, Download, ArrowRight, BrainCircuit, Zap, Activity, ShieldAlert, ShieldCheck, Target, TrendingUp, Info } from 'lucide-react';
import { useTheme } from './theme-context.js';
import { motion as Motion } from 'framer-motion';
import { getScoreColor } from '../utils/colorUtils';
import { normalizeRiskBreakdown, getHealthCheckItems, getAnalysisTransparency } from '@/features/analysis/model/selectors';

const CATEGORY_COLORS = {
  'Legal': { color: '#ef4444', bg: 'bg-red-500' },
  'Privacy': { color: '#a855f7', bg: 'bg-purple-500' },
  'Security': { color: '#3b82f6', bg: 'bg-blue-500' },
  'Financial': { color: '#22c55e', bg: 'bg-green-500' },
  'User': { color: '#f59e0b', bg: 'bg-amber-500' }
};

function renderValue(value) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(renderValue).filter(Boolean).join(', ');
  if (typeof value === 'object') return value.finding || value.issue || value.top_concern || value.text || value.category || JSON.stringify(value);
  return String(value);
}

export default function OverviewPage({ analysisResult, sourceInfo, calculateScore, onNavigate }) {
  const { theme } = useTheme();
  const isDark = theme !== 'light';
  const score = typeof calculateScore === 'function' ? calculateScore() : 0;
  const totalClauses = analysisResult?.total_clauses || 0;
  const riskyClauses = analysisResult?.risky_clause_count || 0;
  const overallRisk = analysisResult?.overall_risk || 'Low';

  const breakdownArray = React.useMemo(() => normalizeRiskBreakdown(analysisResult), [analysisResult]);
  const healthCheckItems = React.useMemo(() => getHealthCheckItems(breakdownArray), [breakdownArray]);
  const analysisTransparency = React.useMemo(() => getAnalysisTransparency(analysisResult), [analysisResult]);

  const s = {
    font: 'Geist, system-ui, sans-serif', mono: 'DM Mono, monospace', serif: 'DM Serif Display, serif',
    border: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)',
    surface: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
    surfaceCard: 'var(--bg-surface)',
    textPrimary: 'var(--text-primary)',
    textSecondary: 'var(--text-secondary)',
    textTertiary: 'var(--text-tertiary)',
  };

  const renderRadarChart = () => {
    const gridStroke = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)';
    const axisStroke = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
    const maxCount = Math.max(...(breakdownArray.map(c => Number(c.count) || 0) || []), 1);
    const categories = ['Legal', 'Privacy', 'Security', 'Financial', 'User'];

    const points = categories.map((label, i) => {
      const breakdown = breakdownArray.find(b => b.category?.toLowerCase().includes(label.toLowerCase()));
      const val = Number(breakdown?.count) || 0;
      const angle = (i * 72 - 90) * (Math.PI / 180);
      const radius = (val / maxCount) * 92;
      return `${(100 + radius * Math.cos(angle)).toFixed(2)},${(100 + radius * Math.sin(angle)).toFixed(2)}`;
    }).join(' ');

    const gridLines = [20, 40, 60, 80, 100].map(radius => {
      return Array.from({ length: 5 }).map((_, i) => {
        const angle = (i * 72 - 90) * (Math.PI / 180);
        return `${100 + radius * Math.cos(angle)},${100 + radius * Math.sin(angle)}`;
      }).join(' ');
    });

    return (
      <svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%', filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.1))' }}>
        {gridLines.map((line, i) => <polygon key={i} points={line} fill="none" stroke={gridStroke} strokeWidth="0.5" />)}
        {categories.map((_, i) => {
          const angle = (i * 72 - 90) * (Math.PI / 180);
          return <line key={i} x1="100" y1="100" x2={100 + 100 * Math.cos(angle)} y2={100 + 100 * Math.sin(angle)} stroke={axisStroke} strokeWidth="0.5" />;
        })}
        <polygon points={points} fill="rgba(113, 113, 122, 0.1)" stroke="var(--text-secondary)" strokeWidth="1" style={{ transition: 'all 0.7s' }} />
        {categories.map((label, i) => {
          const breakdown = breakdownArray.find(b => b.category.toLowerCase().includes(label.toLowerCase()));
          const val = breakdown ? breakdown.count : 0;
          const angle = (i * 72 - 90) * (Math.PI / 180);
          const radius = (val / maxCount) * 92;
          const categoryColor = CATEGORY_COLORS[label]?.color || 'var(--text-tertiary)';
          return <circle key={i} cx={100 + radius * Math.cos(angle)} cy={100 + radius * Math.sin(angle)} r="3" fill={categoryColor} />;
        })}
      </svg>
    );
  };

  const totalRisky = analysisResult?.risky_clause_count || 0;
  const deepAnalyzed = totalClauses - (analysisResult?.skipped_llm_count || 0);
  const deepScanPct = totalClauses > 0 ? Math.round((deepAnalyzed / totalClauses) * 100) : 0;

  const cardStyle = {
    background: s.surfaceCard, borderRadius: '16px', border: `1px solid ${s.border}`, padding: '24px',
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px 80px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div>
          <h1 style={{ fontFamily: s.serif, fontSize: '32px', fontWeight: '400', color: s.textPrimary, margin: '0 0 8px', letterSpacing: '-0.02em' }}>Summary</h1>
          {sourceInfo?.type && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: s.font, fontSize: '14px', color: s.textSecondary, fontWeight: '300' }}>
              {sourceInfo.type === 'url' && <Link size={14} />}
              {(sourceInfo.type === 'pdf' || sourceInfo.type === 'text') && <FileText size={14} />}
              <span style={{ maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sourceInfo.value || 'Document'}</span>
            </div>
          )}
        </div>
        <button onClick={() => onNavigate && onNavigate('reports')} style={{
          display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '10px',
          background: s.surface, border: `1px solid ${s.border}`, color: s.textSecondary,
          fontFamily: s.font, fontSize: '13px', fontWeight: '400', cursor: 'pointer', transition: 'all 0.2s',
        }}><Share2 size={14} /> Open Report</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Score Card */}
        <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', minHeight: '340px' }}>
          <h3 style={{ fontFamily: s.mono, fontSize: '10px', color: s.textTertiary, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '32px' }}>Risk Score</h3>
          <div style={{ position: 'relative', width: '220px', height: '110px', marginBottom: '24px' }}>
            <svg viewBox="0 0 100 50" style={{ width: '100%', height: '100%' }}>
              <path d="M 10 45 A 35 35 0 0 1 90 45" fill="none" stroke={s.surface} strokeWidth="10" strokeLinecap="round" />
              <Motion.path initial={{ pathLength: 0 }} animate={{ pathLength: score / 100 }} transition={{ duration: 1.5, ease: "easeOut" }}
                d="M 10 45 A 35 35 0 0 1 90 45" fill="none" stroke={getScoreColor(score)} strokeWidth="10" strokeLinecap="round" />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '10px' }}>
              <span style={{ fontFamily: s.serif, fontSize: '56px', fontWeight: '400', color: s.textPrimary, lineHeight: 1 }}>{score}</span>
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontFamily: s.font, fontSize: '16px', fontWeight: '500', color: getScoreColor(score), margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{overallRisk} Risk Level</p>
            <p style={{ fontFamily: s.mono, fontSize: '9px', color: s.textTertiary, letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>Based on {totalRisky} flagged clauses</p>
          </div>
        </div>

        {/* Narrative Card */}
        <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: s.surface, border: `1px solid ${s.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BrainCircuit size={16} style={{ color: s.textSecondary }} />
              </div>
              <h3 style={{ fontFamily: s.mono, fontSize: '10px', color: s.textTertiary, letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>Analysis Summary</h3>
            </div>
            <div style={{ fontFamily: s.mono, fontSize: '9px', color: s.textTertiary, padding: '4px 8px', borderRadius: '4px', background: s.surface, border: `1px solid ${s.border}`, letterSpacing: '0.06em' }}>
              CONFIDENCE: {analysisResult?.confidence_level || 'HIGH'}
            </div>
          </div>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: '15px', fontWeight: '400', color: s.textSecondary, lineHeight: '1.7', margin: '0 0 24px', flex: 1, fontStyle: 'italic' }}>
            "{analysisResult?.professional_summary || analysisResult?.executive_summary || "Analysis is complete. Review the flagged clauses and their wording before relying on the score."}"
          </p>
          {(analysisResult?.key_findings || []).length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {analysisResult.key_findings.slice(0, 4).map((f, i) => (
                <span key={i} style={{ fontFamily: s.mono, fontSize: '9px', color: s.textSecondary, padding: '4px 10px', borderRadius: '6px', background: s.surface, border: `1px solid ${s.border}`, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {renderValue(f?.category)}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
        {[
          { label: 'Total Clauses', value: totalClauses, icon: FileText },
          { label: 'Flagged Clauses', value: riskyClauses, icon: ShieldAlert, color: '#ef4444' },
          { label: 'Model-Reviewed', value: `${deepScanPct}%`, icon: BrainCircuit },
          { label: 'Overall Score', value: `${score}/100`, icon: ShieldCheck, color: '#22c55e' },
        ].map((stat, i) => (
          <div key={i} style={{ ...cardStyle }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <stat.icon size={16} style={{ color: stat.color || s.textSecondary }} />
            </div>
            <span style={{ fontFamily: s.mono, fontSize: '9px', color: s.textTertiary, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>{stat.label}</span>
            <div style={{ fontFamily: s.font, fontSize: '24px', fontWeight: '500', color: s.textPrimary }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div>
              <h3 style={{ fontFamily: s.mono, fontSize: '10px', color: s.textTertiary, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={14} /> Risk Breakdown
              </h3>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '40px', flex: 1 }}>
            <div style={{ width: '240px', flexShrink: 0 }}>{renderRadarChart()}</div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {['Legal', 'Privacy', 'Security', 'Financial', 'User'].map((label, i) => {
                const breakdown = breakdownArray.find(b => b.category?.toLowerCase().includes(label.toLowerCase()));
                const count = breakdown?.count || 0;
                const pct = riskyClauses > 0 ? (count / riskyClauses) * 100 : 0;
                const color = CATEGORY_COLORS[label]?.color || s.textTertiary;
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
                        <span style={{ fontFamily: s.mono, fontSize: '10px', color: s.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
                      </div>
                      <span style={{ fontFamily: s.mono, fontSize: '9px', color: s.textTertiary }}>{count} ({Math.round(pct)}%)</span>
                    </div>
                    <div style={{ height: '4px', background: s.surface, borderRadius: '2px', overflow: 'hidden' }}>
                      <Motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, delay: i * 0.1 }} style={{ height: '100%', background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontFamily: s.mono, fontSize: '10px', color: s.textTertiary, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '24px', display: 'flex', justifyContent: 'space-between' }}>
            Clause Map <Target size={14} style={{ color: '#ef4444' }} />
          </h3>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <p style={{ fontFamily: s.mono, fontSize: '9px', color: s.textTertiary, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 8px' }}>Severity by position</p>
              <div style={{ height: '48px', display: 'flex', alignItems: 'flex-end', gap: '1px' }}>
                {(analysisResult?.clauses || []).slice(0, 50).map((c, i) => {
                  const sev = c.severity_score || 0;
                  return <div key={i} style={{ flex: 1, borderRadius: '1px 1px 0 0', background: c.is_risky ? (sev >= 5 ? '#ef4444' : '#f59e0b') : s.surface, height: `${Math.max(10, (sev / 10) * 100)}%` }} />;
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: s.mono, fontSize: '8px', color: s.textTertiary, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '6px' }}>
                <span>Start</span><span>End</span>
              </div>
            </div>
            <div style={{ paddingTop: '16px', borderTop: `1px solid ${s.border}` }}>
              {healthCheckItems.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontFamily: s.font, fontSize: '12px', color: s.textSecondary }}>{item.name}</span>
                  {item.passed ? <ShieldCheck size={14} color="#22c55e" /> : <ShieldAlert size={14} color="#f59e0b" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
