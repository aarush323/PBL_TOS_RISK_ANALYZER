export const calculateSafetyScore = (analysisResult) => {
  if (!analysisResult) return 100;
  if (analysisResult.safety_score != null) return analysisResult.safety_score;

  const riskyCount = analysisResult.risky_clause_count || 0;
  const totalCount = analysisResult.total_clauses || 1;

  if (riskyCount === 0) return 100;

  const avgSeverity =
    analysisResult.avg_severity_score ||
    ((analysisResult.total_severity_score || 0) / (riskyCount || 1));
  const overallRisk = analysisResult.overall_risk || 'Low';

  let score = 100;
  if (avgSeverity <= 1) score = 95;
  else if (avgSeverity <= 2) score = 90 - ((avgSeverity - 1) * 5);
  else if (avgSeverity <= 3) score = 85 - ((avgSeverity - 2) * 5);
  else if (avgSeverity <= 5) score = 75 - ((avgSeverity - 3) * 5);
  else if (avgSeverity <= 8) score = 60 - ((avgSeverity - 5) * 3);
  else if (avgSeverity <= 12) score = 45 - ((avgSeverity - 8) * 3);
  else score = Math.max(10, 30 - ((avgSeverity - 12) * 2));

  if (overallRisk === 'High') score = Math.max(15, score - 12);
  else if (overallRisk === 'Medium') score = Math.max(25, score - 6);

  const riskyRatio = riskyCount / totalCount;
  if (riskyRatio > 0.5) score = Math.max(15, score - 12);
  else if (riskyRatio > 0.3) score = Math.max(25, score - 6);
  else if (riskyRatio > 0.15) score = Math.max(35, score - 3);

  return Math.floor(Math.max(10, Math.min(100, score)));
};
