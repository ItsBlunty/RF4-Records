import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Filter, Star, Scale, X } from 'lucide-react';

const Lines = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [brandFilter, setBrandFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
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

  // URL parameter management
  const updateURLParams = () => {
    const params = new URLSearchParams();
    
    if (searchTerm) params.set('search', searchTerm);
    if (categoryFilter !== 'All') params.set('category', categoryFilter);
    if (brandFilter !== 'All') params.set('brand', brandFilter);
    if (typeFilter !== 'All') params.set('type', typeFilter);
    if (lengthMin) params.set('lengthMin', lengthMin);
    if (lengthMax) params.set('lengthMax', lengthMax);
    if (diameterMin) params.set('diameterMin', diameterMin);
    if (diameterMax) params.set('diameterMax', diameterMax);
    if (loadCapacityMin) params.set('loadCapacityMin', loadCapacityMin);
    if (loadCapacityMax) params.set('loadCapacityMax', loadCapacityMax);
    if (priceMin) params.set('priceMin', priceMin);
    if (priceMax) params.set('priceMax', priceMax);
    if (showAdvancedFilters) params.set('advanced', 'true');
    if (sortConfig.key) {
      params.set('sort', sortConfig.key);
      params.set('sortDir', sortConfig.direction);
    }
    if (compareMode) params.set('compare', 'true');
    
    const newURL = params.toString() ? `${location.pathname}?${params.toString()}` : location.pathname;
    navigate(newURL, { replace: true });
  };

  // Load URL parameters on component mount
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    
    if (params.get('search')) setSearchTerm(params.get('search'));
    if (params.get('category')) setCategoryFilter(params.get('category'));
    if (params.get('brand')) setBrandFilter(params.get('brand'));
    if (params.get('type')) setTypeFilter(params.get('type'));
    if (params.get('lengthMin')) setLengthMin(params.get('lengthMin'));
    if (params.get('lengthMax')) setLengthMax(params.get('lengthMax'));
    if (params.get('diameterMin')) setDiameterMin(params.get('diameterMin'));
    if (params.get('diameterMax')) setDiameterMax(params.get('diameterMax'));
    if (params.get('loadCapacityMin')) setLoadCapacityMin(params.get('loadCapacityMin'));
    if (params.get('loadCapacityMax')) setLoadCapacityMax(params.get('loadCapacityMax'));
    if (params.get('priceMin')) setPriceMin(params.get('priceMin'));
    if (params.get('priceMax')) setPriceMax(params.get('priceMax'));
    if (params.get('advanced') === 'true') setShowAdvancedFilters(true);
    if (params.get('sort')) {
      setSortConfig({
        key: params.get('sort'),
        direction: params.get('sortDir') || 'ascending'
      });
    }
    if (params.get('compare') === 'true') setCompareMode(true);
  }, [location.search]);

  // Update URL when filters change
  useEffect(() => {
    updateURLParams();
  }, [searchTerm, categoryFilter, brandFilter, typeFilter, lengthMin, lengthMax,
      diameterMin, diameterMax, loadCapacityMin, loadCapacityMax, priceMin, priceMax,
      showAdvancedFilters, sortConfig, compareMode]);

  const parseCSVData = (text) => {
    const lines = text.trim().split('\n');
    const itemData = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const values = line.split(',');
      
      if (values.length < 11 || !values[0]) continue;
      
      const item = {
        category: (values[0] || '').trim(),
        brand: (values[1] || '').trim(),
        name: (values[2] || '').trim(),
        type: (values[3] || '').trim(),
        color: (values[4] || '').trim(),
        length: (values[5] || '').trim(),
        diameter: (values[6] || '').trim(),
        loadCapacity: (values[7] || '').trim(),
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
    const baseClass = "px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-600";
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
                          item.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
      const matchesBrand = brandFilter === 'All' || item.brand === brandFilter;
      const matchesType = typeFilter === 'All' || item.type === typeFilter;
      
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
      
      return matchesSearch && matchesCategory && matchesBrand && matchesType && 
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
  }, [items, searchTerm, categoryFilter, brandFilter, typeFilter, lengthMin, lengthMax, diameterMin, diameterMax, loadCapacityMin, loadCapacityMax, priceMin, priceMax, sortConfig]);

  // No grouping needed - display all items in one table

  const uniqueCategories = [...new Set(items.map(item => item.category))].sort();
  const uniqueBrands = [...new Set(items.map(item => item.brand))].sort();
  const uniqueTypes = [...new Set(items.map(item => item.type))].sort();
  
  const clearAllFilters = () => {
    setSearchTerm('');
    setCategoryFilter('All');
    setBrandFilter('All');
    setTypeFilter('All');
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
  
  const hasActiveFilters = searchTerm || categoryFilter !== 'All' || brandFilter !== 'All' || typeFilter !== 'All' || 
                          lengthMin || lengthMax || 
                          diameterMin || diameterMax || loadCapacityMin || loadCapacityMax ||
                          priceMin || priceMax;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading line information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">Error loading line data: {error}</p>
        </div>
      </div>
    );
  }

  const renderComparisonRow = (label) => (
    <tr className="border-b border-gray-200 dark:border-gray-700">
      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800">
        {label}
      </td>
      {selectedItems.map((item, index) => (
        <td key={index} className="px-4 py-3 text-gray-700 dark:text-gray-300">
          {label === 'Brand' && item.brand}
          {label === 'Type' && item.type}
          {label === 'Length' && item.length}
          {label === 'Diameter' && item.diameter}
          {label === 'Load Capacity' && item.loadCapacity}
          {label === 'Player Level' && item.playerLevel}
          {label === 'Price' && `$${item.price.toFixed(2)}`}
        </td>
      ))}
    </tr>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
          {/* Header */}
          <div className="px-6 py-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Lines</h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  Complete line specifications and statistics
                </p>
              </div>
              {!compareMode && (
                <button
                  onClick={() => setCompareMode(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium"
                >
                  <Scale className="w-4 h-4" />
                  Compare Lines
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
                    placeholder="Search lines..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="sm:w-48">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                >
                  <option value="All">All Categories</option>
                  {uniqueCategories.map(category => (
                    <option key={category} value={category}>{category}</option>
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
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>

            {/* Advanced Filters */}
            {showAdvancedFilters && (
              <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Brand</label>
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type</label>
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
                </div>

                {/* Range Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Length Range (m)</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={lengthMin}
                        onChange={(e) => setLengthMin(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={lengthMax}
                        onChange={(e) => setLengthMax(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Diameter Range (mm)</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Min"
                        value={diameterMin}
                        onChange={(e) => setDiameterMin(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                      />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Max"
                        value={diameterMax}
                        onChange={(e) => setDiameterMax(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Load Capacity Range (kg)</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Min"
                        value={loadCapacityMin}
                        onChange={(e) => setLoadCapacityMin(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                      />
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Max"
                        value={loadCapacityMax}
                        onChange={(e) => setLoadCapacityMax(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Price Range ($)</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Min"
                        value={priceMin}
                        onChange={(e) => setPriceMin(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                      />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Max"
                        value={priceMax}
                        onChange={(e) => setPriceMax(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Results */}
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Showing {filteredAndSortedItems.length} of {items.length} lines
              </p>
              {compareMode && (
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  Select up to 5 lines to compare ({selectedItems.length}/5)
                </p>
              )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    {compareMode && (
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Select
                      </th>
                    )}
                    <th 
                      className={getColumnHeaderClass('name')}
                      onClick={() => handleSort('name')}
                    >
                      Name {getSortIndicator('name')}
                    </th>
                    <th 
                      className={getColumnHeaderClass('brand')}
                      onClick={() => handleSort('brand')}
                    >
                      Brand {getSortIndicator('brand')}
                    </th>
                    <th 
                      className={getColumnHeaderClass('type')}
                      onClick={() => handleSort('type')}
                    >
                      Type {getSortIndicator('type')}
                    </th>
                    <th 
                      className={getColumnHeaderClass('length')}
                      onClick={() => handleSort('length')}
                    >
                      Length {getSortIndicator('length')}
                    </th>
                    <th 
                      className={getColumnHeaderClass('diameter')}
                      onClick={() => handleSort('diameter')}
                    >
                      Diameter {getSortIndicator('diameter')}
                    </th>
                    <th 
                      className={getColumnHeaderClass('loadCapacity')}
                      onClick={() => handleSort('loadCapacity')}
                    >
                      Load Capacity {getSortIndicator('loadCapacity')}
                    </th>
                    <th 
                      className={getColumnHeaderClass('rating')}
                      onClick={() => handleSort('rating')}
                    >
                      Rating {getSortIndicator('rating')}
                    </th>
                    <th 
                      className={getColumnHeaderClass('playerLevel')}
                      onClick={() => handleSort('playerLevel')}
                    >
                      Level {getSortIndicator('playerLevel')}
                    </th>
                    <th 
                      className={getColumnHeaderClass('price')}
                      onClick={() => handleSort('price')}
                    >
                      Price {getSortIndicator('price')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredAndSortedItems.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      {compareMode && (
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={selectedItems.some(i => i.name === item.name)}
                            onChange={() => toggleItemSelection(item)}
                            disabled={!selectedItems.some(i => i.name === item.name) && selectedItems.length >= 5}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                          />
                        </td>
                      )}
                      <td className="px-4 py-4 text-sm font-medium text-gray-900 dark:text-white">
                        {item.name}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {item.brand}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {item.type}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {item.length}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {item.diameter}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {item.loadCapacity}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {renderStars(item.rating)}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {item.playerLevel}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                        ${item.price.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredAndSortedItems.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">No lines found matching your criteria.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Comparison Modal */}
      {showComparison && selectedItems.length >= 2 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Line Comparison</h2>
              <button
                onClick={() => setShowComparison(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <div className="p-6 overflow-auto max-h-[calc(90vh-80px)]">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Specification
                      </th>
                      {selectedItems.map((item, index) => (
                        <th key={index} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          {item.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {renderComparisonRow('Brand')}
                    {renderComparisonRow('Type')}
                    {renderComparisonRow('Length')}
                    {renderComparisonRow('Diameter')}
                    {renderComparisonRow('Load Capacity')}
                    {renderComparisonRow('Player Level')}
                    {renderComparisonRow('Price')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Lines;