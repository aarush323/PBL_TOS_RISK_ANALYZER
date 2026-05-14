import { useCallback } from 'react';
import { login, register, fetchMe } from '../api/authApi';
import { setAccessToken, clearAccessToken } from '@/shared/api/auth-storage';

export const useAuthActions = ({
  token,
  setToken,
  setUser,
  setHistoryItems,
  addToast,
  navigate,
}) => {
  const logout = useCallback(() => {
    clearAccessToken();
    setToken(null);
    setUser(null);
    setHistoryItems([]);
    addToast('Logged out');
    navigate('/');
  }, [addToast, navigate, setHistoryItems, setToken, setUser]);

  const fetchUser = useCallback(async () => {
    try {
      const { res, data } = await fetchMe({ token });
      if (res.ok) {
        setUser(data);
      } else if (res.status === 401) {
        logout();
      }
    } catch (error) {
      console.error('Fetch user failed', error);
    }
  }, [logout, setUser, token]);

  const loginUser = useCallback(async ({ email, password }) => {
    const { res, data } = await login({ email, password });
    if (res.ok) {
      setAccessToken(data.access_token);
      setToken(data.access_token);
      addToast('Logged in successfully');
      navigate('/app');
    }
    return { res, data };
  }, [addToast, navigate, setToken]);

  const registerUser = useCallback(async ({ username, email, password }) => {
    const { res, data } = await register({ username, email, password });
    if (res.ok) {
      addToast('Registration successful!');
    }
    return { res, data };
  }, [addToast]);

  return {
    fetchUser,
    loginUser,
    registerUser,
    logout,
  };
};
