import { RISK_THRESHOLDS, RISK_COLORS } from '@/shared/constants';

export const getScoreColor = (score) => {
  if (score <= RISK_THRESHOLDS.LOW_MAX) return RISK_COLORS.LOW;
  if (score <= RISK_THRESHOLDS.MEDIUM_MAX) return RISK_COLORS.MEDIUM;
  return RISK_COLORS.HIGH;
};

export const getRiskColor = (risk) => {
  if (risk === 'High') return RISK_COLORS.HIGH;
  if (risk === 'Medium') return RISK_COLORS.MEDIUM;
  return RISK_COLORS.LOW;
};

export const getRiskClass = (risk) => {
  if (risk === 'High') return 'bg-red-500';
  if (risk === 'Medium') return 'bg-yellow-500';
  return 'bg-green-500';
};
