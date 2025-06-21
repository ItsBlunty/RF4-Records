import React from 'react';
import { Sun, Moon } from 'lucide-react';

const Header = ({ total, filtered, onRefresh, lastRefresh, darkMode, onToggleDarkMode, onAboutClick }) => {
  const formatLastRefresh = (date) => {
    if (!date) return '';
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">RF4 Records</h1>
            <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
              {filtered} of {total} records
            </span>
            <span className="ml-3 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
              RF4 Records created by ItsBlunty
            </span>
          </div>
          <div className="mt-2 sm:mt-0 flex items-center space-x-4">
            {onToggleDarkMode && (
              <button
                onClick={onToggleDarkMode}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {darkMode ? (
                  <Sun className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                ) : (
                  <Moon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                )}
              </button>
            )}
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <div>Russian Fishing 4 World Records Database</div>
              {lastRefresh && (
                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Last updated: {formatLastRefresh(lastRefresh)}
                </div>
              )}
            </div>
            <div className="flex flex-col items-end space-y-2">
              {onAboutClick && (
                <button
                  onClick={onAboutClick}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
                >
                  About
                </button>
              )}
              <div className="flex items-center space-x-2">
                {onRefresh && (
                  <button
                    onClick={onRefresh}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header; 