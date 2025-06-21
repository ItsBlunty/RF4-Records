import React from 'react';
import { X } from 'lucide-react';

const Filters = ({ filters, uniqueValues, onChange, onClear }) => {
  const handleInputChange = (field, value) => {
    onChange(field, value);
  };

  const clearFilter = (field) => {
    onChange(field, '');
  };

  const handleSubmit = (e) => {
    e.preventDefault(); // Prevent actual form submission
  };

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
      <div className="max-w-7xl mx-auto">
        {/* Horizontal Filter Layout */}
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
      </div>
    </div>
  );
};

export default Filters; 