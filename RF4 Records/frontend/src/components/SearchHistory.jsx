import React, { useState, useEffect, useRef } from 'react';
import { History, X, Clock, ChevronDown, Trash2 } from 'lucide-react';
import { getSearchHistory, clearSearchHistory, removeSearchFromHistory, formatRelativeTime } from '../utils/searchHistory.js';

const SearchHistory = ({ onSelectSearch, className = '' }) => {
  const [history, setHistory] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadHistory = () => {
    setHistory(getSearchHistory());
  };

  const handleSelectSearch = (searchEntry) => {
    onSelectSearch(searchEntry.filters);
    setIsOpen(false);
  };

  const handleRemoveSearch = (e, searchId) => {
    e.stopPropagation();
    removeSearchFromHistory(searchId);
    loadHistory();
  };

  const handleClearAll = (e) => {
    e.stopPropagation();
    clearSearchHistory();
    loadHistory();
    setIsOpen(false);
  };

  // Always show the button, but disable it when there's no history
  const hasHistory = history.length > 0;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => hasHistory && setIsOpen(!isOpen)}
        disabled={!hasHistory}
        className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
          hasHistory 
            ? 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer' 
            : 'text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 cursor-not-allowed'
        }`}
        title={hasHistory ? "Search History" : "No search history yet"}
      >
        <History className="w-4 h-4 mr-2" />
        <span className="hidden sm:inline">History</span>
        <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && hasHistory && (
        <div className="absolute top-full left-0 mt-1 w-96 max-w-[90vw] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center">
              <History className="w-4 h-4 mr-2" />
              Recent Searches
            </h3>
            <button
              onClick={handleClearAll}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 flex items-center"
              title="Clear all history"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Clear All
            </button>
          </div>
          
          <div className="py-1">
            {history.map((searchEntry) => (
              <div
                key={searchEntry.id}
                className="group px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer flex items-start justify-between"
                onClick={() => handleSelectSearch(searchEntry)}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-900 dark:text-gray-100 truncate">
                    {searchEntry.displayText}
                  </div>
                  <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <Clock className="w-3 h-3 mr-1" />
                    {formatRelativeTime(searchEntry.timestamp)}
                    {searchEntry.resultCount > 0 && (
                      <span className="ml-2 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs">
                        {searchEntry.resultCount} results
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => handleRemoveSearch(e, searchEntry.id)}
                  className="ml-2 opacity-0 group-hover:opacity-100 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-opacity"
                  title="Remove from history"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchHistory;