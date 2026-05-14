import React, { useState, useEffect, useRef } from 'react';
import { FileText, Download, Activity, Target, Shield, Check, AlertOctagon, Zap, List, BrainCircuit, ArrowLeft, ChevronRight, Loader2, Share2, Printer } from 'lucide-react';
import { apiFetchJson } from '@/shared/api/client';
import { getAccessToken } from '@/shared/api/auth-storage';
import EmptyState from './EmptyState.jsx';
import { useTheme } from './theme-context.js';

const SECTION_LABELS = [
  { id: 'summary', label: 'Executive Summary', icon: FileText },
  { id: 'findings', label: 'Key Findings', icon: Target },
  { id: 'categories', label: 'Risk Categories', icon: Shield },
  { id: 'clauses', label: 'Critical Clauses', icon: AlertOctagon },
  { id: 'compliance', label: 'Compliance Status', icon: Check },
  { id: 'action', label: 'Action Plan', icon: Zap },
];

export default function ReportsPage({ analysisResult, analysisJobId, token }) {
  const { theme } = useTheme();
  const isDark = theme !== 'light';
  const [report, setReport] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeSection, setActiveSection] = useState('summary');
  const reportRef = useRef(null);

  const riskScore = report?.report_metadata?.risk_score ?? analysisResult?.risk_score ?? 0;
  const getRiskColor = (sc) => sc >= 50 ? '#ef4444' : sc >= 20 ? '#f59e0b' : '#22c55e';

  const s = {
    font: 'Anthropic Sans, sans-serif', mono: 'Anthropic Mono, monospace', serif: 'Anthropic Serif, serif',
    border: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)',
    surface: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
    surfaceCard: 'var(--bg-surface)',
  };

  useEffect(() => {
    if (!analysisJobId || report || isGenerating) return;
    const activeToken = token || getAccessToken();
    apiFetchJson(`/report/${analysisJobId}`, { token: activeToken })
      .then(({ res, data }) => { if (res.ok && data?.status === 'complete' && data.report) setReport(data.report); })
      .catch(() => {});
  }, [analysisJobId, token, report, isGenerating]);

  const generateReport = async () => {
    if (!analysisJobId) return;
    setIsGenerating(true);
    try {
      const { res, data } = await apiFetchJson(`/report/generate/${analysisJobId}`, { method: 'POST', token: token || getAccessToken() });
      if (res.ok && data.report) setReport(data.report);
    } catch (err) { console.error('Report generation failed', err); }
    finally { setIsGenerating(false); }
  };

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    const [html2canvas, { jsPDF: JsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ]);
    const canvas = await html2canvas.default(reportRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      onclone: (doc) => {
        doc.querySelectorAll('svg').forEach((svg) => {
          const w = svg.getAttribute('width') || '16';
          const h = svg.getAttribute('height') || '16';
          svg.setAttribute('width', w);
          svg.setAttribute('height', h);
          svg.style.width = w + 'px';
          svg.style.height = h + 'px';
        });
      },
    });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new JsPDF('p', 'mm', 'a4');
    const w = pdf.internal.pageSize.getWidth();
    const imgProps = pdf.getImageProperties(imgData);
    let h = (imgProps.height * w) / imgProps.width;
    let remaining = h;
    let pos = 0;
    const pageH = 297;
    while (remaining > 0) {
      const sliceH = Math.min(remaining, pageH);
      if (pos > 0) pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, -pos, w, h);
      pos += pageH;
      remaining -= pageH;
    }
    pdf.save('Jurist_Report_' + (report?.report_metadata?.report_id || 'analysis') + '.pdf');
  };

  if (!analysisResult && !report) return <EmptyState title="No Analysis Found" description="Run an analysis first to generate a report." />;

  if (!report && !isGenerating) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', padding: '32px' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: s.surface, border: `1px solid ${s.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
          <FileText size={24} style={{ color: 'var(--text-secondary)' }} />
        </div>
        <h2 style={{ fontFamily: s.serif, fontSize: '24px', fontWeight: '400', color: 'var(--text-primary)', margin: '0 0 8px' }}>Generate Risk Report</h2>
        <p style={{ fontFamily: s.font, fontSize: '13px', fontWeight: '300', color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 0 28px', lineHeight: '1.6' }}>
          Create a detailed, LLM-powered legal report summarizing critical risks, compliance status, and action plans.
        </p>
        <button onClick={generateReport} style={{
          padding: '10px 20px', borderRadius: '10px', background: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)',
          border: 'none', color: isDark ? '#000' : '#fff', fontFamily: s.font, fontSize: '13px', fontWeight: '500',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
        }}><Zap size={14} /> Generate Report</button>
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
        <Loader2 size={36} style={{ color: 'var(--text-secondary)', animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
        <h2 style={{ fontFamily: s.serif, fontSize: '20px', fontWeight: '400', color: 'var(--text-primary)', margin: '0 0 6px' }}>Analyzing legal nuances…</h2>
        <p style={{ fontFamily: s.font, fontSize: '13px', fontWeight: '300', color: 'var(--text-secondary)', margin: 0 }}>This usually takes 20–30 seconds.</p>
      </div>
    );
  }

  const btnStyle = {
    display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px',
    background: s.surface, border: `1px solid ${s.border}`, fontFamily: s.font, fontSize: '12px',
    color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.15s',
  };

  const sectionTitle = (icon, label, color) => (
    <h2 style={{ fontFamily: s.font, fontSize: '17px', fontWeight: '600', color: 'var(--text-primary)',
      display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 18px' }}>
      {React.createElement(icon, { size: 16, style: { color: color || 'var(--text-secondary)' } })} {label}
    </h2>
  );

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <button onClick={() => window.history.back()} style={{
            display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none',
            fontFamily: s.font, fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: '6px',
          }}><ArrowLeft size={13} /> Back</button>
          <h1 style={{ fontFamily: s.serif, fontSize: '30px', fontWeight: '400', fontStyle: 'italic',
            color: 'var(--text-primary)', margin: '0 0 4px', letterSpacing: '-0.02em' }}>Risk Analysis Report</h1>
          <p style={{ fontFamily: s.mono, fontSize: '11px', color: 'var(--text-tertiary)', margin: 0 }}>
            {report.report_metadata.report_id} · {new Date(report.report_metadata.generated_at).toLocaleDateString()}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleDownloadPDF} style={btnStyle}><Download size={13} /> PDF</button>
          <button onClick={() => window.print()} style={btnStyle}><Printer size={13} /> Print</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '28px' }}>
        {/* Sidebar nav */}
        <div style={{ position: 'sticky', top: '80px', alignSelf: 'start' }}>
          <div style={{ padding: '14px', borderRadius: '12px', background: s.surface, border: `1px solid ${s.border}`, marginBottom: '12px' }}>
            <div style={{ fontFamily: s.mono, fontSize: '10px', color: 'var(--text-tertiary)', marginBottom: '4px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Risk Score</div>
            <div style={{ fontFamily: s.serif, fontSize: '32px', fontWeight: '400', color: getRiskColor(riskScore) }}>{riskScore}/100</div>
            <div style={{ width: '100%', height: '4px', background: s.surface, borderRadius: '4px', marginTop: '8px', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: '4px', background: getRiskColor(riskScore), width: `${riskScore}%`, transition: 'width 1s' }} />
            </div>
          </div>
          {SECTION_LABELS.map(sec => {
            const Icon = sec.icon;
            const isActive = activeSection === sec.id;
            return (
              <button key={sec.id} onClick={() => { setActiveSection(sec.id); document.getElementById(sec.id)?.scrollIntoView({ behavior: 'smooth' }); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px',
                  borderRadius: '8px', border: isActive ? `1px solid ${s.border}` : '1px solid transparent',
                  background: isActive ? s.surface : 'transparent',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontFamily: s.font, fontSize: '12px', fontWeight: isActive ? '500' : '400',
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', marginBottom: '2px',
                }}>
                <Icon size={13} /> {sec.label}
                {isActive && <ChevronRight size={12} style={{ marginLeft: 'auto', opacity: 0.5 }} />}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div ref={reportRef} id="report-content" style={{ display: 'flex', flexDirection: 'column', gap: '40px', paddingBottom: '80px' }}>
          <section id="summary">{sectionTitle(FileText, 'Executive Summary')}
            <div style={{ padding: '20px', borderRadius: '12px', background: s.surface, border: `1px solid ${s.border}`,
              fontFamily: 'Georgia, serif', fontSize: '15px', fontStyle: 'italic', lineHeight: '1.7', color: 'var(--text-secondary)' }}>
              "{report.executive_summary}"
            </div>
          </section>

          <section id="findings">{sectionTitle(Target, 'Key Findings')}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {report.key_findings.map((f, i) => (
                <div key={i} style={{ display: 'flex', gap: '12px', padding: '14px 16px', borderRadius: '10px',
                  background: s.surface, border: `1px solid ${s.border}` }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: s.surface,
                    border: `1px solid ${s.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: s.mono, fontSize: '11px', fontWeight: '500', color: 'var(--text-secondary)', flexShrink: 0 }}>{i+1}</div>
                  <p style={{ fontFamily: s.font, fontSize: '13px', fontWeight: '300', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>{f}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="categories">{sectionTitle(Shield, 'Category Breakdown')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {Object.entries(report.category_analysis).map(([name, data]) => (
                <div key={name} style={{ borderRadius: '12px', overflow: 'hidden', background: s.surfaceCard, border: `1px solid ${s.border}` }}>
                  <div style={{ padding: '12px 20px', borderBottom: `1px solid ${s.border}`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: s.surface }}>
                    <h3 style={{ fontFamily: s.font, fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>{name}</h3>
                    <span style={{ fontFamily: s.mono, fontSize: '9px', color: 'var(--text-tertiary)', padding: '2px 8px',
                      borderRadius: '4px', background: s.surface, border: `1px solid ${s.border}`, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Risk Category</span>
                  </div>
                  <div style={{ padding: '16px 20px' }}>
                    <p style={{ fontFamily: s.font, fontSize: '13px', fontWeight: '300', color: 'var(--text-secondary)', lineHeight: '1.6', margin: '0 0 12px' }}>{data.assessment}</p>
                    <div style={{ display: 'flex', gap: '10px', padding: '12px 14px', borderRadius: '8px',
                      background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.1)' }}>
                      <Zap size={14} style={{ color: '#f59e0b', flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <div style={{ fontFamily: s.mono, fontSize: '9px', color: '#f59e0b', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '3px' }}>Recommendation</div>
                        <p style={{ fontFamily: s.font, fontSize: '12px', fontWeight: '300', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>{data.recommendation}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section id="clauses">{sectionTitle(AlertOctagon, 'Critical Clauses', '#ef4444')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {report.critical_clauses.map((cl) => (
                <div key={cl.rank} style={{ position: 'relative', padding: '20px 24px 20px 28px', borderRadius: '12px',
                  background: s.surfaceCard, border: `1px solid ${s.border}`, borderLeft: '3px solid #ef4444' }}>
                  <div style={{ position: 'absolute', top: '-8px', left: '-8px', width: '28px', height: '28px',
                    borderRadius: '8px', background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: s.mono, fontSize: '11px', fontWeight: '600', color: '#fff' }}>{cl.rank}</div>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', alignItems: 'center' }}>
                    <span style={{ fontFamily: s.mono, fontSize: '9px', color: '#ef4444', padding: '2px 8px', borderRadius: '4px',
                      background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>High Severity</span>
                    <span style={{ fontFamily: s.mono, fontSize: '10px', color: 'var(--text-tertiary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{cl.category}</span>
                  </div>
                  <div style={{ padding: '14px', borderRadius: '8px', background: s.surface, border: `1px solid ${s.border}`,
                    borderLeft: '2px solid #ef4444', fontFamily: s.mono, fontSize: '12px', fontStyle: 'italic',
                    color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '14px' }}>"{cl.text}"</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <div style={{ fontFamily: s.mono, fontSize: '9px', color: 'var(--text-tertiary)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '4px' }}>Why risky</div>
                      <p style={{ fontFamily: s.font, fontSize: '12px', fontWeight: '300', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>{cl.reason}</p>
                    </div>
                    <div>
                      <div style={{ fontFamily: s.mono, fontSize: '9px', color: '#22c55e', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '4px' }}>Mitigation</div>
                      <p style={{ fontFamily: s.font, fontSize: '12px', fontWeight: '300', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>{cl.mitigation}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section id="compliance">{sectionTitle(Check, 'Compliance Status', '#22c55e')}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              {Object.entries(report.compliance_check).map(([reg, note]) => (
                <div key={reg} style={{ padding: '16px', borderRadius: '10px', background: s.surface, border: `1px solid ${s.border}` }}>
                  <h3 style={{ fontFamily: s.mono, fontSize: '10px', color: 'var(--text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 8px' }}>{reg}</h3>
                  <p style={{ fontFamily: s.font, fontSize: '12px', fontWeight: '400', color: 'var(--text-primary)', margin: 0, lineHeight: '1.5' }}>{note}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="action">{sectionTitle(Zap, 'Action Plan')}
            <div style={{ padding: '24px', borderRadius: '14px', background: s.surface, border: `1px solid ${s.border}` }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
                {[
                  { title: 'Immediate', color: '#ef4444', items: report.action_plan.immediate },
                  { title: 'Negotiate', color: '#f59e0b', items: report.action_plan.negotiate },
                ].map(col => (
                  <div key={col.title}>
                    <div style={{ fontFamily: s.mono, fontSize: '9px', color: col.color, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>{col.title}</div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {col.items.map((it, i) => (
                        <li key={i} style={{ fontFamily: s.font, fontSize: '12px', fontWeight: '300', color: 'var(--text-secondary)', display: 'flex', gap: '6px', lineHeight: '1.5' }}>
                          <span style={{ color: col.color }}>•</span> {it}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                <div>
                  <div style={{ fontFamily: s.mono, fontSize: '9px', color: '#22c55e', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Final Verdict</div>
                  <div style={{ padding: '12px 14px', borderRadius: '8px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.12)' }}>
                    <p style={{ fontFamily: s.font, fontSize: '13px', fontWeight: '500', color: '#22c55e', margin: 0 }}>{report.action_plan.final_verdict}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
