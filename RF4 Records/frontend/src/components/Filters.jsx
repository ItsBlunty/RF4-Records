import React, { useState } from 'react';
import { X, Clock, Search } from 'lucide-react';

const Filters = ({ filters, uniqueValues, onChange, onSubmit, onClear }) => {

  // Check if any of the main text fields (fish, waterbody, bait) have content
  const hasTextContent = () => {
    return !!(filters.fish || filters.waterbody || filters.bait);
  };

  const handleInputChange = (field, value) => {
    onChange(field, value);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      onSubmit();
    }
  };

  const handleDropdownChange = (field, value) => {
    onChange(field, value);
    // Only submit if there's content in at least one text field (fish, waterbody, or bait)
    if (hasTextContent()) {
      setTimeout(() => onSubmit(), 0);
    }
  };

  const clearFilter = (field) => {
    onChange(field, '');
  };

  const handleSubmit = (e) => {
    e.preventDefault(); // Prevent actual form submission
  };



  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
      <div className="max-w-7xl mx-auto">
        {/* Main Filter Row */}
        <div className="flex flex-wrap gap-4 items-center">
          {/* Fish Filter */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Fish</label>
            <div className="relative">
              <input
                type="search"
                list="fish-list"
                placeholder="Search fish... (Press Enter to search)"
                value={filters.fish}
                onChange={e => handleInputChange('fish', e.target.value)}
                onKeyPress={handleKeyPress}
                autoComplete="off"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
              />
              <datalist id="fish-list">
                {uniqueValues.fish.map((fish, idx) => (
                  <option key={idx} value={fish} />
                ))}
              </datalist>
              {filters.fish && (
                <button
                  type="button"
                  onClick={() => clearFilter('fish')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Location Filter */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
            <div className="relative">
              <input
                type="search"
                list="locations"
                placeholder="Search location... (Press Enter to search)"
                value={filters.waterbody}
                onChange={e => handleInputChange('waterbody', e.target.value)}
                onKeyPress={handleKeyPress}
                autoComplete="off"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
              />
              <datalist id="locations">
                {uniqueValues.waterbody.map((loc, idx) => (
                  <option key={idx} value={loc} />
                ))}
              </datalist>
              {filters.waterbody && (
                <button
                  type="button"
                  onClick={() => clearFilter('waterbody')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Bait Filter */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Bait</label>
            <div className="relative">
              <input
                type="search"
                list="bait-list"
                placeholder="Search bait... (Press Enter to search)"
                value={filters.bait}
                onChange={e => handleInputChange('bait', e.target.value)}
                onKeyPress={handleKeyPress}
                autoComplete="off"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
              />
              <datalist id="bait-list">
                {uniqueValues.bait.map((bait, idx) => (
                  <option key={idx} value={bait} />
                ))}
              </datalist>
              {filters.bait && (
                <button
                  type="button"
                  onClick={() => clearFilter('bait')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Data Age Filter */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              <Clock className="inline h-3 w-3 mr-1" />
              Data Age
            </label>
            <div className="relative">
              <select
                value={filters.dataAge || '1-day'}
                onChange={e => handleDropdownChange('dataAge', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 appearance-none"
              >
                <option value="1-day">Fish Caught in the Last Day</option>
                <option value="2-days">Fish Caught in the Last 2 Days</option>
                <option value="3-days">Fish Caught in the Last 3 Days</option>
                <option value="since-reset">Fish Caught Since Reset</option>
                <option value="30-days">Fish Caught in the Last 30 Days</option>
              </select>
              {/* Custom dropdown arrow */}
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              {filters.dataAge && (
                <button
                  type="button"
                  onClick={() => clearFilter('dataAge')}
                  className="absolute right-8 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Search Button */}
          <div className="flex-shrink-0">
            <button
              type="button"
              onClick={onSubmit}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mt-6 flex items-center space-x-2"
            >
              <Search className="h-4 w-4" />
              <span>Search</span>
            </button>
          </div>

          {/* Clear Button */}
          <div className="flex-shrink-0">
            <button
              type="button"
              onClick={onClear}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 mt-6"
            >
              Clear All
            </button>
          </div>


        </div>

        {/* Advanced Filters Panel */}

      </div>
    </div>
  );
};

export default Filters; 