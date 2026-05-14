import { getAccessToken } from './auth-storage';

const isDev = import.meta.env.DEV || false;

export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');

export const buildApiUrl = (path) => {
  if (!path) return API_BASE_URL;
  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};

export const getAuthHeaders = (token) => {
  const activeToken = token || getAccessToken();
  return activeToken ? { Authorization: `Bearer ${activeToken}` } : {};
};

export const withJsonHeaders = (headers = {}) => ({
  'Content-Type': 'application/json',
  ...headers,
});

export const fetchWithRetry = async (url, options, retries = 3, delayMs = 3000) => {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const res = await fetch(url, options);
      return res;
    } catch (err) {
      console.warn(`Fetch attempt ${attempt}/${retries} failed:`, err.message);
      if (attempt === retries) throw err;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return null;
};

export const apiFetch = async (path, options = {}) => {
  const {
    token,
    retries,
    retryDelayMs,
    headers,
    ...fetchOptions
  } = options;

  const url = buildApiUrl(path);
  const mergedHeaders = { ...getAuthHeaders(token), ...(headers || {}) };
  const requestOptions = { ...fetchOptions, headers: mergedHeaders };

  if (retries) {
    return fetchWithRetry(url, requestOptions, retries, retryDelayMs);
  }

  return fetch(url, requestOptions);
};

export const apiFetchJson = async (path, options = {}) => {
  const res = await apiFetch(path, options);
  const data = await res.json().catch(() => null);
  return { res, data };
};

// Runtime validation — warns but doesn't throw at module level
if (!import.meta.env.VITE_API_URL) {
  if (!isDev) {
    console.error(
      '[Jurist AI] VITE_API_URL is not set. Set this environment variable to your backend URL in production. ' +
      'Falling back to http://localhost:8000 — API calls will fail if this is incorrect.'
    );
  }
}
