import React from 'react';
import { Scale, Plus, MessageSquare, ArrowLeft, AlertTriangle, Shield, Trophy, Crown, FileText, Info } from 'lucide-react';
import { useTheme } from './ThemeProvider.jsx';
import { getScoreColor, getRiskColor } from '../utils/colorUtils';

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

  const textClass = theme === 'light' ? 'text-gray-900' : 'text-white';
  const subTextClass = theme === 'light' ? 'text-gray-500' : 'text-white/60';
  const mutedTextClass = theme === 'light' ? 'text-gray-400' : 'text-white/40';

  const renderScoreGauge = (score, label, risk, isWinner, docStats) => {
    const scoreColor = getScoreColor(score);
    const riskColor = getRiskColor(risk);

    return (
      <div className={`glass-card p-6 relative overflow-hidden ${isWinner ? (theme === 'light' ? 'border-2 border-green-500/30 bg-green-50/20' : 'border-2 border-green-500/50') : ''}`}>
        {isWinner && (
          <div className="absolute top-2 right-2">
            <Trophy size={20} className="text-amber-400" />
          </div>
        )}
        <div className="flex items-center gap-2 mb-4">
          <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: riskColor }} />
          <h3 className={`text-lg font-bold ${textClass}`}>{isWinner ? '🏆 SAFER' : '⚠️ RISKIER'} DOC</h3>
        </div>

        <p className={`${subTextClass} text-sm mb-4 truncate`}>{label}</p>

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
              <span className={`text-4xl font-bold ${textClass}`}>{score}</span>
              <span className={`text-xs ${mutedTextClass}`}>/ 100</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 mb-2">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold`} style={{ backgroundColor: `${riskColor}20`, color: riskColor }}>
            {risk} Risk
          </span>
        </div>

        <div className={`flex justify-between text-sm border-t ${theme === 'light' ? 'border-gray-100' : 'border-white/10'} pt-3 mt-3`}>
          <span className={mutedTextClass}>Risky Clauses</span>
          <span className={`font-medium ${textClass}`}>{docStats?.risky_clause_count || 0}/{docStats?.total_clauses || 0}</span>
        </div>
      </div>
    );
  };

  if (isComparing) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#007AFF]/30 border-t-[#007AFF] rounded-full animate-spin mx-auto mb-4" />
          <p className={subTextClass}>Comparing documents...</p>
        </div>
      </div>
    );
  }

  if (!comparisonData) {
    return (
      <div className="space-y-6">
        <div className="glass-card p-8 text-center">
          <Scale size={48} className={`mx-auto mb-4 ${theme === 'light' ? 'text-gray-300' : 'text-white/30'}`} />
          <h2 className={`text-xl font-semibold mb-2 ${textClass}`}>Document Comparison</h2>
          <p className={`${subTextClass} mb-6`}>Select two analyzed documents to compare risk profiles side-by-side.</p>
          {historyItems.length < 2 ? (
            <p className={`${mutedTextClass} text-sm`}>Need at least 2 analyzed documents to compare.</p>
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

        {compareHistory?.length > 0 ? (
          <div>
            <h3 className={`text-sm font-semibold uppercase mb-3 ${mutedTextClass}`}>Past Comparisons (This Session)</h3>
            <div className="space-y-2">
              {compareHistory.map(c => (
                <button key={c.compare_id} onClick={() => onOpenCompareHistory(c.compare_id)}
                  className="w-full glass-card p-4 text-left hover:bg-white/10 transition-all">
                  <div className="flex justify-between">
                    <span className={`text-sm ${textClass}`}>{c.source_a} vs {c.source_b}</span>
                    <span className={`text-xs ${mutedTextClass}`}>{new Date(c.created_at).toLocaleDateString()}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="glass-card p-4">
            <p className={mutedTextClass}>No saved comparisons in this session yet.</p>
          </div>
        )}
      </div>
    );
  }

  const { doc_a, doc_b, categories, overall_winner, verdict } = comparisonData;

  const docAName = doc_a?.label || doc_a?.source || 'Document A';
  const docBName = doc_b?.label || doc_b?.source || 'Document B';
  const scoreA = doc_a?.score || 0;
  const scoreB = doc_b?.score || 0;
  const isAWinner = overall_winner === 'A';
  const isBWinner = overall_winner === 'B';
  const winnerName = isAWinner ? docAName : isBWinner ? docBName : 'Neither';
  const scoreDiff = Math.abs(scoreA - scoreB);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className={`text-2xl font-bold ${textClass}`}>Document Comparison</h1>
        <button
          onClick={onNewComparison}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-all ${theme === 'light' ? 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50' : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'}`}
        >
          <ArrowLeft size={16} />
          New Comparison
        </button>
      </div>

      {/* Summary banner */}
      <div className={`relative overflow-hidden border rounded-2xl p-6 ${theme === 'light' ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100' : 'bg-gradient-to-r from-[#0A2540] to-[#1a3a5c] border-[#635BFF]/30'}`}>
        <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 ${theme === 'light' ? 'bg-blue-200/50' : 'bg-[#635BFF]/10'}`} />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            {isAWinner ? (
              <div className="w-12 h-12 rounded-xl bg-[#635BFF] flex items-center justify-center shadow-lg shadow-[#635BFF]/30">
                <Trophy size={24} className="text-white" />
              </div>
            ) : isBWinner ? (
              <div className="w-12 h-12 rounded-xl bg-[#635BFF] flex items-center justify-center shadow-lg shadow-[#635BFF]/30">
                <Trophy size={24} className="text-white" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Scale size={24} className="text-white" />
              </div>
            )}
            <div>
              <p className={`text-lg font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                {isAWinner
                  ? `${docAName} is the safer choice`
                  : isBWinner
                    ? `${docBName} is the safer choice`
                    : 'Similar risk levels'
                }
              </p>
              <p className={`text-sm mt-1 font-medium ${theme === 'light' ? 'text-gray-600' : 'text-white/60'}`}>
                {verdict || (scoreDiff > 0 ? `${scoreDiff} points difference` : 'No clear winner')}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest shadow-sm ${isAWinner || isBWinner ? 'bg-green-500/10 border border-green-500/20 text-green-600 uppercase' : 'bg-amber-500/10 border border-amber-500/20 text-amber-600 uppercase'}`}>
              {isAWinner || isBWinner ? 'Recommended' : 'Tie'}
            </span>
          </div>
        </div>
      </div>

      {/* Score Gauges */}
      <div className="grid grid-cols-2 gap-6">
        {renderScoreGauge(scoreA, doc_a?.label, doc_a?.risk, isAWinner, doc_a)}
        {renderScoreGauge(scoreB, doc_b?.label, doc_b?.risk, !isAWinner, doc_b)}
      </div>

      {/* Category Comparison */}
      <div className="glass-card p-6">
        <h3 className={`text-lg font-bold mb-6 flex items-center gap-2 ${textClass}`}>
          <Scale size={20} className="text-[#007AFF]" />
          Detailed Comparison
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
              <div key={idx} className={`p-5 rounded-xl border transition-all ${theme === 'light' ? 'bg-gray-50/50 border-gray-100 hover:bg-gray-50' : 'bg-white/5 border-white/10 hover:border-white/20'}`}>
                <div className="flex items-center justify-between mb-4">
                  <span className={`font-bold tracking-tight ${textClass}`}>{cat.category}</span>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${mutedTextClass}`}>
                    {countA} vs {countB} Risks
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] uppercase tracking-widest font-bold">
                      <span className={mutedTextClass}>Doc A</span>
                      <span className={catWinner === 'A' ? 'text-green-500' : mutedTextClass}>{countA}</span>
                    </div>
                    <div className={`h-2.5 rounded-full overflow-hidden ${theme === 'light' ? 'bg-gray-200' : 'bg-white/10'}`}>
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${catWinner === 'A' ? 'bg-green-500' : 'bg-blue-400'}`}
                        style={{ width: `${pctA}%` }}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] uppercase tracking-widest font-bold">
                      <span className={mutedTextClass}>Doc B</span>
                      <span className={catWinner === 'B' ? 'text-green-500' : mutedTextClass}>{countB}</span>
                    </div>
                    <div className={`h-2.5 rounded-full overflow-hidden ${theme === 'light' ? 'bg-gray-200' : 'bg-white/10'}`}>
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${catWinner === 'B' ? 'bg-green-500' : 'bg-red-400'}`}
                        style={{ width: `${pctB}%` }}
                      />
                    </div>
                  </div>
                </div>

                {cat.reasoning && (
                  <div className={`flex items-start gap-3 pt-4 border-t ${theme === 'light' ? 'border-gray-100' : 'border-white/10'}`}>
                    <div className="mt-0.5 p-1 rounded-full bg-[#007AFF]/10">
                      <Info size={12} className="text-[#007AFF]" />
                    </div>
                    <p className={`text-sm leading-relaxed ${subTextClass}`}>{cat.reasoning}</p>
                  </div>
                )}
              </div>
            );
          })}

          {(!categories || categories.length === 0) && (
            <div className="text-center py-8">
              <p className={`text-sm ${mutedTextClass}`}>No category data available.</p>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={onDiscussInChat}
        className="w-full py-4 rounded-xl bg-[#007AFF] text-white font-bold hover:bg-[#0056cc] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#007AFF]/20"
      >
        <MessageSquare size={18} />
        Start In-Depth Discussion
      </button>
    </div>
  );
}
