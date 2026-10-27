import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/authApi.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await authApi.me();
      const current = data.authenticated ? data.user : null;
      setUser(current);
      return current;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await authApi.csrf();
      } catch {
        // backend chưa chạy: vẫn cho hiển thị giao diện khách
      }
      await refresh();
      if (active) setInitializing(false);
    })();
    return () => {
      active = false;
    };
  }, [refresh]);

  useEffect(() => {
    const handleUnauthorized = () => setUser(null);
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = useCallback(async (username, password) => {
    const data = await authApi.login(username, password);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // vẫn xóa trạng thái phía client nếu server lỗi
    }
    try {
      await authApi.csrf();
    } catch {
      // bỏ qua
    }
    setUser(null);
  }, []);

  const register = useCallback((payload) => authApi.register(payload), []);

  const value = useMemo(
    () => ({ user, initializing, isAuthenticated: Boolean(user), login, logout, register, refresh }),
    [user, initializing, login, logout, register, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth phải được dùng bên trong AuthProvider');
  }
  return context;
}
