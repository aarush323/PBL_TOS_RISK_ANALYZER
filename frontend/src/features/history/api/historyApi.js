import { apiFetchJson } from '@/shared/api/client';

export const fetchHistory = ({ token, limit = 50 }) => {
  const query = typeof limit === 'number' ? `?limit=${limit}` : '';
  return apiFetchJson(`/analyses${query}`, { token });
};

export const fetchAnalysis = ({ token, jobId }) => {
  return apiFetchJson(`/analyses/${jobId}`, { token });
};
