import React, { useState } from 'react';
import { X, Clock, Search, Target, Trophy } from 'lucide-react';
import MultiSelectFilter from './MultiSelectFilter.jsx';
import SearchHistory from './SearchHistory.jsx';

const Filters = ({ filters, uniqueValues, onChange, onSubmit, onSubmitWithValues, onClear, onPageChange, currentPage }) => {
  // Refs to store search trigger functions from MultiSelectFilter components
  const fishSearchTriggerRef = React.useRef(null);
  const waterbodySearchTriggerRef = React.useRef(null);
  const baitSearchTriggerRef = React.useRef(null);

  const handleHistorySelect = (historicalFilters) => {
    // First trigger the search with historical filters
    if (onSubmitWithValues) {
      onSubmitWithValues(historicalFilters);
    }
    
    // Then update the UI state to reflect the selected filters
    Object.keys(historicalFilters).forEach(key => {
      onChange(key, historicalFilters[key]);
    });
  };

  // Check if any of the main text fields (fish, waterbody, bait) have content
  const hasTextContent = () => {
    return !!(filters.fish && filters.fish.length > 0) || 
           !!(filters.waterbody && filters.waterbody.length > 0) || 
           !!(filters.bait && filters.bait.length > 0);
  };

  const handleInputChange = (field, value) => {
    onChange(field, value);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      onSubmit();
    }
  };

  const handleAddAndSearch = (field) => (newValues) => {
    // Create new filter object with the updated field
    const newFilters = {
      ...filters,
      [field]: newValues
    };
    
    // Update the filter state and immediately trigger search with the new values
    onChange(field, newValues);
    
    // Use the new search function that accepts specific filter values
    if (onSubmitWithValues) {
      onSubmitWithValues(newFilters);
    } else {
      // Fallback to old behavior
      setTimeout(() => {
        onSubmit();
      }, 0);
    }
  };

  const handleDataAgeChange = (field, value) => {
    onChange(field, value);
    // Data age filter should not auto-submit, only submit on button press
  };


  const handleSubmit = (e) => {
    e.preventDefault(); // Prevent actual form submission
    
    // Trigger search with any pending input values from MultiSelectFilter components
    const updatedFilters = { ...filters };
    
    // Get updated values from each MultiSelectFilter component
    if (fishSearchTriggerRef.current) {
      updatedFilters.fish = fishSearchTriggerRef.current();
    }
    if (waterbodySearchTriggerRef.current) {
      updatedFilters.waterbody = waterbodySearchTriggerRef.current();
    }
    if (baitSearchTriggerRef.current) {
      updatedFilters.bait = baitSearchTriggerRef.current();
    }
    
    // Use the updated filters for search
    if (onSubmitWithValues) {
      onSubmitWithValues(updatedFilters);
    } else {
      onSubmit();
    }
  };



  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
      <div className="max-w-7xl mx-auto">
        <div className="flex gap-4">
          {/* Quick Access Buttons - Separate from main filter row */}
          {currentPage === 'records' && (
            <div className="flex flex-col gap-2 self-start">
              <button
                onClick={() => onPageChange && onPageChange('topbaits')}
                className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded-md transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 bg-gray-500 dark:bg-gray-600 text-white hover:bg-gray-600 dark:hover:bg-gray-700"
                title="Top Baits"
              >
                <Target className="w-3 h-3 mr-1" />
                &nbsp;&nbsp;Top Baits
              </button>
              <button
                onClick={() => onPageChange && onPageChange('trophyweights')}
                className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded-md transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 bg-gray-500 dark:bg-gray-600 text-white hover:bg-gray-600 dark:hover:bg-gray-700"
                title="Trophy Weights"
              >
                <Trophy className="w-3 h-3 mr-1" />
                Trophy Weights
              </button>
            </div>
          )}
          
          {/* Main Filter Row */}
          <div className="flex gap-4 items-center flex-1">
          
          {/* Fish Filter */}
          <MultiSelectFilter
            label="Fish"
            placeholder="Type fish name... (Enter to search, Tab to add)"
            values={uniqueValues.fish}
            selectedValues={filters.fish}
            onChange={(values) => handleInputChange('fish', values)}
            onKeyPress={handleKeyPress}
            onAddAndSearch={handleAddAndSearch('fish')}
            onSearchTriggered={(triggerFn) => { fishSearchTriggerRef.current = triggerFn; }}
            className="flex-1 min-w-[200px]"
          />

          {/* Location Filter */}
          <MultiSelectFilter
            label="Location"
            placeholder="Type location... (Enter to search, Tab to add)"
            values={uniqueValues.waterbody}
            selectedValues={filters.waterbody}
            onChange={(values) => handleInputChange('waterbody', values)}
            onKeyPress={handleKeyPress}
            onAddAndSearch={handleAddAndSearch('waterbody')}
            onSearchTriggered={(triggerFn) => { waterbodySearchTriggerRef.current = triggerFn; }}
            className="flex-1 min-w-[200px]"
          />

          {/* Bait Filter */}
          <MultiSelectFilter
            label="Bait"
            placeholder="Type bait... (Enter to search, Tab to add)"
            values={uniqueValues.bait}
            selectedValues={filters.bait}
            onChange={(values) => handleInputChange('bait', values)}
            onKeyPress={handleKeyPress}
            onAddAndSearch={handleAddAndSearch('bait')}
            onSearchTriggered={(triggerFn) => { baitSearchTriggerRef.current = triggerFn; }}
            className="flex-1 min-w-[200px]"
          />

          {/* Data Age Filter */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              <Clock className="inline h-3 w-3 mr-1" />
              Data Age
            </label>
            <div className="relative">
              <select
                value={filters.dataAge || '1-day'}
                onChange={e => handleDataAgeChange('dataAge', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 appearance-none"
              >
                <option value="1-day">Fish Caught in the Last Day</option>
                <option value="2-days">Fish Caught in the Last 2 Days</option>
                <option value="3-days">Fish Caught in the Last 3 Days</option>
                <option value="since-reset">Fish Caught Since Last Reset</option>
              </select>
              {/* Custom dropdown arrow */}
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Action Buttons Group */}
          <div className="flex-shrink-0 flex gap-3 items-center">
            {/* Search Button */}
            <button
              type="button"
              onClick={handleSubmit}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center space-x-2"
            >
              <Search className="h-4 w-4" />
              <span>Search</span>
            </button>

            {/* Search History */}
            <SearchHistory onSelectSearch={handleHistorySelect} />

            {/* Clear Button */}
            <button
              type="button"
              onClick={onClear}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Clear All
            </button>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default Filters; 