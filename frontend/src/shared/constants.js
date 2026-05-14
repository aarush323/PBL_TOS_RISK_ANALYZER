// ─── Risk thresholds (shared between backend scoring and frontend display) ───
export const RISK_THRESHOLDS = {
  LOW_MAX: 30,
  MEDIUM_MAX: 60,
};

// ─── Risk colors (hex) ───
export const RISK_COLORS = {
  LOW: '#22c55e',
  MEDIUM: '#f59e0b',
  HIGH: '#ef4444',
};

// ─── Risk level labels ───
export const RISK_LEVELS = ['Low', 'Medium', 'High'];

// ─── Polling ───
export const POLL_INTERVAL_MS = 3000;
export const MAX_POLL_RETRIES = 15;

// ─── API ───
export const API_RETRY_COUNT = 3;
export const API_RETRY_DELAY_MS = 3000;

// ─── Analysis ───
export const MIN_TEXT_LENGTH = 80;
export const MAX_FILE_SIZE_MB = 50;
