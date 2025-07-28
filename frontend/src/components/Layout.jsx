import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MessageSquare, BarChart3, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import PropTypes from 'prop-types';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 lg:p-6">
          <div className="flex-1">
            <h1 className="text-lg lg:text-xl font-bold text-gray-800">
              AI Invoice Manager
            </h1>
            <p className="text-xs lg:text-sm text-gray-600 mt-1 truncate">
              Welcome, {user?.name}
            </p>
          </div>
          {/* Close button - only visible on mobile */}
          <button
            onClick={closeSidebar}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-4 lg:mt-6">
          <div className="px-4 lg:px-6 space-y-2">
            <Link
              to="/"
              onClick={closeSidebar}
              className={`
                flex items-center space-x-3 px-3 py-3 lg:py-2 rounded-lg transition-colors
                ${location.pathname === '/'
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-50'
                }
              `}
            >
              <MessageSquare className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm lg:text-base">Chat Assistant</span>
            </Link>
          </div>
        </nav>

        {/* Logout Button */}
        <div className="absolute bottom-4 lg:bottom-6 left-4 lg:left-6 right-4 lg:right-6">
          <button
            onClick={() => {
              logout();
              closeSidebar();
            }}
            className="
              w-full flex items-center space-x-3 px-3 py-3 lg:py-2 
              text-gray-600 hover:bg-red-50 hover:text-red-700 
              rounded-lg transition-colors text-sm lg:text-base
            "
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between p-4">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Menu className="w-6 h-6 text-gray-600" />
            </button>
            <h2 className="text-lg font-semibold text-gray-800">
              AI Invoice Manager
            </h2>
            <div className="w-10" /> {/* Spacer for centering */}
          </div>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 overflow-hidden">
          <div className="h-full p-4 lg:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

Layout.propTypes = {
  children: PropTypes.node.isRequired
};