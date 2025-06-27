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
      return <div className="text-gray-400 text-sm">No data</div>;
    }

    const data = periodData[type];
    const displayValue = type === 'caught_most' ? `${data.count} fish` : `${data.weight}g`;
    
    return (
      <div className="text-center">
        <div className="font-medium text-sm text-gray-800 mb-1">
          {data.bait}
        </div>
        <div className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl font-semibold mb-2">Error Loading Data</div>
          <div className="text-gray-600">{error}</div>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center">
                <Target className="mr-3 text-blue-600" />
                Top Baits Analysis
              </h1>
              <p className="text-gray-600 mt-2">
                Weekly bait performance analysis using Sunday 6PM UTC reset markers
              </p>
            </div>
            
            {topBaitsData?.performance && (
              <div className="text-right text-sm text-gray-600">
                <div>{topBaitsData.performance.total_fish_species} fish species</div>
                <div>{topBaitsData.performance.total_records} records analyzed</div>
                <div className="flex items-center">
                  <TrendingUp size={14} className="mr-1" />
                  {topBaitsData.performance.total_time}s processing time
                </div>
              </div>
            )}
          </div>

          {/* Period Information */}
          {topBaitsData?.periods && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-blue-50 rounded-lg">
              {Object.entries(topBaitsData.periods).map(([key, period]) => (
                <div key={key} className="text-center">
                  <div className="font-semibold text-blue-800 flex items-center justify-center">
                    <Calendar size={16} className="mr-2" />
                    {period.label}
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
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

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search fish species..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Top Baits Table */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
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
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
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
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredFishData.map((fishName, index) => {
                  const fishData = topBaitsData.fish_data[fishName];
                  return (
                    <tr key={fishName} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
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
          
          {filteredFishData.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? 'No fish found matching your search.' : 'No data available.'}
            </div>
          )}
        </div>
        
        {filteredFishData.length > 0 && (
          <div className="mt-4 text-center text-sm text-gray-600">
            Showing {filteredFishData.length} fish species
          </div>
        )}
      </div>
    </div>
  );
};

export default TopBaits;