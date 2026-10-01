import React, { useState, useEffect, useCallback } from 'react';
import { authService } from '../services/api';
import { AuthContext } from './auth-context-base';

const sanitizeUser = (raw) => {
  if (raw && typeof raw === 'object' && (raw.username || raw.id)) {
    return {
      id: raw.id || 1,
      username: String(raw.username || 'admin'),
      name: String(raw.name || raw.username || 'Administrador'),
      role: String(raw.role || 'admin'),
      avatar: raw.avatar || null,
      theme: raw.theme || 'elegant-red',
    };
  }
  return null;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('visor_tv_user');
      return saved ? sanitizeUser(JSON.parse(saved)) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('visor_tv_token') || null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('visor_tv_token');
    localStorage.removeItem('visor_tv_user');
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const verifyUser = async () => {
      const savedToken = localStorage.getItem('visor_tv_token');
      if (!savedToken) {
        if (!isCancelled) setLoading(false);
        return;
      }

      try {
        const res = await authService.getMe();
        if (!isCancelled && res.data.success) {
          const sanitized = sanitizeUser(res.data.user);
          setUser(sanitized);
          localStorage.setItem('visor_tv_user', JSON.stringify(sanitized));
        }
      } catch {
        // Silently clear stale token if expired (401), preventing red console errors
        if (!isCancelled) {
          logout();
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    verifyUser();

    return () => {
      isCancelled = true;
    };
  }, [logout]);

  const login = async (username, password) => {
    const res = await authService.login(username, password);
    if (res.data.success) {
      const { token: newToken, user: newUser } = res.data;
      const sanitized = sanitizeUser(newUser);
      setToken(newToken);
      setUser(sanitized);
      localStorage.setItem('visor_tv_token', newToken);
      localStorage.setItem('visor_tv_user', JSON.stringify(sanitized));
      return sanitized;
    }
    throw new Error(res.data.error || 'Error al iniciar sesión');
  };

  const updateUser = useCallback((updatedData) => {
    setUser((prev) => {
      const newUser = sanitizeUser({ ...(prev || {}), ...updatedData });
      localStorage.setItem('visor_tv_user', JSON.stringify(newUser));
      return newUser;
    });
    window.dispatchEvent(new CustomEvent('visorUserUpdated', { detail: updatedData }));
  }, []);

  const changeTheme = async (newTheme) => {
    if (!user) return;
    const updated = sanitizeUser({ ...user, theme: newTheme });
    setUser(updated);
    localStorage.setItem('visor_tv_user', JSON.stringify(updated));

    try {
      await authService.updateProfile({ theme: newTheme });
    } catch (err) {
      console.error('Error saving user theme to database:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        loading,
        login,
        logout,
        updateUser,
        changeTheme,
        currentThemeId: user?.theme || 'elegant-red',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};


export default AuthProvider;
