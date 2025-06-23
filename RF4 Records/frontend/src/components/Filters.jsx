import React, { useState } from 'react';
import { X, Clock, Settings, ChevronDown, ChevronUp } from 'lucide-react';

const Filters = ({ filters, uniqueValues, onChange, onClear }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleInputChange = (field, value) => {
    onChange(field, value);
  };

  const clearFilter = (field) => {
    onChange(field, '');
  };

  const handleSubmit = (e) => {
    e.preventDefault(); // Prevent actual form submission
  };

  const handleAdvancedToggle = (field, value) => {
    onChange(field, value);
  };

  // Toggle Switch Component
  const ToggleSwitch = ({ label, checked, onChange }) => (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          checked ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

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
                placeholder="Search fish..."
                value={filters.fish}
                onChange={e => handleInputChange('fish', e.target.value)}
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
                placeholder="Search location..."
                value={filters.waterbody}
                onChange={e => handleInputChange('waterbody', e.target.value)}
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
                placeholder="Search bait..."
                value={filters.bait}
                onChange={e => handleInputChange('bait', e.target.value)}
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
                value={filters.dataAge || ''}
                onChange={e => handleInputChange('dataAge', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 appearance-none"
              >
                <option value="">All Time</option>
                <option value="since-reset">Data Scraped Since Last Reset</option>
                <option value="1-hour">Data Scraped in Last 1 Hour</option>
                <option value="6-hours">Data Scraped in Last 6 Hours</option>
                <option value="12-hours">Data Scraped in Last 12 Hours</option>
                <option value="1-day">Fish Caught in Last 1 Day</option>
                <option value="3-days">Fish Caught in Last 3 Days</option>
                <option value="7-days">Fish Caught in Last 7 Days</option>
                <option value="30-days">Fish Caught in Last 30 Days</option>
                <option value="90-days">Fish Caught in Last 90 Days</option>
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

          {/* Advanced Filters Toggle */}
          <div className="flex-shrink-0">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors mt-6"
              title="Advanced Filters"
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showAdvanced && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Advanced Filters</h3>
              <button
                type="button"
                onClick={() => setShowAdvanced(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Sandwich Bait Toggle */}
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <ToggleSwitch
                  label="Include Sandwich Bait"
                  checked={filters.includeSandwichBait !== false}
                  onChange={(value) => handleAdvancedToggle('includeSandwichBait', value)}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Show records with multiple baits (Bait1 + Bait2)
                </p>
              </div>

              {/* Ultralight Toggle */}
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <ToggleSwitch
                  label="Include Ultralight"
                  checked={filters.includeUltralight !== false}
                  onChange={(value) => handleAdvancedToggle('includeUltralight', value)}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Show records from Ultralight category
                </p>
              </div>

              {/* Light Toggle */}
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <ToggleSwitch
                  label="Include Light"
                  checked={filters.includeLight !== false}
                  onChange={(value) => handleAdvancedToggle('includeLight', value)}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Show records from Light category
                </p>
              </div>

              {/* Bottom Light Toggle */}
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <ToggleSwitch
                  label="Include Bottom Light"
                  checked={filters.includeBottomLight !== false}
                  onChange={(value) => handleAdvancedToggle('includeBottomLight', value)}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Show records from Bottom Light category
                </p>
              </div>

              {/* Telescopic Toggle */}
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <ToggleSwitch
                  label="Include Telescopic"
                  checked={filters.includeTelescopic !== false}
                  onChange={(value) => handleAdvancedToggle('includeTelescopic', value)}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Show records from Telescopic category
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Filters; 