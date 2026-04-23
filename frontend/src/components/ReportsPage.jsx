import React from 'react';
import {
  FileText, Printer, Copy, Check, AlertTriangle,
  Shield, Scale, Zap, BrainCircuit, Activity
} from 'lucide-react';
import EmptyState from './EmptyState.jsx';
import { useTheme } from './ThemeProvider.jsx';

const CATEGORY_COLORS = {
  'Privacy Risk': { bg: 'bg-purple-500', text: 'text-purple-500', border: 'border-purple-500/30' },
  'Legal Risk': { bg: 'bg-red-500', text: 'text-red-500', border: 'border-red-500/30' },
  'Financial Risk': { bg: 'bg-green-500', text: 'text-green-500', border: 'border-green-500/30' },
  'Security Risk': { bg: 'bg-blue-500', text: 'text-blue-500', border: 'border-blue-500/30' },
  'User Rights Risk': { bg: 'bg-amber-500', text: 'text-amber-500', border: 'border-amber-500/30' },
  'Transparency Risk': { bg: 'bg-cyan-500', text: 'text-cyan-500', border: 'border-cyan-500/30' },
  'Data Risk': { bg: 'bg-indigo-500', text: 'text-indigo-500', border: 'border-indigo-500/30' },
  'General': { bg: 'bg-slate-500', text: 'text-slate-500', border: 'border-slate-500/30' }
};

export default function ReportsPage({ analysisResult, sourceInfo, calculateScore, narrativeVerdict, onNewAnalysis }) {
  const { theme } = useTheme();
  const [copied, setCopied] = React.useState(false);

  const criticalClauses = React.useMemo(() => {
    return (analysisResult?.clauses || [])
      .filter(c => c.is_risky)
      .sort((a, b) => (b.severity_score || 0) - (a.severity_score || 0))
      .slice(0, 5);
  }, [analysisResult]);

  if (!analysisResult) {
    return <EmptyState view="reports" onNewAnalysis={onNewAnalysis} />;
  }

  const score = calculateScore ? calculateScore() : 0;
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const textClass = theme === 'light' ? 'text-gray-900' : 'text-white';
  const subTextClass = theme === 'light' ? 'text-gray-500' : 'text-white/60';
  const mutedTextClass = theme === 'light' ? 'text-gray-400' : 'text-white/40';

  const handlePrint = () => window.print();

  const handleCopy = () => {
    const clauses = analysisResult?.clauses || [];
    const topClauses = clauses
      .filter(c => c.is_risky)
      .sort((a, b) => (b.severity_score || 0) - (a.severity_score || 0))
      .slice(0, 10);

    let text = `JURIST AI — LEGAL RISK ASSESSMENT REPORT\n`;
    text += `Generated: ${date}\n`;
    text += `Document: ${sourceInfo?.value || 'Unknown'}\n`;
    text += `Overall Risk: ${analysisResult.overall_risk} | Safety Score: ${score}/100\n\n`;

    if (narrativeVerdict) {
      text += `EXECUTIVE VERDICT:\n"${narrativeVerdict}"\n\n`;
    }

    text += `TOP RISKY CLAUSES:\n`;
    topClauses.forEach((c, i) => {
      text += `[${i + 1}] SEVERITY: ${c.severity_score}/10 | ${c.risk_categories?.[0] || 'GENERAL'}\n`;
      text += `INSIGHT: ${c.explanation}\n\n`;
    });

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getCategoryStyles = (category) => {
    return CATEGORY_COLORS[category] || CATEGORY_COLORS['General'];
  };

  return (
    <div className="space-y-6 print:m-0 print:p-0">
      <div className="flex items-center justify-between print:hidden">
        <h1 className={`text-2xl font-bold ${textClass}`}>Reports</h1>
        <div className="flex gap-3">
          <button
            onClick={handleCopy}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${theme === 'light' ? 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50' : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'}`}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copied' : 'Copy Text'}
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#007AFF] to-[#0056cc] text-white font-semibold"
          >
            <Printer size={16} />
            Print PDF
          </button>
        </div>
      </div>

      <div id="report-document" className={`glass-card p-10 print:bg-white print:text-black print:border-none print:shadow-none print:p-8 ${theme === 'light' ? 'bg-white border-gray-100' : ''}`}>
        <div className={`flex items-center justify-between border-b-2 ${theme === 'light' ? 'border-gray-100' : 'border-white/5'} pb-6 mb-8`}>
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${theme === 'light' ? 'bg-blue-50' : 'bg-[#007AFF]/10'}`}>
              <Scale size={32} className="text-[#007AFF]" />
            </div>
            <div>
              <h2 className={`text-2xl font-extrabold tracking-tight ${textClass}`}>Jurist AI Analysis</h2>
              <p className={`${mutedTextClass} font-bold uppercase text-[10px] tracking-widest`}>{date}</p>
            </div>
          </div>
          <div className="text-right">
            <p className={`${mutedTextClass} text-[10px] font-bold uppercase tracking-widest mb-1`}>Document Source</p>
            <p className={`${textClass} font-bold truncate max-w-[300px]`}>{sourceInfo?.value}</p>
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full mt-2 text-xs font-black uppercase tracking-wider ${analysisResult.overall_risk === 'High' ? 'bg-red-500/10 text-red-500' :
              analysisResult.overall_risk === 'Medium' ? 'bg-amber-500/10 text-amber-500' :
                'bg-green-500/10 text-green-500'
              }`}>
              <AlertTriangle size={12} />
              <span>{analysisResult.overall_risk} Risk Profile</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-6 mb-10">
          {[
            { label: 'Safety Score', value: `${score}/100`, sub: 'Overall Health', color: 'text-[#007AFF]' },
            { label: 'Total Clauses', value: analysisResult.total_clauses, sub: 'Analyzed', color: theme === 'light' ? 'text-gray-700' : 'text-white/80' },
            { label: 'Flagged', value: analysisResult.risky_clause_count, sub: 'Risky Vectors', color: 'text-red-500' },
            { label: 'AI Deep Scan', value: `${Math.round(((analysisResult.total_clauses - (analysisResult.skipped_llm_count || 0)) / (analysisResult.total_clauses || 1)) * 100)}%`, sub: 'Coverage', color: 'text-emerald-500' },
          ].map((stat, i) => (
            <div key={i} className={`${theme === 'light' ? 'bg-gray-50 border-gray-100' : 'bg-white/5 border-white/10'} p-5 rounded-2xl border print:bg-white`}>
              <p className={`${mutedTextClass} text-[10px] font-bold uppercase tracking-widest mb-1`}>{stat.label}</p>
              <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
              <p className={`${mutedTextClass} text-[10px] font-medium mt-1`}>{stat.sub}</p>
            </div>
          ))}
        </div>

        {narrativeVerdict && (
          <div className={`mb-10 p-6 rounded-2xl border ${theme === 'light' ? 'bg-blue-50 border-blue-100' : 'bg-blue-500/5 border-blue-500/10'}`}>
            <h3 className={`text-[10px] font-bold uppercase tracking-widest mb-3 flex items-center gap-2 ${theme === 'light' ? 'text-blue-700' : 'text-blue-400'}`}>
              <Zap size={14} />
              Executive Verdict
            </h3>
            <p className={`text-lg font-medium leading-relaxed italic ${theme === 'light' ? 'text-blue-900' : 'text-blue-100/90'}`}>
              "{narrativeVerdict}"
            </p>
          </div>
        )}

        <div className="mb-12 break-inside-avoid shadow-inner p-8 bg-black/5 rounded-3xl border border-white/5 print:bg-white print:border-gray-200">
          <div className="flex items-center justify-between mb-8">
            <h3 className={`${mutedTextClass} text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2`}>
              <Activity size={14} className="text-[#007AFF]" />
              Document Severity Risk Map
            </h3>
            <span className={`text-[10px] font-bold ${subTextClass} opacity-50 uppercase tracking-widest`}>Structural Risk Distribution</span>
          </div>

          <div className="h-32 flex items-end gap-[2px] mb-6">
            {(analysisResult?.clauses || []).map((c, i) => {
              const sev = c.severity_score || 0;
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-t-sm ${c.is_risky ? (sev >= 5 ? 'bg-red-500' : 'bg-amber-500') : 'bg-white/10'}`}
                  style={{ height: `${Math.max(12, (sev / 10) * 100)}%` }}
                />
              );
            }).slice(0, 100)}
          </div>
          <div className="flex justify-between border-t border-white/5 pt-4">
            <div className="flex gap-8">
              <div>
                <p className={`${mutedTextClass} text-[9px] font-black uppercase tracking-widest mb-1`}>Critical Zones</p>
                <p className={`text-xl font-black text-red-500`}>{analysisResult.risky_clause_count}</p>
              </div>
              <div>
                <p className={`${mutedTextClass} text-[9px] font-black uppercase tracking-widest mb-1`}>Avg Intensity</p>
                <p className={`text-xl font-black ${textClass}`}>{(analysisResult.clauses?.reduce((s, c) => s + (c.severity_score || 0), 0) / (analysisResult.total_clauses || 1)).toFixed(1)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-12 mb-12 break-inside-avoid">
          <div className="space-y-8">
            <div>
              <h3 className={`${mutedTextClass} text-[10px] font-black uppercase tracking-[0.2em] mb-8 flex items-center gap-2`}>
                <BrainCircuit size={16} className="text-[#007AFF]" />
                Categorical Risk Intensity
              </h3>
              <div className="space-y-6">
                {(Array.isArray(analysisResult.risk_breakdown) ? analysisResult.risk_breakdown : (analysisResult.risk_breakdown ? Object.entries(analysisResult.risk_breakdown).map(([category, count]) => ({ category, count })) : [])).map((item, idx) => {
                  const styles = getCategoryStyles(item.category);
                  return (
                    <div key={idx} className="space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                        <span className={subTextClass}>{item.category}</span>
                        <span className={`${styles.text} font-black`}>{item.count} Vectors Identified</span>
                      </div>
                      <div className={`h-2.5 rounded-full overflow-hidden ${theme === 'light' ? 'bg-gray-100' : 'bg-white/5'}`}>
                        <div className={`h-full rounded-full ${styles.bg}`} style={{ width: `${(item.count / (analysisResult.risky_clause_count || 1)) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className={`p-8 rounded-3xl border border-dashed flex flex-col justify-between ${theme === 'light' ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/10'} print:bg-white print:border-solid`}>
            <div>
              <h3 className={`${mutedTextClass} text-[10px] font-black uppercase tracking-[0.2em] mb-6 flex items-center gap-2`}>
                <Scale size={16} className="text-amber-500" />
                Dynamic Risk Resolutions
              </h3>
              <ul className="space-y-5 text-left">
                {criticalClauses.length > 0 ? (
                  criticalClauses.map((clause, idx) => {
                    const styles = getCategoryStyles(clause.risk_categories?.[0] || 'General');
                    return (
                      <li key={idx} className={`flex gap-3 text-xs leading-relaxed font-semibold ${subTextClass} print:text-black`}>
                        <div className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${styles.bg}`} />
                        <div>
                          <span className={`${styles.text} font-black uppercase text-[9px] tracking-widest`}>{clause.risk_categories?.[0] || 'GENERAL'}</span>
                          <p className="mt-1">{clause.explanation?.split('.')?.[0]}.</p>
                        </div>
                      </li>
                    );
                  })
                ) : (
                  <li className={`text-xs ${subTextClass}`}>No critical resolutions required based on current audit status.</li>
                )}
              </ul>
            </div>
          </div>
        </div>

        <div className="break-inside-avoid">
          <h3 className={`${mutedTextClass} text-[10px] font-black uppercase tracking-[0.2em] mb-8 border-b ${theme === 'light' ? 'border-gray-100' : 'border-white/5'} pb-4`}>
            Critical Severity Vectors (Ranked Top 10)
          </h3>
          <div className="grid grid-cols-2 gap-6">
            {Array.isArray(analysisResult.clauses) ? (
              analysisResult.clauses
                .filter(c => c.is_risky)
                .sort((a, b) => (b.severity_score || 0) - (a.severity_score || 0))
                .slice(0, 10)
                .map((clause, idx) => {
                  const mainCategory = clause.risk_categories?.[0] || 'General';
                  const styles = getCategoryStyles(mainCategory);
                  return (
                    <div key={idx} className={`p-6 border rounded-2xl shadow-sm break-inside-avoid transition-all ${theme === 'light' ? 'bg-white border-gray-100' : 'bg-black/20 border-white/5 group hover:border-[#007AFF]/30'} text-left`}>
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 flex items-center justify-center rounded-lg text-[10px] font-black ${theme === 'light' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>{idx + 1}</span>
                          <span className={`font-black text-[10px] uppercase tracking-widest ${styles.text}`}>{mainCategory}</span>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest ${clause.severity_score >= 8 ? 'bg-red-500 text-white' :
                          clause.severity_score >= 5 ? 'bg-amber-500 text-white' :
                            'bg-[#007AFF] text-white'
                          }`}>
                          SEV: {clause.severity_score?.toFixed(1)}
                        </span>
                      </div>
                      <p className={`text-xs leading-relaxed italic mb-5 line-clamp-3 font-serif ${theme === 'light' ? 'text-gray-500 border-l-4 border-gray-100 pl-4' : 'text-white/40 border-l-4 border-white/5 pl-4'}`}>"{(clause.text || '').trim()}"</p>
                      <div className={`p-5 rounded-2xl text-xs font-semibold leading-relaxed ${theme === 'light' ? 'bg-gray-50 text-gray-800' : 'bg-white/5 text-white/70'}`}>
                        <span className={`font-black block mb-2 uppercase tracking-[0.2em] text-[9px] ${styles.text}`}>AI Diagnostic</span>
                        {clause.explanation}
                      </div>
                    </div>
                  );
                })
            ) : null}
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-white/5 text-center">
          <p className={`${mutedTextClass} text-[10px] font-black tracking-[0.4em] uppercase`}>End of Automated System Audit</p>
          <div className="flex items-center justify-center gap-4 mt-4 opacity-50">
            <Scale size={14} className={mutedTextClass} />
            <Activity size={14} className={mutedTextClass} />
            <BrainCircuit size={14} className={mutedTextClass} />
          </div>
          <p className="text-[8px] text-white/10 mt-6 font-bold uppercase tracking-widest">Jurist AI — Enterprise Intelligence Engine</p>
        </div>
      </div>
    </div>
  );
}