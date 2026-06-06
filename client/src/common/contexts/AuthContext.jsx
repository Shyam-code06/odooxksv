import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from local storage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('vb_user');
    const storedAccess = localStorage.getItem('vb_access_token');
    const storedRefresh = localStorage.getItem('vb_refresh_token');

    if (storedUser && storedAccess && storedRefresh) {
      setUser(JSON.parse(storedUser));
      setAccessToken(storedAccess);
      setRefreshToken(storedRefresh);
      
      // Configure Axios default header
      axios.defaults.headers.common['Authorization'] = `Bearer ${storedAccess}`;
    }
    setLoading(false);
  }, []);

  const login = (userData, access, refresh) => {
    setUser(userData);
    setAccessToken(access);
    setRefreshToken(refresh);
    
    localStorage.setItem('vb_user', JSON.stringify(userData));
    localStorage.setItem('vb_access_token', access);
    localStorage.setItem('vb_refresh_token', refresh);
    
    axios.defaults.headers.common['Authorization'] = `Bearer ${access}`;
  };

  const logout = async () => {
    try {
      if (refreshToken) {
        // Run network logout call in background (non-blocking)
        axios.post('http://localhost:5000/api/auth/logout', { refreshToken })
          .catch(err => console.error('Background logout error:', err.message));
      }
    } finally {
      setUser(null);
      setAccessToken(null);
      setRefreshToken(null);
      
      localStorage.removeItem('vb_user');
      localStorage.removeItem('vb_access_token');
      localStorage.removeItem('vb_refresh_token');
      
      delete axios.defaults.headers.common['Authorization'];
    }
  };

  const hasPermission = (permissionName) => {
    if (!user || !Array.isArray(user.permissions)) return false;
    return user.permissions.includes(permissionName);
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, refreshToken, loading, login, logout, hasPermission }}>
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
