import React from 'react';
import {
  Check, AlertTriangle, FileText, Link, Share2,
  Download, ArrowRight, BrainCircuit, Zap, Activity,
  ShieldAlert, ShieldCheck, Target, TrendingUp, Info
} from 'lucide-react';
import { useTheme } from './ThemeProvider.jsx';

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
  const score = calculateScore();
  const totalClauses = analysisResult?.total_clauses || 0;
  const riskyClauses = analysisResult?.risky_clause_count || 0;
  const nlpCleared = totalClauses - riskyClauses;
  const avgSeverity = analysisResult?.avg_severity_score || 0;
  const totalRiskScore = analysisResult?.total_severity_score || 0;
  const overallRisk = analysisResult?.overall_risk || 'N/A';

  // Fix: Convert risk_breakdown from dict to array for rendering
  const breakdownArray = React.useMemo(() => {
    if (!analysisResult?.risk_breakdown) return [];
    // If it's already an array (old format), return as is (wrapped). 
    // If it's a dict (new backend format), convert it.
    if (Array.isArray(analysisResult.risk_breakdown)) return analysisResult.risk_breakdown;
    return Object.entries(analysisResult.risk_breakdown)
      .map(([category, count]) => ({ category, count }))
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

  // Feature 2: Severity Distribution Histogram
  const severityDistribution = React.useMemo(() => {
    if (!Array.isArray(analysisResult?.clauses)) return [];
    
    const bins = [
      { label: 'Minor',    range: '0–2',   color: '#22c55e', count: 0 },
      { label: 'Moderate', range: '2–5',   color: '#f59e0b', count: 0 },
      { label: 'Serious',  range: '5–8',   color: '#f97316', count: 0 },
      { label: 'Critical', range: '8–12', color: '#ef4444', count: 0 },
      { label: 'Fatal',    range: '12+',  color: '#dc2626', count: 0 },
    ];

    analysisResult.clauses.forEach(clause => {
      if (!clause.is_risky) return;
      const sev = clause.severity_score || 0;
      if (sev <= 2)       bins[0].count++;
      else if (sev <= 5)  bins[1].count++;
      else if (sev <= 8)  bins[2].count++;
      else if (sev <= 12) bins[3].count++;
      else                bins[4].count++;
    });

    return bins;
  }, [analysisResult]);

  const maxBinCount = Math.max(...severityDistribution.map(b => b.count), 1);

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
    const maxCount = Math.max(...breakdownArray.map(c => c.count), 1);
    const categories = ['Legal', 'Privacy', 'Security', 'Financial', 'User'];

    const points = categories.map((label, i) => {
      const breakdown = breakdownArray.find(b => b.category.toLowerCase().includes(label.toLowerCase()));
      const val = breakdown ? breakdown.count : 0;
      const angle = (i * 72 - 90) * (Math.PI / 180);
      const radius = (val / maxCount) * 80;
      return `${100 + radius * Math.cos(angle)},${100 + radius * Math.sin(angle)}`;
    }).join(' ');

    const gridLines = [25, 50, 75, 100].map(radius => {
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
            <line key={i} x1="100" y1="100" x2={100 + 95 * Math.cos(angle)} y2={100 + 95 * Math.sin(angle)} stroke={axisStroke} strokeWidth="0.5" />
          );
        })}
        <polygon points={points} fill="rgba(0, 122, 255, 0.2)" stroke="#007AFF" strokeWidth="2" className="transition-all duration-700" />
        {categories.map((label, i) => {
          const breakdown = breakdownArray.find(b => b.category.toLowerCase().includes(label.toLowerCase()));
          const val = breakdown ? breakdown.count : 0;
          const angle = (i * 72 - 90) * (Math.PI / 180);
          const radius = (val / maxCount) * 80;
          return <circle key={i} cx={100 + radius * Math.cos(angle)} cy={100 + radius * Math.sin(angle)} r="3" fill="#007AFF" />;
        })}
      </svg>
    );
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[10px] font-semibold text-[#007AFF] uppercase tracking-wider">Analysis Results</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Executive Summary</h1>
          {sourceInfo?.type && (
            <a
              onClick={() => { }}
              className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors cursor-pointer"
            >
              {sourceInfo.type === 'url' && <Link size={14} />}
              {(sourceInfo.type === 'pdf' || sourceInfo.type === 'text') && <FileText size={14} />}
              <span>{sourceInfo.value || 'Document'}</span>
            </a>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20">
            <AlertTriangle size={14} className="text-red-400" />
            <span className="text-white/80">{riskyClauses} flagged</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
            <ShieldCheck size={14} className="text-green-400" />
            <span className="text-white/80">{Math.round((nlpCleared / (totalClauses || 1)) * 100)}% safe</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#007AFF]/10 border border-[#007AFF]/20">
            <BrainCircuit size={14} className="text-[#007AFF]" />
            <span className="text-white/80">{Math.round(((totalClauses - (analysisResult?.skipped_llm_count || 0)) / (totalClauses || 1)) * 100)}% deep</span>
          </div>
        </div>
      </div>

      {/* Feature 1: AI Narrative Verdict */}
      {(narrativeVerdict || isVerdictLoading) && (
        <div className="glass-card p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-[#007AFF]/5 to-emerald-500/5 pointer-events-none" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-[#007AFF] flex items-center justify-center">
                <Zap size={14} className="text-white" />
              </div>
              <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                AI Verdict
              </span>
            </div>
            {isVerdictLoading ? (
              <div className="space-y-2">
                <div className="h-4 bg-white/5 rounded animate-pulse w-full" />
                <div className="h-4 bg-white/5 rounded animate-pulse w-3/4" />
                <div className="h-4 bg-white/5 rounded animate-pulse w-5/6" />
              </div>
            ) : (
              <p className="text-base text-white/80 leading-relaxed italic">
                "{narrativeVerdict}"
              </p>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-7 gap-6">
        <div className="col-span-5 glass-card p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#007AFF]/5 to-transparent pointer-events-none" />
          <div className="relative flex items-center gap-12">
            <div className="relative w-32 h-32">
              <div className="absolute inset-0 rounded-full blur-xl opacity-30" style={{ backgroundColor: getScoreColor() }} />
              <svg viewBox="0 0 100 50" className="w-full h-full relative z-10">
                <path
                  d="M 10 45 A 35 35 0 0 1 90 45"
                  fill="none"
                  stroke={theme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'}
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                <path
                  d="M 10 45 A 35 35 0 0 1 90 45"
                  fill="none"
                  stroke={getScoreColor()}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${score * 1.1} 110`}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
                <span className="text-5xl font-bold text-white">{score}</span>
                <span className="text-xs text-white/50 uppercase">/ 100</span>
              </div>
            </div>
            <div className="flex-1 space-y-4">
              <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase ${overallRisk === 'High' ? 'bg-red-500/20 text-red-500' :
                overallRisk === 'Medium' ? 'bg-amber-500/20 text-amber-500' :
                  'bg-green-500/20 text-green-500'
                }`}>
                <AlertTriangle size={14} />
                <span>{overallRisk} Risk</span>
              </div>
              <p className="text-base text-white/60">
                {riskyClauses} of {totalClauses} clauses flagged
              </p>
              <p className="text-sm text-white/40">
                {getScoreDescription()}
              </p>
            </div>
          </div>
        </div>

        <div className="col-span-2 glass-card p-6 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm text-white/50 uppercase">Clauses Flagged</span>
          </div>
          <div className="text-4xl font-bold text-white">{riskyClauses}</div>
          <div className="w-full h-2 bg-white/10 rounded-full mt-3 overflow-hidden">
            <div
              className="h-full bg-[#007AFF] rounded-full transition-all"
              style={{ width: `${totalClauses > 0 ? (riskyClauses / totalClauses) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {[
          { label: 'Total Clauses', value: totalClauses, icon: FileText, color: 'text-blue-400' },
          { label: 'Risky Clauses', value: riskyClauses, icon: AlertTriangle, color: 'text-red-400' },
          { label: 'NLP Cleared', value: nlpCleared, icon: Check, color: 'text-green-400' },
          { label: 'Risk Ratio', value: `${((riskyClauses / (totalClauses || 1)) * 100).toFixed(1)}%`, icon: Target, color: 'text-purple-400' },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="glass-card p-6 hover:border-white/20 transition-all">
              <div className="flex items-center gap-2 mb-3">
                <Icon size={16} className={stat.color} />
                <span className="text-sm text-white/50 uppercase">{stat.label}</span>
              </div>
              <div className="text-3xl font-bold text-white">{stat.value}</div>
            </div>
          );
        })}
      </div>

      {/* Feature 2 + 3: Severity Histogram + Transparency Row */}
      <div className="grid grid-cols-2 gap-6">
        {/* Severity Distribution Histogram */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-amber-400" />
              <span className="text-sm text-white/50 uppercase">Severity Distribution</span>
            </div>
            <span className="text-lg font-bold text-white">
              avg {avgSeverity.toFixed(1)}
            </span>
          </div>
          <div className="flex items-end gap-2 h-24">
            {severityDistribution.map((bin, j) => (
              <div key={j} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-white/50 font-medium">
                  {bin.count > 0 ? bin.count : ''}
                </span>
                <div
                  className="w-full rounded-t-md transition-all duration-700"
                  style={{
                    height: `${bin.count > 0 ? Math.max(8, (bin.count / maxBinCount) * 100) : 4}%`,
                    backgroundColor: bin.count > 0 ? bin.color : (theme === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)'),
                  }}
                />
                <span className="text-[9px] text-white/40 uppercase leading-none text-center">
                  {bin.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Analysis Transparency Card */}
        {analysisTransparency && (
          <div className="glass-card p-6">
            <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <Zap size={18} className="text-emerald-400" />
              How We Analyzed
            </h3>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-full h-8 bg-white/5 rounded-lg overflow-hidden relative">
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white/80 z-10">
                    {analysisTransparency.total} clauses ingested
                  </div>
                  <div className="h-full bg-[#007AFF]/20 rounded-lg" style={{ width: '100%' }} />
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-xs text-white/60">Fast NLP Filter</span>
                  </div>
                  <div className="h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-center">
                    <span className="text-lg font-bold text-emerald-400">
                      {analysisTransparency.nlpFiltered}
                    </span>
                    <span className="text-xs text-emerald-400/60 ml-1.5">
                      ({analysisTransparency.nlpPercent}%)
                    </span>
                  </div>
                  <p className="text-[10px] text-white/40 mt-1 leading-tight">
                    Cleared by keyword & pattern analysis — no AI cost
                  </p>
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-2 h-2 rounded-full bg-[#007AFF]" />
                    <span className="text-xs text-white/60">Deep AI (Cerebras)</span>
                  </div>
                  <div className="h-10 bg-[#007AFF]/10 border border-[#007AFF]/20 rounded-lg flex items-center justify-center">
                    <span className="text-lg font-bold text-[#007AFF]">
                      {analysisTransparency.deepAnalyzed}
                    </span>
                    <span className="text-xs text-[#007AFF]/60 ml-1.5">
                      ({analysisTransparency.deepPercent}%)
                    </span>
                  </div>
                  <p className="text-[10px] text-white/40 mt-1 leading-tight">
                    Full LLM risk assessment with contextual reasoning
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-white/5">
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck size={12} className="text-green-400" />
                    <span className="text-white/60">AI Cleared:</span>
                    <span className="text-green-400 font-semibold">{analysisTransparency.safeFromDeep}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ShieldAlert size={12} className="text-red-400" />
                    <span className="text-white/60">Flagged Risky:</span>
                    <span className="text-red-400 font-semibold">{analysisTransparency.riskyFound}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* NEW: Risk Profile + Analysis Depth Cards */}
      <div className="grid grid-cols-2 gap-6">
        {/* Risk Profile Card */}
        <div className="glass-card p-6">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Activity size={18} className="text-red-400" />
            Risk Profile
          </h3>
          <div className="space-y-4">
            {breakdownArray.length > 0 ? (
              breakdownArray.slice(0, 3).map((cat, i) => {
                const colors = ['bg-red-500', 'bg-amber-500', 'bg-blue-500'];
                const color = colors[i] || colors[0];
                const percentage = ((cat.count / (analysisResult?.risky_clause_count || 1)) * 100).toFixed(0);
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${color}`} />
                        <span className="text-white/90 font-medium">{cat.category}</span>
                      </div>
                      <span className="text-white/60">{cat.count} clauses ({percentage}%)</span>
                    </div>
                    <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${color} rounded-full transition-all`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-white/40">No risk breakdown available.</p>
            )}
          </div>
          {breakdownArray.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="flex items-center gap-2 text-sm">
                <ShieldAlert size={14} className="text-amber-400" />
                <span className="text-white/60">Recommendation:</span>
              </div>
              <p className="text-sm text-white/80 mt-1">
                Review {breakdownArray[0]?.category || 'risk'} clauses carefully
              </p>
            </div>
          )}
        </div>

        {/* Analysis Depth Card */}
        <div className="glass-card p-6">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <BrainCircuit size={18} className="text-[#007AFF]" />
            Analysis Depth
          </h3>
          <div className="flex items-center gap-6">
            <div className="relative w-24 h-24">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="40" fill="none" stroke={theme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'} strokeWidth="10" />
                <circle
                  cx="50" cy="50" r="40" fill="none" stroke="#007AFF" strokeWidth="10"
                  strokeDasharray={`${((totalClauses - (analysisResult?.skipped_llm_count || 0)) / (totalClauses || 1)) * 251.2} 251.2`}
                  strokeLinecap="round"
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">
                  {Math.round(((totalClauses - (analysisResult?.skipped_llm_count || 0)) / (totalClauses || 1)) * 100)}
                </span>
              </div>
            </div>
            <div className="flex-1 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-white/60">AI-Analyzed</span>
                <span className="text-white font-medium">{totalClauses - (analysisResult?.skipped_llm_count || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/60">NLP-Filtered</span>
                <span className="text-white font-medium">{analysisResult?.skipped_llm_count || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Confidence</span>
                <span className="text-green-400 font-medium">High</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Risk Breakdown Radar - Larger */}
        <div className="glass-card p-6">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Activity size={18} className="text-[#007AFF]" />
            Risk Breakdown
          </h3>
          <div className="aspect-square max-w-[360px] mx-auto">
            {renderRadarChart()}
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {['legal', 'privacy', 'security', 'financial', 'user'].map((key, i) => {
              const cat = [{
                key: 'legal', label: 'Legal'
              }, {
                key: 'privacy', label: 'Privacy'
              }, {
                key: 'security', label: 'Security'
              }, {
                key: 'financial', label: 'Financial'
              }, {
                key: 'user', label: 'User Rights'
              }][i];
              return (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className={`w-2 h-2 rounded-full ${key === 'legal' ? 'bg-red-500' :
                    key === 'privacy' ? 'bg-amber-500' :
                      key === 'security' ? 'bg-blue-500' :
                        key === 'financial' ? 'bg-yellow-500' :
                          'bg-gray-500'
                    }`} />
                  <span className="text-white/60">{cat.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Risk Factors - Sexy Cards */}
        <div className="glass-card p-6">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <ShieldAlert size={18} className="text-red-400" />
            Key Risk Factors
          </h3>
          {riskyClauseList.length === 0 ? (
            <p className="text-sm text-white/50">No risky clauses identified.</p>
          ) : (
            <div className="space-y-3">
              {riskyClauseList.slice(0, 3).map((clause, i) => {
                const category = clause.risk_categories?.[0] || 'General';
                const severity = i === 0 ? 'HIGH' : i === 1 ? 'MEDIUM' : 'LOW';
                const severityColor = i === 0 ? 'bg-red-500/20 text-red-400' : i === 1 ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400';
                return (
                  <div key={i} className="p-4 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${severityColor}`}>
                        {severity}
                      </span>
                      <span className="text-xs text-white/50">{category}</span>
                    </div>
                    <p className="text-sm text-white/80 line-clamp-2">{clause.explanation}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        {/* Compact Health Checklist */}
        <div className="flex items-center gap-2">
          {healthCheckItems.slice(0, 5).map((item, i) => (
            <div
              key={i}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border ${
                item.passed
                  ? 'bg-green-500/10 border-green-500/30 text-green-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}
            >
              {item.passed ? <Check size={12} /> : <AlertTriangle size={12} />}
              <span>{item.name}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => onNavigate && onNavigate('clauses')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#007AFF] to-[#0056cc] text-white text-sm font-semibold hover:shadow-lg hover:shadow-[#007AFF]/30"
          >
            <span>View All Flagged Clauses</span>
            <ArrowRight size={16} />
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white/80 hover:bg-white/10 transition-all">
            <Download size={14} />
            <span>Export</span>
          </button>
        </div>
      </div>
    </div>
  );
}