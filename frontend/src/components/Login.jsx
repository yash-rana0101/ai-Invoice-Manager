import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, isAuthenticated } = useAuth();

  console.log('=== LOGIN COMPONENT ===');
  console.log('Current path:', location.pathname);
  console.log('Search params:', location.search);
  console.log('Is loading:', loading);
  console.log('Is authenticated:', isAuthenticated);
  console.log('User:', !!user);

  // Check for error parameters and handle them
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const error = params.get('error');

    if (error) {
      console.log('Login page error parameter:', error);

      // Handle specific errors
      if (error === 'duplicate_callback') {
        console.log('Duplicate callback detected, clearing URL params');
        // Clear the error from URL without causing a re-render loop
        window.history.replaceState({}, '', '/login');
      }

      // You can add more error handling here
      if (error === 'oauth_error') {
        console.log('OAuth error detected');
      }
    }
  }, [location.search]);

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      console.log('=== USER ALREADY AUTHENTICATED ===');
      console.log('Redirecting authenticated user to home');

      // Get the intended destination from location state, or default to home
      const from = location.state?.from?.pathname || '/';
      console.log('Redirecting to:', from);

      navigate(from, { replace: true });
    }
  }, [isAuthenticated, loading, user, navigate, location.state]);

  const handleXeroLogin = () => {
    console.log('=== STARTING XERO OAUTH FLOW ===');

    const clientId = import.meta.env.VITE_XERO_CLIENT_ID;
    const redirectUri = import.meta.env.VITE_XERO_CALLBACK_URL;

    console.log('Client ID:', clientId ? `${clientId.substring(0, 8)}...` : 'MISSING');
    console.log('Redirect URI:', redirectUri);

    if (!clientId || !redirectUri) {
      console.error('Missing required environment variables');
      alert('OAuth configuration error. Please check environment variables.');
      return;
    }

    // Generate a random state for CSRF protection
    const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    console.log('Generated state:', state);

    // Store state for validation (optional but recommended)
    sessionStorage.setItem('xero_oauth_state', state);

    // Clear any existing processed URLs to prevent duplicate callback issues
    sessionStorage.removeItem('xero_last_processed_url');

    const authUrl = `https://login.xero.com/identity/connect/authorize?` +
      `response_type=code&` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=openid profile email accounting.settings accounting.reports.read accounting.journals.read accounting.contacts accounting.attachments&` +
      `state=${state}`;

    console.log('OAuth URL created, redirecting...');
    console.log('Auth URL:', authUrl.replace(clientId, `${clientId.substring(0, 8)}...`));

    // Redirect to Xero OAuth
    window.location.href = authUrl;
  };

  // Show loading if auth is still being checked
  if (loading) {
    console.log('Auth still loading, showing spinner');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="spinner"></div>
          <div>Checking authentication status...</div>
        </div>
      </div>
    );
  }

  // Show login form if not authenticated
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Connect with your Xero account to get started
          </p>
        </div>

        <div className="mt-8 space-y-6">
          <button
            onClick={handleXeroLogin}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
            Login with Xero
          </button>
        </div>
      </div>
    </div>
  );
}