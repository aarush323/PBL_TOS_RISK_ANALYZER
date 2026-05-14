import { apiFetchJson, withJsonHeaders } from '@/shared/api/client';

export const login = ({ email, password }) => {
  const formData = new URLSearchParams();
  formData.append('username', email);
  formData.append('password', password);
  return apiFetchJson('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData,
  });
};

export const register = ({ username, email, password }) => {
  return apiFetchJson('/auth/register', {
    method: 'POST',
    headers: withJsonHeaders(),
    body: JSON.stringify({ username, email, password }),
  });
};

export const fetchMe = ({ token }) => apiFetchJson('/auth/me', { token });
