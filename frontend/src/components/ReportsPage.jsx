import React from 'react';
import { FileText, Printer, Copy, Check, AlertTriangle, Shield, Scale, Zap, BrainCircuit } from 'lucide-react';
import EmptyState from './EmptyState.jsx';

export default function ReportsPage({ analysisResult, sourceInfo, calculateScore, onNewAnalysis }) {
  const [copied, setCopied] = React.useState(false);

  if (!analysisResult) {
    return <EmptyState view="reports" onNewAnalysis={onNewAnalysis} />;
  }

  const score = calculateScore ? calculateScore() : 0;
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const getRiskColor = (risk) => {
    if (risk === 'High') return 'text-red-500';
    if (risk === 'Medium') return 'text-yellow-500';
    return 'text-green-500';
  };

  const handlePrint = () => window.print();

  const handleCopy = () => {
    const clauses = analysisResult?.clauses || [];
    const criticalClauses = clauses
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

    text += `STATISTICAL SUMMARY:\n`;
    text += `• Total Clauses: ${analysisResult.total_clauses}\n`;
    text += `• Flagged Clauses: ${analysisResult.risky_clause_count} (${Math.round(analysisResult.risky_clause_count / analysisResult.total_clauses * 100)}%)\n`;
    text += `• NLP Cleared: ${analysisResult.total_clauses - analysisResult.risky_clause_count}\n\n`;

    text += `TOP 10 RISKY CLAUSES (Sorted by Severity):\n`;
    text += `=========================================\n\n`;

    criticalClauses.forEach((c, i) => {
      text += `[${i + 1}] SEVERITY: ${c.severity_score}/10 | CATEGORY: ${c.risk_categories?.[0] || 'General'}\n`;
      text += `EXPLANATION: ${c.explanation}\n`;
      text += `CLAUSE: "${(c.text || '').trim()}"\n\n`;
    });

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 print:m-0 print:p-0">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-2xl font-bold text-white">Reports</h1>
        <div className="flex gap-3">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/80 hover:bg-white/10"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copied' : 'Copy Text'}
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#007AFF] to-[#0056cc] text-white"
          >
            <Printer size={16} />
            Print PDF
          </button>
        </div>
      </div>

      <div className="glass-card p-10 print:bg-white print:text-black print:border-none print:shadow-none print:p-8">
        <div className="flex items-center justify-between border-b-2 border-gray-100 pb-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#007AFF]/10 rounded-xl print:bg-blue-50">
              <Scale size={32} className="text-[#007AFF]" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Jurist AI Analysis</h2>
              <p className="text-gray-500 font-medium uppercase text-xs tracking-widest">{date}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">Document Source</p>
            <p className="text-gray-900 font-bold truncate max-w-[300px]">{sourceInfo?.value}</p>
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full mt-2 text-sm font-bold ${analysisResult.overall_risk === 'High' ? 'bg-red-50 text-red-600' :
              analysisResult.overall_risk === 'Medium' ? 'bg-amber-50 text-amber-600' :
                'bg-green-50 text-green-600'
              }`}>
              <AlertTriangle size={14} />
              <span>{analysisResult.overall_risk} Risk Level</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-6 mb-10">
          {[
            { label: 'Safety Score', value: `${score}/100`, sub: 'Overall Health', color: 'text-[#007AFF]' },
            { label: 'Total Clauses', value: analysisResult.total_clauses, sub: 'Analyzed', color: 'text-gray-700' },
            { label: 'Flagged', value: analysisResult.risky_clause_count, sub: 'Risky Vectors', color: 'text-red-600' },
            { label: 'AI Deep Scan', value: `${Math.round(((analysisResult.total_clauses - (analysisResult.skipped_llm_count || 0)) / (analysisResult.total_clauses || 1)) * 100)}%`, sub: 'Coverage', color: 'text-emerald-600' },
          ].map((stat, i) => (
            <div key={i} className="bg-gray-50 p-5 rounded-2xl border border-gray-100 print:bg-white">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{stat.label}</p>
              <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
              <p className="text-[10px] text-gray-400 font-medium mt-1">{stat.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-10 mb-10">
          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <BrainCircuit size={14} className="text-[#007AFF]" />
                Risk Distribution
              </h3>
              <div className="space-y-3">
                {(Array.isArray(analysisResult.risk_breakdown) ? analysisResult.risk_breakdown : (analysisResult.risk_breakdown ? Object.entries(analysisResult.risk_breakdown).map(([category, count]) => ({ category, count })) : [])).map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="w-28 text-xs font-bold text-gray-600">{item.category}</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: `${(item.count / (analysisResult.risky_clause_count || 1)) * 100}%` }} />
                    </div>
                    <span className="text-xs font-bold text-gray-900 w-6 text-right">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-6 bg-gray-50 rounded-2xl border border-dashed border-gray-200 print:bg-white">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Zap size={14} className="text-amber-500" />
              Strategic Advice
            </h3>
            <ul className="space-y-3">
              {(Array.isArray(analysisResult.risk_breakdown) ? analysisResult.risk_breakdown : (analysisResult.risk_breakdown ? Object.entries(analysisResult.risk_breakdown).map(([category, count]) => ({ category, count })) : [])).slice(0, 4).map((item, idx) => (
                <li key={idx} className="flex gap-2 text-xs text-gray-600 leading-relaxed font-medium">
                  <span className="text-amber-500 font-bold">•</span>
                  <span>Prioritize negotiation on <span className="text-gray-900 font-bold">{item.category.toLowerCase()}</span> terms to reduce liability.</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="break-inside-avoid">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 border-b border-gray-100 pb-2">
            Top 10 Flagged Clauses (Ranked by Severity)
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {Array.isArray(analysisResult.clauses) ? (
              analysisResult.clauses
                .filter(c => c.is_risky)
                .sort((a, b) => (b.severity_score || 0) - (a.severity_score || 0))
                .slice(0, 10)
                .map((clause, idx) => (
                  <div key={idx} className="p-4 border border-gray-100 rounded-xl bg-white shadow-sm break-inside-avoid">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 bg-gray-900 text-white flex items-center justify-center rounded text-[10px] font-bold">{idx + 1}</span>
                        <span className="font-bold text-gray-800 text-[10px] uppercase tracking-wider">{clause.risk_categories?.[0] || 'General Risk'}</span>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${clause.severity_score >= 8 ? 'bg-red-500 text-white' :
                        clause.severity_score >= 5 ? 'bg-amber-500 text-white' :
                          'bg-blue-500 text-white'
                        }`}>
                        SEV: {clause.severity_score}
                      </span>
                    </div>
                    <p className="text-gray-600 text-[10px] leading-relaxed italic mb-2 line-clamp-2">"{(clause.text || '').trim()}"</p>
                    <div className="p-2 bg-gray-50 rounded text-[10px] text-gray-800 font-medium leading-relaxed">
                      <span className="font-bold border-b border-gray-200 block mb-1">AI ANALYSIS:</span>
                      {clause.explanation}
                    </div>
                  </div>
                ))
            ) : null}
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-gray-100 text-center">
          <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">End of Automated Risk Assessment Report</p>
          <p className="text-[9px] text-gray-300 mt-1">Generated by Jurist AI Protocol.</p>
        </div>
      </div>
    </div>
  );
}