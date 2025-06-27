import React, { useState, useEffect, useMemo } from 'react';
import { Search, Trophy, Hash, Calendar, TrendingUp, Target } from 'lucide-react';
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
        
        // Check if the response contains an error
        if (data.error) {
          throw new Error(data.error);
        }
        
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
      return (
        <div className="text-gray-400 dark:text-gray-500 text-xs">No data</div>
      );
    }

    const data = periodData[type];
    
    // Check if bait contains multiple baits separated by semicolon
    if (data.bait && data.bait.includes(';')) {
      const baits = data.bait.split(';').map(bait => bait.trim());
      return (
        <div className="font-medium text-gray-900 dark:text-white text-sm">
          {baits.map((bait, index) => (
            <div key={index} className="flex items-center justify-center">
              {index > 0 && <span className="text-xs text-gray-500 dark:text-gray-400 mx-1">+</span>}
              <span>{bait}</span>
            </div>
          ))}
        </div>
      );
    }
    
    return (
      <div className="font-medium text-gray-900 dark:text-white text-sm">
        {data.bait}
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
    <div className="w-full p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center">
          <Target className="w-8 h-8 mr-3 text-blue-500" />
          Top Baits Analysis
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Weekly bait performance analysis using Sunday 6PM UTC reset markers
        </p>
      </div>


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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden w-full">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                {/* Period Names Row */}
                <tr>
                  <th 
                    className="w-48 px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
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
                  <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" colSpan="2">
                    <div className="flex items-center justify-center">
                      <Calendar size={14} className="mr-2" />
                      This Reset
                    </div>
                  </th>
                  <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" colSpan="2">
                    <div className="flex items-center justify-center">
                      <Calendar size={14} className="mr-2" />
                      Last Reset
                    </div>
                  </th>
                  <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" colSpan="2">
                    <div className="flex items-center justify-center">
                      <Calendar size={14} className="mr-2" />
                      3 Resets Ago
                    </div>
                  </th>
                </tr>
                
                {/* Type Labels Row */}
                <tr className="bg-gray-700 dark:bg-gray-600">
                  <th className="px-4 py-2"></th>
                  <th className="px-2 py-2 text-center text-xs font-medium text-white uppercase tracking-wider">
                    <div className="flex items-center justify-center">
                      <Hash size={14} className="mr-1 text-blue-300" />
                      Most Caught
                    </div>
                  </th>
                  <th className="px-2 py-2 text-center text-xs font-medium text-white uppercase tracking-wider">
                    <div className="flex items-center justify-center">
                      <Trophy size={14} className="mr-1 text-yellow-400" />
                      Biggest
                    </div>
                  </th>
                  <th className="px-2 py-2 text-center text-xs font-medium text-white uppercase tracking-wider">
                    <div className="flex items-center justify-center">
                      <Hash size={14} className="mr-1 text-blue-300" />
                      Most Caught
                    </div>
                  </th>
                  <th className="px-2 py-2 text-center text-xs font-medium text-white uppercase tracking-wider">
                    <div className="flex items-center justify-center">
                      <Trophy size={14} className="mr-1 text-yellow-400" />
                      Biggest
                    </div>
                  </th>
                  <th className="px-2 py-2 text-center text-xs font-medium text-white uppercase tracking-wider">
                    <div className="flex items-center justify-center">
                      <Hash size={14} className="mr-1 text-blue-300" />
                      Most Caught
                    </div>
                  </th>
                  <th className="px-2 py-2 text-center text-xs font-medium text-white uppercase tracking-wider">
                    <div className="flex items-center justify-center">
                      <Trophy size={14} className="mr-1 text-yellow-400" />
                      Biggest
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredFishData.map((fishName, index) => {
                  const fishData = topBaitsData.fish_data[fishName];
                  return (
                    <tr key={fishName} className={index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'}>
                      <td className="px-4 py-4 text-sm font-medium text-gray-900 dark:text-white w-48">
                        {fishName}
                      </td>
                      
                      {/* This Week - Most Caught */}
                      <td className="px-2 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                        {formatBaitCell(fishData.this_week, 'caught_most')}
                      </td>
                      
                      {/* This Week - Biggest */}
                      <td className="px-2 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                        {formatBaitCell(fishData.this_week, 'caught_biggest')}
                      </td>
                      
                      {/* Last Week - Most Caught */}
                      <td className="px-2 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                        {formatBaitCell(fishData.last_week, 'caught_most')}
                      </td>
                      
                      {/* Last Week - Biggest */}
                      <td className="px-2 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                        {formatBaitCell(fishData.last_week, 'caught_biggest')}
                      </td>
                      
                      {/* 3 Weeks Ago - Most Caught */}
                      <td className="px-2 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                        {formatBaitCell(fishData.three_weeks_ago, 'caught_most')}
                      </td>
                      
                      {/* 3 Weeks Ago - Biggest */}
                      <td className="px-2 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                        {formatBaitCell(fishData.three_weeks_ago, 'caught_biggest')}
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