export const normalizeRiskBreakdown = (analysisResult) => {
  const breakdown = analysisResult?.risk_breakdown;
  if (!breakdown) return [];

  const normalized = Array.isArray(breakdown)
    ? breakdown.map((item) => ({
        category: item?.category,
        count: Number(item?.count) || 0,
      }))
    : Object.entries(breakdown).map(([category, count]) => ({
        category,
        count: Number(count) || 0,
      }));

  return normalized.sort((a, b) => b.count - a.count);
};

export const getTopRiskyClauses = (analysisResult, limit = 3) => {
  if (!Array.isArray(analysisResult?.clauses)) return [];
  return analysisResult.clauses
    .filter((clause) => clause.is_risky)
    .sort((a, b) => (b.severity_score || 0) - (a.severity_score || 0))
    .slice(0, limit);
};

export const getHealthCheckItems = (breakdownArray) => {
  const checks = [
    { key: 'legal', name: 'No legal flags', passed: true },
    { key: 'privacy', name: 'No privacy flags', passed: true },
    { key: 'security', name: 'No security flags', passed: true },
    { key: 'financial', name: 'No financial flags', passed: true },
    { key: 'user', name: 'No user-rights flags', passed: true },
  ];

  (breakdownArray || []).forEach((item) => {
    if (item.count > 0) {
      const key = item.category?.toLowerCase().split(' ')[0];
      const checkItem = checks.find((entry) => entry.key === key);
      if (checkItem) checkItem.passed = false;
    }
  });

  return checks;
};

export const getAnalysisTransparency = (analysisResult) => {
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
};

export const getSeveritySeries = (analysisResult) => {
  const clauses = analysisResult?.clauses || [];
  if (!Array.isArray(clauses) || clauses.length === 0) return [];

  return clauses.map((clause, index) => ({
    position: clause.position_weight || (index / clauses.length) * 100,
    severity: Number(clause.severity_score) || 0,
    isRisky: clause.is_risky,
  }));
};

export const filterClauses = (analysisResult, filters) => {
  if (!Array.isArray(analysisResult?.clauses)) return [];

  return analysisResult.clauses.filter((clause) => {
    if (filters.riskLevel !== 'all' && clause.is_risky !== (filters.riskLevel === 'risky')) {
      return false;
    }
    if (filters.confidence !== 'all' && clause.confidence !== filters.confidence) {
      return false;
    }
    if (filters.severity !== 'all') {
      const severityScore = clause.severity_score || 0;
      if (filters.severity === 'high' && severityScore < 5) return false;
      if (filters.severity === 'medium' && (severityScore < 2 || severityScore >= 5)) return false;
      if (filters.severity === 'low' && severityScore >= 2) return false;
    }
    return true;
  });
};

export const getConfidenceCounts = (analysisResult) => {
  const counts = { High: 0, Medium: 0, Low: 0 };
  if (!Array.isArray(analysisResult?.clauses)) return counts;

  analysisResult.clauses.forEach((clause) => {
    if (clause.confidence) {
      counts[clause.confidence] = (counts[clause.confidence] || 0) + 1;
    }
  });

  return counts;
};
