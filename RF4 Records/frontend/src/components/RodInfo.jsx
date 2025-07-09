import React, { useState, useEffect, useMemo } from 'react';
import { Search, Star, Info, Filter, X, Scale } from 'lucide-react';

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
  const [lengthMin, setLengthMin] = useState('');
  const [lengthMax, setLengthMax] = useState('');
  const [lowTestMin, setLowTestMin] = useState('');
  const [lowTestMax, setLowTestMax] = useState('');
  const [highTestMin, setHighTestMin] = useState('');
  const [highTestMax, setHighTestMax] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [compareMode, setCompareMode] = useState(false);
  const [selectedRods, setSelectedRods] = useState([]);
  const [showComparison, setShowComparison] = useState(false);

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
      
      // Length range filter
      const lengthMinNum = lengthMin ? parseFloat(lengthMin) : null;
      const lengthMaxNum = lengthMax ? parseFloat(lengthMax) : null;
      const matchesLengthMin = !lengthMinNum || rod.length >= lengthMinNum;
      const matchesLengthMax = !lengthMaxNum || rod.length <= lengthMaxNum;
      
      // Low Test range filter
      const lowTestMinNum = lowTestMin ? parseInt(lowTestMin) : null;
      const lowTestMaxNum = lowTestMax ? parseInt(lowTestMax) : null;
      const matchesLowTestMin = !lowTestMinNum || rod.lowTest >= lowTestMinNum;
      const matchesLowTestMax = !lowTestMaxNum || rod.lowTest <= lowTestMaxNum;
      
      // High Test range filter
      const highTestMinNum = highTestMin ? parseInt(highTestMin) : null;
      const highTestMaxNum = highTestMax ? parseInt(highTestMax) : null;
      const matchesHighTestMin = !highTestMinNum || rod.highTest >= highTestMinNum;
      const matchesHighTestMax = !highTestMaxNum || rod.highTest <= highTestMaxNum;
      
      return matchesSearch && matchesType && matchesPower && matchesAction && 
             matchesStiffnessMin && matchesStiffnessMax && matchesLengthMin && matchesLengthMax &&
             matchesLowTestMin && matchesLowTestMax && matchesHighTestMin && matchesHighTestMax;
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
  }, [rods, searchTerm, typeFilter, powerFilter, actionFilter, stiffnessMin, stiffnessMax, lengthMin, lengthMax, lowTestMin, lowTestMax, highTestMin, highTestMax, sortConfig]);

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
    setLengthMin('');
    setLengthMax('');
    setLowTestMin('');
    setLowTestMax('');
    setHighTestMin('');
    setHighTestMax('');
  };

  const toggleRodSelection = (rod) => {
    if (selectedRods.find(r => r.name === rod.name)) {
      setSelectedRods(selectedRods.filter(r => r.name !== rod.name));
    } else if (selectedRods.length < 5) {
      setSelectedRods([...selectedRods, rod]);
    }
  };

  const exitCompareMode = () => {
    setCompareMode(false);
    setSelectedRods([]);
  };
  
  const hasActiveFilters = searchTerm || typeFilter !== 'All' || powerFilter !== 'All' || 
                          actionFilter !== 'All' || stiffnessMin || stiffnessMax || 
                          lengthMin || lengthMax || lowTestMin || lowTestMax || 
                          highTestMin || highTestMax;

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
              {!compareMode && (
                <button
                  onClick={() => setCompareMode(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium"
                >
                  <Scale className="w-4 h-4" />
                  Compare Rods
                </button>
              )}
              {compareMode && (
                <div className="flex gap-2">
                  <button
                    onClick={exitCompareMode}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
                  >
                    Exit Compare
                  </button>
                  {selectedRods.length >= 2 && (
                    <button
                      onClick={() => setShowComparison(true)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                    >
                      View Comparison ({selectedRods.length})
                    </button>
                  )}
                </div>
              )}
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
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
                        className="w-16 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={stiffnessMax}
                        onChange={(e) => setStiffnessMax(e.target.value)}
                        className="w-16 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                      />
                    </div>
                  </div>

                  {/* Length Range */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Length Range (m)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Min"
                        value={lengthMin}
                        onChange={(e) => setLengthMin(e.target.value)}
                        className="w-16 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                      />
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Max"
                        value={lengthMax}
                        onChange={(e) => setLengthMax(e.target.value)}
                        className="w-16 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                      />
                    </div>
                  </div>

                  {/* Low Test Range */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Low Test Range
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={lowTestMin}
                        onChange={(e) => setLowTestMin(e.target.value)}
                        className="w-16 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={lowTestMax}
                        onChange={(e) => setLowTestMax(e.target.value)}
                        className="w-16 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                      />
                    </div>
                  </div>

                  {/* High Test Range */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      High Test Range
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={highTestMin}
                        onChange={(e) => setHighTestMin(e.target.value)}
                        className="w-16 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={highTestMax}
                        onChange={(e) => setHighTestMax(e.target.value)}
                        className="w-16 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Results count */}
          <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Showing {filteredAndSortedRods.length} of {rods.length} rods
              </p>
              {compareMode && (
                <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  {selectedRods.length}/5 rods selected for comparison
                </div>
              )}
            </div>
          </div>

          {/* Rod sections by type */}
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {Object.entries(rodsByType).map(([type, typeRods]) => (
              <div key={type} className="px-6 py-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{type}</h2>
                
                <div className="overflow-x-auto">
                  <table className="w-full divide-y divide-gray-200 dark:divide-gray-700 table-auto">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        {compareMode && (
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                            Select
                          </th>
                        )}
                        <th onClick={() => handleSort('name')} className={`${getColumnHeaderClass('name')} whitespace-nowrap`}>
                          Rod Name {getSortIndicator('name')}
                        </th>
                        <th onClick={() => handleSort('level')} className={`${getColumnHeaderClass('level')} whitespace-nowrap`}>
                          Level {getSortIndicator('level')}
                        </th>
                        <th onClick={() => handleSort('lowTest')} className={`${getColumnHeaderClass('lowTest')} px-3 py-3 whitespace-nowrap`}>
                          Low Test {getSortIndicator('lowTest')}
                        </th>
                        <th onClick={() => handleSort('highTest')} className={`${getColumnHeaderClass('highTest')} px-3 py-3 whitespace-nowrap`}>
                          High Test {getSortIndicator('highTest')}
                        </th>
                        <th onClick={() => handleSort('action')} className={`${getColumnHeaderClass('action')} whitespace-nowrap`}>
                          Action {getSortIndicator('action')}
                        </th>
                        <th onClick={() => handleSort('stiffness')} className={`${getColumnHeaderClass('stiffness')} whitespace-nowrap`}>
                          Stiffness {getSortIndicator('stiffness')}
                        </th>
                        <th onClick={() => handleSort('power')} className={`${getColumnHeaderClass('power')} whitespace-nowrap`}>
                          Power {getSortIndicator('power')}
                        </th>
                        <th onClick={() => handleSort('length')} className={`${getColumnHeaderClass('length')} whitespace-nowrap`}>
                          Length {getSortIndicator('length')}
                        </th>
                        <th onClick={() => handleSort('maxLoad')} className={`${getColumnHeaderClass('maxLoad')} whitespace-nowrap`}>
                          Max Load {getSortIndicator('maxLoad')}
                        </th>
                        <th onClick={() => handleSort('cost')} className={`${getColumnHeaderClass('cost')} whitespace-nowrap`}>
                          Cost {getSortIndicator('cost')}
                        </th>
                        <th onClick={() => handleSort('stars')} className={`${getColumnHeaderClass('stars')} whitespace-nowrap`}>
                          Stars {getSortIndicator('stars')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {typeRods.map((rod, index) => (
                        <tr key={`${rod.name}-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          {compareMode && (
                            <td className="px-6 py-2.5 whitespace-nowrap text-center">
                              <input
                                type="checkbox"
                                checked={selectedRods.some(r => r.name === rod.name)}
                                onChange={() => toggleRodSelection(rod)}
                                disabled={selectedRods.length === 5 && !selectedRods.some(r => r.name === rod.name)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                              />
                            </td>
                          )}
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

      {/* Comparison Modal */}
      {showComparison && selectedRods.length >= 2 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Rod Comparison</h2>
                <button
                  onClick={() => setShowComparison(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Rod Names */}
              <div className={`grid gap-4 mb-6`} style={{gridTemplateColumns: `200px repeat(${selectedRods.length}, 1fr)`}}>
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Specification
                </div>
                {selectedRods.map((rod, index) => (
                  <div key={index} className="text-center">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {rod.name}
                    </h3>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {rod.type} | Level {rod.level}
                    </div>
                  </div>
                ))}
              </div>

              {/* Comparison Table */}
              <div className="space-y-2">
                {/* Helper function to render comparison rows */}
                {(() => {
                  const renderComparisonRow = (label, getValue) => (
                    <div className={`grid gap-4 py-3 border-b border-gray-200 dark:border-gray-700`} style={{gridTemplateColumns: `200px repeat(${selectedRods.length}, 1fr)`}}>
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</div>
                      {selectedRods.map((rod, index) => (
                        <div key={index} className="text-sm text-center text-gray-900 dark:text-white">{getValue(rod)}</div>
                      ))}
                    </div>
                  );

                  return (
                    <>
                      {renderComparisonRow('Type', (rod) => rod.type)}
                      {renderComparisonRow('Level', (rod) => rod.level)}
                      {renderComparisonRow('Low Test', (rod) => rod.lowTest)}
                      {renderComparisonRow('High Test', (rod) => rod.highTest)}
                      {renderComparisonRow('Action', (rod) => rod.action)}
                      {renderComparisonRow('Stiffness', (rod) => rod.stiffness)}
                      {renderComparisonRow('Power', (rod) => rod.power)}
                      {renderComparisonRow('Length', (rod) => `${rod.length}m`)}
                      {renderComparisonRow('Max Load', (rod) => `${rod.maxLoad}kg`)}
                      {renderComparisonRow('Cost', (rod) => rod.cost.toFixed(2))}
                      
                      {/* Stars */}
                      <div className={`grid gap-4 py-3 border-b border-gray-200 dark:border-gray-700`} style={{gridTemplateColumns: `200px repeat(${selectedRods.length}, 1fr)`}}>
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Stars</div>
                        {selectedRods.map((rod, index) => (
                          <div key={index} className="text-sm text-center text-gray-900 dark:text-white flex justify-center">
                            {Array.from({ length: 5 }, (_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${i < rod.stars ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                              />
                            ))}
                          </div>
                        ))}
                      </div>

                      {/* Bonuses */}
                      {selectedRods.some(rod => rod.bonuses.length > 0) && (
                        <div className={`grid gap-4 py-3`} style={{gridTemplateColumns: `200px repeat(${selectedRods.length}, 1fr)`}}>
                          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Bonuses</div>
                          {selectedRods.map((rod, index) => (
                            <div key={index} className="text-sm text-center text-gray-900 dark:text-white">
                              {rod.bonuses.length > 0 ? (
                                <ul className="text-xs space-y-1">
                                  {rod.bonuses.map((bonus, i) => (
                                    <li key={i}>• {bonus}</li>
                                  ))}
                                </ul>
                              ) : (
                                <span className="text-gray-400">None</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RodInfo;