import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api, { clearToken, getToken, setToken } from './api.js';

const AuthContext = createContext(null);

function applyTheme(theme) {
  const root = document.documentElement;
  if (!theme || theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      setReady(true);
      return;
    }
    api.get('/auth/me')
      .then((r) => setUser(r.data.user))
      .catch(() => clearToken())
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    applyTheme(user?.preferences?.theme);
  }, [user]);

  useEffect(() => {
    const expired = () => setUser(null);
    window.addEventListener('auth:expired', expired);
    return () => window.removeEventListener('auth:expired', expired);
  }, []);

  const login = useCallback(async (identifier, password, remember) => {
    const { data } = await api.post('/auth/login', { identifier, password, remember });
    setToken(data.token, remember);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      /* the token may already be expired; signing out locally is enough */
    }
    clearToken();
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    const { data } = await api.get('/auth/me');
    setUser(data.user);
    return data.user;
  }, []);

  const can = (perm) => Boolean(user?.permissions?.includes(perm));

  return (
    <AuthContext.Provider value={{ user, ready, login, logout, refresh, setUser, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
