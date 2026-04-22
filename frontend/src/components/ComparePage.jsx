import React from 'react';
import { Scale, Plus, MessageSquare, ArrowLeft, AlertTriangle, Shield, Trophy, Crown, FileText, Info } from 'lucide-react';
import { useTheme } from './ThemeProvider.jsx';

export default function ComparePage({
  comparisonData,
  historyItems,
  isComparing,
  compareHistory,
  onOpenCompareHistory,
  onSelectDocuments,
  onNewComparison,
  onDiscussInChat,
  calculateScore,
}) {
  const { theme } = useTheme();
  
  const getRiskColor = (risk) => {
    if (risk === 'High') return '#ef4444';
    if (risk === 'Medium') return '#f59e0b';
    return '#22c55e';
  };

  const getScoreColor = (score) => {
    if (score >= 75) return '#22c55e';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const renderScoreGauge = (score, label, risk, isWinner) => {
    const scoreColor = getScoreColor(score);
    const riskColor = getRiskColor(risk);
    
    return (
      <div className={`glass-card p-6 relative overflow-hidden ${isWinner ? 'border-2 border-green-500/50' : ''}`}>
        {isWinner && (
          <div className="absolute top-2 right-2">
            <Trophy size={20} className="text-amber-400" />
          </div>
        )}
        <div className="flex items-center gap-2 mb-4">
          <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: riskColor }} />
          <h3 className="text-lg font-bold text-white">{isWinner ? '🏆 SAFER' : '⚠️ RISKIER'} DOC</h3>
        </div>
        
        <p className="text-white/60 text-sm mb-4 truncate">{label}</p>
        
        <div className="flex items-center justify-center mb-4">
          <div className="relative w-28 h-28">
            <svg viewBox="0 0 100 50" className="w-full h-full">
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
                stroke={scoreColor}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${score * 1.1} 110`}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
              <span className="text-4xl font-bold text-white">{score}</span>
              <span className="text-xs text-white/50">/ 100</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold`} style={{ backgroundColor: `${riskColor}20`, color: riskColor }}>
            {risk} Risk
          </span>
        </div>
        
        <div className="flex justify-between text-sm border-t border-white/10 pt-3 mt-3">
          <span className="text-white/50">Risky</span>
          <span className="text-white font-medium">{comparisonData?.doc_a?.risky_clause_count || 0}/{comparisonData?.doc_a?.total_clauses || 0}</span>
        </div>
      </div>
    );
  };

  if (isComparing) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#007AFF]/30 border-t-[#007AFF] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">Comparing documents...</p>
        </div>
      </div>
    );
  }

  if (!comparisonData) {
    return (
      <div className="space-y-6">
        <div className="glass-card p-8 text-center">
          <Scale size={48} className="mx-auto text-white/30 mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Document Comparison</h2>
          <p className="text-white/50 mb-6">Select two analyzed documents to compare risk profiles side-by-side.</p>
          {historyItems.length < 2 ? (
            <p className="text-white/40 text-sm">Need at least 2 analyzed documents to compare.</p>
          ) : (
            <button
              onClick={onSelectDocuments}
              className="px-6 py-3 rounded-lg bg-gradient-to-r from-[#007AFF] to-[#0056cc] text-white font-semibold"
            >
              <Plus size={18} className="inline mr-2" />
              Select Documents
            </button>
          )}
        </div>

        {compareHistory?.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-white/50 uppercase mb-3">Past Comparisons</h3>
            <div className="space-y-2">
              {compareHistory.map(c => (
                <button key={c.compare_id} onClick={() => onOpenCompareHistory(c.compare_id)}
                  className="w-full glass-card p-4 text-left hover:bg-white/10 transition-all">
                  <div className="flex justify-between">
                    <span className="text-sm text-white">{c.source_a} vs {c.source_b}</span>
                    <span className="text-xs text-white/40">{new Date(c.created_at).toLocaleDateString()}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const { doc_a, doc_b, categories, overall_winner, verdict } = comparisonData;
  
  const scoreA = doc_a?.score || 0;
  const scoreB = doc_b?.score || 0;
  const isAFaster = scoreA > scoreB;
  const scoreDiff = Math.abs(scoreA - scoreB);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Document Comparison</h1>
        <button
          onClick={onNewComparison}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white/80 hover:bg-white/10"
        >
          <ArrowLeft size={16} />
          New Comparison
        </button>
      </div>

      {/* Verdict Banner */}
      <div className="glass-card p-5 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-amber-500/10" />
        <div className="relative flex items-center justify-center gap-3">
          {isAFaster ? (
            <Trophy size={24} className="text-amber-400" />
          ) : (
            <AlertTriangle size={24} className="text-red-400" />
          )}
          <p className="text-lg font-semibold text-white">
            {isAFaster 
              ? `Document A is ${scoreDiff} points safer` 
              : `Document B is ${scoreDiff} points safer`
            }
          </p>
        </div>
        <p className="text-sm text-white/50 mt-1">{verdict || 'Similar risk levels'}</p>
      </div>

      {/* Score Gauges */}
      <div className="grid grid-cols-2 gap-6">
        {renderScoreGauge(scoreA, doc_a?.label, doc_a?.risk, isAFaster)}
        {renderScoreGauge(scoreB, doc_b?.label, doc_b?.risk, !isAFaster)}
      </div>

      {/* Category Comparison */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Scale size={20} className="text-[#007AFF]" />
          Category Comparison
        </h3>
        <div className="space-y-4">
          {categories?.map((cat, idx) => {
            const countA = cat.doc_a_risk_count || cat.clauses_a || 0;
            const countB = cat.doc_b_risk_count || cat.clauses_b || 0;
            const maxCount = Math.max(countA, countB, 1);
            const pctA = (countA / maxCount) * 100;
            const pctB = (countB / maxCount) * 100;
            const catWinner = countA < countB ? 'A' : countB < countA ? 'B' : 'tie';
            
            return (
              <div key={idx} className="p-4 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white font-medium">{cat.category}</span>
                  <span className="text-xs text-white/40">
                    {countA} vs {countB} clauses
                  </span>
                </div>
                
                <div className="space-y-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/50 w-8">Doc A</span>
                    <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${catWinner === 'A' ? 'bg-green-500' : 'bg-white/30'}`}
                        style={{ width: `${pctA}%` }}
                      />
                    </div>
                    <span className="text-xs text-white/60 w-6">{countA}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/50 w-8">Doc B</span>
                    <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${catWinner === 'B' ? 'bg-red-500' : 'bg-white/30'}`}
                        style={{ width: `${pctB}%` }}
                      />
                    </div>
                    <span className="text-xs text-white/60 w-6">{countB}</span>
                  </div>
                </div>

                {cat.reasoning && (
                  <div className="flex items-start gap-2 pt-2 border-t border-white/10">
                    <Info size={14} className="text-white/40 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-white/70">{cat.reasoning}</p>
                  </div>
                )}
              </div>
            );
          })}
          
          {(!categories || categories.length === 0) && (
            <p className="text-sm text-white/40 text-center py-4">No category data available.</p>
          )}
        </div>
      </div>

      <button
        onClick={onDiscussInChat}
        className="w-full py-3 rounded-lg bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 text-center flex items-center justify-center gap-2"
      >
        <MessageSquare size={18} />
        Discuss in Chat
      </button>
    </div>
  );
}