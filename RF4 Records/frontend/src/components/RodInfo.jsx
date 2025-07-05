import React, { useState, useEffect, useMemo } from 'react';
import { Search, Star, Info, Filter, X } from 'lucide-react';

const RodInfo = () => {
  const [rods, setRods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [powerFilter, setPowerFilter] = useState('All');
  const [actionFilter, setActionFilter] = useState('All');
  const [stiffnessMin, setStiffnessMin] = useState('');
  const [stiffnessMax, setStiffnessMax] = useState('');
  const [levelMin, setLevelMin] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });

  useEffect(() => {
    const loadRodData = async () => {
      try {
        setLoading(true);
        
        // Load CSV file from public directory
        const response = await fetch('/RodList.csv');
        if (!response.ok) {
          throw new Error(`Failed to fetch rod data: ${response.status}`);
        }
        
        const text = await response.text();
        const parsedRods = parseCSVData(text);
        
        console.log(`Loaded ${parsedRods.length} rods`);
        setRods(parsedRods);
      } catch (err) {
        console.error('Error loading rod data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadRodData();
  }, []);

  const parseCSVData = (text) => {
    const lines = text.trim().split('\n');
    const rodData = [];
    
    for (let i = 1; i < lines.length; i++) { // Skip header row
      const line = lines[i];
      const values = line.split(',');
      
      if (values.length < 12 || !values[0]) continue; // Skip invalid rows
      
      // Collect all bonus columns (13-20)
      const bonuses = [];
      for (let j = 12; j < Math.min(values.length, 20); j++) {
        if (values[j] && values[j].trim()) {
          bonuses.push(values[j].trim());
        }
      }
      
      const rod = {
        name: values[0] || '',
        type: values[1] || '',
        level: parseInt(values[2]) || 0,
        lowTest: parseInt(values[3]) || 0,
        highTest: parseInt(values[4]) || 0,
        action: values[5] || '',
        stiffness: parseInt(values[6]) || 0,
        power: values[7] || '',
        length: parseFloat(values[8]) || 0,
        maxLoad: parseFloat(values[9]) || 0,
        cost: parseFloat(values[10]) || 0,
        stars: parseFloat(values[11]) || 0,
        bonuses: bonuses
      };
      
      rodData.push(rod);
    }
    
    return rodData;
  };

  const renderStars = (stars) => {
    const fullStars = Math.floor(stars);
    const hasHalfStar = stars % 1 !== 0;
    
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((starNum) => {
          if (starNum <= fullStars) {
            // Full star
            return (
              <Star 
                key={starNum}
                className="w-4 h-4 text-yellow-500" 
                fill="currentColor" 
              />
            );
          } else if (starNum === fullStars + 1 && hasHalfStar) {
            // Half star - use a different approach that's more visible
            return (
              <div key={starNum} className="relative w-4 h-4">
                <Star className="w-4 h-4 text-gray-300 dark:text-gray-600" fill="currentColor" />
                <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
                  <Star className="w-4 h-4 text-yellow-500" fill="currentColor" />
                </div>
              </div>
            );
          } else {
            // Empty star
            return (
              <Star 
                key={starNum}
                className="w-4 h-4 text-gray-300 dark:text-gray-600" 
                fill="currentColor" 
              />
            );
          }
        })}
      </div>
    );
  };


  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (columnKey) => {
    if (sortConfig.key !== columnKey) return '↕';
    if (sortConfig.direction === 'ascending') return '↑';
    if (sortConfig.direction === 'descending') return '↓';
    return '↕';
  };

  const getColumnHeaderClass = (columnKey) => {
    const baseClass = "px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-600";
    if (sortConfig.key === columnKey) {
      return `${baseClass} bg-gray-100 dark:bg-gray-600`;
    }
    return baseClass;
  };

  const filteredAndSortedRods = useMemo(() => {
    let filtered = rods.filter(rod => {
      const matchesSearch = !searchTerm || 
                          rod.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          rod.type.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'All' || rod.type === typeFilter;
      const matchesPower = powerFilter === 'All' || rod.power === powerFilter;
      const matchesAction = actionFilter === 'All' || rod.action === actionFilter;
      
      // Stiffness range filter
      const stiffnessMinNum = stiffnessMin ? parseInt(stiffnessMin) : null;
      const stiffnessMaxNum = stiffnessMax ? parseInt(stiffnessMax) : null;
      const matchesStiffnessMin = !stiffnessMinNum || rod.stiffness >= stiffnessMinNum;
      const matchesStiffnessMax = !stiffnessMaxNum || rod.stiffness <= stiffnessMaxNum;
      
      // Level minimum filter
      const levelMinNum = levelMin ? parseInt(levelMin) : null;
      const matchesLevelMin = !levelMinNum || rod.level >= levelMinNum;
      
      return matchesSearch && matchesType && matchesPower && matchesAction && 
             matchesStiffnessMin && matchesStiffnessMax && matchesLevelMin;
    });

    if (!sortConfig.key) return filtered;

    return [...filtered].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      // Handle numeric comparisons
      if (['level', 'lowTest', 'highTest', 'stiffness', 'length', 'maxLoad', 'cost', 'stars'].includes(sortConfig.key)) {
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
      }

      // Handle string comparisons
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
  }, [rods, searchTerm, typeFilter, powerFilter, actionFilter, stiffnessMin, stiffnessMax, levelMin, sortConfig]);

  // Group rods by type
  const rodsByType = useMemo(() => {
    const grouped = {};
    filteredAndSortedRods.forEach(rod => {
      if (!grouped[rod.type]) {
        grouped[rod.type] = [];
      }
      grouped[rod.type].push(rod);
    });
    return grouped;
  }, [filteredAndSortedRods]);

  const uniqueTypes = [...new Set(rods.map(rod => rod.type))].sort();
  // Organize powers from heaviest to lightest, with marine variants at bottom
  const powerOrder = [
    'Extra Heavy',
    'Heavy', 
    'Medium Heavy',
    'Medium',
    'Medium Light',
    'Light',
    'Ultra Light',
    // Marine variants grouped at bottom
    'Heavy Marine',
    'Medium Marine', 
    'Light Marine'
  ];
  
  const allPowers = [...new Set(rods.map(rod => rod.power))];
  const uniquePowers = powerOrder.filter(power => allPowers.includes(power));
  const uniqueActions = [...new Set(rods.map(rod => rod.action))].sort();
  
  const clearAllFilters = () => {
    setSearchTerm('');
    setTypeFilter('All');
    setPowerFilter('All');
    setActionFilter('All');
    setStiffnessMin('');
    setStiffnessMax('');
    setLevelMin('');
  };
  
  const hasActiveFilters = searchTerm || typeFilter !== 'All' || powerFilter !== 'All' || 
                          actionFilter !== 'All' || stiffnessMin || stiffnessMax || 
                          levelMin;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading rod information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">Error loading rod data: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
          {/* Header */}
          <div className="px-6 py-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Rod Information</h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  Complete rod specifications and statistics
                </p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            {/* Basic Filters */}
            <div className="flex flex-col lg:flex-row gap-4 mb-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search rods..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="sm:w-48">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                >
                  <option value="All">All Types</option>
                  {uniqueTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                    showAdvancedFilters || hasActiveFilters
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  Advanced
                </button>
                {hasActiveFilters && (
                  <button
                    onClick={clearAllFilters}
                    className="px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 bg-red-600 text-white hover:bg-red-700"
                  >
                    <X className="w-4 h-4" />
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Advanced Filters */}
            {showAdvancedFilters && (
              <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Power Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Power
                    </label>
                    <select
                      value={powerFilter}
                      onChange={(e) => setPowerFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                    >
                      <option value="All">All Powers</option>
                      {uniquePowers.map(power => (
                        <option key={power} value={power}>{power}</option>
                      ))}
                    </select>
                  </div>

                  {/* Action Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Action
                    </label>
                    <select
                      value={actionFilter}
                      onChange={(e) => setActionFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                    >
                      <option value="All">All Actions</option>
                      {uniqueActions.map(action => (
                        <option key={action} value={action}>{action}</option>
                      ))}
                    </select>
                  </div>

                  {/* Stiffness Range */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Stiffness Range
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={stiffnessMin}
                        onChange={(e) => setStiffnessMin(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={stiffnessMax}
                        onChange={(e) => setStiffnessMax(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                      />
                    </div>
                  </div>

                  {/* Minimum Level */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Minimum Level
                    </label>
                    <input
                      type="number"
                      placeholder="Min Level"
                      value={levelMin}
                      onChange={(e) => setLevelMin(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Results count */}
          <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Showing {filteredAndSortedRods.length} of {rods.length} rods
            </p>
          </div>

          {/* Rod sections by type */}
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {Object.entries(rodsByType).map(([type, typeRods]) => (
              <div key={type} className="px-6 py-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{type}</h2>
                
                <div className="overflow-x-auto">
                  <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th onClick={() => handleSort('name')} className={getColumnHeaderClass('name')}>
                          Rod Name {getSortIndicator('name')}
                        </th>
                        <th onClick={() => handleSort('level')} className={getColumnHeaderClass('level')}>
                          Level {getSortIndicator('level')}
                        </th>
                        <th onClick={() => handleSort('lowTest')} className={`${getColumnHeaderClass('lowTest')} px-3 py-3`}>
                          Low Test {getSortIndicator('lowTest')}
                        </th>
                        <th onClick={() => handleSort('highTest')} className={`${getColumnHeaderClass('highTest')} px-3 py-3`}>
                          High Test {getSortIndicator('highTest')}
                        </th>
                        <th onClick={() => handleSort('action')} className={getColumnHeaderClass('action')}>
                          Action {getSortIndicator('action')}
                        </th>
                        <th onClick={() => handleSort('stiffness')} className={getColumnHeaderClass('stiffness')}>
                          Stiffness {getSortIndicator('stiffness')}
                        </th>
                        <th onClick={() => handleSort('power')} className={getColumnHeaderClass('power')}>
                          Power {getSortIndicator('power')}
                        </th>
                        <th onClick={() => handleSort('length')} className={getColumnHeaderClass('length')}>
                          Length {getSortIndicator('length')}
                        </th>
                        <th onClick={() => handleSort('maxLoad')} className={getColumnHeaderClass('maxLoad')}>
                          Max Load {getSortIndicator('maxLoad')}
                        </th>
                        <th onClick={() => handleSort('cost')} className={getColumnHeaderClass('cost')}>
                          Cost {getSortIndicator('cost')}
                        </th>
                        <th onClick={() => handleSort('stars')} className={getColumnHeaderClass('stars')}>
                          Stars {getSortIndicator('stars')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {typeRods.map((rod, index) => (
                        <tr key={`${rod.name}-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-2.5 whitespace-nowrap">
                            <div className="group relative">
                              <span className={`text-sm font-medium ${rod.bonuses.length > 0 ? 'text-blue-600 dark:text-blue-400 cursor-help' : 'text-gray-900 dark:text-white'}`}>
                                {rod.name}
                              </span>
                              {rod.bonuses.length > 0 && (
                                <div className="absolute left-0 top-full mt-1 hidden group-hover:block z-10 bg-gray-900 text-white p-3 rounded-lg shadow-lg max-w-xs">
                                  <div className="text-xs font-semibold mb-2">Bonuses:</div>
                                  <ul className="text-xs space-y-1">
                                    {rod.bonuses.map((bonus, i) => (
                                      <li key={i}>• {bonus}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-2.5 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {rod.level}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {rod.lowTest}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {rod.highTest}
                          </td>
                          <td className="px-6 py-2.5 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {rod.action}
                          </td>
                          <td className="px-6 py-2.5 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {rod.stiffness}
                          </td>
                          <td className="px-6 py-2.5 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {rod.power}
                          </td>
                          <td className="px-6 py-2.5 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {rod.length}m
                          </td>
                          <td className="px-6 py-2.5 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {rod.maxLoad}kg
                          </td>
                          <td className="px-6 py-2.5 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {rod.cost.toFixed(2)}
                          </td>
                          <td className="px-6 py-2.5 whitespace-nowrap">
                            {renderStars(rod.stars)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>

          {filteredAndSortedRods.length === 0 && (
            <div className="text-center py-12">
              <Info className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No rods found matching your criteria</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RodInfo;