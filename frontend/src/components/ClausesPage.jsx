import React, { useState, useMemo } from 'react';
import { Filter, AlertTriangle, Activity, Info } from 'lucide-react';
import { useTheme } from './theme-context.js';
import {
  filterClauses,
  getSeveritySeries,
  getConfidenceCounts,
} from '@/features/analysis/model/selectors';

export default function ClausesPage({
  analysisResult,
  sourceInfo,
  onExplainRiskInChat,
  onToggleChat
}) {
  const { theme } = useTheme();
  const [filters, setFilters] = useState({
    riskLevel: 'all',
    severity: 'all',
    confidence: 'all',
  });
  const [expandedCardId, setExpandedCardId] = useState(null); // NEW: expandable state

  const clauses = useMemo(() => filterClauses(analysisResult, filters), [analysisResult, filters]);
  const severitySeries = useMemo(() => getSeveritySeries(analysisResult), [analysisResult]);

  const totalClauses = analysisResult?.clauses?.length || 0;
  const filteredCount = clauses.length;
  const renderConfidenceRing = (confidence) => {
    const confValue = confidence === 'High' ? 90 : confidence === 'Medium' ? 60 : 30;
    const color = confidence === 'High' ? '#ef4444' : confidence === 'Medium' ? '#f59e0b' : '#22c55e';

    return (
      <div className="relative w-14 h-14">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          <circle
            cx="18"
            cy="18"
            r="15"
            fill="none"
            stroke={theme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'}
            strokeWidth="3"
          />
          <circle
            cx="18"
            cy="18"
            r="15"
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeDasharray={`${confValue} 100`}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
          {confValue}
        </span>
      </div>
    );
  };

  const renderSeverityBar = () => {
    const data = severitySeries;
    if (data.length === 0) {
      return (
        <div className="h-32 flex flex-col items-center justify-center border border-white/5 bg-white/5 rounded-lg">
          <Info size={24} className="text-white/20 mb-2" />
          <p className="text-xs text-white/40">No clauses to map</p>
        </div>
      );
    }

    const maxSeverity = Math.max(...data.map(d => d.severity), 1);
    const avgSeverity = data.reduce((sum, d) => sum + d.severity, 0) / (data.length || 1);
    const highRiskZones = data.filter(d => d.severity >= 5).length;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between text-[10px] text-white/30 uppercase tracking-widest font-bold">
          <span>Start of Doc</span>
          <span>End of Doc</span>
        </div>
        <div className="h-20 flex items-end gap-[1px]">
          {data.map((d, i) => {
            const barHeight = Math.max(8, (d.severity / maxSeverity) * 100);
            return (
              <div
                key={i}
                className="flex-1 rounded-t-sm transition-all hover:scale-y-110 origin-bottom cursor-help"
                style={{
                  height: `${barHeight}%`,
                  backgroundColor: d.isRisky
                    ? (d.severity >= 5 ? '#ef4444' : '#f59e0b')
                    : 'rgba(255,255,255,0.1)',
                  opacity: d.isRisky ? 1 : 0.4
                }}
                title={`Clause ${i + 1}: Sev ${d.severity.toFixed(1)}`}
              />
            );
          })}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2 rounded bg-white/5 border border-white/5">
            <p className="text-[10px] text-white/30 uppercase mb-1">Avg Sev</p>
            <p className="text-sm font-bold text-white">{avgSeverity.toFixed(1)}</p>
          </div>
          <div className="p-2 rounded bg-white/5 border border-white/5 text-center">
            <p className="text-[10px] text-white/30 uppercase mb-1">Max</p>
            <p className="text-sm font-bold text-white">{maxSeverity.toFixed(1)}</p>
          </div>
          <div className="p-2 rounded bg-white/5 border border-white/5 text-right">
            <p className="text-[10px] text-white/30 uppercase mb-1">Critical</p>
            <p className="text-sm font-bold text-red-400">{highRiskZones}</p>
          </div>
        </div>
      </div>
    );
  };

  const selectedCategoryCounts = useMemo(() => getConfidenceCounts(analysisResult), [analysisResult]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Clause map */}
      <div className="bg-gradient-to-b from-[#0a0a0a] to-transparent px-8 py-8 border-b border-white/5">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-black text-white tracking-tighter">Clause Review</h2>
              <p className="text-sm text-white/40 font-bold uppercase tracking-widest mt-1">
                Clause severity across the document — {sourceInfo?.value || 'Current Analysis'}
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">Filtered Scope</p>
                <p className="text-lg font-black text-white tracking-tight">{filteredCount} of {totalClauses} Clauses</p>
              </div>
              <div className="h-10 w-px bg-white/10" />
              <div className="text-right">
                <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">Risk Profile</p>
                <div className="w-32 h-1.5 bg-white/10 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-red-500 to-amber-500 rounded-full transition-all duration-1000"
                    style={{ width: `${totalClauses > 0 ? (clauses.filter(c => c.is_risky).length / totalClauses) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#007AFF]/5 blur-[100px] pointer-events-none" />
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xs font-black text-white/50 uppercase tracking-[0.2em] flex items-center gap-2">
                <Activity size={14} className="text-[#007AFF]" />
                Severity by document position
              </h3>
              <div className="flex items-center gap-4 text-[9px] font-black tracking-widest text-white/30">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" /> CRITICAL</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> MODERATE</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-white/10" /> NOT FLAGGED</span>
              </div>
            </div>
            <div className="h-40">{renderSeverityBar()}</div>
          </div>
        </div>
      </div>

      <div className="flex-1 px-8 py-6 space-y-6 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-3 flex-wrap">
              <Filter size={16} className="text-indigo-500 mr-2" />
              {['riskLevel', 'severity', 'confidence'].map(filterKey => (
                <select
                  key={filterKey}
                  value={filters[filterKey]}
                  onChange={(e) => setFilters(prev => ({ ...prev, [filterKey]: e.target.value }))}
                  className="h-10 px-4 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-white/80 focus:outline-none focus:border-[#007AFF]/50 transition-all hover:bg-white/10"
                >
                  <option value="all">{filterKey === 'riskLevel' ? 'ALL RISK' : filterKey === 'severity' ? 'ALL SEVERITY' : 'ALL CONFIDENCE'}</option>
                  {filterKey === 'riskLevel' && (
                    <>
                      <option value="risky">RISKY ONLY</option>
                      <option value="safe">SAFE ONLY</option>
                    </>
                  )}
                  {filterKey === 'severity' && (
                    <>
                      <option value="high">HIGH RISK (≥5)</option>
                      <option value="medium">MEDIUM RISK (2-5)</option>
                      <option value="low">LOW RISK (&lt;2)</option>
                    </>
                  )}
                  {filterKey === 'confidence' && (
                    <>
                      <option value="High">HIGH CONFIDENCE</option>
                      <option value="Medium">MEDIUM CONFIDENCE</option>
                      <option value="Low">LOW CONFIDENCE</option>
                    </>
                  )}
                </select>
              ))}
            </div>

            <div className="flex items-center gap-4">
              <div className="glass-card px-4 py-2 flex items-center gap-3">
                <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Confidence Dist:</span>
                <div className="flex gap-1.5">
                  {Object.entries(selectedCategoryCounts).map(([conf, count]) => (
                    <div
                      key={conf}
                      className={`w-6 h-1.5 rounded-full ${conf === 'High' ? 'bg-red-500' : conf === 'Medium' ? 'bg-amber-500' : 'bg-green-500'}`}
                      style={{ opacity: count > 0 ? 1 : 0.2 }}
                      title={`${conf}: ${count}`}
                    />
                  ))}
                </div>
              </div>
              <button
                onClick={onToggleChat}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all"
              >
                <MessageSquare size={16} />
                Ask about clauses
              </button>
            </div>
          </div>

          <div className="grid gap-6">
            {clauses.length === 0 ? (
              <div className="glass-card p-20 text-center border-dashed border-2">
                <Shield size={64} className="mx-auto text-white/5 mb-6" />
                <h3 className="text-xl font-bold text-white/60 mb-2">No Matching Clauses</h3>
                <p className="text-sm text-white/30">Try adjusting your filters to see more analysis.</p>
              </div>
            ) : (
              clauses.slice(0, 50).map((clause, idx) => {
                const isRisky = clause.is_risky;
                const isExpanded = expandedCardId === idx;
                const severityLevel = clause.severity_score >= 5 ? 'HIGH' : clause.severity_score >= 2 ? 'MEDIUM' : 'LOW';
                const severityColor = clause.severity_score >= 5 ? 'bg-red-500/20 text-red-400' : clause.severity_score >= 2 ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400';

                return (
                  <div
                    key={idx}
                    id={`clause-${idx}`}
                    className={`glass-card p-0 overflow-hidden transition-all duration-500 border-none group ${isRisky ? 'bg-gradient-to-r from-red-500/[0.03] to-transparent' : 'bg-gradient-to-r from-green-500/[0.02] to-transparent'}`}
                  >
                    <div className={`h-full border-l-[3px] ${isRisky ? 'border-red-500/50 group-hover:border-red-500' : 'border-green-500/20 group-hover:border-green-500/50'} transition-all`}>
                      {isRisky ? (
                        <div className="p-6">
                          <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-4">
                              <span className={`text-[10px] font-black px-3 py-1 rounded-full tracking-widest shadow-sm ${severityColor}`}>
                                {severityLevel} RISK
                              </span>
                              <span className="text-xs font-black text-white/60 uppercase tracking-widest">{clause.risk_categories?.[0] || 'General Liability'}</span>
                              <div className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[10px] font-bold text-white/40 tracking-tight">
                                IMPACT: {clause.severity_score?.toFixed(1) || '0.0'}
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Confidence</p>
                                <p className={`text-xs font-black ${clause.confidence === 'High' ? 'text-red-500' : clause.confidence === 'Medium' ? 'text-amber-500' : 'text-green-500'}`}>{clause.confidence}</p>
                              </div>
                              {renderConfidenceRing(clause.confidence)}
                            </div>
                          </div>

                          <div className="space-y-6">
                            <p className={`text-lg font-medium leading-relaxed font-serif tracking-tight ${theme === 'light' ? 'text-gray-800' : 'text-white/90'} ${!isExpanded ? 'line-clamp-2' : ''}`}>
                              {clause.explanation}
                            </p>

                            {isExpanded && (
                              <div className="pt-6 border-t border-white/5 space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                  <div className="space-y-3">
                                    <h4 className="text-[10px] font-black text-[#007AFF] uppercase tracking-[0.2em] flex items-center gap-2">
                                      <FileText size={12} />
                                      Source Provision
                                    </h4>
                                    <div className="p-6 rounded-2xl bg-black/40 border border-white/5 text-sm text-white/50 font-mono leading-relaxed max-h-80 overflow-y-auto selection:bg-[#007AFF]/30">
                                      {clause.text}
                                    </div>
                                  </div>
                                  <div className="space-y-6">
                                    <div className="space-y-3">
                                      <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <Zap size={12} />
                                        Review note
                                      </h4>
                                      <div className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-sm text-amber-100/70 leading-relaxed shadow-inner">
                                        Use the source text and explanation as a starting point. Check the exact wording before relying on the score.
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 transition-colors hover:bg-blue-500/10">
                                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-1">Risk category</p>
                                        <p className="text-xs text-blue-100/50 leading-snug">{(clause.risk_categories || ['General']).join(', ')}</p>
                                      </div>
                                      <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/10 transition-colors hover:bg-purple-500/10">
                                        <p className="text-[10px] font-black text-purple-400 uppercase tracking-[0.2em] mb-1">Confidence</p>
                                        <p className="text-xs text-purple-100/50 leading-snug">{clause.confidence || 'Not provided'}</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/5">
                            <div className="flex items-center gap-3">
                              <div className="flex -space-x-2">
                                {[1, 2, 3].map(i => (
                                  <div key={i} className="w-6 h-6 rounded-full border border-[#0a0a0a] bg-white/5 flex items-center justify-center">
                                    <Shield size={10} className="text-white/20" />
                                  </div>
                                ))}
                              </div>
                              <span className="text-[10px] text-white/30 font-black uppercase tracking-widest">Analysis context</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onExplainRiskInChat && onExplainRiskInChat(clause, idx);
                                  onToggleChat && onToggleChat();
                                }}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#007AFF] text-white text-[11px] font-black uppercase tracking-tighter hover:bg-[#0056cc] transition-all shadow-[0_8px_20px_-8px_rgba(0,122,255,0.4)] active:scale-95"
                              >
                                <MessageSquare size={14} />
                                Ask about this clause
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedCardId(isExpanded ? null : idx);
                                }}
                                className={`px-5 py-2.5 rounded-xl border text-[11px] font-black uppercase tracking-tighter transition-all ${isExpanded ? 'bg-white/10 border-white/20 text-white' : 'bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10'}`}
                              >
                                {isExpanded ? 'Hide details' : 'Show details'}
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-5 flex items-center justify-between group/safe transition-all hover:bg-green-500/[0.02]">
                          <div className="flex items-center gap-5">
                            <div className="w-10 h-10 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500 shadow-sm border border-green-500/20 group-hover/safe:scale-110 transition-transform">
                              <Check size={20} strokeWidth={3} />
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-1">Clause {idx + 1}</p>
                              <p className="text-base text-white/40 italic font-medium truncate max-w-2xl group-hover/safe:text-white/60 transition-colors">"{clause.text?.slice(0, 100)}..."</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <span className="text-[10px] font-black text-green-500/40 uppercase tracking-widest border border-green-500/20 px-3 py-1 rounded-full">No risk flag</span>
                            {renderConfidenceRing(clause.confidence)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
