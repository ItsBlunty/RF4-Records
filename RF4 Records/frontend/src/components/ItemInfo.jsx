import React, { useState, useEffect, useMemo } from 'react';
import { Search, Star, Info, Filter, X, Scale } from 'lucide-react';

const ItemInfo = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [brandFilter, setBrandFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [colorFilter, setColorFilter] = useState('All');
  const [lengthMin, setLengthMin] = useState('');
  const [lengthMax, setLengthMax] = useState('');
  const [diameterMin, setDiameterMin] = useState('');
  const [diameterMax, setDiameterMax] = useState('');
  const [loadCapacityMin, setLoadCapacityMin] = useState('');
  const [loadCapacityMax, setLoadCapacityMax] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [compareMode, setCompareMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [showComparison, setShowComparison] = useState(false);

  useEffect(() => {
    const loadItemData = async () => {
      try {
        setLoading(true);
        
        const response = await fetch('/LinesData.csv');
        if (!response.ok) {
          throw new Error(`Failed to fetch item data: ${response.status}`);
        }
        
        const text = await response.text();
        const parsedItems = parseCSVData(text);
        
        console.log(`Loaded ${parsedItems.length} items`);
        setItems(parsedItems);
      } catch (err) {
        console.error('Error loading item data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadItemData();
  }, []);

  const parseCSVData = (text) => {
    const lines = text.trim().split('\n');
    const itemData = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const values = line.split(',');
      
      if (values.length < 11 || !values[0]) continue;
      
      const item = {
        category: values[0] || '',
        brand: values[1] || '',
        name: values[2] || '',
        type: values[3] || '',
        color: values[4] || '',
        length: values[5] || '',
        diameter: values[6] || '',
        loadCapacity: values[7] || '',
        rating: parseFloat(values[8]) || 0,
        playerLevel: parseInt(values[9]) || 0,
        price: parseFloat(values[10]) || 0
      };
      
      itemData.push(item);
    }
    
    return itemData;
  };

  const renderStars = (stars) => {
    const fullStars = Math.floor(stars);
    const hasHalfStar = stars % 1 !== 0;
    
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((starNum) => {
          if (starNum <= fullStars) {
            return (
              <Star 
                key={starNum}
                className="w-4 h-4 text-yellow-500" 
                fill="currentColor" 
              />
            );
          } else if (starNum === fullStars + 1 && hasHalfStar) {
            return (
              <div key={starNum} className="relative w-4 h-4">
                <Star className="w-4 h-4 text-gray-300 dark:text-gray-600" fill="currentColor" />
                <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
                  <Star className="w-4 h-4 text-yellow-500" fill="currentColor" />
                </div>
              </div>
            );
          } else {
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

  const parseLength = (lengthStr) => {
    if (!lengthStr) return 0;
    const match = lengthStr.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  };

  const parseDiameter = (diameterStr) => {
    if (!diameterStr) return 0;
    const match = diameterStr.match(/(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : 0;
  };

  const parseLoadCapacity = (loadStr) => {
    if (!loadStr) return 0;
    const match = loadStr.match(/(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : 0;
  };

  const filteredAndSortedItems = useMemo(() => {
    let filtered = items.filter(item => {
      const matchesSearch = !searchTerm || 
                          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.brand.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesBrand = brandFilter === 'All' || item.brand === brandFilter;
      const matchesType = typeFilter === 'All' || item.type === typeFilter;
      const matchesColor = colorFilter === 'All' || item.color === colorFilter;
      
      // Length range filter
      const lengthNum = parseLength(item.length);
      const lengthMinNum = lengthMin ? parseInt(lengthMin) : null;
      const lengthMaxNum = lengthMax ? parseInt(lengthMax) : null;
      const matchesLengthMin = !lengthMinNum || lengthNum >= lengthMinNum;
      const matchesLengthMax = !lengthMaxNum || lengthNum <= lengthMaxNum;
      
      // Diameter range filter
      const diameterNum = parseDiameter(item.diameter);
      const diameterMinNum = diameterMin ? parseFloat(diameterMin) : null;
      const diameterMaxNum = diameterMax ? parseFloat(diameterMax) : null;
      const matchesDiameterMin = !diameterMinNum || diameterNum >= diameterMinNum;
      const matchesDiameterMax = !diameterMaxNum || diameterNum <= diameterMaxNum;
      
      // Load capacity range filter
      const loadCapacityNum = parseLoadCapacity(item.loadCapacity);
      const loadCapacityMinNum = loadCapacityMin ? parseFloat(loadCapacityMin) : null;
      const loadCapacityMaxNum = loadCapacityMax ? parseFloat(loadCapacityMax) : null;
      const matchesLoadCapacityMin = !loadCapacityMinNum || loadCapacityNum >= loadCapacityMinNum;
      const matchesLoadCapacityMax = !loadCapacityMaxNum || loadCapacityNum <= loadCapacityMaxNum;
      
      // Price range filter
      const priceMinNum = priceMin ? parseFloat(priceMin) : null;
      const priceMaxNum = priceMax ? parseFloat(priceMax) : null;
      const matchesPriceMin = !priceMinNum || item.price >= priceMinNum;
      const matchesPriceMax = !priceMaxNum || item.price <= priceMaxNum;
      
      return matchesSearch && matchesBrand && matchesType && matchesColor && 
             matchesLengthMin && matchesLengthMax && matchesDiameterMin && matchesDiameterMax &&
             matchesLoadCapacityMin && matchesLoadCapacityMax && matchesPriceMin && matchesPriceMax;
    });

    if (!sortConfig.key) return filtered;

    return [...filtered].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      // Handle numeric comparisons
      if (['rating', 'playerLevel', 'price'].includes(sortConfig.key)) {
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
      }
      // Handle length comparison
      else if (sortConfig.key === 'length') {
        aValue = parseLength(aValue);
        bValue = parseLength(bValue);
      }
      // Handle diameter comparison
      else if (sortConfig.key === 'diameter') {
        aValue = parseDiameter(aValue);
        bValue = parseDiameter(bValue);
      }
      // Handle load capacity comparison
      else if (sortConfig.key === 'loadCapacity') {
        aValue = parseLoadCapacity(aValue);
        bValue = parseLoadCapacity(bValue);
      }
      // Handle string comparisons
      else if (typeof aValue === 'string') {
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
  }, [items, searchTerm, brandFilter, typeFilter, colorFilter, lengthMin, lengthMax, diameterMin, diameterMax, loadCapacityMin, loadCapacityMax, priceMin, priceMax, sortConfig]);

  // Group items by brand
  const itemsByBrand = useMemo(() => {
    const grouped = {};
    filteredAndSortedItems.forEach(item => {
      if (!grouped[item.brand]) {
        grouped[item.brand] = [];
      }
      grouped[item.brand].push(item);
    });
    return grouped;
  }, [filteredAndSortedItems]);

  const uniqueBrands = [...new Set(items.map(item => item.brand))].sort();
  const uniqueTypes = [...new Set(items.map(item => item.type))].sort();
  const uniqueColors = [...new Set(items.map(item => item.color))].sort();
  
  const clearAllFilters = () => {
    setSearchTerm('');
    setBrandFilter('All');
    setTypeFilter('All');
    setColorFilter('All');
    setLengthMin('');
    setLengthMax('');
    setDiameterMin('');
    setDiameterMax('');
    setLoadCapacityMin('');
    setLoadCapacityMax('');
    setPriceMin('');
    setPriceMax('');
  };

  const toggleItemSelection = (item) => {
    if (selectedItems.find(i => i.name === item.name)) {
      setSelectedItems(selectedItems.filter(i => i.name !== item.name));
    } else if (selectedItems.length < 5) {
      setSelectedItems([...selectedItems, item]);
    }
  };

  const exitCompareMode = () => {
    setCompareMode(false);
    setSelectedItems([]);
  };
  
  const hasActiveFilters = searchTerm || brandFilter !== 'All' || typeFilter !== 'All' || 
                          colorFilter !== 'All' || lengthMin || lengthMax || 
                          diameterMin || diameterMax || loadCapacityMin || loadCapacityMax ||
                          priceMin || priceMax;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading item information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">Error loading item data: {error}</p>
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
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Item Information</h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  Complete item specifications and statistics
                </p>
              </div>
              {!compareMode && (
                <button
                  onClick={() => setCompareMode(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium"
                >
                  <Scale className="w-4 h-4" />
                  Compare Items
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
                  {selectedItems.length >= 2 && (
                    <button
                      onClick={() => setShowComparison(true)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                    >
                      View Comparison ({selectedItems.length})
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
                    placeholder="Search items..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="sm:w-48">
                <select
                  value={brandFilter}
                  onChange={(e) => setBrandFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                >
                  <option value="All">All Brands</option>
                  {uniqueBrands.map(brand => (
                    <option key={brand} value={brand}>{brand}</option>
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
                  {/* Type Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Type
                    </label>
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

                  {/* Color Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Color
                    </label>
                    <select
                      value={colorFilter}
                      onChange={(e) => setColorFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                    >
                      <option value="All">All Colors</option>
                      {uniqueColors.map(color => (
                        <option key={color} value={color}>{color}</option>
                      ))}
                    </select>
                  </div>

                  {/* Length Range */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Length Range (m)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={lengthMin}
                        onChange={(e) => setLengthMin(e.target.value)}
                        className="w-16 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={lengthMax}
                        onChange={(e) => setLengthMax(e.target.value)}
                        className="w-16 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                      />
                    </div>
                  </div>

                  {/* Diameter Range */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Diameter Range (mm)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Min"
                        value={diameterMin}
                        onChange={(e) => setDiameterMin(e.target.value)}
                        className="w-16 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                      />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Max"
                        value={diameterMax}
                        onChange={(e) => setDiameterMax(e.target.value)}
                        className="w-16 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                      />
                    </div>
                  </div>

                  {/* Load Capacity Range */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Load Capacity (kg)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Min"
                        value={loadCapacityMin}
                        onChange={(e) => setLoadCapacityMin(e.target.value)}
                        className="w-16 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                      />
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Max"
                        value={loadCapacityMax}
                        onChange={(e) => setLoadCapacityMax(e.target.value)}
                        className="w-16 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                      />
                    </div>
                  </div>

                  {/* Price Range */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Price Range
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Min"
                        value={priceMin}
                        onChange={(e) => setPriceMin(e.target.value)}
                        className="w-16 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                      />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Max"
                        value={priceMax}
                        onChange={(e) => setPriceMax(e.target.value)}
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
                Showing {filteredAndSortedItems.length} of {items.length} items
              </p>
              {compareMode && (
                <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  {selectedItems.length}/5 items selected for comparison
                </div>
              )}
            </div>
          </div>

          {/* Item sections by brand */}
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {Object.entries(itemsByBrand).map(([brand, brandItems]) => (
              <div key={brand} className="px-6 py-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{brand}</h2>
                
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
                          Item Name {getSortIndicator('name')}
                        </th>
                        <th onClick={() => handleSort('type')} className={`${getColumnHeaderClass('type')} whitespace-nowrap`}>
                          Type {getSortIndicator('type')}
                        </th>
                        <th onClick={() => handleSort('color')} className={`${getColumnHeaderClass('color')} whitespace-nowrap`}>
                          Color {getSortIndicator('color')}
                        </th>
                        <th onClick={() => handleSort('length')} className={`${getColumnHeaderClass('length')} whitespace-nowrap`}>
                          Length {getSortIndicator('length')}
                        </th>
                        <th onClick={() => handleSort('diameter')} className={`${getColumnHeaderClass('diameter')} whitespace-nowrap`}>
                          Diameter {getSortIndicator('diameter')}
                        </th>
                        <th onClick={() => handleSort('loadCapacity')} className={`${getColumnHeaderClass('loadCapacity')} whitespace-nowrap`}>
                          Load Capacity {getSortIndicator('loadCapacity')}
                        </th>
                        <th onClick={() => handleSort('rating')} className={`${getColumnHeaderClass('rating')} whitespace-nowrap`}>
                          Rating {getSortIndicator('rating')}
                        </th>
                        <th onClick={() => handleSort('playerLevel')} className={`${getColumnHeaderClass('playerLevel')} whitespace-nowrap`}>
                          Player Level {getSortIndicator('playerLevel')}
                        </th>
                        <th onClick={() => handleSort('price')} className={`${getColumnHeaderClass('price')} whitespace-nowrap`}>
                          Price {getSortIndicator('price')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {brandItems.map((item, index) => (
                        <tr key={`${item.name}-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          {compareMode && (
                            <td className="px-6 py-2.5 whitespace-nowrap text-center">
                              <input
                                type="checkbox"
                                checked={selectedItems.some(i => i.name === item.name)}
                                onChange={() => toggleItemSelection(item)}
                                disabled={selectedItems.length === 5 && !selectedItems.some(i => i.name === item.name)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                              />
                            </td>
                          )}
                          <td className="px-6 py-2.5 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {item.name}
                          </td>
                          <td className="px-6 py-2.5 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {item.type}
                          </td>
                          <td className="px-6 py-2.5 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {item.color}
                          </td>
                          <td className="px-6 py-2.5 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {item.length}
                          </td>
                          <td className="px-6 py-2.5 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {item.diameter}
                          </td>
                          <td className="px-6 py-2.5 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {item.loadCapacity}
                          </td>
                          <td className="px-6 py-2.5 whitespace-nowrap">
                            {renderStars(item.rating)}
                          </td>
                          <td className="px-6 py-2.5 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {item.playerLevel}
                          </td>
                          <td className="px-6 py-2.5 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {item.price.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>

          {filteredAndSortedItems.length === 0 && (
            <div className="text-center py-12">
              <Info className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No items found matching your criteria</p>
            </div>
          )}
        </div>
      </div>

      {/* Comparison Modal */}
      {showComparison && selectedItems.length >= 2 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Item Comparison</h2>
                <button
                  onClick={() => setShowComparison(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Item Names */}
              <div className={`grid gap-4 mb-6`} style={{gridTemplateColumns: `200px repeat(${selectedItems.length}, 1fr)`}}>
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Specification
                </div>
                {selectedItems.map((item, index) => (
                  <div key={index} className="text-center">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {item.name}
                    </h3>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {item.brand} | Level {item.playerLevel}
                    </div>
                  </div>
                ))}
              </div>

              {/* Comparison Table */}
              <div className="space-y-2">
                {(() => {
                  const renderComparisonRow = (label, getValue) => (
                    <div className={`grid gap-4 py-3 border-b border-gray-200 dark:border-gray-700`} style={{gridTemplateColumns: `200px repeat(${selectedItems.length}, 1fr)`}}>
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</div>
                      {selectedItems.map((item, index) => (
                        <div key={index} className="text-sm text-center text-gray-900 dark:text-white">{getValue(item)}</div>
                      ))}
                    </div>
                  );

                  return (
                    <>
                      {renderComparisonRow('Brand', (item) => item.brand)}
                      {renderComparisonRow('Type', (item) => item.type)}
                      {renderComparisonRow('Color', (item) => item.color)}
                      {renderComparisonRow('Length', (item) => item.length)}
                      {renderComparisonRow('Diameter', (item) => item.diameter)}
                      {renderComparisonRow('Load Capacity', (item) => item.loadCapacity)}
                      {renderComparisonRow('Player Level', (item) => item.playerLevel)}
                      {renderComparisonRow('Price', (item) => item.price.toFixed(2))}
                      
                      {/* Rating */}
                      <div className={`grid gap-4 py-3`} style={{gridTemplateColumns: `200px repeat(${selectedItems.length}, 1fr)`}}>
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Rating</div>
                        {selectedItems.map((item, index) => (
                          <div key={index} className="text-sm text-center text-gray-900 dark:text-white flex justify-center">
                            {Array.from({ length: 5 }, (_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${i < item.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                              />
                            ))}
                          </div>
                        ))}
                      </div>
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

export default ItemInfo;