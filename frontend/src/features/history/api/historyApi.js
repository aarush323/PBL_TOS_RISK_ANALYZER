import { apiFetchJson, withJsonHeaders } from '@/shared/api/client';

export const fetchHistory = ({ token, limit = 50 }) => {
  const query = typeof limit === 'number' ? `?limit=${limit}` : '';
  return apiFetchJson(`/analyses${query}`, { token });
};

export const fetchAnalysis = ({ token, jobId }) => {
  return apiFetchJson(`/analyses/${jobId}`, { token });
};

export const renameAnalysis = ({ token, jobId, title }) => {
  return apiFetchJson(`/analyses/${jobId}`, {
    method: 'PATCH',
    headers: withJsonHeaders(),
    body: JSON.stringify({ title }),
    token,
  });
};

export const deleteAnalysis = ({ token, jobId }) => {
  return apiFetchJson(`/analyses/${jobId}`, {
    method: 'DELETE',
    token,
  });
};
