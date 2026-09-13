import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../../lib/api';

interface AuthContextType {
  isAuthenticated: boolean;
  username: string | null;
  isLoading: boolean;
  login: (password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('mc_auth_token') !== null;
  });
  const [username, setUsername] = useState<string | null>(() => {
    return localStorage.getItem('mc_auth_user') || 'Admin';
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    // Verify session
    api.getMe()
      .then((res) => {
        if (res.isAuthenticated) {
          setIsAuthenticated(true);
          setUsername(res.username);
        }
      })
      .catch(() => {
        // Fallback to existing local token if valid
      });
  }, []);

  const login = async (password: string) => {
    setIsLoading(true);
    try {
      const res = await api.login(password);
      if (res && res.token) {
        localStorage.setItem('mc_auth_token', res.token);
        localStorage.setItem('mc_auth_user', 'Admin');
        setIsAuthenticated(true);
        setUsername('Admin');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('mc_auth_token');
    localStorage.removeItem('mc_auth_user');
    setIsAuthenticated(false);
    setUsername(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, username, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
