import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Target, HelpCircle, ChevronDown } from 'lucide-react';
import MultiSelectFilter from './MultiSelectFilter.jsx';
import SearchHistory from './SearchHistory.jsx';

// DataAgeFilter component - custom dropdown matching MultiSelectFilter style
const DATA_AGE_OPTIONS = [
  { value: '1-day', label: 'Fish Caught in the Last Day' },
  { value: '2-days', label: 'Fish Caught in the Last 2 Days' },
  { value: '3-days', label: 'Fish Caught in the Last 3 Days' },
  { value: 'since-reset', label: 'Fish Caught Since Last Reset' },
];

const DataAgeFilter = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const dropdownRef = useRef(null);
  const tooltipRef = useRef(null);

  const selectedOption = DATA_AGE_OPTIONS.find(opt => opt.value === value) || DATA_AGE_OPTIONS[0];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
      if (tooltipRef.current && !tooltipRef.current.contains(event.target)) {
        setShowTooltip(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div className="relative flex-1 min-w-[200px]" ref={dropdownRef}>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
          Data Age
        </label>
        <div className="relative" ref={tooltipRef}>
          <button
            type="button"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onClick={() => setShowTooltip(!showTooltip)}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <HelpCircle className="h-3 w-3" />
          </button>
          {showTooltip && (
            <div className="absolute right-0 top-full mt-1 w-64 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg p-2 shadow-lg z-50">
              <div className="space-y-1">
                <div>Filter records by how recently they were caught</div>
              </div>
              <div className="absolute -top-1 right-2 w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45"></div>
            </div>
          )}
        </div>
      </div>

      <div className="relative">
        <div
          className="w-full min-h-[40px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 bg-white dark:bg-gray-700 flex flex-wrap gap-1 items-center cursor-pointer"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="flex-1 min-w-[120px] text-sm text-gray-900 dark:text-gray-100">
            {selectedOption.label}
          </span>
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
        </div>

        {/* Custom Dropdown */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {DATA_AGE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                  option.value === value
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                    : 'text-gray-900 dark:text-gray-100'
                }`}
                onClick={() => handleSelect(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

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

          {/* Data Age Filter - structure matches MultiSelectFilter exactly */}
          <DataAgeFilter
            value={filters.dataAge || '1-day'}
            onChange={(value) => handleDataAgeChange('dataAge', value)}
          />

          {/* Search History */}
          <SearchHistory onSelectSearch={handleHistorySelect} className="self-end" />
        </div>
        </div>
      </div>
    </div>
  );
};

export default Filters;
