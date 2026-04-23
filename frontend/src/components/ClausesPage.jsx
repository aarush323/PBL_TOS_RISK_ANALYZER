import React, { useState, useMemo } from 'react';
import { Filter, AlertTriangle, Shield, Lock, Eye, DollarSign, UserCheck, Scale, MessageSquare, Check } from 'lucide-react';
import { useTheme } from './ThemeProvider.jsx';

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
  const [selectedClause, setSelectedClause] = useState(null);
  const [expandedCardId, setExpandedCardId] = useState(null); // NEW: expandable state

  const clauses = useMemo(() => {
    if (!Array.isArray(analysisResult?.clauses)) return [];
    return analysisResult.clauses.filter(c => {
      if (filters.riskLevel !== 'all' && c.is_risky !== (filters.riskLevel === 'risky')) return false;
      if (filters.confidence !== 'all' && c.confidence !== filters.confidence) return false;
      if (filters.severity !== 'all') {
        const severityScore = c.severity_score || 0;
        if (filters.severity === 'high' && severityScore < 5) return false;
        if (filters.severity === 'medium' && (severityScore < 2 || severityScore >= 5)) return false;
        if (filters.severity === 'low' && severityScore >= 2) return false;
      }
      return true;
    });
  }, [analysisResult, filters]);

  const totalClauses = analysisResult?.clauses?.length || 0;
  const filteredCount = clauses.length;
  const progress = totalClauses > 0 ? ((totalClauses - filteredCount) / totalClauses) * 100 : 0;

  const getCategoryIcon = (category) => {
    const cat = category?.toLowerCase() || '';
    if (cat.includes('legal')) return <Scale size={14} />;
    if (cat.includes('privacy')) return <Eye size={14} />;
    if (cat.includes('security')) return <Lock size={14} />;
    if (cat.includes('financial')) return <DollarSign size={14} />;
    if (cat.includes('user')) return <UserCheck size={14} />;
    return <Shield size={14} />;
  };

  const getCategoryColor = (category) => {
    const cat = category?.toLowerCase() || '';
    if (cat.includes('legal')) return 'text-red-500 bg-red-500/10 border-red-500/30';
    if (cat.includes('privacy')) return 'text-amber-500 bg-amber-500/10 border-amber-500/30';
    if (cat.includes('security')) return 'text-blue-500 bg-blue-500/10 border-blue-500/30';
    if (cat.includes('financial')) return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30';
    if (cat.includes('user')) return 'text-gray-500 bg-gray-500/10 border-gray-500/30';
    return 'text-white/50 bg-white/5 border-white/10';
  };

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
    const allClauses = analysisResult?.clauses || [];
    const data = allClauses.map((c, i) => ({
      position: c.position_weight || (i / allClauses.length) * 100,
      severity: Number(c.severity_score) || 0,
      isRisky: c.is_risky
    }));

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

  const selectedCategoryCounts = useMemo(() => {
    const counts = { High: 0, Medium: 0, Low: 0 };
    if (Array.isArray(analysisResult?.clauses)) {
      analysisResult.clauses.forEach(c => {
        if (c.confidence) counts[c.confidence] = (counts[c.confidence] || 0) + 1;
      });
    }
    return counts;
  }, [analysisResult]);

  return (
    <div className="flex h-full">
      <div className="flex-1 p-6 space-y-4 overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Clause Analysis</h2>
            <p className="text-sm text-white/50">
              {sourceInfo?.value || 'Document'} — {filteredCount} of {totalClauses} clauses
            </p>
          </div>
        </div>

        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#007AFF] to-[#00c6ff] rounded-full transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap mb-6">
          <Filter size={14} className="text-white/50" />
          {['riskLevel', 'severity', 'confidence'].map(filterKey => (
            <select
              key={filterKey}
              value={filters[filterKey]}
              onChange={(e) => setFilters(prev => ({ ...prev, [filterKey]: e.target.value }))}
              className="h-9 px-4 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-[#007AFF]/50 transition-colors"
            >
              <option value="all">{filterKey === 'riskLevel' ? 'All Risk' : filterKey === 'severity' ? 'All Severity' : 'All Confidence'}</option>
              {filterKey === 'riskLevel' && (
                <>
                  <option value="risky">Risky Only</option>
                  <option value="safe">Safe Only</option>
                </>
              )}
              {filterKey === 'severity' && (
                <>
                  <option value="high">High Risk (≥5)</option>
                  <option value="medium">Medium Risk (2-5)</option>
                  <option value="low">Low Risk (&lt;2)</option>
                </>
              )}
              {filterKey === 'confidence' && (
                <>
                  <option value="High">High Confidence</option>
                  <option value="Medium">Medium Confidence</option>
                  <option value="Low">Low Confidence</option>
                </>
              )}
            </select>
          ))}
        </div>

        <div className="grid gap-4">
          {clauses.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <Shield size={48} className="mx-auto text-white/10 mb-4" />
              <p className="text-white/40">No clauses match the selected filters.</p>
            </div>
          ) : (
            clauses.slice(0, 30).map((clause, idx) => {
              const isRisky = clause.is_risky;
              const isExpanded = expandedCardId === idx;
              const severityLevel = clause.severity_score >= 5 ? 'HIGH' : clause.severity_score >= 2 ? 'MEDIUM' : 'LOW';
              const severityColor = clause.severity_score >= 5 ? 'bg-red-500/20 text-red-400' : clause.severity_score >= 2 ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400';

              return (
                <div
                  key={idx}
                  className={`glass-card p-0 overflow-hidden transition-all duration-300 hover:border-white/20 ${isRisky ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-green-500/30'}`}
                >
                  {isRisky ? (
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] font-black px-2 py-1 rounded tracking-widest ${severityColor}`}>
                            {severityLevel} RISK
                          </span>
                          <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                          <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">{clause.risk_categories?.[0] || 'General'}</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                          <span className="text-xs font-medium text-white/40">Score: {clause.severity_score?.toFixed(1) || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {renderConfidenceRing(clause.confidence)}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="relative">
                          <p className={`text-base text-white/90 leading-relaxed font-medium ${!isExpanded ? 'line-clamp-2' : ''}`}>
                            {clause.explanation}
                          </p>
                        </div>

                        {isExpanded && (
                          <div className="pt-4 mt-4 border-t border-white/5 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                <h4 className="text-[10px] font-bold text-[#007AFF] uppercase tracking-widest">Original Text</h4>
                                <div className="p-4 rounded-xl bg-black/40 border border-white/5 text-sm text-white/60 font-mono leading-relaxed max-h-60 overflow-y-auto">
                                  {clause.text}
                                </div>
                              </div>
                              <div className="space-y-2">
                                <h4 className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Mitigation Strategy</h4>
                                <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 text-sm text-amber-200/80 leading-relaxed">
                                  Seek documentation on how this clause is enforced or negotiate for a more balanced wording that protects your liability.
                                </div>
                                <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 mt-2">
                                  <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Jurisdiction Impact</p>
                                  <p className="text-xs text-blue-200/70">Standard for US/EU legal frameworks but highly restrictive.</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-5 pt-4 border-t border-white/5">
                        <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Confidence: {clause.confidence}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onExplainRiskInChat && onExplainRiskInChat(clause, idx);
                              onToggleChat && onToggleChat();
                            }}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#007AFF] text-white text-xs font-bold hover:bg-[#0056cc] transition-all shadow-lg shadow-[#007AFF]/20"
                          >
                            <MessageSquare size={14} />
                            Analyze Deeply
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedCardId(isExpanded ? null : idx);
                            }}
                            className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/60 text-xs font-bold hover:bg-white/10 transition-all"
                          >
                            {isExpanded ? 'Collapse' : 'Details'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                          <Check size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white/50 uppercase tracking-widest mb-0.5">Clause {idx + 1}</p>
                          <p className="text-sm text-white/30 italic truncate max-w-md">"{clause.text?.slice(0, 70)}..."</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] font-bold text-green-500/60 uppercase tracking-widest">Safe Provision</span>
                        {renderConfidenceRing(clause.confidence)}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="w-96 border-l border-white/10 p-4 space-y-4 overflow-y-auto">
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Severity by Position</h3>
          {renderSeverityBar()}
        </div>

        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Confidence Distribution</h3>
          <div className="space-y-2">
            {Object.entries(selectedCategoryCounts).map(([conf, count]) => (
              <div key={conf} className="flex items-center justify-between">
                <span className="text-xs text-white/60">{conf}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${totalClauses > 0 ? (count / totalClauses) * 100 : 0}%`,
                        backgroundColor: conf === 'High' ? '#ef4444' : conf === 'Medium' ? '#f59e0b' : '#22c55e',
                      }}
                    />
                  </div>
                  <span className="text-xs text-white/40">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={onToggleChat}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-gradient-to-r from-[#007AFF] to-[#0056cc] text-white text-sm font-semibold hover:shadow-lg hover:shadow-[#007AFF]/30 transition-all"
        >
          <MessageSquare size={16} />
          <span>Chat with Jurist</span>
        </button>
      </div>
    </div>
  );
}