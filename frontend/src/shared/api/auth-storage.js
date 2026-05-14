const TOKEN_KEY = 'tos_token';

export const getAccessToken = () => localStorage.getItem(TOKEN_KEY);

export const setAccessToken = (token) => {
  if (!token) return;
  localStorage.setItem(TOKEN_KEY, token);
};

export const clearAccessToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};
