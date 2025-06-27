import React, { useState, useEffect, useMemo } from 'react';
import { Search, Trophy, Target, Calendar, TrendingUp } from 'lucide-react';
import LoadingOverlay from './LoadingOverlay';

const TopBaits = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [topBaitsData, setTopBaitsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTopBaitsData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/records/top-baits');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        setTopBaitsData(data);
      } catch (err) {
        console.error('Error fetching top baits data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTopBaitsData();
  }, []);

  const filteredFishData = useMemo(() => {
    if (!topBaitsData?.fish_data) return [];
    
    const fishNames = Object.keys(topBaitsData.fish_data);
    
    return fishNames
      .filter(fishName => 
        fishName.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        if (!sortConfig.key) return a.localeCompare(b);
        
        let aValue, bValue;
        
        if (sortConfig.key === 'fish_name') {
          aValue = a;
          bValue = b;
        } else {
          // For bait sorting, we'll use a simple string comparison
          aValue = sortConfig.key;
          bValue = sortConfig.key;
        }
        
        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
  }, [topBaitsData, searchTerm, sortConfig]);

  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const formatBaitCell = (periodData, type) => {
    if (!periodData || !periodData[type]) {
      return <div className="text-gray-400 dark:text-gray-500 text-sm">No data</div>;
    }

    const data = periodData[type];
    const displayValue = type === 'caught_most' ? `${data.count} fish` : `${data.weight}g`;
    
    return (
      <div className="text-center">
        <div className="font-medium text-sm text-gray-800 dark:text-gray-200 mb-1">
          {data.bait}
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
          {displayValue}
        </div>
      </div>
    );
  };

  if (loading) {
    return <LoadingOverlay message="Loading top baits analysis..." />;
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-6">
          <div className="flex items-center">
            <Target className="w-6 h-6 text-red-600 dark:text-red-400 mr-3" />
            <div>
              <h3 className="font-semibold text-red-800 dark:text-red-200">Error Loading Data</h3>
              <p className="text-red-700 dark:text-red-300 mt-1">{error}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center">
          <Target className="w-8 h-8 mr-3 text-blue-500" />
          Top Baits Analysis
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Weekly bait performance analysis using Sunday 6PM UTC reset markers
        </p>
      </div>

      {/* Performance Info */}
      {topBaitsData?.performance && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{topBaitsData.performance.total_fish_species}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Fish Species</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{topBaitsData.performance.total_records.toLocaleString()}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Records Analyzed</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{topBaitsData.performance.total_time}s</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Processing Time</div>
          </div>
        </div>
      )}

      {/* Show message if no data */}
      {topBaitsData?.performance?.total_records === 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg p-6 mb-6">
          <div className="flex items-center">
            <Target className="w-6 h-6 text-yellow-600 dark:text-yellow-400 mr-3" />
            <div>
              <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">No Records Available</h3>
              <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                There are currently no fishing records in the database to analyze. Please check back after some records have been added.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Period Information */}
      {topBaitsData?.periods && topBaitsData.performance.total_records > 0 && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
          {Object.entries(topBaitsData.periods).map(([key, period]) => (
            <div key={key} className="text-center">
              <div className="font-semibold text-blue-800 dark:text-blue-200 flex items-center justify-center">
                <Calendar size={16} className="mr-2" />
                {period.label}
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                {new Date(period.start_date).toLocaleDateString()}
                {period.end_date && (
                  <> - {new Date(period.end_date).toLocaleDateString()}</>
                )}
                {!period.end_date && <> - Present</>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search and Filter Controls */}
      {topBaitsData?.performance?.total_records > 0 && (
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search fish species..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Top Baits Table */}
      {filteredFishData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                    onClick={() => handleSort('fish_name')}
                  >
                    <div className="flex items-center">
                      Fish Species
                      {sortConfig.key === 'fish_name' && (
                        <span className="ml-1">
                          {sortConfig.direction === 'ascending' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  
                  {/* This Week */}
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <div className="flex items-center justify-center mb-2">
                      <Calendar size={14} className="mr-1" />
                      This Week
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-center">
                        <Trophy size={14} className="mx-auto mb-1 text-yellow-600" />
                        <div>Caught Most</div>
                      </div>
                      <div className="text-center">
                        <Target size={14} className="mx-auto mb-1 text-green-600" />
                        <div>Caught Biggest</div>
                      </div>
                    </div>
                  </th>
                  
                  {/* Last Week */}
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <div className="flex items-center justify-center mb-2">
                      <Calendar size={14} className="mr-1" />
                      Last Week
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-center">
                        <Trophy size={14} className="mx-auto mb-1 text-yellow-600" />
                        <div>Caught Most</div>
                      </div>
                      <div className="text-center">
                        <Target size={14} className="mx-auto mb-1 text-green-600" />
                        <div>Caught Biggest</div>
                      </div>
                    </div>
                  </th>
                  
                  {/* 3 Weeks Ago */}
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <div className="flex items-center justify-center mb-2">
                      <Calendar size={14} className="mr-1" />
                      3 Weeks Ago
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-center">
                        <Trophy size={14} className="mx-auto mb-1 text-yellow-600" />
                        <div>Caught Most</div>
                      </div>
                      <div className="text-center">
                        <Target size={14} className="mx-auto mb-1 text-green-600" />
                        <div>Caught Biggest</div>
                      </div>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredFishData.map((fishName, index) => {
                  const fishData = topBaitsData.fish_data[fishName];
                  return (
                    <tr key={fishName} className={index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {fishName}
                      </td>
                      
                      {/* This Week */}
                      <td className="px-6 py-4">
                        <div className="grid grid-cols-2 gap-2">
                          <div>{formatBaitCell(fishData.this_week, 'caught_most')}</div>
                          <div>{formatBaitCell(fishData.this_week, 'caught_biggest')}</div>
                        </div>
                      </td>
                      
                      {/* Last Week */}
                      <td className="px-6 py-4">
                        <div className="grid grid-cols-2 gap-2">
                          <div>{formatBaitCell(fishData.last_week, 'caught_most')}</div>
                          <div>{formatBaitCell(fishData.last_week, 'caught_biggest')}</div>
                        </div>
                      </td>
                      
                      {/* 3 Weeks Ago */}
                      <td className="px-6 py-4">
                        <div className="grid grid-cols-2 gap-2">
                          <div>{formatBaitCell(fishData.three_weeks_ago, 'caught_most')}</div>
                          <div>{formatBaitCell(fishData.three_weeks_ago, 'caught_biggest')}</div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {filteredFishData.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-700 px-6 py-3 text-center text-sm text-gray-600 dark:text-gray-400">
              Showing {filteredFishData.length} fish species
            </div>
          )}
        </div>
      )}

      {/* No search results */}
      {topBaitsData?.performance?.total_records > 0 && filteredFishData.length === 0 && searchTerm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No fish found</h3>
          <p className="text-gray-600 dark:text-gray-400">No fish species match your search term "{searchTerm}"</p>
        </div>
      )}
    </div>
  );
};

export default TopBaits;