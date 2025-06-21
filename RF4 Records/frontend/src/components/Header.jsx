import React from 'react';
import { Sun, Moon, Info, Database, BookOpen, Calculator, Wine } from 'lucide-react';

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
        {/* Top Section - Title, Attribution, and Navigation */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-6">
          {/* Left Side - Title, Attribution, Database Info, and Controls */}
          <div className="flex flex-col space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">RF4 Records</h1>
              <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                Created by ItsBlunty
              </span>
            </div>
            
            {/* Database Info and Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
              <div>
                {lastRefresh && (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Last updated: {formatLastRefresh(lastRefresh)}
                  </div>
                )}
              </div>
              
              {/* Refresh and Dark Mode Controls */}
              <div className="flex items-center space-x-3">
                {/* Refresh Button */}
                {onRefresh && (
                  <button
                    onClick={onRefresh}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 shadow-sm text-xs font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </button>
                )}

                {/* Dark Mode Toggle */}
                {onToggleDarkMode && (
                  <button
                    onClick={onToggleDarkMode}
                    className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                  >
                    {darkMode ? (
                      <Sun className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                    ) : (
                      <Moon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
          
          {/* Right Side - Navigation Buttons */}
          <div className="flex space-x-3 mt-4 lg:mt-0">
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

            <button
              onClick={() => onPageChange && onPageChange('wearcalc')}
              className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                currentPage === 'wearcalc' 
                  ? 'bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-800' 
                  : 'bg-gray-500 dark:bg-gray-500 text-white hover:bg-gray-600 dark:hover:bg-gray-600'
              }`}
            >
              <Calculator className="w-4 h-4 mr-2" />
              Wear Calculator
            </button>

            <button
              onClick={() => onPageChange && onPageChange('alcohol')}
              className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                currentPage === 'alcohol' 
                  ? 'bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-800' 
                  : 'bg-gray-500 dark:bg-gray-500 text-white hover:bg-gray-600 dark:hover:bg-gray-600'
              }`}
            >
              <Wine className="w-4 h-4 mr-2" />
              Alcohol
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
        </div>
      </div>
    </header>
  );
};

export default Header; 