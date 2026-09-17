import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient, { setAccessToken, getAccessToken } from '../services/api/client';

const USER_KEY = 'inventory_user_data';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // Restore and verify session on startup
  useEffect(() => {
    async function restoreSession() {
      const token = getAccessToken();
      if (!token) {
        localStorage.removeItem(USER_KEY);
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const response = await apiClient.get('/auth/me');
        if (response.success && response.data) {
          const userData = response.data.user || response.data;
          setUser(userData);
          localStorage.setItem(USER_KEY, JSON.stringify(userData));
        } else {
          setAccessToken(null);
          localStorage.removeItem(USER_KEY);
          setUser(null);
        }
      } catch (err) {
        setAccessToken(null);
        localStorage.removeItem(USER_KEY);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    restoreSession();

    const handleSessionExpired = () => {
      setAccessToken(null);
      localStorage.removeItem(USER_KEY);
      setUser(null);
    };

    window.addEventListener('auth:session_expired', handleSessionExpired);
    return () => window.removeEventListener('auth:session_expired', handleSessionExpired);
  }, []);

  const login = async (email, password) => {
    const response = await apiClient.post('/auth/login', {
      email: email.trim(),
      password
    });

    if (response.success && response.data) {
      const userData = response.data.user;
      setAccessToken(response.data.accessToken);
      setUser(userData);
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
      return userData;
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (e) {
      // Ignore network errors on logout
    } finally {
      setAccessToken(null);
      localStorage.removeItem(USER_KEY);
      setUser(null);
    }
  };

  const isAdmin = user?.role === 'ADMIN';
  const isStaff = user?.role === 'STAFF';

  const hasRole = (role) => {
    if (!user) return false;
    if (role.toUpperCase() === 'ADMIN') return user.role === 'ADMIN';
    if (role.toUpperCase() === 'STAFF') return user.role === 'STAFF';
    return user.role === role;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        isAdmin,
        isStaff,
        login,
        logout,
        hasRole
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
