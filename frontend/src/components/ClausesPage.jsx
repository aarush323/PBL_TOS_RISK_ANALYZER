import React, { useState, useMemo } from 'react';
import { Filter, AlertTriangle, Shield, Lock, Eye, DollarSign, UserCheck, Scale, MessageSquare } from 'lucide-react';
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
    const data = clauses.map(c => ({
      position: c.position_weight || 50,
      severity: c.severity_score || 
        (c.confidence === 'High' ? 3 : c.confidence === 'Medium' ? 2 : 1),
    }));

    if (data.length === 0) {
      return <p className="text-sm text-white/40">No data available.</p>;
    }

    const maxSeverity = Math.max(...data.map(d => d.severity), 1);
    const avgSeverity = data.reduce((sum, d) => sum + d.severity, 0) / (data.length || 1);
    const highRiskZones = data.filter(d => d.severity >= 5).length;

    return (
      <div className="min-h-48">
        <div className="flex items-center justify-between text-xs text-white/50 mb-2">
          <span>Start</span>
          <span>End</span>
        </div>
        <div className="h-12 flex items-end gap-0.5">
          {data.map((d, i) => (
            <div
              key={i}
              className="flex-1 rounded-t transition-all hover:opacity-80"
              style={{
                height: `${(d.severity / maxSeverity) * 100}%`,
                backgroundColor: d.severity >= 5 ? '#ef4444' : d.severity >= 2 ? '#f59e0b' : '#22c55e',
              }}
              title={`Clause ${i + 1}: Severity ${d.severity.toFixed(1)}`}
            />
          ))}
        </div>
        <div className="flex items-center justify-center gap-4 mt-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-white/60">High (≥5)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <span className="text-white/60">Medium (2-5)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-white/60">Low (&lt;2)</span>
          </div>
        </div>
        <div className="flex justify-center gap-6 mt-3 text-xs text-white/50">
          <span>Avg: {avgSeverity.toFixed(1)}</span>
          <span>Max: {maxSeverity.toFixed(1)}</span>
          <span>High-risk zones: {highRiskZones}</span>
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

        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#007AFF] rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={14} className="text-white/50" />
          {['riskLevel', 'severity', 'confidence'].map(filterKey => (
            <select
              key={filterKey}
              value={filters[filterKey]}
              onChange={(e) => setFilters(prev => ({ ...prev, [filterKey]: e.target.value }))}
              className="h-8 px-3 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-[#007AFF]/50"
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
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </>
              )}
              {filterKey === 'confidence' && (
                <>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </>
              )}
            </select>
          ))}
        </div>

        <div className="grid gap-4">
          {clauses.length === 0 ? (
            <div className="glass-card p-8 text-center text-white/50">
              No clauses match the selected filters.
            </div>
          ) : (
            clauses.slice(0, 30).map((clause, idx) => {
              const isRisky = clause.is_risky;
              const isExpanded = expandedCardId === idx;
              const severityLevel = clause.severity_score >= 3 ? 'HIGH' : clause.severity_score >= 2 ? 'MEDIUM' : 'LOW';
              const severityColor = clause.severity_score >= 3 ? 'bg-red-500/20 text-red-400' : clause.severity_score >= 2 ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400';
              
              return (
                <div
                  key={idx}
                  className={`glass-card p-5 cursor-pointer transition-all hover:border-white/30 ${isRisky ? 'border-l-2 border-l-red-500' : ''}`}
                >
                  {isRisky ? (
                    <>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-2 py-1 rounded ${severityColor}`}>
                            {severityLevel}
                          </span>
                          <span className="text-xs text-white/40">·</span>
                          <span className="text-xs text-white/60">{clause.risk_categories?.[0] || 'General'}</span>
                          <span className="text-xs text-white/40">·</span>
                          <span className="text-xs text-white/50">Sev: {clause.severity_score?.toFixed(1) || 'N/A'}</span>
                        </div>
                      </div>

                      {isExpanded ? (
                        <div className="space-y-4">
                          <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                            <p className="text-xs text-white/40 uppercase mb-2">AI Analysis</p>
                            <p className="text-base text-white/90 leading-relaxed">{clause.explanation}</p>
                          </div>
                          
                          <div className="p-3 rounded-lg bg-black/30">
                            <p className="text-xs text-white/40 uppercase mb-2">Clause Text</p>
                            <p className="text-sm text-white/70 font-mono leading-relaxed">{clause.text}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-white/70 line-clamp-2 mb-3">{clause.explanation}</p>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {renderConfidenceRing(clause.confidence)}
                          <span className="text-xs text-white/50">{clause.confidence} confidence</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onExplainRiskInChat && onExplainRiskInChat(clause, idx);
                              onToggleChat && onToggleChat();
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#007AFF] to-[#0056cc] text-white text-xs font-semibold"
                          >
                            <MessageSquare size={12} />
                            Ask Jurist
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedCardId(isExpanded ? null : idx);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 text-xs"
                          >
                            {isExpanded ? '▲ Less' : '▼ More'}
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-semibold text-white/60">CL-{idx + 1}</span>
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-500">
                            <Check size={10} />
                            <span>Safe</span>
                          </div>
                        </div>
                        {renderConfidenceRing(clause.confidence)}
                      </div>

                      <div className="font-mono text-xs text-white/40 bg-black/20 p-2 rounded mb-2 overflow-hidden text-ellipsis whitespace-nowrap">
                        {clause.text?.slice(0, 80)}...
                      </div>
                    </>
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