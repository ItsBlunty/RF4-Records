import React, { useMemo } from 'react';
import { Clock, Target } from 'lucide-react';
import MultiSelectFilter from './MultiSelectFilter.jsx';
import SearchHistory from './SearchHistory.jsx';

const Filters = ({ filters, uniqueValues, onChange, onSubmitWithValues, onPageChange, currentPage }) => {
  // Dynamic filtering: when locations are selected, filter fish list to show fish at those locations
  // When fish are selected, filter location list to show locations where those fish appear
  // Uses union logic: if multiple selected, show anything matching ANY of the selections
  const filteredFishOptions = useMemo(() => {
    // If no locations selected, show all fish
    if (!filters.waterbody || filters.waterbody.length === 0) {
      return uniqueValues.fish || [];
    }

    // Get fish_by_location mapping from uniqueValues
    const fishByLocation = uniqueValues.fish_by_location || {};

    // Union of all fish across selected locations
    const fishSet = new Set();
    filters.waterbody.forEach(location => {
      const fishAtLocation = fishByLocation[location] || [];
      fishAtLocation.forEach(fish => fishSet.add(fish));
    });

    // Return sorted array, or all fish if no mapping found
    return fishSet.size > 0 ? Array.from(fishSet).sort() : (uniqueValues.fish || []);
  }, [filters.waterbody, uniqueValues.fish, uniqueValues.fish_by_location]);

  const filteredLocationOptions = useMemo(() => {
    // If no fish selected, show all locations
    if (!filters.fish || filters.fish.length === 0) {
      return uniqueValues.waterbody || [];
    }

    // Get locations_by_fish mapping from uniqueValues
    const locationsByFish = uniqueValues.locations_by_fish || {};

    // Union of all locations across selected fish
    const locationSet = new Set();
    filters.fish.forEach(fish => {
      const locationsForFish = locationsByFish[fish] || [];
      locationsForFish.forEach(location => locationSet.add(location));
    });

    // Return sorted array, or all locations if no mapping found
    return locationSet.size > 0 ? Array.from(locationSet).sort() : (uniqueValues.waterbody || []);
  }, [filters.fish, uniqueValues.waterbody, uniqueValues.locations_by_fish]);

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

  const handleInputChange = (field, value) => {
    onChange(field, value);

    // Auto-search when fish, waterbody, or bait changes (not dataAge)
    if (field !== 'dataAge') {
      const newFilters = { ...filters, [field]: value };
      if (onSubmitWithValues) {
        onSubmitWithValues(newFilters);
      }
    }
  };

  const handleDataAgeChange = (field, value) => {
    onChange(field, value);
    // Data age filter does not auto-submit - user must add a fish/location/bait filter
  };

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
      <div className="max-w-7xl mx-auto">
        <div className="flex gap-4">
          {/* Top Baits Quick Access */}
          {currentPage === 'records' && (
            <button
              onClick={() => onPageChange && onPageChange('topbaits')}
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 bg-gray-500 dark:bg-gray-600 text-white hover:bg-gray-600 dark:hover:bg-gray-700 self-end"
              title="Top Baits"
            >
              <Target className="w-4 h-4 mr-2" />
              Top Baits
            </button>
          )}

          {/* Main Filter Row */}
          <div className="flex gap-4 items-center flex-1">

          {/* Fish Filter - filtered by selected locations */}
          <MultiSelectFilter
            label="Fish"
            placeholder="Select or type fish name..."
            values={filteredFishOptions}
            selectedValues={filters.fish}
            onChange={(values) => handleInputChange('fish', values)}
            className="flex-1 min-w-[200px]"
          />

          {/* Location Filter - filtered by selected fish */}
          <MultiSelectFilter
            label="Location"
            placeholder="Select or type location..."
            values={filteredLocationOptions}
            selectedValues={filters.waterbody}
            onChange={(values) => handleInputChange('waterbody', values)}
            className="flex-1 min-w-[200px]"
          />

          {/* Bait Filter */}
          <MultiSelectFilter
            label="Bait"
            placeholder="Select or type bait..."
            values={uniqueValues.bait}
            selectedValues={filters.bait}
            onChange={(values) => handleInputChange('bait', values)}
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

          {/* Search History */}
          <div className="flex-shrink-0 flex items-center">
            <SearchHistory onSelectSearch={handleHistorySelect} />
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default Filters;
