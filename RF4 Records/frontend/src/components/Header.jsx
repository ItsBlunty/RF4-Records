import React from 'react';
import { Sun, Moon, Info, Database, BookOpen } from 'lucide-react';

const Header = ({ total, filtered, onRefresh, lastRefresh, darkMode, onToggleDarkMode, onAboutClick, currentPage, onPageChange }) => {
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
      <div className="mx-auto px-6 py-6">
        {/* Navigation Buttons - Top Right */}
        <div className="flex justify-end mb-4 space-x-3">
          <button
            onClick={() => onPageChange && onPageChange('records')}
            className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              currentPage === 'records' 
                ? 'bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-800' 
                : 'bg-gray-500 dark:bg-gray-500 text-white hover:bg-gray-600 dark:hover:bg-gray-600'
            }`}
          >
            <Database className="w-4 h-4 mr-2" />
            Records
          </button>
          
          <button
            onClick={() => onPageChange && onPageChange('guides')}
            className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              currentPage === 'guides' 
                ? 'bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-800' 
                : 'bg-gray-500 dark:bg-gray-500 text-white hover:bg-gray-600 dark:hover:bg-gray-600'
            }`}
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Skill Leveling Guides
          </button>

          {onAboutClick && (
            <button
              onClick={onAboutClick}
              className="inline-flex items-center px-4 py-2 bg-gray-600 dark:bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 dark:hover:bg-gray-700 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              <Info className="w-4 h-4 mr-2" />
              About RF4 Records
            </button>
          )}
        </div>

        {/* Main Header Content */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          {/* Left Side - Title and Badges */}
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">RF4 Records</h1>
            <div className="flex items-center space-x-3">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                {filtered} of {total} records
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                Created by ItsBlunty
              </span>
            </div>
          </div>

          {/* Right Side - Controls and Info */}
          <div className="mt-4 lg:mt-0 flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
            {/* Dark Mode Toggle */}
            {onToggleDarkMode && (
              <button
                onClick={onToggleDarkMode}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {darkMode ? (
                  <Sun className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                )}
              </button>
            )}

            {/* Database Info */}
            <div className="text-center sm:text-right">
              <div className="text-lg font-medium text-gray-700 dark:text-gray-300">
                Russian Fishing 4 World Records Database
              </div>
              {lastRefresh && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Last updated: {formatLastRefresh(lastRefresh)}
                </div>
              )}
            </div>

            {/* Refresh Button */}
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header; 