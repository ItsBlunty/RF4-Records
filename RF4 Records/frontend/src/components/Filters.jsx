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
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="max-w-7xl mx-auto">
        <form 
          method="get" 
          action="/search/fish" 
          onSubmit={handleSubmit}
          className="stat filters"
          role="search"
        >
          <input type="hidden" name="type" value="fish_search" />
          <table className="w-full">
            <tbody>
              <tr>
                <td className="fish">
                  <div className="relative">
                    <input
                      type="search"
                      list="fish-list"
                      placeholder="Fish"
                      name="fish_query"
                      value={filters.fish}
                      onChange={e => handleInputChange('fish', e.target.value)}
                      autoComplete="off"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      role="searchbox"
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
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        tabIndex={-1}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
                <td className="location">
                  <div className="relative">
                    <input
                      type="search"
                      list="locations"
                      placeholder="Location"
                      name="location_query"
                      value={filters.waterbody}
                      onChange={e => handleInputChange('waterbody', e.target.value)}
                      autoComplete="off"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      role="searchbox"
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
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        tabIndex={-1}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
                <td className="bait">
                  <div className="relative">
                    <input
                      type="search"
                      list="bait-list"
                      placeholder="Bait"
                      name="bait_query"
                      value={filters.bait}
                      onChange={e => handleInputChange('bait', e.target.value)}
                      autoComplete="off"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      role="searchbox"
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
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        tabIndex={-1}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
                <td className="right">
                  <button
                    type="button"
                    onClick={onClear}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Clear All
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </form>
      </div>
    </div>
  );
};

export default Filters; 