import React from 'react';
import {
  Check, AlertTriangle, FileText, Link, Share2,
  Download, ArrowRight, BrainCircuit, Zap, Activity,
  ShieldAlert, ShieldCheck, Target, TrendingUp, Info
} from 'lucide-react';
import { useTheme } from './ThemeProvider.jsx';
import { motion } from 'framer-motion';

export default function OverviewPage({
  analysisResult,
  sourceInfo,
  calculateScore,
  onNavigate,
  historyItems,
  narrativeVerdict,
  isVerdictLoading
}) {
  const { theme } = useTheme();
  const score = typeof calculateScore === 'function' ? calculateScore() : 0;
  const totalClauses = analysisResult?.total_clauses || 0;
  const riskyClauses = analysisResult?.risky_clause_count || 0;
  const nlpCleared = Math.max(0, totalClauses - riskyClauses);
  const avgSeverity = analysisResult?.avg_severity_score || 0;
  const totalRiskScore = analysisResult?.total_severity_score || 0;
  const overallRisk = analysisResult?.overall_risk || 'Low';

  // Fix: Convert risk_breakdown from dict to array for rendering
  const breakdownArray = React.useMemo(() => {
    if (!analysisResult?.risk_breakdown) return [];
    // If it's already an array (old format), return as is (wrapped). 
    // If it's a dict (new backend format), convert it.
    if (Array.isArray(analysisResult.risk_breakdown)) {
      return [...analysisResult.risk_breakdown].sort((a, b) => (Number(b.count) || 0) - (Number(a.count) || 0));
    }
    return Object.entries(analysisResult.risk_breakdown)
      .map(([category, count]) => ({ category, count: Number(count) || 0 }))
      .sort((a, b) => b.count - a.count);
  }, [analysisResult]);

  const riskyClauseList = React.useMemo(() => {
    if (!Array.isArray(analysisResult?.clauses)) return [];
    return analysisResult.clauses
      .filter(c => c.is_risky)
      .sort((a, b) => (b.severity_score || 0) - (a.severity_score || 0))
      .slice(0, 3);
  }, [analysisResult]);

  const healthCheckItems = React.useMemo(() => {
    const checks = [
      { key: 'legal', name: 'Legal Clarity', passed: true },
      { key: 'privacy', name: 'Privacy Compliance', passed: true },
      { key: 'security', name: 'Security Provisions', passed: true },
      { key: 'financial', name: 'Financial Transparency', passed: true },
      { key: 'user', name: 'User Rights Protection', passed: true },
    ];

    breakdownArray.forEach(item => {
      if (item.count > 0) {
        const checkItem = checks.find(h => h.key === item.category?.toLowerCase().split(' ')[0]);
        if (checkItem) checkItem.passed = false;
      }
    });
    return checks;
  }, [breakdownArray]);

  // Feature 3: NLP vs Deep AI Transparency
  const analysisTransparency = React.useMemo(() => {
    if (!analysisResult) return null;
    const total = analysisResult.total_clauses || 0;
    const nlpFiltered = analysisResult.skipped_llm_count || 0;
    const deepAnalyzed = total - nlpFiltered;
    const riskyFound = analysisResult.risky_clause_count || 0;
    const safeFromDeep = deepAnalyzed - riskyFound;

    return {
      total,
      nlpFiltered,
      deepAnalyzed,
      riskyFound,
      safeFromDeep,
      nlpPercent: total > 0 ? ((nlpFiltered / total) * 100).toFixed(0) : 0,
      deepPercent: total > 0 ? ((deepAnalyzed / total) * 100).toFixed(0) : 0,
    };
  }, [analysisResult]);

  const getScoreColor = () => {
    if (score >= 75) return '#22c55e';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const getScoreDescription = () => {
    if (score >= 85) return "This document is exceptionally safe with standard legal frameworks.";
    if (score >= 70) return "General compliance is good, but minor adjustments are recommended.";
    if (score >= 50) return "Moderate risk detected. Several clauses require immediate review.";
    return "Critical risks identified. Avoid signing until significant changes are made.";
  };

  const renderRadarChart = () => {
    const isLight = theme === 'light';
    const gridStroke = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.05)';
    const textFill = isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)';
    const axisStroke = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)';
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
      <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl">
        {gridLines.map((line, i) => (
          <polygon key={i} points={line} fill="none" stroke={gridStroke} strokeWidth="0.5" />
        ))}
        {categories.map((_, i) => {
          const angle = (i * 72 - 90) * (Math.PI / 180);
          return (
            <line key={i} x1="100" y1="100" x2={100 + 100 * Math.cos(angle)} y2={100 + 100 * Math.sin(angle)} stroke={axisStroke} strokeWidth="0.5" />
          );
        })}
        <polygon points={points} fill="rgba(0, 122, 255, 0.25)" stroke="#007AFF" strokeWidth="2.5" className="transition-all duration-700" />
        {categories.map((label, i) => {
          const breakdown = breakdownArray.find(b => b.category.toLowerCase().includes(label.toLowerCase()));
          const val = breakdown ? breakdown.count : 0;
          const angle = (i * 72 - 90) * (Math.PI / 180);
          const radius = (val / maxCount) * 92;
          return <circle key={i} cx={100 + radius * Math.cos(angle)} cy={100 + radius * Math.sin(angle)} r="3.5" fill="#007AFF" />;
        })}
      </svg>
    );
  };

  const subTextClass = theme === 'light' ? 'text-gray-500' : 'text-white/60';
  const mutedTextClass = theme === 'light' ? 'text-gray-400' : 'text-white/40';
  const textClass = theme === 'light' ? 'text-gray-900' : 'text-white';

  const totalRisky = analysisResult?.risky_clause_count || 0;
  const deepAnalyzed = totalClauses - (analysisResult?.skipped_llm_count || 0);
  const deepScanPct = totalClauses > 0 ? Math.round((deepAnalyzed / totalClauses) * 100) : 0;

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[10px] font-semibold text-[#007AFF] uppercase tracking-wider">Analysis Results</span>
          </div>
          <h1 className={`text-2xl font-bold mb-1 ${textClass}`}>Executive Summary</h1>
          {sourceInfo?.type && (
            <div className="flex items-center gap-2 text-sm text-white/60">
              {sourceInfo.type === 'url' && <Link size={14} />}
              {(sourceInfo.type === 'pdf' || sourceInfo.type === 'text') && <FileText size={14} />}
              <span className="truncate max-w-md">{sourceInfo.value || 'Document'}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => onNavigate && onNavigate('reports')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-all ${theme === 'light' ? 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50' : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'}`}
          >
            <Share2 size={16} />
            Generate Report
          </button>
        </div>
      </div>

      {/* Hero Stats Section */}
      <div className="grid grid-cols-12 gap-6">
        {/* Score Gauge */}
        <div className="col-span-12 lg:col-span-5 glass-card p-8 flex flex-col items-center justify-center relative overflow-hidden group">
          <div className={`absolute -top-24 -left-24 w-64 h-64 rounded-full blur-3xl transition-all duration-1000 ${theme === 'light' ? 'bg-blue-100/40 group-hover:bg-blue-200/40' : 'bg-[#007AFF]/10 group-hover:bg-[#007AFF]/20'}`} />

          <h3 className={`text-xs font-black uppercase tracking-[0.2em] mb-8 ${mutedTextClass}`}>Safety Score</h3>

          <div className="relative w-56 h-32 mb-4">
            <svg viewBox="0 0 100 50" className="w-full h-full drop-shadow-2xl">
              <path
                d="M 10 45 A 35 35 0 0 1 90 45"
                fill="none"
                stroke={theme === 'light' ? '#f1f5f9' : 'rgba(255,255,255,0.05)'}
                strokeWidth="10"
                strokeLinecap="round"
              />
              <motion.path
                initial={{ pathLength: 0 }}
                animate={{ pathLength: score / 100 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                d="M 10 45 A 35 35 0 0 1 90 45"
                fill="none"
                stroke={getScoreColor()}
                strokeWidth="10"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
              <span className={`text-6xl font-black tracking-tighter drop-shadow-sm ${textClass}`}>
                {score}
              </span>
            </div>
          </div>

          <div className="text-center z-10">
            <p className={`text-lg font-extrabold uppercase tracking-widest pointer-events-none transition-colors duration-300`} style={{ color: getScoreColor() }}>
              {overallRisk} Risk Level
            </p>
            <p className={`text-[10px] mt-1 font-bold uppercase tracking-[0.1em] ${mutedTextClass}`}>
              Based on {totalRisky} high-severity vectors
            </p>
          </div>
        </div>

        {/* AI Narrative Verdict - THE "PEAK" UI */}
        <div className="col-span-12 lg:col-span-7 relative group overflow-hidden rounded-3xl">
          <div className="absolute inset-0 bg-gradient-to-br from-[#6366f1] via-[#a855f7] to-[#ec4899] opacity-[0.08] dark:opacity-[0.15]" />
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 5, 0],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-20 -right-20 w-80 h-80 bg-[#6366f1]/20 rounded-full blur-[80px]"
          />

          <div className={`glass-card h-full p-8 relative z-10 border-none flex flex-col justify-between ${theme === 'light' ? 'bg-white/40' : 'bg-black/20 text-white'}`}>
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="absolute inset-0 bg-indigo-500 rounded-lg blur-lg opacity-40 animate-pulse" />
                    <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                      <Zap size={20} className="text-white fill-white" />
                    </div>
                  </div>
                  <div>
                    <h3 className={`text-xs font-black uppercase tracking-[0.2em] ${theme === 'light' ? 'text-indigo-600' : 'text-indigo-400'}`}>Professional Summary</h3>
                    <p className={`text-[9px] font-bold uppercase tracking-widest ${mutedTextClass}`}>Jurist AI Executive Verdict</p>
                  </div>
                </div>
                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest border shadow-sm ${theme === 'light' ? 'bg-white border-indigo-100 text-indigo-600' : 'bg-white/5 border-white/10 text-white/60'}`}>
                  CONFIDENCE: HIGH
                </div>
              </div>

              {isVerdictLoading ? (
                <div className="flex items-center gap-4 py-8">
                  <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                  <p className={`text-lg font-medium animate-pulse ${subTextClass}`}>Synthesizing risk profile...</p>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <p className={`text-xl font-medium leading-relaxed italic tracking-tight font-serif ${theme === 'light' ? 'text-gray-800' : 'text-indigo-50/90'}`}>
                    "{narrativeVerdict || "The initial analysis is complete. Detailed review of the flagged clauses is recommended to understand specific legal implications."}"
                  </p>
                </motion.div>
              )}
            </div>

            {!isVerdictLoading && (
              <div className="mt-8 pt-6 border-t border-indigo-500/10 flex items-center justify-between whitespace-nowrap">
                <div className="flex gap-6">
                  <div>
                    <p className={`text-[10px] font-black uppercase tracking-widest ${mutedTextClass}`}>Critical Risks</p>
                    <p className="text-xl font-black text-red-500">{totalRisky}</p>
                  </div>
                  <div className="w-px h-10 bg-indigo-500/10" />
                  <div>
                    <p className={`text-[10px] font-black uppercase tracking-widest ${mutedTextClass}`}>Compliance Score</p>
                    <p className="text-xl font-black text-emerald-500">{score}%</p>
                  </div>
                </div>
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full border-2 border-indigo-500 bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-700 z-30">AI</div>
                  <div className="w-8 h-8 rounded-full border-2 border-purple-500 bg-purple-100 flex items-center justify-center text-[10px] font-bold text-purple-700 z-20">LGL</div>
                  <div className="w-8 h-8 rounded-full border-2 border-pink-500 bg-pink-100 flex items-center justify-center text-[10px] font-bold text-pink-700 z-10">RISK</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid: Stats & Depth */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Clauses', value: totalClauses, icon: FileText, color: 'text-blue-400', bg: 'bg-blue-400/5' },
          { label: 'Risky Clauses', value: riskyClauses, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-400/5' },
          { label: 'NLP Cleared', value: nlpCleared, icon: Check, color: 'text-green-400', bg: 'bg-green-400/5' },
          { label: 'Risk Ratio', value: `${totalClauses > 0 ? ((riskyClauses / totalClauses) * 100).toFixed(1) : 0}%`, icon: Target, color: 'text-purple-400', bg: 'bg-purple-400/5' },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className={`glass-card p-6 group transition-all`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <Icon size={18} className={stat.color} />
                </div>
                <span className={`text-[10px] font-black uppercase tracking-[0.1em] ${mutedTextClass}`}>{stat.label}</span>
              </div>
              <div className={`text-3xl font-black ${textClass}`}>{stat.value}</div>
            </div>
          );
        })}
      </div>

      {/* transparency and depth row */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8 glass-card p-8 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-8">
            <h3 className={`text-xs font-black uppercase tracking-[0.2em] ${mutedTextClass}`}>Analysis Transparency</h3>
            <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest ${subTextClass}`}>
              <Activity size={12} className="text-emerald-500" />
              Source: Cerebras LLaMA-3 Engine
            </div>
          </div>

          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <div>
                  <p className={`text-lg font-black ${textClass}`}>{deepScanPct}% Deep Scan</p>
                  <p className={`text-xs ${mutedTextClass}`}>Full neural network evaluation</p>
                </div>
                <p className={`text-xs font-bold ${subTextClass}`}>{deepAnalyzed} of {totalClauses} total</p>
              </div>
              <div className={`h-3 bg-white/5 rounded-full overflow-hidden border ${theme === 'light' ? 'border-gray-100' : 'border-white/5'}`}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${deepScanPct}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className={`p-5 rounded-2xl border ${theme === 'light' ? 'bg-gray-50/50 border-gray-100' : 'bg-white/5 border-white/5'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck size={14} className="text-emerald-500" />
                  <span className={`text-[10px] font-black uppercase tracking-widest ${mutedTextClass}`}>Fast NLP Filter</span>
                </div>
                <p className={`text-2xl font-black ${textClass}`}>{analysisTransparency?.nlpFiltered || 0}</p>
                <p className={`text-[10px] mt-1 leading-relaxed ${subTextClass}`}>Identified as safe via structural pattern matching.</p>
              </div>
              <div className={`p-5 rounded-2xl border ${theme === 'light' ? 'bg-blue-50/30 border-blue-100' : 'bg-[#007AFF]/5 border-[#007AFF]/10'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <BrainCircuit size={14} className="text-[#007AFF]" />
                  <span className={`text-[10px] font-black uppercase tracking-widest ${mutedTextClass}`}>Deep AI Layer</span>
                </div>
                <p className={`text-2xl font-black text-[#007AFF]`}>{deepAnalyzed}</p>
                <p className={`text-[10px] mt-1 leading-relaxed ${subTextClass}`}>Subjected to multi-pass LLM risk verification.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 glass-card p-8 flex flex-col items-center justify-center relative overflow-hidden group">
          <div className="flex flex-col items-center justify-center space-y-6 py-4">
            <div className="relative">
              <svg className="w-48 h-48 transform -rotate-90 drop-shadow-xl">
                <circle
                  cx="96"
                  cy="96"
                  r="80"
                  stroke={theme === 'light' ? '#f1f5f9' : 'rgba(255,255,255,0.05)'}
                  strokeWidth="12"
                  fill="transparent"
                />
                <motion.circle
                  initial={{ strokeDasharray: "0, 502" }}
                  animate={{ strokeDasharray: `${(502 * deepScanPct) / 100}, 502` }}
                  transition={{ duration: 2, ease: "easeInOut" }}
                  cx="96"
                  cy="96"
                  r="80"
                  stroke="#007AFF"
                  strokeWidth="12"
                  fill="transparent"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-5xl font-black tracking-tighter ${textClass}`}>{deepScanPct}%</span>
                <span className={`text-[10px] font-black uppercase tracking-widest ${mutedTextClass}`}>Coverage</span>
              </div>
            </div>
            <div className="text-center space-y-1">
              <p className={`text-sm font-black uppercase tracking-tight ${textClass}`}>Audit Scope</p>
              <p className={`text-[10px] font-bold uppercase tracking-widest ${mutedTextClass}`}>Comprehensive Deep Scan</p>
            </div>
          </div>
        </div>
      </div>

      {/* Radar Matrix Row */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8 glass-card p-8">
          <h3 className={`text-xs font-black uppercase tracking-[0.2em] mb-10 flex items-center gap-2 ${mutedTextClass}`}>
            <Activity size={14} className="text-[#007AFF]" />
            Risk Breakdown Matrix
          </h3>
          <div className="flex flex-col md:flex-row items-center gap-16">
            <div className="w-full md:w-1/2 max-w-[350px]">
              {renderRadarChart()}
            </div>
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              {['Legal', 'Privacy', 'Security', 'Financial', 'User'].map((label, i) => {
                const breakdown = breakdownArray.find(b => b.category?.toLowerCase().includes(label.toLowerCase()));
                const count = breakdown?.count || 0;
                return (
                  <div key={i} className={`flex items-center justify-between p-4 rounded-xl border ${theme === 'light' ? 'bg-gray-50/50 border-gray-100' : 'bg-white/5 border-white/5'}`}>
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-red-500' : i === 1 ? 'bg-amber-500' : i === 2 ? 'bg-blue-500' : i === 3 ? 'bg-emerald-500' : 'bg-purple-500'}`} />
                      <span className={`text-xs font-bold ${textClass}`}>{label}</span>
                    </div>
                    <span className={`text-[10px] font-black ${mutedTextClass}`}>{count} Risks</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 glass-card p-8 flex flex-col">
          <h3 className={`text-xs font-black uppercase tracking-[0.2em] mb-6 ${mutedTextClass}`}>Health Checklist</h3>
          <div className="flex-1 flex flex-col justify-center space-y-4">
            {healthCheckItems.map((item, i) => (
              <div
                key={i}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${item.passed
                  ? 'bg-green-500/5 border-green-500/10 text-green-500'
                  : 'bg-amber-500/5 border-amber-500/10 text-amber-500'
                  }`}
              >
                <div className="flex items-center gap-3">
                  {item.passed ? <Check size={14} className="stroke-[3]" /> : <AlertTriangle size={14} className="stroke-[3]" />}
                  <span className="text-[10px] font-black uppercase tracking-widest">{item.name}</span>
                </div>
                <span className={`text-[10px] font-black uppercase tracking-tight ${item.passed ? 'text-green-600' : 'text-amber-600'}`}>
                  {item.passed ? 'PASSED' : 'FLAGGED'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-6">
        <p className={`text-[10px] font-bold uppercase tracking-widest ${mutedTextClass}`}>
          Jurist AI Protocol Engine v1.4.2
        </p>
        <div className="flex items-center gap-4">
          <button
            onClick={() => onNavigate && onNavigate('clauses')}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#007AFF] to-[#0056cc] text-white text-xs font-black uppercase tracking-widest hover:shadow-lg hover:shadow-[#007AFF]/30 transition-all active:scale-[0.98]"
          >
            Explore Flagged Clauses
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}