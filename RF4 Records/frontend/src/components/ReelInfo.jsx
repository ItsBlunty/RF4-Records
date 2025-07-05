import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Search, Filter, X } from 'lucide-react';

const ReelInfo = () => {
  const [reels, setReels] = useState([]);
  const [filteredReels, setFilteredReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [saltwaterFilter, setSaltwaterFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [sizeFilter, setSizeFilter] = useState('All');
  const [testWeightMin, setTestWeightMin] = useState('');
  const [testWeightMax, setTestWeightMax] = useState('');
  const [dragListedMin, setDragListedMin] = useState('');
  const [dragListedMax, setDragListedMax] = useState('');
  const [mechWeightMin, setMechWeightMin] = useState('');
  const [mechWeightMax, setMechWeightMax] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [gearRatioMin, setGearRatioMin] = useState('');
  const [gearRatioMax, setGearRatioMax] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Parse CSV data and extract reel information
  const parseCSVData = (text) => {
    const lines = text.trim().split('\n');
    const reelData = [];
    
    console.log(`Total lines in CSV: ${lines.length}`);
    console.log(`First few lines:`, lines.slice(0, 10));
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const values = line.split(',');
      
      // Skip header rows, empty rows, and category headers
      if (i < 4 || values.length < 5 || !values[1] || values[1].includes('ОБНОВЛЕНИЕ') || 
          values[1].includes('НАЗВАНИЕ') || values[1].includes('Reel') || values[1].includes('БЕЗЫНЕРЦИОННЫЕ') ||
          values[1].includes('БАЙТКАСТИНГОВЫЕ') || values[1].includes('СИЛОВЫЕ') ||
          values[1] === '' || values[1].includes('НГ IMPERIAL R600')) {
        continue;
      }
      
      // Extract reel data (columns shifted by 2 due to Type and Size)
      const reel = {
        Name: values[1] || '',
        Type: values[2] || '',
        Size: values[3] || '',
        Test_Weight: values[4] || '',
        Saltwater_Resistance: values[5] || '',
        Gear_Ratio_1: values[8] || '',
        Gear_Ratio_2: values[9] || '',
        Line_Capacity: values[11] || '',
        Line_Capacity_2: values[12] || '',
        Retrieve_Speed_1: values[14] || '',
        Retrieve_Speed_2: values[15] || '',
        Retrieve_Speed_3: values[16] || '',
        Retrieve_Speed_4: values[17] || '',
        Drag_Real: values[18] || '',
        Drag_Claimed: values[19] || '',
        Moving_Weight: values[20] || '',
        Mechanism_Weight: values[21] || '',
        Mechanism_Weight_2: values[22] || '',
        Price: values[24] || '',
        Price_New: values[25] || ''
      };
      
      // Only add if it has a valid name
      if (reel.Name && reel.Name.trim() !== '') {
        reelData.push(reel);
      }
    }
    
    console.log(`Parsed ${reelData.length} reels`);
    return reelData;
  };


  useEffect(() => {
    const loadReels = async () => {
      try {
        const response = await fetch('/data/reels.csv?v=' + Date.now());
        if (!response.ok) {
          throw new Error('Failed to load reel data');
        }
        const text = await response.text();
        const reelData = parseCSVData(text);
        
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

  // Advanced filtering with useMemo for performance
  const filteredAndSortedReels = useMemo(() => {
    let filtered = reels.filter(reel => {
      // Search filter
      const matchesSearch = !searchTerm || 
                          reel.Name.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Saltwater filter with safe handling
      const matchesSaltwater = saltwaterFilter === 'All' || 
                              (saltwaterFilter === 'Yes' && reel.Saltwater_Resistance && reel.Saltwater_Resistance.includes('💧')) ||
                              (saltwaterFilter === 'No' && (!reel.Saltwater_Resistance || !reel.Saltwater_Resistance.includes('💧')));
      
      // Type filter
      const matchesType = typeFilter === 'All' || reel.Type === typeFilter;
      
      // Size filter
      const matchesSize = sizeFilter === 'All' || reel.Size === sizeFilter;
      
      // Test Weight range filter
      const testWeight = parseFloat(reel.Test_Weight?.replace('~', ''));
      const testWeightMinNum = testWeightMin ? parseFloat(testWeightMin) : null;
      const testWeightMaxNum = testWeightMax ? parseFloat(testWeightMax) : null;
      const matchesTestWeightMin = !testWeightMinNum || (!isNaN(testWeight) && testWeight >= testWeightMinNum);
      const matchesTestWeightMax = !testWeightMaxNum || (!isNaN(testWeight) && testWeight <= testWeightMaxNum);
      
      // Mechanism Weight range filter
      const mechWeight = parseFloat(reel.Mechanism_Weight);
      const mechWeightMinNum = mechWeightMin ? parseFloat(mechWeightMin) : null;
      const mechWeightMaxNum = mechWeightMax ? parseFloat(mechWeightMax) : null;
      const matchesMechWeightMin = !mechWeightMinNum || (!isNaN(mechWeight) && mechWeight >= mechWeightMinNum);
      const matchesMechWeightMax = !mechWeightMaxNum || (!isNaN(mechWeight) && mechWeight <= mechWeightMaxNum);
      
      // Listed Drag range filter - simplified approach
      let listedDragValue = 0;
      if (reel.Drag_Real && reel.Drag_Real !== '-') {
        // Extract the last number from the drag string (this is usually the listed value)
        const numbers = reel.Drag_Real.match(/\d+(\.\d+)?/g);
        if (numbers && numbers.length > 0) {
          listedDragValue = parseFloat(numbers[numbers.length - 1]);
        }
      }
      
      const dragListedMinNum = dragListedMin ? parseFloat(dragListedMin) : null;
      const dragListedMaxNum = dragListedMax ? parseFloat(dragListedMax) : null;
      const reelMatchesDragListedMin = !dragListedMinNum || (listedDragValue >= dragListedMinNum);
      const reelMatchesDragListedMax = !dragListedMaxNum || (listedDragValue <= dragListedMaxNum);
      
      // Price range filter
      const price = parseFloat(reel.Price?.replace(/\s/g, '').replace(',', '.'));
      const priceMinNum = priceMin ? parseFloat(priceMin) : null;
      const priceMaxNum = priceMax ? parseFloat(priceMax) : null;
      const matchesPriceMin = !priceMinNum || (!isNaN(price) && price >= priceMinNum);
      const matchesPriceMax = !priceMaxNum || (!isNaN(price) && price <= priceMaxNum);
      
      // Gear Ratio range filter (extract number before :1)
      let gearRatioValue = 0;
      if (reel.Gear_Ratio_1 && reel.Gear_Ratio_1 !== '-') {
        const ratioMatch = reel.Gear_Ratio_1.match(/^(\d+(?:\.\d+)?)/);
        if (ratioMatch) {
          gearRatioValue = parseFloat(ratioMatch[1]);
        }
      }
      
      const gearRatioMinNum = gearRatioMin ? parseFloat(gearRatioMin) : null;
      const gearRatioMaxNum = gearRatioMax ? parseFloat(gearRatioMax) : null;
      const matchesGearRatioMin = !gearRatioMinNum || (gearRatioValue >= gearRatioMinNum);
      const matchesGearRatioMax = !gearRatioMaxNum || (gearRatioValue <= gearRatioMaxNum);
      
      return matchesSearch && matchesSaltwater && matchesType && matchesSize && 
             matchesTestWeightMin && matchesTestWeightMax &&
             reelMatchesDragListedMin && reelMatchesDragListedMax &&
             matchesMechWeightMin && matchesMechWeightMax && matchesPriceMin && matchesPriceMax &&
             matchesGearRatioMin && matchesGearRatioMax;
    });
    
    return filtered;
  }, [reels, searchTerm, saltwaterFilter, typeFilter, sizeFilter, testWeightMin, testWeightMax, dragListedMin, dragListedMax, mechWeightMin, mechWeightMax, priceMin, priceMax, gearRatioMin, gearRatioMax]);
  
  // Update filteredReels when the computed value changes
  useEffect(() => {
    setFilteredReels(filteredAndSortedReels);
  }, [filteredAndSortedReels]);

  const formatPrice = (price) => {
    if (!price || price === '-' || price === '') return '-';
    // Handle Russian number format with spaces
    const cleanPrice = price.replace(/\s/g, '').replace(',', '.');
    const num = parseFloat(cleanPrice);
    if (isNaN(num)) return price;
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatWeight = (weight) => {
    if (!weight || weight === '-' || weight === '') return '-';
    return weight.includes('kg') ? weight : `${weight} kg`;
  };
  
  const formatGearRatio = (ratio1, ratio2) => {
    const ratios = [ratio1, ratio2].filter(r => r && r !== '-' && r !== '');
    return ratios.length > 0 ? ratios.join(' / ') : '-';
  };
  
  const formatSpeed = (speed1, speed2, speed3, speed4) => {
    const speeds = [speed1, speed2, speed3, speed4].filter(s => s && s !== '-' && s !== '' && s !== '?');
    return speeds.length > 0 ? speeds.join(' / ') : '-';
  };
  
  const parseDragValues = (dragString) => {
    if (!dragString || dragString === '-' || dragString === '') {
      return { tested: '-', listed: '-' };
    }
    
    const trimmed = dragString.trim();
    
    // Look for pattern like "14.4 - 15.43 15.4" where we need to group ranges
    // We'll find the last standalone number and treat everything before it as the first value
    const parts = trimmed.split(/\s+/);
    
    if (parts.length === 1) {
      // One number - goes to listed
      return { tested: '-', listed: parts[0] };
    }
    
    // Find the last part that looks like a standalone number (not part of a range)
    let lastStandaloneIndex = -1;
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i];
      // Check if this part is a number and the previous part isn't a dash
      if (/^\d+(\.\d+)?$/.test(part) && (i === 0 || parts[i-1] !== '-')) {
        lastStandaloneIndex = i;
        break;
      }
    }
    
    if (lastStandaloneIndex > 0) {
      // Split at the last standalone number
      const tested = parts.slice(0, lastStandaloneIndex).join(' ');
      const listed = parts[lastStandaloneIndex];
      return { tested, listed };
    } else if (parts.length >= 2) {
      // Fallback: treat first part as tested, last as listed
      return { tested: parts[0], listed: parts[parts.length - 1] };
    }
    
    return { tested: '-', listed: parts[0] };
  };
  

  const clearAllFilters = () => {
    setSearchTerm('');
    setSaltwaterFilter('All');
    setTypeFilter('All');
    setSizeFilter('All');
    setTestWeightMin('');
    setTestWeightMax('');
    setDragListedMin('');
    setDragListedMax('');
    setMechWeightMin('');
    setMechWeightMax('');
    setPriceMin('');
    setPriceMax('');
    setGearRatioMin('');
    setGearRatioMax('');
  };
  
  const hasActiveFilters = searchTerm || saltwaterFilter !== 'All' || typeFilter !== 'All' || sizeFilter !== 'All' ||
                         testWeightMin || testWeightMax || dragListedMin || dragListedMax ||
                         mechWeightMin || mechWeightMax || priceMin || priceMax ||
                         gearRatioMin || gearRatioMax;

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
          {/* Basic Filters */}
          <div className="flex flex-col lg:flex-row gap-4 mb-4">
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
            
            {/* Type Filter */}
            <div className="sm:w-48">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="All">All Types</option>
                <option value="Spinning">Spinning</option>
                <option value="Classic Baitcasting">Classic Baitcasting</option>
                <option value="Low-Profile Baitcasting">Low-Profile Baitcasting</option>
                <option value="Conventional">Conventional</option>
              </select>
            </div>
            
            {/* Size Filter */}
            <div className="sm:w-32">
              <select
                value={sizeFilter}
                onChange={(e) => setSizeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="All">All Sizes</option>
                <option value="30000">30000</option>
                <option value="20000">20000</option>
                <option value="10000">10000</option>
                <option value="8000">8000</option>
                <option value="6000">6000</option>
                <option value="4000">4000</option>
              </select>
            </div>
            
            {/* Saltwater Filter */}
            <div className="sm:w-40">
              <select
                value={saltwaterFilter}
                onChange={(e) => setSaltwaterFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="All">All Reels</option>
                <option value="Yes">Saltwater Only</option>
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
                {/* Test Weight Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Test Weight Range
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={testWeightMin}
                      onChange={(e) => setTestWeightMin(e.target.value)}
                      className="w-16 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={testWeightMax}
                      onChange={(e) => setTestWeightMax(e.target.value)}
                      className="w-16 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                    />
                  </div>
                </div>
                
                {/* Listed Drag Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Listed Drag Range
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Min"
                      value={dragListedMin}
                      onChange={(e) => setDragListedMin(e.target.value)}
                      className="w-16 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                    />
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Max"
                      value={dragListedMax}
                      onChange={(e) => setDragListedMax(e.target.value)}
                      className="w-16 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                    />
                  </div>
                </div>
                
                {/* Mechanism Weight Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Mech Weight Range
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Min"
                      value={mechWeightMin}
                      onChange={(e) => setMechWeightMin(e.target.value)}
                      className="w-16 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                    />
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Max"
                      value={mechWeightMax}
                      onChange={(e) => setMechWeightMax(e.target.value)}
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
                      placeholder="Min"
                      value={priceMin}
                      onChange={(e) => setPriceMin(e.target.value)}
                      className="w-16 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={priceMax}
                      onChange={(e) => setPriceMax(e.target.value)}
                      className="w-16 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                    />
                  </div>
                </div>
                
                {/* Gear Ratio Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Gear Ratio Range
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Min"
                      value={gearRatioMin}
                      onChange={(e) => setGearRatioMin(e.target.value)}
                      className="w-16 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                    />
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Max"
                      value={gearRatioMax}
                      onChange={(e) => setGearRatioMax(e.target.value)}
                      className="w-16 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

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
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Reel Name
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Test Weight
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Gear Ratio
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Line Capacity (m)
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Retrieve Speed
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Tested Drag (kg)
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Listed Drag (kg)
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Mech Weight (kg)
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Price
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredReels.map((reel, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-2">
                      <div className="flex items-center space-x-2">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {reel.Name}
                        </div>
                        {reel.Saltwater_Resistance && reel.Saltwater_Resistance.includes('💧') && (
                          <span className="text-blue-500" title="Saltwater Resistant">💧</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-center text-sm text-gray-900 dark:text-white">
                      {reel.Type || '-'}
                    </td>
                    <td className="px-4 py-2 text-center text-sm text-gray-900 dark:text-white">
                      {reel.Size || '-'}
                    </td>
                    <td className="px-4 py-2 text-center text-sm text-gray-900 dark:text-white">
                      {reel.Test_Weight || '-'}
                    </td>
                    <td className="px-4 py-2 text-center text-sm text-gray-900 dark:text-white">
                      {formatGearRatio(reel.Gear_Ratio_1, reel.Gear_Ratio_2)}
                    </td>
                    <td className="px-4 py-2 text-center text-sm text-gray-900 dark:text-white">
                      {reel.Line_Capacity && reel.Line_Capacity !== '-' ? reel.Line_Capacity : '-'}
                    </td>
                    <td className="px-4 py-2 text-center text-sm text-gray-900 dark:text-white">
                      {formatSpeed(reel.Retrieve_Speed_1, reel.Retrieve_Speed_2, reel.Retrieve_Speed_3, reel.Retrieve_Speed_4)}
                    </td>
                    <td className="px-4 py-2 text-center text-sm text-gray-900 dark:text-white">
                      {parseDragValues(reel.Drag_Real).tested}
                    </td>
                    <td className="px-4 py-2 text-center text-sm text-gray-900 dark:text-white">
                      {parseDragValues(reel.Drag_Real).listed}
                    </td>
                    <td className="px-4 py-2 text-center text-sm text-gray-900 dark:text-white">
                      {reel.Mechanism_Weight && reel.Mechanism_Weight !== '-' ? reel.Mechanism_Weight : '-'}
                    </td>
                    <td className="px-4 py-2 text-center text-sm text-gray-900 dark:text-white">
                      {reel.Price && reel.Price !== '-' ? formatPrice(reel.Price) : '-'}
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
            <p><strong>Test Weight:</strong> Maximum recommended line test weight (kg or lb)</p>
            <p><strong>Gear Ratio:</strong> Number of spool rotations per handle turn</p>
            <p><strong>Line Capacity:</strong> Line capacity in meters at specified thickness</p>
            <p><strong>Retrieve Speed:</strong> Line retrieval speed in meters per second</p>
            <p><strong>Tested Drag:</strong> Real-world tested maximum drag force in kilograms</p>
            <p><strong>Listed Drag:</strong> Manufacturer claimed maximum drag force in kilograms</p>
            <p><strong>Mech Weight:</strong> Reel mechanism weight in kilograms</p>
            <p><strong>💧:</strong> Saltwater resistant reel</p>
            <p><strong>Note:</strong> Prices are in game currency. Data updated May 22, 2025</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReelInfo;