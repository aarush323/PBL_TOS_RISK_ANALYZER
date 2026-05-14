/**
 * Shared color utilities for Jurist AI
 */

/**
 * Returns a hex color string based on the risk score.
 * @param {number} score - The risk score (0-100). Higher = riskier.
 * @returns {string} Hex color string
 */
export const getScoreColor = (score) => {
    if (score <= 20) return '#22c55e'; // Green  — low risk
    if (score <= 50) return '#f59e0b'; // Amber  — medium risk
    return '#ef4444';                  // Red    — high risk
};

/**
 * Returns a hex color string based on the risk level.
 * @param {string} risk - Risk level ('High', 'Medium', 'Low')
 * @returns {string} Hex color string
 */
export const getRiskColor = (risk) => {
    if (risk === 'High') return '#ef4444';
    if (risk === 'Medium') return '#f59e0b';
    return '#22c55e';
};

/**
 * Returns a Tailwind background class based on the risk level.
 * @param {string} risk - Risk level ('High', 'Medium', 'Low')
 * @returns {string} Tailwind class string
 */
export const getRiskClass = (risk) => {
    if (risk === 'High') return 'bg-red-500';
    if (risk === 'Medium') return 'bg-yellow-500';
    return 'bg-green-500';
};
