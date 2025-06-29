import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, Filter } from 'lucide-react';

const ReelInfo = () => {
  const [reels, setReels] = useState([]);
  const [filteredReels, setFilteredReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSize, setFilterSize] = useState('');
  const [filterSpecial, setFilterSpecial] = useState('');

  // Unique size classes for filter dropdown
  const sizeClasses = [...new Set(reels.map(reel => reel.Size_Class))].sort((a, b) => b - a);
  const specialEditions = [...new Set(reels.map(reel => reel.Special_Edition).filter(Boolean))];

  useEffect(() => {
    const loadReels = async () => {
      try {
        const response = await fetch('/data/reels.csv');
        if (!response.ok) {
          throw new Error('Failed to load reel data');
        }
        const text = await response.text();
        const lines = text.trim().split('\n');
        const headers = lines[0].split(',');
        
        const reelData = lines.slice(1).map(line => {
          const values = line.split(',');
          const reel = {};
          headers.forEach((header, index) => {
            reel[header] = values[index] || '';
          });
          return reel;
        });
        
        setReels(reelData);
        setFilteredReels(reelData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadReels();
  }, []);

  useEffect(() => {
    let filtered = reels;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(reel => 
        reel.Name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply size filter
    if (filterSize) {
      filtered = filtered.filter(reel => reel.Size_Class === filterSize);
    }

    // Apply special edition filter
    if (filterSpecial) {
      if (filterSpecial === 'regular') {
        filtered = filtered.filter(reel => !reel.Special_Edition);
      } else {
        filtered = filtered.filter(reel => reel.Special_Edition === filterSpecial);
      }
    }

    setFilteredReels(filtered);
  }, [reels, searchTerm, filterSize, filterSpecial]);

  const formatPrice = (price) => {
    if (!price || price === '-') return '-';
    return new Intl.NumberFormat().format(price);
  };

  const formatWeight = (weight) => {
    if (!weight || weight === '-') return '-';
    return `${weight} kg`;
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterSize('');
    setFilterSpecial('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading reel information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">Error Loading Data</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Reel Information
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Complete specifications and pricing for RF4 fishing reels
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search reel names..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Size Class Filter */}
            <div className="w-full lg:w-48">
              <select
                value={filterSize}
                onChange={(e) => setFilterSize(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Sizes</option>
                {sizeClasses.map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>

            {/* Special Edition Filter */}
            <div className="w-full lg:w-48">
              <select
                value={filterSpecial}
                onChange={(e) => setFilterSpecial(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Editions</option>
                <option value="regular">Regular</option>
                {specialEditions.map(edition => (
                  <option key={edition} value={edition}>{edition}</option>
                ))}
              </select>
            </div>

            {/* Clear Filters */}
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Clear
            </button>
          </div>

          <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            Showing {filteredReels.length} of {reels.length} reels
          </div>
        </div>

        {/* Reels Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Reel Name
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Test Weight
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Gear Ratio
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Line Capacity (m)
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Retrieve Speed
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Drag (kg)
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Weight
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Price
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredReels.map((reel, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {reel.Name}
                          </div>
                          {reel.Special_Edition && (
                            <div className="text-xs text-primary-600 dark:text-primary-400">
                              {reel.Special_Edition}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-900 dark:text-white">
                      {reel.Size_Class}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-900 dark:text-white">
                      {reel.Test_Weight}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-900 dark:text-white">
                      {reel.Gear_Ratio}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-900 dark:text-white">
                      {reel.Line_Capacity_m}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-900 dark:text-white">
                      {reel.Retrieve_Speed}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-900 dark:text-white">
                      {reel.Drag_Real_KG && reel.Drag_Real_KG !== '-' ? formatWeight(reel.Drag_Real_KG) : '-'}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-900 dark:text-white">
                      {reel.Weight_KG && reel.Weight_KG !== '-' ? formatWeight(reel.Weight_KG) : '-'}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-900 dark:text-white">
                      <div className="flex flex-col">
                        {reel.Price && reel.Price !== '-' && (
                          <span className="font-medium">{formatPrice(reel.Price)}</span>
                        )}
                        {reel.Price_New && reel.Price_New !== '-' && reel.Price_New !== reel.Price && (
                          <span className="text-xs text-green-600 dark:text-green-400">
                            New: {formatPrice(reel.Price_New)}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredReels.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 dark:text-gray-500 text-6xl mb-4">🎣</div>
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                No reels found
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Try adjusting your search or filter criteria.
              </p>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Legend</h3>
          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <p><strong>Test Weight:</strong> Maximum recommended line test weight</p>
            <p><strong>Gear Ratio:</strong> Number of spool rotations per handle turn</p>
            <p><strong>Line Capacity:</strong> Line capacity in meters (at 0.42mm line thickness)</p>
            <p><strong>Retrieve Speed:</strong> Line retrieval speed in meters per second</p>
            <p><strong>Drag:</strong> Maximum drag force in kilograms</p>
            <p><strong>💧:</strong> All reels feature water resistance</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReelInfo;