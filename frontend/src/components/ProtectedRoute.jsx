import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PropTypes from 'prop-types';

export default function ProtectedRoute({ children }) {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  console.log('=== PROTECTED ROUTE CHECK ===');
  console.log('Current path:', location.pathname);
  console.log('Is loading:', loading);
  console.log('User object:', !!user);
  console.log('Is authenticated:', isAuthenticated);
  console.log('Token in localStorage:', !!localStorage.getItem('token'));

  // Show loading spinner while checking auth
  if (loading) {
    console.log('🔄 Showing loading state');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="spinner"></div>
          <div>Checking authentication...</div>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    console.log('❌ Not authenticated, redirecting to login');
    console.log('Redirect reason:', !isAuthenticated ? 'Not authenticated' : 'No user object');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  console.log('✅ User authenticated, rendering protected content');
  return children;
}

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired
};