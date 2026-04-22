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
    const text = [
      `JURIST AI — LEGAL RISK ASSESSMENT REPORT`,
      `Generated: ${date}`,
      `Document: ${sourceInfo?.value || 'Unknown'}`,
      `Overall Risk: ${analysisResult.overall_risk} | Safety Score: ${score}/100`,
      ``,
      `EXECUTIVE SUMMARY`,
      `Total Clauses Analyzed: ${analysisResult.total_clauses}`,
      `Flagged Clauses: ${analysisResult.risky_clause_count} (${Math.round(analysisResult.risky_clause_count / analysisResult.total_clauses * 100)}%)`,
      ``,
      `Risk Distribution:`,
      ...(Array.isArray(analysisResult.risk_breakdown) ? analysisResult.risk_breakdown.map(r => `• ${r.category}: ${r.count} clauses`) : []),
      ``,
      `FLAGGED CLAUSES:`,
      ...(Array.isArray(analysisResult.clauses) ? (analysisResult.clauses.filter(c => c.is_risky).map((c, i) => [
        `Clause #${i + 1}`,
        `Category: ${c.risk_categories?.[0]} | Severity: ${c.severity_score}`,
        `TEXT: ${c.text?.slice(0, 200)}`,
        `AI ANALYSIS: ${c.explanation}`,
        ''
      ]).flat()) : [])
    ].join('\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 print:bg-white print:text-black">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-2xl font-bold text-white">Reports</h1>
        <div className="flex gap-3">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/80 hover:bg-white/10"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#007AFF] to-[#0056cc] text-white"
          >
            <Printer size={16} />
            Print Report
          </button>
        </div>
      </div>

      <div className="glass-card p-8 print:border-none print:p-0">
        <div className="text-center border-b border-white/10 pb-6 mb-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Scale size={32} className="text-[#007AFF]" />
            <h2 className="text-2xl font-bold text-white">Jurist AI — Legal Risk Assessment Report</h2>
          </div>
          <p className="text-white/50 text-sm">Generated: {date}</p>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6 p-4 bg-white/5 rounded-lg">
          <div>
            <p className="text-white/50 text-sm">Document</p>
            <p className="text-white font-medium truncate">{sourceInfo?.value}</p>
          </div>
          <div className="text-right">
            <p className="text-white/50 text-sm">Overall Risk</p>
            <p className={`font-medium ${getRiskColor(analysisResult.overall_risk)}`}>
              {analysisResult.overall_risk} · {score}/100
            </p>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-4 border-b border-white/10 pb-2">Executive Summary</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-white/5 rounded-lg">
              <p className="text-2xl font-bold text-white">{analysisResult.total_clauses}</p>
              <p className="text-white/50 text-sm">Total Clauses</p>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-lg">
              <p className="text-2xl font-bold text-red-500">{analysisResult.risky_clause_count}</p>
              <p className="text-white/50 text-sm">Flagged Clauses</p>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-lg">
              <p className="text-2xl font-bold text-[#007AFF]">{score}/100</p>
              <p className="text-white/50 text-sm">Safety Score</p>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-4 border-b border-white/10 pb-2">Risk Distribution</h3>
          <div className="space-y-2">
            {Array.isArray(analysisResult.risk_breakdown) ? (
              analysisResult.risk_breakdown.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <span className="w-32 text-white/70 text-sm">{item.category}</span>
                  <div className="flex-1 h-4 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500 rounded-full"
                      style={{ width: `${(item.count / (analysisResult.risky_clause_count || 1)) * 100}%` }}
                    />
                  </div>
                  <span className="text-white text-sm w-12 text-right">{item.count}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-white/50 text-center py-4">No risk distribution data available.</p>
            )}
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-4 border-b border-white/10 pb-2">Flagged Clauses</h3>
          <div className="space-y-4">
            {Array.isArray(analysisResult.clauses) ? (
              analysisResult.clauses.filter(c => c.is_risky).map((clause, idx) => (
                <div key={idx} className="p-4 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">Clause #{idx + 1}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/50">{clause.risk_categories?.[0]}</span>
                      <span className="text-xs text-white/50">Severity: {clause.severity_score}</span>
                    </div>
                  </div>
                  <p className="text-white/70 text-sm mb-2">{clause.text?.slice(0, 200)}</p>
                  <p className="text-white/50 text-sm italic">{clause.explanation}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-white/50">No flagged clauses found.</p>
            )}
          </div>
        </div>

        <div className="pt-6 border-t border-white/10">
          <h3 className="text-lg font-semibold text-white mb-4">Recommendations</h3>
          <ul className="space-y-2 text-white/70">
            {Array.isArray(analysisResult.risk_breakdown) && analysisResult.risk_breakdown.slice(0, 3).map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-[#007AFF] mt-1">•</span>
                <span>Review and negotiate {item.category.toLowerCase()} terms</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}