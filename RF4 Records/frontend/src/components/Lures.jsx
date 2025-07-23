import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Filter, Scale, X, Star } from 'lucide-react';

const Lures = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [lures, setLures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [brandFilter, setBrandFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [sizeFilter, setSizeFilter] = useState('All');
  const [minMass, setMinMass] = useState('');
  const [maxMass, setMaxMass] = useState('');
  const [minHookSize, setMinHookSize] = useState('');
  const [maxHookSize, setMaxHookSize] = useState('');
  const [depthFilter, setDepthFilter] = useState('All');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [compareMode, setCompareMode] = useState(false);
  const [selectedLures, setSelectedLures] = useState([]);
  const [showComparison, setShowComparison] = useState(false);
  
  // Track if we're updating URL programmatically to prevent loops
  const isUpdatingURL = useRef(false);
  const hasInitialized = useRef(false);

  useEffect(() => {
    const loadLures = async () => {
      try {
        setLoading(true);
        
        const response = await fetch('/LuresData.csv');
        if (!response.ok) {
          throw new Error(`Failed to fetch lure data: ${response.status}`);
        }
        
        const text = await response.text();
        const parsedLures = parseCSVData(text);
        
        console.log(`Loaded ${parsedLures.length} lures`);
        setLures(parsedLures);
      } catch (err) {
        console.error('Error loading lure data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadLures();
  }, []);

  const parseCSVData = (text) => {
    const lines = text.trim().split('\n');
    const lureData = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const values = parseCSVLine(line);
      
      if (values.length < 5 || !values[0]) continue;
      
      const lure = {
        category: (values[0] || '').trim(),
        brand: (values[1] || '').trim(),
        name: (values[2] || '').trim(),
        type: (values[3] || '').trim(),
        size: (values[4] || '').trim(),
        mass: (values[5] || '').trim(),
        minHookSize: (values[6] || '').trim(),
        maxHookSize: (values[7] || '').trim(),
        depth: (values[8] || '').trim(),
        components: (values[9] || '').trim(),
        restrictions: (values[10] || '').trim(),
        rating: parseFloat(values[11]) || 0,
        price: (values[12] || '').trim()
      };
      
      lureData.push(lure);
    }
    
    return lureData;
  };

  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result;
  };

  // URL parameter management
  const updateURLParams = () => {
    const params = new URLSearchParams();
    
    if (searchTerm) params.set('search', searchTerm);
    if (brandFilter !== 'All') params.set('brand', brandFilter);
    if (typeFilter !== 'All') params.set('type', typeFilter);
    if (sizeFilter !== 'All') params.set('size', sizeFilter);
    if (minMass) params.set('minMass', minMass);
    if (maxMass) params.set('maxMass', maxMass);
    if (minHookSize) params.set('minHookSize', minHookSize);
    if (maxHookSize) params.set('maxHookSize', maxHookSize);
    if (depthFilter !== 'All') params.set('depth', depthFilter);
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);
    if (showAdvancedFilters) params.set('advanced', 'true');
    if (sortConfig.key) {
      params.set('sort', sortConfig.key);
      params.set('sortDir', sortConfig.direction);
    }
    if (compareMode) params.set('compare', 'true');
    
    const newURL = params.toString() ? `${location.pathname}?${params.toString()}` : location.pathname;
    
    // Set flag to prevent reading our own URL update
    isUpdatingURL.current = true;
    navigate(newURL, { replace: true });
    
    // Reset flag after a brief delay to allow for URL change
    setTimeout(() => {
      isUpdatingURL.current = false;
    }, 10);
  };

  // Load URL parameters on component mount and external URL changes only
  useEffect(() => {
    // Skip if we're updating URL programmatically
    if (isUpdatingURL.current) {
      return;
    }
    
    const params = new URLSearchParams(location.search);
    
    if (params.get('search')) setSearchTerm(params.get('search'));
    if (params.get('brand')) setBrandFilter(params.get('brand'));
    if (params.get('type')) setTypeFilter(params.get('type'));
    if (params.get('size')) setSizeFilter(params.get('size'));
    if (params.get('minMass')) setMinMass(params.get('minMass'));
    if (params.get('maxMass')) setMaxMass(params.get('maxMass'));
    if (params.get('minHookSize')) setMinHookSize(params.get('minHookSize'));
    if (params.get('maxHookSize')) setMaxHookSize(params.get('maxHookSize'));
    if (params.get('depth')) setDepthFilter(params.get('depth'));
    if (params.get('minPrice')) setMinPrice(params.get('minPrice'));
    if (params.get('maxPrice')) setMaxPrice(params.get('maxPrice'));
    if (params.get('advanced') === 'true') setShowAdvancedFilters(true);
    if (params.get('sort')) {
      setSortConfig({
        key: params.get('sort'),
        direction: params.get('sortDir') || 'ascending'
      });
    }
    if (params.get('compare') === 'true') setCompareMode(true);
    
    hasInitialized.current = true;
  }, [location.search]);

  // Update URL when filters change (but only after initial load)
  useEffect(() => {
    // Don't update URL on initial mount before data is loaded
    if (!hasInitialized.current) {
      return;
    }
    
    updateURLParams();
  }, [searchTerm, brandFilter, typeFilter, sizeFilter, minMass, maxMass,
      minHookSize, maxHookSize, depthFilter, minPrice, maxPrice, showAdvancedFilters, sortConfig, compareMode]);

  const parseWeight = (weightStr) => {
    if (!weightStr || weightStr === '-') return 0;
    const cleanWeight = weightStr.replace(/[^\d.]/g, '');
    return parseFloat(cleanWeight) || 0;
  };

  const parsePrice = (priceStr) => {
    if (!priceStr || priceStr === '-') return 0;
    const cleanPrice = priceStr.replace(/[^\d.]/g, '');
    return parseFloat(cleanPrice) || 0;
  };

  const parseHookSize = (hookStr) => {
    if (!hookStr || hookStr === '-') return 0;
    const cleanHook = hookStr.replace(/[^\d.]/g, '');
    return parseFloat(cleanHook) || 0;
  };

  // Sorting functions
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

  const filteredAndSortedLures = useMemo(() => {
    let filtered = lures.filter(lure => {
      const matchesSearch = !searchTerm || 
        lure.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lure.components?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lure.restrictions?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesBrand = brandFilter === 'All' || lure.brand === brandFilter;
      const matchesType = typeFilter === 'All' || lure.type === typeFilter;
      const matchesSize = sizeFilter === 'All' || lure.size === sizeFilter;
      
      const lureWeight = parseWeight(lure.mass);
      const matchesMinMass = !minMass || lureWeight >= parseFloat(minMass);
      const matchesMaxMass = !maxMass || lureWeight <= parseFloat(maxMass);
      
      const lureMinHook = parseHookSize(lure.minHookSize);
      const lureMaxHook = parseHookSize(lure.maxHookSize);
      const matchesMinHook = !minHookSize || lureMaxHook >= parseFloat(minHookSize);
      const matchesMaxHook = !maxHookSize || lureMinHook <= parseFloat(maxHookSize);
      
      const matchesDepth = depthFilter === 'All' || 
        (depthFilter === 'surface' && (lure.depth === '-' || lure.depth === '0')) ||
        (depthFilter === 'shallow' && lure.depth && lure.depth !== '-' && parseFloat(lure.depth) <= 3) ||
        (depthFilter === 'medium' && lure.depth && lure.depth !== '-' && parseFloat(lure.depth) > 3 && parseFloat(lure.depth) <= 10) ||
        (depthFilter === 'deep' && lure.depth && lure.depth !== '-' && parseFloat(lure.depth) > 10);
      
      const lurePrice = parsePrice(lure.price);
      const matchesMinPrice = !minPrice || lurePrice >= parseFloat(minPrice);
      const matchesMaxPrice = !maxPrice || lurePrice <= parseFloat(maxPrice);

      return matchesSearch && matchesBrand && matchesType && 
             matchesSize && matchesMinMass && matchesMaxMass && matchesMinHook && 
             matchesMaxHook && matchesDepth && matchesMinPrice && matchesMaxPrice;
    });

    if (!sortConfig.key) return filtered;

    return [...filtered].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      // Handle numeric comparisons
      if (['mass', 'price', 'rating', 'minHookSize', 'maxHookSize', 'depth'].includes(sortConfig.key)) {
        if (sortConfig.key === 'mass') {
          aValue = parseWeight(aValue);
          bValue = parseWeight(bValue);
        } else if (sortConfig.key === 'price') {
          aValue = parsePrice(aValue);
          bValue = parsePrice(bValue);
        } else if (sortConfig.key === 'minHookSize' || sortConfig.key === 'maxHookSize') {
          aValue = parseHookSize(aValue);
          bValue = parseHookSize(bValue);
        } else if (sortConfig.key === 'depth') {
          aValue = parseFloat(aValue) || 0;
          bValue = parseFloat(bValue) || 0;
        } else {
          aValue = parseFloat(aValue) || 0;
          bValue = parseFloat(bValue) || 0;
        }
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
  }, [lures, searchTerm, brandFilter, typeFilter, sizeFilter, 
      minMass, maxMass, minHookSize, maxHookSize, depthFilter, minPrice, maxPrice, sortConfig]);

  const uniqueValues = useMemo(() => {
    return {
      brands: [...new Set(lures.map(l => l.brand).filter(Boolean))].sort(),
      types: [...new Set(lures.map(l => l.type).filter(Boolean))].sort(),
      sizes: [...new Set(lures.map(l => l.size).filter(Boolean))].sort()
    };
  }, [lures]);

  const toggleLureSelection = (lure) => {
    if (selectedLures.find(l => l.name === lure.name)) {
      setSelectedLures(selectedLures.filter(l => l.name !== lure.name));
    } else if (selectedLures.length < 5) {
      setSelectedLures([...selectedLures, lure]);
    }
  };

  const exitCompareMode = () => {
    setCompareMode(false);
    setSelectedLures([]);
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setBrandFilter('All');
    setTypeFilter('All');
    setSizeFilter('All');
    setMinMass('');
    setMaxMass('');
    setMinHookSize('');
    setMaxHookSize('');
    setDepthFilter('All');
    setMinPrice('');
    setMaxPrice('');
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

  const formatHookSize = (minHook, maxHook) => {
    if ((!minHook || minHook === '-') && (!maxHook || maxHook === '-')) return '-';
    if (!minHook || minHook === '-') return `≤${maxHook}`;
    if (!maxHook || maxHook === '-') return `≥${minHook}`;
    if (minHook === maxHook) return minHook;
    return `${minHook}-${maxHook}`;
  };

  const hasActiveFilters = searchTerm || brandFilter !== 'All' || 
                          typeFilter !== 'All' || sizeFilter !== 'All' || minMass || maxMass || 
                          minHookSize || maxHookSize || depthFilter !== 'All' || minPrice || maxPrice;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading lure information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">Error loading lure data: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
          {/* Header */}
          <div className="px-6 py-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Lures</h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  Complete lure specifications and statistics
                </p>
              </div>
              {!compareMode && (
                <button
                  onClick={() => setCompareMode(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium"
                >
                  <Scale className="w-4 h-4" />
                  Compare Lures
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
                  {selectedLures.length >= 2 && (
                    <button
                      onClick={() => setShowComparison(true)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                    >
                      View Comparison ({selectedLures.length})
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
                    placeholder="Search lures..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                  />
                </div>
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
                      {uniqueValues.brands.map(brand => (
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
                      {uniqueValues.types.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Size</label>
                    <select
                      value={sizeFilter}
                      onChange={(e) => setSizeFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                    >
                      <option value="All">All Sizes</option>
                      {uniqueValues.sizes.map(size => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Range Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Mass Range (g)</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={minMass}
                        onChange={(e) => setMinMass(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={maxMass}
                        onChange={(e) => setMaxMass(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Hook Size Range</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={minHookSize}
                        onChange={(e) => setMinHookSize(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={maxHookSize}
                        onChange={(e) => setMaxHookSize(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Depth</label>
                    <select
                      value={depthFilter}
                      onChange={(e) => setDepthFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                    >
                      <option value="All">All Depths</option>
                      <option value="surface">Surface (0m)</option>
                      <option value="shallow">Shallow (≤3m)</option>
                      <option value="medium">Medium (3-10m)</option>
                      <option value="deep">Deep (&gt;10m)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Price Range</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
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
                Showing {filteredAndSortedLures.length} of {lures.length} lures
              </p>
              {compareMode && (
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  Select up to 5 lures to compare ({selectedLures.length}/5)
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
                      Name
                    </th>

                    <th 
                      className={getColumnHeaderClass('brand')}
                      onClick={() => handleSort('brand')}
                    >
                      Brand
                    </th>
                    <th 
                      className={getColumnHeaderClass('type')}
                      onClick={() => handleSort('type')}
                    >
                      Type
                    </th>
                    <th 
                      className={getColumnHeaderClass('size')}
                      onClick={() => handleSort('size')}
                    >
                      Size
                    </th>
                    <th 
                      className={getColumnHeaderClass('mass')}
                      onClick={() => handleSort('mass')}
                    >
                      Mass
                    </th>
                    <th 
                      className={getColumnHeaderClass('minHookSize')}
                      onClick={() => handleSort('minHookSize')}
                    >
                      Hook Size
                    </th>
                    <th 
                      className={getColumnHeaderClass('depth')}
                      onClick={() => handleSort('depth')}
                    >
                      Depth
                    </th>
                    <th 
                      className={getColumnHeaderClass('price')}
                      onClick={() => handleSort('price')}
                    >
                      Price
                    </th>
                    <th 
                      className={getColumnHeaderClass('rating')}
                      onClick={() => handleSort('rating')}
                    >
                      Rating
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredAndSortedLures.map((lure, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      {compareMode && (
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={selectedLures.some(l => l.name === lure.name)}
                            onChange={() => toggleLureSelection(lure)}
                            disabled={!selectedLures.some(l => l.name === lure.name) && selectedLures.length >= 5}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                          />
                        </td>
                      )}
                      <td className="px-4 py-4 text-sm font-medium text-gray-900 dark:text-white">
                        {lure.name}
                      </td>

                      <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {lure.brand}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {lure.type}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {lure.size}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {lure.mass}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {formatHookSize(lure.minHookSize, lure.maxHookSize)}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {lure.depth || '-'}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {lure.price}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {renderStars(lure.rating)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredAndSortedLures.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">No lures found matching your criteria.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Comparison Modal */}
      {showComparison && selectedLures.length >= 2 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Lure Comparison</h2>
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
                      {selectedLures.map((lure, index) => (
                        <th key={index} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          {lure.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">

                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800">Brand</td>
                      {selectedLures.map((lure, index) => (
                        <td key={index} className="px-4 py-3 text-gray-700 dark:text-gray-300">{lure.brand}</td>
                      ))}
                    </tr>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800">Type</td>
                      {selectedLures.map((lure, index) => (
                        <td key={index} className="px-4 py-3 text-gray-700 dark:text-gray-300">{lure.type}</td>
                      ))}
                    </tr>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800">Size</td>
                      {selectedLures.map((lure, index) => (
                        <td key={index} className="px-4 py-3 text-gray-700 dark:text-gray-300">{lure.size}</td>
                      ))}
                    </tr>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800">Mass</td>
                      {selectedLures.map((lure, index) => (
                        <td key={index} className="px-4 py-3 text-gray-700 dark:text-gray-300">{lure.mass}</td>
                      ))}
                    </tr>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800">Hook Size</td>
                      {selectedLures.map((lure, index) => (
                        <td key={index} className="px-4 py-3 text-gray-700 dark:text-gray-300">{formatHookSize(lure.minHookSize, lure.maxHookSize)}</td>
                      ))}
                    </tr>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800">Depth</td>
                      {selectedLures.map((lure, index) => (
                        <td key={index} className="px-4 py-3 text-gray-700 dark:text-gray-300">{lure.depth || '-'}</td>
                      ))}
                    </tr>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800">Price</td>
                      {selectedLures.map((lure, index) => (
                        <td key={index} className="px-4 py-3 text-gray-700 dark:text-gray-300">{lure.price}</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800">Rating</td>
                      {selectedLures.map((lure, index) => (
                        <td key={index} className="px-4 py-3 text-gray-700 dark:text-gray-300">{renderStars(lure.rating)}</td>
                      ))}
                    </tr>
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

export default Lures;