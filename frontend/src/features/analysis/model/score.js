/**
 * getRiskScore — reads the pre-computed risk_score from the analysis result.
 *
 * The score is computed server-side by backend/analysis/scoring.py using
 * Weighted Risk Density (WRD). It is a 0-100 integer where:
 *   0   = no risk (clean document)
 *   100 = maximum possible risk
 *
 * Higher score = RISKIER (inverted from the old "safety score" convention).
 *
 * @param {object|null} analysisResult - The analysis result object from the API.
 * @returns {number} Integer 0-100.
 */
export const getRiskScore = (analysisResult) => {
  if (!analysisResult) return 0;
  // Prefer the server-computed value (set by scoring.py via analyzer.py)
  if (analysisResult.risk_score != null) return analysisResult.risk_score;
  // Fallback: 0 (no score available — do NOT compute client-side)
  return 0;
};

/**
 * @deprecated Use getRiskScore instead. Kept temporarily to avoid import errors
 * in files that haven't been updated yet.
 */
export const calculateSafetyScore = (analysisResult) => getRiskScore(analysisResult);
