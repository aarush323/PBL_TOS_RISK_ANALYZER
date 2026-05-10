import React from 'react';
import {
  FileText, Printer, Copy, Check, AlertTriangle,
  Shield, Scale, Zap, BrainCircuit, Activity,
  ChevronDown, ChevronRight, Download, Clock, Hash,
  Target, ShieldCheck, BookOpen, List, AlertOctagon
} from 'lucide-react';
import EmptyState from './EmptyState.jsx';
import { useTheme } from './ThemeProvider.jsx';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');

const CATEGORY_COLORS = {
  'Privacy Risk': { bg: 'bg-purple-500', text: 'text-purple-500', border: 'border-purple-500/30', light: 'text-purple-700' },
  'Legal Risk': { bg: 'bg-red-500', text: 'text-red-500', border: 'border-red-500/30', light: 'text-red-700' },
  'Financial Risk': { bg: 'bg-green-500', text: 'text-green-500', border: 'border-green-500/30', light: 'text-green-700' },
  'Security Risk': { bg: 'bg-blue-500', text: 'text-blue-500', border: 'border-blue-500/30', light: 'text-blue-700' },
  'User Rights Risk': { bg: 'bg-amber-500', text: 'text-amber-500', border: 'border-amber-500/30', light: 'text-amber-700' },
  'General': { bg: 'bg-slate-500', text: 'text-slate-500', border: 'border-slate-500/30', light: 'text-slate-700' }
};

const SECTION_LABELS = [
  { id: 'executive-dashboard', label: 'Executive Dashboard', icon: Activity },
  { id: 'executive-summary', label: 'Executive Summary', icon: BookOpen },
  { id: 'key-findings', label: 'Key Findings', icon: Target },
  { id: 'category-deep-dive', label: 'Category Deep Dive', icon: Shield },
  { id: 'compliance', label: 'Compliance Assessment', icon: Check },
  { id: 'critical-clauses', label: 'Critical Clauses', icon: AlertOctagon },
  { id: 'risk-distribution', label: 'Risk Distribution', icon: Activity },
  { id: 'action-plan', label: 'Action Plan', icon: Zap },
  { id: 'transparency', label: 'Transparency', icon: BrainCircuit },
  { id: 'appendix', label: 'Appendix', icon: List },
];

export default function ReportsPage({ analysisResult, sourceInfo, calculateScore, onNewAnalysis, analysisJobId, token }) {
  const { theme } = useTheme();
  const [copied, setCopied] = React.useState(false);
  const [report, setReport] = React.useState(null);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [activeSection, setActiveSection] = React.useState(null);
  const [expandedSections, setExpandedSections] = React.useState({});

  const textClass = theme === 'light' ? 'text-gray-900' : 'text-white';
  const subTextClass = theme === 'light' ? 'text-gray-500' : 'text-white/60';
  const mutedTextClass = theme === 'light' ? 'text-gray-400' : 'text-white/40';

  // Auto-load cached report on mount
  React.useEffect(() => {
    if (analysisJobId && !report && !isGenerating) {
      const activeToken = token || localStorage.getItem('tos_token');
      fetch(`${API}/report/${analysisJobId}`, {
        headers: { 'Authorization': `Bearer ${activeToken}` }
      })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.status === 'complete' && data.report) {
            setReport(data.report);
            const initExpanded = {};
            SECTION_LABELS.forEach(s => { initExpanded[s.id] = true; });
            setExpandedSections(initExpanded);
          }
        })
        .catch(() => { }); // 404 is fine, just means no cached report
    }
  }, [analysisJobId]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    if (report?.report_metadata?.generated_at) {
      const sections = document.querySelectorAll('[data-section-id]');
      const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.getAttribute('data-section-id'));
          }
        }
      }, { rootMargin: '-80px 0px -80% 0px' });
      sections.forEach(s => observer.observe(s));
      return () => observer.disconnect();
    }
  }, [report]);

  const generateReport = async () => {
    if (!analysisResult) return;
    setIsGenerating(true);
    try {
      const activeToken = token || localStorage.getItem('tos_token');
      const jobId = analysisJobId || '';
      if (!jobId) {
        const fallback = buildFallbackReport();
        setReport(fallback);
        setIsGenerating(false);
        return;
      }
      const res = await fetch(`${API}/report/generate/${jobId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${activeToken}` }
      });
      const data = await res.json();
      if (data.status === 'complete' && data.report) {
        setReport(data.report);
        const initExpanded = {};
        SECTION_LABELS.forEach(s => { initExpanded[s.id] = true; });
        setExpandedSections(initExpanded);
      } else {
        const fallback = buildFallbackReport();
        setReport(fallback);
      }
    } catch {
      const fallback = buildFallbackReport();
      setReport(fallback);
    } finally {
      setIsGenerating(false);
    }
  };

  const buildFallbackReport = () => {
    const riskyClauses = (analysisResult?.clauses || []).filter(c => c.is_risky)
      .sort((a, b) => (b.severity_score || 0) - (a.severity_score || 0));

    // Dynamically build category deep dives from actual clause data
    const categoryMap = {};
    riskyClauses.forEach((clause, idx) => {
      const cats = clause.risk_categories || ['General'];
      cats.forEach(cat => {
        if (!categoryMap[cat]) categoryMap[cat] = { clauses: [], totalSeverity: 0 };
        categoryMap[cat].clauses.push({ ...clause, originalIndex: idx });
        categoryMap[cat].totalSeverity += (clause.severity_score || 0);
      });
    });

    const category_deep_dives = {};
    Object.entries(categoryMap).forEach(([cat, data]) => {
      const count = data.clauses.length;
      const avgSev = count > 0 ? (data.totalSeverity / count).toFixed(1) : 0;
      const topClauses = data.clauses.sort((a, b) => (b.severity_score || 0) - (a.severity_score || 0)).slice(0, 3);

      // Dynamic assessment based on actual data
      const sevLevel = avgSev >= 7 ? 'critically high' : avgSev >= 5 ? 'elevated' : avgSev >= 3 ? 'moderate' : 'low';
      const assessment = `${count} clause${count > 1 ? 's' : ''} flagged under ${cat} with an average severity of ${avgSev}/10 (${sevLevel} risk). ` +
        (count > 5 ? `This represents a significant concentration of ${cat.toLowerCase()} issues that demands immediate legal review.` :
          count > 2 ? `Multiple ${cat.toLowerCase()} concerns identified that should be reviewed before signing.` :
            `Limited ${cat.toLowerCase()} concerns found, but individual clause severity warrants attention.`);

      // Real specific concerns from actual clause text
      const specific_concerns = topClauses.map(c => {
        const snippet = (c.text || '').slice(0, 150);
        const explanation = c.explanation || 'No explanation available';
        return `Clause #${(c.id || c.originalIndex) + 1} (Severity ${(c.severity_score || 0).toFixed(1)}): ${explanation.slice(0, 200)}`;
      });

      // Dynamic recommendation based on severity
      let recommendation;
      if (avgSev >= 7) recommendation = `Strongly recommend legal counsel review all ${count} ${cat} clauses before proceeding. Consider requesting amendments to the highest-severity terms.`;
      else if (avgSev >= 4) recommendation = `Review ${cat} clauses with legal advisor. Negotiate modifications to clauses with severity above 5.0.`;
      else recommendation = `${cat} risk is within acceptable range. Monitor for changes in future revisions.`;

      category_deep_dives[cat] = { assessment, specific_concerns, recommendation, clause_count: count, avg_severity: parseFloat(avgSev) };
    });

    // Generate executive summary from data if not available
    const totalFlagged = analysisResult?.risky_clause_count || 0;
    const totalClauses = analysisResult?.total_clauses || 0;
    const riskLevel = analysisResult?.overall_risk || 'Low';
    const topCategories = Object.entries(categoryMap).sort((a, b) => b[1].clauses.length - a[1].clauses.length).slice(0, 3).map(([cat]) => cat);
    const generatedSummary = analysisResult?.executive_summary ||
      `Analysis of ${totalClauses} clauses identified ${totalFlagged} flagged provisions across ${Object.keys(categoryMap).length} risk categories. ` +
      `The overall risk assessment is **${riskLevel}**. ` +
      (topCategories.length > 0 ? `Primary risk concentrations are in ${topCategories.join(', ')}. ` : '') +
      (riskLevel === 'High' ? 'Immediate legal review is strongly recommended before signing this agreement.' :
        riskLevel === 'Medium' ? 'Legal review is recommended for flagged clauses before proceeding.' :
          'The document presents manageable risk levels, though flagged clauses should still be reviewed.');

    return {
      report_metadata: {
        report_id: `R${Date.now().toString(36)}`,
        generated_at: new Date().toISOString(),
        document_source: sourceInfo?.value || 'Unknown',
        analysis_engine: 'Jurist AI v2.0',
      },
      executive_dashboard: {
        safety_score: analysisResult?.total_severity_score || 0,
        overall_risk_level: riskLevel,
        total_clauses_analyzed: totalClauses,
        total_flagged: totalFlagged,
        ai_deep_scan_coverage: `${Math.round(((totalClauses - (analysisResult?.skipped_llm_count || 0)) / Math.max(1, totalClauses)) * 100)}%`,
        quick_verdict: analysisResult?.professional_summary || '',
      },
      executive_summary: generatedSummary,
      key_findings: analysisResult?.key_findings || [],
      category_deep_dives,
      compliance_assessment: {
        gdpr: { data_collection_transparency: '⚠️', right_to_deletion: '⚠️', data_portability: '⚠️', consent_mechanisms: '⚠️', notes: 'Automated assessment — manual review recommended' },
        ccpa: { right_to_know: '⚠️', right_to_opt_out: '⚠️', non_discrimination: '✅', notes: 'Automated assessment — manual review recommended' },
        best_practices: { plain_language: '⚠️', change_notification: '⚠️', dispute_resolution_clarity: '⚠️', notes: 'Standard review recommended' },
      },
      critical_clauses: riskyClauses.slice(0, 10).map((c, i) => {
        const cat = (c.risk_categories || ['General'])[0];
        const sev = c.severity_score || 0;
        return {
          rank: i + 1, severity_score: sev,
          category: cat,
          text: c.text || '', explanation: c.explanation || '',
          why_it_matters: sev >= 8
            ? 'This clause poses a significant legal or financial risk that could result in loss of user rights or unexpected obligations.'
            : sev >= 5
              ? 'This clause contains terms that may limit your rights or impose unexpected conditions.'
              : 'This clause has minor risk indicators worth noting for comprehensive review.',
          negotiation_suggestion: sev >= 8
            ? `Request removal or substantial amendment of this ${cat.replace(' Risk', '').toLowerCase()} clause. Consider it a deal-breaker if unchanged.`
            : sev >= 5
              ? `Negotiate to limit the scope of this clause or add protective exceptions for the user.`
              : `Acceptable risk — monitor for future changes in this ${cat.replace(' Risk', '').toLowerCase()} provision.`,
        };
      }),
      risk_distribution_analysis: {
        severity_distribution: analysisResult?.aggregated_signals?.severity_distribution || {},
        risk_concentration: analysisResult?.aggregated_signals?.risk_concentration || {},
        confidence_distribution: analysisResult?.aggregated_signals?.confidence_distribution || {},
        category_cross_correlation: analysisResult?.aggregated_signals?.category_cross_correlation || {},
      },
      action_plan: {
        immediate_actions: riskLevel === 'High'
          ? [`Review all ${totalFlagged} flagged clauses with legal counsel`, 'Do not sign until high-severity clauses are amended', ...topCategories.slice(0, 2).map(c => `Prioritize ${c} clauses for negotiation`)]
          : riskLevel === 'Medium'
            ? ['Review clauses with severity > 5.0 with legal counsel', ...topCategories.slice(0, 1).map(c => `Focus on ${c} provisions`)]
            : ['No immediate critical actions required'],
        negotiate_before_signing: riskyClauses.filter(c => (c.severity_score || 0) >= 5).length > 0
          ? [`${riskyClauses.filter(c => (c.severity_score || 0) >= 5).length} clauses with severity ≥ 5.0 should be negotiated`, 'Request written amendments for high-severity provisions', 'Consider adding protective addendum clauses']
          : ['No high-severity clauses requiring negotiation'],
        monitor_and_accept: [`${riskyClauses.filter(c => (c.severity_score || 0) < 5).length} low-severity clauses can be accepted with awareness`, 'Set calendar reminders for ToS revision dates', 'Re-analyze if the provider updates their terms'],
        overall_recommendation: riskLevel === 'High' ? 'Do Not Sign Without Amendment' : riskLevel === 'Medium' ? 'Negotiate Key Clauses' : 'Acceptable — Sign with Awareness',
      },
      analysis_transparency: {
        total_clauses: totalClauses,
        nlp_pre_filtered: analysisResult?.skipped_llm_count || 0,
        llm_deep_scanned: totalClauses - (analysisResult?.skipped_llm_count || 0),
        high_confidence_flags: analysisResult?.aggregated_signals?.confidence_distribution?.High || 0,
        medium_confidence_flags: analysisResult?.aggregated_signals?.confidence_distribution?.Medium || 0,
        low_confidence_flags: analysisResult?.aggregated_signals?.confidence_distribution?.Low || 0,
      },
      appendix_all_flagged: riskyClauses.map(c => ({
        id: c.id, text: c.text || '', categories: c.risk_categories || [],
        severity_score: c.severity_score || 0, confidence: c.confidence || 'Low', explanation: c.explanation || '',
      })),
    };
  };

  if (!analysisResult) {
    return <EmptyState view="reports" onNewAnalysis={onNewAnalysis} />;
  }

  const handlePrint = () => window.print();
  const handleCopy = () => {
    let text = `JURIST AI — COMPREHENSIVE LEGAL RISK ASSESSMENT\n`;
    text += `Report ID: ${report?.report_metadata?.report_id || 'N/A'}\n`;
    text += `Generated: ${new Date(report?.report_metadata?.generated_at || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}\n`;
    text += `Document: ${report?.report_metadata?.document_source || sourceInfo?.value || 'Unknown'}\n`;
    text += `Risk Level: ${report?.executive_dashboard?.overall_risk_level || analysisResult?.overall_risk || 'Low'}\n\n`;

    if (report?.executive_summary || analysisResult?.executive_summary) {
      text += `EXECUTIVE SUMMARY:\n${report?.executive_summary || analysisResult?.executive_summary}\n\n`;
    }
    if (report?.key_findings?.length) {
      text += `KEY FINDINGS:\n`;
      report.key_findings.forEach(f => { text += `- [${f.severity?.toUpperCase()}] ${f.category}: ${f.finding}\n`; });
      text += '\n';
    }
    if (report?.critical_clauses?.length) {
      text += `TOP CRITICAL CLAUSES:\n`;
      report.critical_clauses.forEach((c, i) => {
        text += `[${c.rank}] SEV: ${c.severity_score} | ${c.category}\n`;
        text += `  ${c.explanation}\n`;
        text += `  Negotiation: ${c.negotiation_suggestion}\n\n`;
      });
    }

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleSection = (id) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const scrollToSection = (id) => {
    const el = document.querySelector(`[data-section-id="${id}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const complianceIcon = (status) => {
    if (status === '✅') return <span className="text-green-500 text-lg">✅</span>;
    if (status === '⚠️') return <span className="text-amber-500 text-lg">⚠️</span>;
    return <span className="text-red-500 text-lg">❌</span>;
  };

  return (
    <div className="space-y-6 print:m-0 print:p-0">
      <div className="flex items-center justify-between print:hidden">
        <h1 className={`text-2xl font-bold ${textClass}`}>Comprehensive Report</h1>
        <div className="flex gap-3">
          <button
            onClick={handleCopy}
            disabled={!report}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${theme === 'light' ? 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50' : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'} disabled:opacity-50`}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copied' : 'Copy Report'}
          </button>
          <button
            onClick={handlePrint}
            disabled={!report}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#007AFF] to-[#0056cc] text-white font-semibold disabled:opacity-50"
          >
            <Printer size={16} />
            Download PDF
          </button>
        </div>
      </div>

      {!report && !isGenerating && (
        <div className={`glass-card p-12 text-center ${theme === 'light' ? 'bg-white' : ''}`}>
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#007AFF]/20 to-purple-500/20 flex items-center justify-center mx-auto mb-6">
            <FileText size={32} className="text-[#007AFF]" />
          </div>
          <h2 className={`text-xl font-bold mb-3 ${textClass}`}>Generate Comprehensive Report</h2>
          <p className={`${subTextClass} max-w-lg mx-auto mb-8`}>
            Generate a professional multi-section legal risk assessment report with compliance analysis, category deep dives, action plan, and full clause appendix.
          </p>
          <button
            onClick={generateReport}
            className="px-8 py-4 rounded-xl bg-gradient-to-r from-[#007AFF] to-[#0056cc] text-white font-bold text-sm hover:shadow-lg hover:shadow-[#007AFF]/30 transition-all"
          >
            <Zap size={18} className="inline mr-2" />
            Generate Comprehensive Report
          </button>
        </div>
      )}

      {isGenerating && (
        <div className={`glass-card p-12 text-center ${theme === 'light' ? 'bg-white' : ''}`}>
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-6">
            <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          </div>
          <h2 className={`text-xl font-bold mb-3 ${textClass}`}>Generating Report...</h2>
          <p className={`${subTextClass} max-w-lg mx-auto`}>
            Analyzing signals, generating category deep dives, compliance checks, and action plan. This may take a moment.
          </p>
        </div>
      )}

      {report && (
        <div className="flex gap-6 print:block">
          <div className="w-56 shrink-0 hidden lg:block print:hidden">
            <div className="sticky top-6 space-y-1">
              <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${mutedTextClass}`}>Sections</p>
              {SECTION_LABELS.map(s => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.id}
                    onClick={() => scrollToSection(s.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left ${activeSection === s.id
                      ? (theme === 'light' ? 'bg-blue-50 text-blue-700' : 'bg-[#007AFF]/10 text-[#007AFF]')
                      : (theme === 'light' ? 'text-gray-500 hover:bg-gray-50' : 'text-white/50 hover:bg-white/5')
                      }`}
                  >
                    <Icon size={14} />
                    <span className="truncate">{s.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 min-w-0" id="report-document">
            <div className={`glass-card p-10 print:bg-white print:text-black print:border-none print:shadow-none print:p-8 ${theme === 'light' ? 'bg-white border-gray-100' : ''}`}>

              {/* Report Header */}
              <div className={`flex items-start justify-between border-b-2 ${theme === 'light' ? 'border-gray-100' : 'border-white/5'} pb-6 mb-8`}>
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${theme === 'light' ? 'bg-blue-50' : 'bg-[#007AFF]/10'}`}>
                    <Scale size={32} className="text-[#007AFF]" />
                  </div>
                  <div>
                    <h2 className={`text-2xl font-extrabold tracking-tight ${textClass}`}>Comprehensive Legal Risk Assessment</h2>
                    <p className={`${mutedTextClass} font-bold uppercase text-[10px] tracking-widest mt-1`}>
                      {new Date(report.report_metadata.generated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`${mutedTextClass} text-[10px] font-bold uppercase tracking-widest mb-1`}>Report ID</p>
                  <p className={`text-xs font-mono font-bold ${textClass}`}>{report.report_metadata.report_id}</p>
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full mt-2 text-xs font-black uppercase tracking-wider ${report.executive_dashboard.overall_risk_level === 'High' ? 'bg-red-500/10 text-red-500' :
                      report.executive_dashboard.overall_risk_level === 'Medium' ? 'bg-amber-500/10 text-amber-500' :
                        'bg-green-500/10 text-green-500'
                    }`}>
                    <AlertTriangle size={12} />
                    <span>{report.executive_dashboard.overall_risk_level}</span>
                  </div>
                </div>
              </div>

              {/* Section 1: Executive Dashboard */}
              <div data-section-id="executive-dashboard" className="mb-12 scroll-mt-20">
                <div className="flex items-center gap-3 mb-6 cursor-pointer" onClick={() => toggleSection('executive-dashboard')}>
                  <div className="w-8 h-8 rounded-lg bg-[#007AFF]/20 flex items-center justify-center">
                    <Activity size={16} className="text-[#007AFF]" />
                  </div>
                  <h3 className={`text-lg font-black uppercase tracking-wider ${textClass}`}>§1 Executive Dashboard</h3>
                  {expandedSections['executive-dashboard'] ? <ChevronDown size={16} className={subTextClass} /> : <ChevronRight size={16} className={subTextClass} />}
                </div>
                {expandedSections['executive-dashboard'] !== false && (
                  <>
                    <div className="grid grid-cols-4 gap-4 mb-6">
                      <div className={`p-4 rounded-xl ${theme === 'light' ? 'bg-gray-50 border-gray-100' : 'bg-white/5 border border-white/10'}`}>
                        <p className={`${mutedTextClass} text-[10px] font-bold uppercase tracking-widest`}>Safety Score</p>
                        <p className={`text-2xl font-black mt-1 ${textClass}`}>{report.executive_dashboard.safety_score}/100</p>
                      </div>
                      <div className={`p-4 rounded-xl ${theme === 'light' ? 'bg-gray-50 border-gray-100' : 'bg-white/5 border border-white/10'}`}>
                        <p className={`${mutedTextClass} text-[10px] font-bold uppercase tracking-widest`}>Total Clauses</p>
                        <p className={`text-2xl font-black mt-1 ${textClass}`}>{report.executive_dashboard.total_clauses_analyzed}</p>
                      </div>
                      <div className={`p-4 rounded-xl ${theme === 'light' ? 'bg-gray-50 border-gray-100' : 'bg-white/5 border border-white/10'}`}>
                        <p className={`${mutedTextClass} text-[10px] font-bold uppercase tracking-widest`}>Flagged</p>
                        <p className={`text-2xl font-black mt-1 text-red-500`}>{report.executive_dashboard.total_flagged}</p>
                      </div>
                      <div className={`p-4 rounded-xl ${theme === 'light' ? 'bg-gray-50 border-gray-100' : 'bg-white/5 border border-white/10'}`}>
                        <p className={`${mutedTextClass} text-[10px] font-bold uppercase tracking-widest`}>AI Deep Scan</p>
                        <p className={`text-2xl font-black mt-1 text-emerald-500`}>{report.executive_dashboard.ai_deep_scan_coverage}</p>
                      </div>
                    </div>
                    {report.executive_dashboard.quick_verdict && (
                      <div className={`p-5 rounded-xl border-l-4 border-[#007AFF] ${theme === 'light' ? 'bg-blue-50 border-blue-200' : 'bg-blue-500/10 border-blue-500/30'}`}>
                        <p className={`text-sm font-medium leading-relaxed italic ${theme === 'light' ? 'text-blue-900' : 'text-blue-200'}`}>
                          {report.executive_dashboard.quick_verdict}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Section 2: Executive Summary */}
              <div data-section-id="executive-summary" className="mb-12 scroll-mt-20">
                <div className="flex items-center gap-3 mb-6 cursor-pointer" onClick={() => toggleSection('executive-summary')}>
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                    <BookOpen size={16} className="text-indigo-500" />
                  </div>
                  <h3 className={`text-lg font-black uppercase tracking-wider ${textClass}`}>§2 Executive Summary</h3>
                  {expandedSections['executive-summary'] ? <ChevronDown size={16} className={subTextClass} /> : <ChevronRight size={16} className={subTextClass} />}
                </div>
                {expandedSections['executive-summary'] !== false && (
                  <p className={`text-base leading-relaxed ${theme === 'light' ? 'text-gray-700' : 'text-white/80'}`}>
                    {report.executive_summary || analysisResult?.executive_summary || 'No executive summary available.'}
                  </p>
                )}
              </div>

              {/* Section 3: Key Findings */}
              <div data-section-id="key-findings" className="mb-12 scroll-mt-20">
                <div className="flex items-center gap-3 mb-6 cursor-pointer" onClick={() => toggleSection('key-findings')}>
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <Target size={16} className="text-amber-500" />
                  </div>
                  <h3 className={`text-lg font-black uppercase tracking-wider ${textClass}`}>§3 Key Findings</h3>
                  {expandedSections['key-findings'] ? <ChevronDown size={16} className={subTextClass} /> : <ChevronRight size={16} className={subTextClass} />}
                </div>
                {expandedSections['key-findings'] !== false && (
                  <div className="space-y-3">
                    {(report.key_findings || analysisResult?.key_findings || []).length > 0 ? (
                      (report.key_findings || analysisResult?.key_findings || []).map((f, i) => {
                        const sevColor = f.severity === 'critical' ? 'border-red-500 bg-red-500/10' :
                          f.severity === 'high' ? 'border-orange-500 bg-orange-500/10' :
                            f.severity === 'medium' ? 'border-amber-500 bg-amber-500/10' :
                              'border-green-500 bg-green-500/10';
                        const sevLabel = f.severity === 'critical' ? 'CRITICAL' :
                          f.severity === 'high' ? 'HIGH' :
                            f.severity === 'medium' ? 'MEDIUM' : 'LOW';
                        return (
                          <div key={i} className={`flex items-start gap-4 p-4 rounded-xl border-l-4 ${sevColor} ${theme === 'light' ? 'bg-opacity-50' : ''}`}>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-xs font-black uppercase tracking-widest ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>{f.category}</span>
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${f.severity === 'critical' ? 'bg-red-500/20 text-red-500' :
                                    f.severity === 'high' ? 'bg-orange-500/20 text-orange-500' :
                                      f.severity === 'medium' ? 'bg-amber-500/20 text-amber-500' :
                                        'bg-green-500/20 text-green-500'
                                  }`}>{sevLabel}</span>
                              </div>
                              <p className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-white/60'}`}>{f.finding}</p>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className={`${subTextClass} text-sm`}>No key findings available.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Section 4: Category Deep Dive */}
              <div data-section-id="category-deep-dive" className="mb-12 scroll-mt-20">
                <div className="flex items-center gap-3 mb-6 cursor-pointer" onClick={() => toggleSection('category-deep-dive')}>
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <Shield size={16} className="text-purple-500" />
                  </div>
                  <h3 className={`text-lg font-black uppercase tracking-wider ${textClass}`}>§4 Risk Category Deep Dive</h3>
                  {expandedSections['category-deep-dive'] ? <ChevronDown size={16} className={subTextClass} /> : <ChevronRight size={16} className={subTextClass} />}
                </div>
                {expandedSections['category-deep-dive'] !== false && (
                  <div className="space-y-6">
                    {Object.keys(report.category_deep_dives || {}).length > 0 ? (
                      Object.entries(report.category_deep_dives).map(([cat, data]) => {
                        const styles = CATEGORY_COLORS[cat] || CATEGORY_COLORS.General;
                        return (
                          <div key={cat} className={`p-6 rounded-2xl border-l-4 ${styles.border} ${theme === 'light' ? 'bg-gray-50 border-gray-200' : 'bg-white/5'}`}>
                            <h4 className={`text-sm font-black uppercase tracking-widest mb-3 ${styles.text}`}>{cat}</h4>
                            <p className={`text-sm leading-relaxed mb-4 ${theme === 'light' ? 'text-gray-700' : 'text-white/70'}`}>{data.assessment}</p>
                            {data.specific_concerns?.length > 0 && (
                              <div className="mb-4">
                                <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${mutedTextClass}`}>Specific Concerns</p>
                                <ul className="space-y-1">
                                  {data.specific_concerns.map((c, i) => (
                                    <li key={i} className={`text-sm flex items-start gap-2 ${theme === 'light' ? 'text-gray-600' : 'text-white/60'}`}>
                                      <span className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                      {c}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {data.recommendation && (
                              <div className={`p-3 rounded-lg border ${theme === 'light' ? 'bg-green-50 border-green-100' : 'bg-green-500/10 border-green-500/20'}`}>
                                <p className={`text-xs font-bold ${theme === 'light' ? 'text-green-800' : 'text-green-300'}`}>Recommendation: {data.recommendation}</p>
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <p className={`${subTextClass} text-sm`}>No category deep dives available. Run the analysis to generate them.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Section 5: Compliance Assessment */}
              <div data-section-id="compliance" className="mb-12 scroll-mt-20">
                <div className="flex items-center gap-3 mb-6 cursor-pointer" onClick={() => toggleSection('compliance')}>
                  <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <Check size={16} className="text-green-500" />
                  </div>
                  <h3 className={`text-lg font-black uppercase tracking-wider ${textClass}`}>§5 Compliance Assessment</h3>
                  {expandedSections['compliance'] ? <ChevronDown size={16} className={subTextClass} /> : <ChevronRight size={16} className={subTextClass} />}
                </div>
                {expandedSections['compliance'] !== false && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {['gdpr', 'ccpa', 'best_practices'].map(reg => {
                      const data = report.compliance_assessment?.[reg] || {};
                      const title = reg === 'gdpr' ? 'GDPR' : reg === 'ccpa' ? 'CCPA' : 'Best Practices';
                      return (
                        <div key={reg} className={`p-6 rounded-2xl border ${theme === 'light' ? 'bg-gray-50 border-gray-100' : 'bg-white/5 border-white/10'}`}>
                          <h4 className={`text-xs font-black uppercase tracking-widest mb-4 ${textClass}`}>{title}</h4>
                          <div className="space-y-3">
                            {Object.entries(data).filter(([k]) => k !== 'notes').map(([key, val]) => (
                              <div key={key} className="flex items-center justify-between">
                                <span className={`text-xs font-medium capitalize ${subTextClass}`}>{key.replace(/_/g, ' ')}</span>
                                {complianceIcon(val)}
                              </div>
                            ))}
                          </div>
                          {data.notes && (
                            <p className={`text-[10px] mt-4 pt-3 border-t ${theme === 'light' ? 'border-gray-200 text-gray-500' : 'border-white/10 text-white/40'}`}>
                              {data.notes}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Section 6: Critical Clauses */}
              <div data-section-id="critical-clauses" className="mb-12 scroll-mt-20">
                <div className="flex items-center gap-3 mb-6 cursor-pointer" onClick={() => toggleSection('critical-clauses')}>
                  <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                    <AlertOctagon size={16} className="text-red-500" />
                  </div>
                  <h3 className={`text-lg font-black uppercase tracking-wider ${textClass}`}>§6 Critical Clauses Report</h3>
                  {expandedSections['critical-clauses'] ? <ChevronDown size={16} className={subTextClass} /> : <ChevronRight size={16} className={subTextClass} />}
                </div>
                {expandedSections['critical-clauses'] !== false && (
                  <div className="space-y-6">
                    {(report.critical_clauses || []).length > 0 ? (
                      report.critical_clauses.map((clause, i) => {
                        const styles = CATEGORY_COLORS[clause.category] || CATEGORY_COLORS.General;
                        return (
                          <div key={i} className={`p-6 rounded-2xl border ${theme === 'light' ? 'bg-white border-gray-100' : 'bg-black/20 border-white/5'}`}>
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <span className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-black ${theme === 'light' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>{clause.rank}</span>
                                <span className={`text-xs font-black uppercase tracking-widest ${styles.text}`}>{clause.category}</span>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest ${clause.severity_score >= 8 ? 'bg-red-500 text-white' :
                                  clause.severity_score >= 5 ? 'bg-amber-500 text-white' :
                                    'bg-[#007AFF] text-white'
                                }`}>
                                SEV: {clause.severity_score?.toFixed(1)}
                              </span>
                            </div>
                            <p className={`text-xs leading-relaxed italic mb-4 line-clamp-3 font-serif border-l-4 pl-4 ${theme === 'light' ? 'text-gray-500 border-gray-200' : 'text-white/40 border-white/10'}`}>
                              "{clause.text}"
                            </p>
                            <div className={`p-4 rounded-xl text-sm leading-relaxed ${theme === 'light' ? 'bg-gray-50 text-gray-700' : 'bg-white/5 text-white/70'}`}>
                              <p className="mb-3"><span className="font-black">Risk: </span>{clause.explanation}</p>
                              <p className="mb-3"><span className="font-black">Why it matters: </span>{clause.why_it_matters}</p>
                              <p className={`p-3 rounded-lg border ${theme === 'light' ? 'bg-amber-50 border-amber-100 text-amber-800' : 'bg-amber-500/10 border-amber-500/20 text-amber-200'}`}>
                                <span className="font-black">Negotiation: </span>{clause.negotiation_suggestion}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className={`${subTextClass} text-sm`}>No critical clauses identified.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Section 7: Risk Distribution Analysis */}
              <div data-section-id="risk-distribution" className="mb-12 scroll-mt-20">
                <div className="flex items-center gap-3 mb-6 cursor-pointer" onClick={() => toggleSection('risk-distribution')}>
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                    <Activity size={16} className="text-cyan-500" />
                  </div>
                  <h3 className={`text-lg font-black uppercase tracking-wider ${textClass}`}>§7 Risk Distribution Analysis</h3>
                  {expandedSections['risk-distribution'] ? <ChevronDown size={16} className={subTextClass} /> : <ChevronRight size={16} className={subTextClass} />}
                </div>
                {expandedSections['risk-distribution'] !== false && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className={`p-6 rounded-2xl border ${theme === 'light' ? 'bg-gray-50 border-gray-100' : 'bg-white/5 border-white/10'}`}>
                      <h4 className={`text-[10px] font-black uppercase tracking-widest mb-4 ${mutedTextClass}`}>Severity Distribution</h4>
                      {['critical', 'high', 'medium', 'low'].map(sev => {
                        const count = report.risk_distribution_analysis?.severity_distribution?.[sev] || 0;
                        const colors = { critical: 'bg-red-500', high: 'bg-orange-500', medium: 'bg-amber-500', low: 'bg-green-500' };
                        const maxCount = Math.max(...Object.values(report.risk_distribution_analysis?.severity_distribution || {}), 1);
                        return (
                          <div key={sev} className="flex items-center gap-3 mb-2">
                            <span className={`text-[10px] font-bold uppercase w-16 ${mutedTextClass}`}>{sev}</span>
                            <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${colors[sev]}`} style={{ width: `${(count / maxCount) * 100}%` }} />
                            </div>
                            <span className={`text-xs font-black ${textClass}`}>{count}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className={`p-6 rounded-2xl border ${theme === 'light' ? 'bg-gray-50 border-gray-100' : 'bg-white/5 border-white/10'}`}>
                      <h4 className={`text-[10px] font-black uppercase tracking-widest mb-4 ${mutedTextClass}`}>Risk Concentration</h4>
                      <p className={`text-sm leading-relaxed ${theme === 'light' ? 'text-gray-700' : 'text-white/70'}`}>
                        {report.risk_distribution_analysis?.risk_concentration?.verdict || 'No concentration data available.'}
                      </p>
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className={subTextClass}>Front-loaded: {report.risk_distribution_analysis?.risk_concentration?.front_loaded_pct || 0}%</span>
                          <span className={subTextClass}>Back-loaded: {report.risk_distribution_analysis?.risk_concentration?.back_loaded_pct || 0}%</span>
                        </div>
                      </div>
                      <div className="mt-4">
                        <h4 className={`text-[10px] font-black uppercase tracking-widest mb-3 ${mutedTextClass}`}>Confidence Distribution</h4>
                        {['High', 'Medium', 'Low'].map(level => {
                          const count = report.risk_distribution_analysis?.confidence_distribution?.[level] || 0;
                          return (
                            <div key={level} className="flex items-center gap-3 mb-1">
                              <span className={`text-[10px] font-bold uppercase w-14 ${mutedTextClass}`}>{level}</span>
                              <span className={`text-xs font-black ${textClass}`}>{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 8: Action Plan */}
              <div data-section-id="action-plan" className="mb-12 scroll-mt-20">
                <div className="flex items-center gap-3 mb-6 cursor-pointer" onClick={() => toggleSection('action-plan')}>
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <Zap size={16} className="text-amber-500" />
                  </div>
                  <h3 className={`text-lg font-black uppercase tracking-wider ${textClass}`}>§8 Action Plan</h3>
                  {expandedSections['action-plan'] ? <ChevronDown size={16} className={subTextClass} /> : <ChevronRight size={16} className={subTextClass} />}
                </div>
                {expandedSections['action-plan'] !== false && (
                  <div className="space-y-6">
                    <div className={`p-6 rounded-2xl border-l-4 border-red-500 ${theme === 'light' ? 'bg-red-50 border-red-200' : 'bg-red-500/10'}`}>
                      <h4 className={`text-xs font-black uppercase tracking-widest mb-3 text-red-500`}>🔴 Immediate Actions</h4>
                      <ul className="space-y-2">
                        {(report.action_plan?.immediate_actions || []).map((action, i) => (
                          <li key={i} className={`flex items-start gap-2 text-sm ${theme === 'light' ? 'text-gray-700' : 'text-white/70'}`}>
                            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className={`p-6 rounded-2xl border-l-4 border-amber-500 ${theme === 'light' ? 'bg-amber-50 border-amber-200' : 'bg-amber-500/10'}`}>
                      <h4 className={`text-xs font-black uppercase tracking-widest mb-3 text-amber-500`}>🟡 Negotiate Before Signing</h4>
                      <ul className="space-y-2">
                        {(report.action_plan?.negotiate_before_signing || []).map((action, i) => (
                          <li key={i} className={`flex items-start gap-2 text-sm ${theme === 'light' ? 'text-gray-700' : 'text-white/70'}`}>
                            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className={`p-6 rounded-2xl border-l-4 border-green-500 ${theme === 'light' ? 'bg-green-50 border-green-200' : 'bg-green-500/10'}`}>
                      <h4 className={`text-xs font-black uppercase tracking-widest mb-3 text-green-500`}>🟢 Monitor / Accept with Awareness</h4>
                      <ul className="space-y-2">
                        {(report.action_plan?.monitor_and_accept || []).map((action, i) => (
                          <li key={i} className={`flex items-start gap-2 text-sm ${theme === 'light' ? 'text-gray-700' : 'text-white/70'}`}>
                            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className={`p-6 rounded-2xl text-center border ${theme === 'light' ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/10'}`}>
                      <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${mutedTextClass}`}>Overall Recommendation</p>
                      <p className={`text-xl font-black ${report.action_plan?.overall_recommendation === 'Sign' ? 'text-green-500' : report.action_plan?.overall_recommendation === 'Negotiate' ? 'text-amber-500' : 'text-red-500'}`}>
                        {report.action_plan?.overall_recommendation || 'Review'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 9: Analysis Transparency */}
              <div data-section-id="transparency" className="mb-12 scroll-mt-20">
                <div className="flex items-center gap-3 mb-6 cursor-pointer" onClick={() => toggleSection('transparency')}>
                  <div className="w-8 h-8 rounded-lg bg-slate-500/20 flex items-center justify-center">
                    <BrainCircuit size={16} className="text-slate-400" />
                  </div>
                  <h3 className={`text-lg font-black uppercase tracking-wider ${textClass}`}>§9 Analysis Transparency</h3>
                  {expandedSections['transparency'] ? <ChevronDown size={16} className={subTextClass} /> : <ChevronRight size={16} className={subTextClass} />}
                </div>
                {expandedSections['transparency'] !== false && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className={`p-4 rounded-xl ${theme === 'light' ? 'bg-gray-50 border-gray-100' : 'bg-white/5 border border-white/10'}`}>
                      <p className={`${mutedTextClass} text-[10px] font-bold uppercase tracking-widest`}>Total Clauses</p>
                      <p className={`text-lg font-black mt-1 ${textClass}`}>{report.analysis_transparency?.total_clauses || 0}</p>
                    </div>
                    <div className={`p-4 rounded-xl ${theme === 'light' ? 'bg-gray-50 border-gray-100' : 'bg-white/5 border border-white/10'}`}>
                      <p className={`${mutedTextClass} text-[10px] font-bold uppercase tracking-widest`}>NLP Pre-Filtered</p>
                      <p className={`text-lg font-black mt-1 ${textClass}`}>{report.analysis_transparency?.nlp_pre_filtered || 0}</p>
                    </div>
                    <div className={`p-4 rounded-xl ${theme === 'light' ? 'bg-gray-50 border-gray-100' : 'bg-white/5 border border-white/10'}`}>
                      <p className={`${mutedTextClass} text-[10px] font-bold uppercase tracking-widest`}>LLM Deep Scanned</p>
                      <p className={`text-lg font-black mt-1 text-[#007AFF]`}>{report.analysis_transparency?.llm_deep_scanned || 0}</p>
                    </div>
                    <div className={`p-4 rounded-xl ${theme === 'light' ? 'bg-gray-50 border-gray-100' : 'bg-white/5 border border-white/10'}`}>
                      <p className={`${mutedTextClass} text-[10px] font-bold uppercase tracking-widest`}>High Confidence</p>
                      <p className={`text-lg font-black mt-1 text-green-500`}>{report.analysis_transparency?.high_confidence_flags || 0}</p>
                    </div>
                    <div className={`p-4 rounded-xl ${theme === 'light' ? 'bg-gray-50 border-gray-100' : 'bg-white/5 border border-white/10'}`}>
                      <p className={`${mutedTextClass} text-[10px] font-bold uppercase tracking-widest`}>Medium Confidence</p>
                      <p className={`text-lg font-black mt-1 text-amber-500`}>{report.analysis_transparency?.medium_confidence_flags || 0}</p>
                    </div>
                    <div className={`p-4 rounded-xl ${theme === 'light' ? 'bg-gray-50 border-gray-100' : 'bg-white/5 border border-white/10'}`}>
                      <p className={`${mutedTextClass} text-[10px] font-bold uppercase tracking-widest`}>Low Confidence</p>
                      <p className={`text-lg font-black mt-1 text-red-500`}>{report.analysis_transparency?.low_confidence_flags || 0}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 10: Appendix */}
              <div data-section-id="appendix" className="mb-12 scroll-mt-20">
                <div className="flex items-center gap-3 mb-6 cursor-pointer" onClick={() => toggleSection('appendix')}>
                  <div className="w-8 h-8 rounded-lg bg-slate-500/20 flex items-center justify-center">
                    <List size={16} className="text-slate-400" />
                  </div>
                  <h3 className={`text-lg font-black uppercase tracking-wider ${textClass}`}>§10 Appendix: All Flagged Clauses</h3>
                  {expandedSections['appendix'] ? <ChevronDown size={16} className={subTextClass} /> : <ChevronRight size={16} className={subTextClass} />}
                </div>
                {expandedSections['appendix'] !== false && (
                  <div className="space-y-4">
                    {(report.appendix_all_flagged || []).length > 0 ? (
                      report.appendix_all_flagged.map((clause, i) => {
                        const styles = CATEGORY_COLORS[clause.categories?.[0]] || CATEGORY_COLORS.General;
                        return (
                          <div key={i} className={`p-4 rounded-xl border ${theme === 'light' ? 'bg-gray-50 border-gray-100' : 'bg-white/5 border-white/10'}`}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-black ${mutedTextClass}`}>#{clause.id}</span>
                                {clause.categories?.map((cat, ci) => {
                                  const s = CATEGORY_COLORS[cat] || CATEGORY_COLORS.General;
                                  return <span key={ci} className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${s.text} ${s.border}`}>{cat}</span>;
                                })}
                              </div>
                              <span className={`text-[10px] font-black ${clause.confidence === 'High' ? 'text-green-500' : clause.confidence === 'Medium' ? 'text-amber-500' : 'text-red-500'}`}>
                                {clause.confidence}
                              </span>
                            </div>
                            <p className={`text-xs line-clamp-2 mb-2 ${theme === 'light' ? 'text-gray-500' : 'text-white/40'}`}>{clause.text}</p>
                            <p className={`text-xs ${theme === 'light' ? 'text-gray-700' : 'text-white/70'}`}>{clause.explanation}</p>
                          </div>
                        );
                      })
                    ) : (
                      <p className={`${subTextClass} text-sm`}>No flagged clauses to display.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Report Footer */}
              <div className="mt-16 pt-8 border-t border-white/5 text-center">
                <p className={`${mutedTextClass} text-[10px] font-black tracking-[0.4em] uppercase`}>
                  End of Comprehensive Legal Risk Assessment
                </p>
                <div className="flex items-center justify-center gap-4 mt-4 opacity-50">
                  <Scale size={14} className={mutedTextClass} />
                  <Activity size={14} className={mutedTextClass} />
                  <BrainCircuit size={14} className={mutedTextClass} />
                </div>
                <p className="text-[8px] text-white/10 mt-6 font-bold uppercase tracking-widest">
                  Jurist AI — Enterprise Intelligence Engine | Report ID: {report.report_metadata.report_id}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
