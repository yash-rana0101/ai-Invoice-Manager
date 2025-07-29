import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = () => {
    console.log('=== CHECKING AUTHENTICATION STATUS ===');

    const token = localStorage.getItem('token');
    const tokenExpiry = localStorage.getItem('xero_token_expiry');
    const userInfo = localStorage.getItem('xero_user_info');

    console.log('Token exists:', !!token);
    console.log('Token expiry:', tokenExpiry);
    console.log('User info exists:', !!userInfo);

    if (token && tokenExpiry) {
      const expiryTime = parseInt(tokenExpiry);
      const isExpired = Date.now() > expiryTime;

      console.log('Token expired:', isExpired);
      console.log('Current time:', new Date().toISOString());
      console.log('Expiry time:', new Date(expiryTime).toISOString());

      if (!isExpired) {
        const userData = { token };

        // Add user info if available
        if (userInfo) {
          try {
            const parsedUserInfo = JSON.parse(userInfo);
            userData.email = parsedUserInfo.email;
            userData.name = parsedUserInfo.name;
            userData.xero_userid = parsedUserInfo.xero_userid;
            userData.userInfo = parsedUserInfo;
          } catch (e) {
            console.warn('Failed to parse user info:', e);
          }
        }

        setUser(userData);
        console.log('✅ User is authenticated');
        return true;
      } else {
        console.log('❌ Token expired, clearing auth');
        logout();
        return false;
      }
    } else if (token) {
      // Token exists but no expiry - assume valid for backward compatibility
      console.log('⚠️  Token exists but no expiry time found');
      setUser({ token });
      return true;
    } else {
      console.log('❌ No valid token found');
      setUser(null);
      return false;
    }
  };

  useEffect(() => {
    console.log('=== AUTH PROVIDER INITIALIZING ===');

    // Initial auth check
    const isAuthenticated = checkAuth();
    setLoading(false);

    console.log('Initial auth status:', isAuthenticated);

    // Listen for auth success events from XeroCallback
    const handleAuthSuccess = (event) => {
      console.log('=== RECEIVED AUTH SUCCESS EVENT ===');
      console.log('Event detail:', event.detail);

      // Small delay to ensure localStorage is ready
      setTimeout(() => {
        const authStatus = checkAuth();
        console.log('Auth status after event:', authStatus);
        setLoading(false);
      }, 200);
    };

    window.addEventListener('xero-auth-success', handleAuthSuccess);

    // Listen for storage changes (useful for multi-tab scenarios)
    const handleStorageChange = (e) => {
      if (e.key === 'token' || e.key === 'xero_token_expiry' || e.key === 'xero_user_info') {
        console.log('=== STORAGE CHANGE DETECTED ===');
        console.log('Changed key:', e.key);
        console.log('New value exists:', !!e.newValue);

        setTimeout(() => {
          checkAuth();
        }, 100);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Expose checkAuth globally for XeroCallback
    window.authContext = { checkAuth };

    return () => {
      window.removeEventListener('xero-auth-success', handleAuthSuccess);
      window.removeEventListener('storage', handleStorageChange);
      delete window.authContext;
    };
  }, []);

  const login = (email, password) => {
    // Your login logic here
    // On success: setUser({ ...userData });
    console.log('Manual login called with:', email);
  };

  const logout = () => {
    console.log('=== LOGGING OUT ===');

    // Clear all Xero-related tokens
    localStorage.removeItem('token');
    localStorage.removeItem('xero_refresh_token');
    localStorage.removeItem('xero_id_token');
    localStorage.removeItem('xero_token_expiry');
    localStorage.removeItem('xero_user_info');

    // Clear any session storage
    sessionStorage.removeItem('xero_oauth_state');
    sessionStorage.removeItem('xero_last_processed_url');

    setUser(null);
    console.log('✅ User logged out');
  };

  const refreshToken = async () => {
    console.log('=== ATTEMPTING TOKEN REFRESH ===');

    const refreshToken = localStorage.getItem('xero_refresh_token');
    const clientId = import.meta.env.VITE_XERO_CLIENT_ID;
    const clientSecret = import.meta.env.VITE_XERO_CLIENT_SECRET;

    if (!refreshToken) {
      console.log('❌ No refresh token available');
      logout();
      return false;
    }

    try {
      const basicAuth = btoa(`${clientId}:${clientSecret}`);
      const response = await axios.post('https://identity.xero.com/connect/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        }), {
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
      );

      const { access_token, expires_in, refresh_token: newRefreshToken } = response.data;

      // Update tokens
      localStorage.setItem('token', access_token);
      if (newRefreshToken) {
        localStorage.setItem('xero_refresh_token', newRefreshToken);
      }
      if (expires_in) {
        const expiryTime = Date.now() + (expires_in * 1000);
        localStorage.setItem('xero_token_expiry', expiryTime.toString());
      }

      console.log('✅ Token refreshed successfully');
      checkAuth();
      return true;
    } catch (error) {
      console.error('❌ Token refresh failed:', error);
      logout();
      return false;
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    checkAuth,
    refreshToken,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}