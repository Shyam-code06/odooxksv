import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from local storage on mount and register Axios interceptors
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

    // Setup global Axios response interceptor for token refresh handling
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        // If error is 401 and access token is expired, attempt token refresh
        if (
          error.response?.status === 401 &&
          error.response?.data?.message === 'Access token has expired.' &&
          !originalRequest._retry
        ) {
          originalRequest._retry = true;
          
          try {
            const currentRefreshToken = localStorage.getItem('vb_refresh_token');
            if (!currentRefreshToken) {
              throw new Error('No refresh token available');
            }

            // Do not intercept or loop on the refresh endpoint itself
            if (originalRequest.url && originalRequest.url.includes('/api/auth/refresh')) {
              throw error;
            }

            const res = await axios.post('http://localhost:5000/api/auth/refresh', {
              refreshToken: currentRefreshToken
            });

            const { accessToken: newAccessToken } = res.data.data;

            // Update local storage and React state
            localStorage.setItem('vb_access_token', newAccessToken);
            setAccessToken(newAccessToken);

            // Set default headers for future requests
            axios.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
            
            // Set Authorization header for retrying current request
            originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;

            return axios(originalRequest);
          } catch (refreshError) {
            console.error('Token refresh failed, clearing session...', refreshError.message);
            
            // Invalidate state and local storage on refresh failure
            setUser(null);
            setAccessToken(null);
            setRefreshToken(null);
            localStorage.removeItem('vb_user');
            localStorage.removeItem('vb_access_token');
            localStorage.removeItem('vb_refresh_token');
            delete axios.defaults.headers.common['Authorization'];

            return Promise.reject(refreshError);
          }
        }
        
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
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
