import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, Filter } from 'lucide-react';

const ReelInfo = () => {
  const [reels, setReels] = useState([]);
  const [filteredReels, setFilteredReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSize, setFilterSize] = useState('');
  const [filterType, setFilterType] = useState('');

  // Parse CSV data and extract reel information
  const parseCSVData = (text) => {
    const lines = text.trim().split('\n');
    const reelData = [];
    
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
      
      // Extract reel data
      const reel = {
        Name: values[1] || '',
        Test_Weight: values[2] || '',
        Saltwater_Resistance: values[3] || '',
        Gear_Ratio_1: values[6] || '',
        Gear_Ratio_2: values[7] || '',
        Line_Capacity: values[9] || '',
        Line_Capacity_2: values[10] || '',
        Retrieve_Speed_1: values[12] || '',
        Retrieve_Speed_2: values[13] || '',
        Retrieve_Speed_3: values[14] || '',
        Retrieve_Speed_4: values[15] || '',
        Drag_Real: values[16] || '',
        Drag_Claimed: values[17] || '',
        Moving_Weight: values[18] || '',
        Mechanism_Weight: values[19] || '',
        Mechanism_Weight_2: values[20] || '',
        Price: values[22] || '',
        Price_New: values[23] || ''
      };
      
      // Only add if it has a valid name
      if (reel.Name && reel.Name.trim() !== '') {
        reelData.push(reel);
      }
    }
    
    return reelData;
  };

  // Extract unique values for filters
  const reelTypes = [...new Set(reels.map(reel => {
    const name = reel.Name.toLowerCase();
    if (name.includes('байткастинг') || name.includes('minister') || name.includes('phantom') || name.includes('rocket')) return 'Baitcasting';
    if (name.includes('силов') || name.includes('electro') || name.includes('borealica')) return 'Power Multiplier';
    return 'Spinning';
  }))].filter(Boolean);
  
  const sizeClasses = [...new Set(reels.map(reel => {
    const test = reel.Test_Weight;
    if (!test || test === '-') return 'Unknown';
    const num = parseFloat(test.replace(/[^0-9.,]/g, '').replace(',', '.'));
    if (num >= 40) return 'XL (40+)';
    if (num >= 20) return 'L (20-39)';
    if (num >= 10) return 'M (10-19)';
    if (num >= 5) return 'S (5-9)';
    if (num >= 1) return 'XS (1-4)';
    return 'Unknown';
  }))].filter(type => type !== 'Unknown').sort();

  useEffect(() => {
    const loadReels = async () => {
      try {
        const response = await fetch('/data/reels.csv');
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
      filtered = filtered.filter(reel => {
        const test = reel.Test_Weight;
        if (!test || test === '-') return false;
        const num = parseFloat(test.replace(/[^0-9.,]/g, '').replace(',', '.'));
        
        switch (filterSize) {
          case 'XL (40+)': return num >= 40;
          case 'L (20-39)': return num >= 20 && num < 40;
          case 'M (10-19)': return num >= 10 && num < 20;
          case 'S (5-9)': return num >= 5 && num < 10;
          case 'XS (1-4)': return num >= 1 && num < 5;
          default: return true;
        }
      });
    }

    // Apply type filter
    if (filterType) {
      filtered = filtered.filter(reel => {
        const name = reel.Name.toLowerCase();
        switch (filterType) {
          case 'Baitcasting': 
            return name.includes('minister') || name.includes('phantom') || name.includes('rocket') || name.includes('imperial');
          case 'Power Multiplier': 
            return name.includes('electro') || name.includes('borealica') || name.includes('triumph') || name.includes('venga c');
          case 'Spinning': 
            return !name.includes('minister') && !name.includes('phantom') && !name.includes('rocket') && 
                   !name.includes('electro') && !name.includes('borealica') && !name.includes('triumph');
          default: return true;
        }
      });
    }

    setFilteredReels(filtered);
  }, [reels, searchTerm, filterSize, filterType]);

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
  

  const clearFilters = () => {
    setSearchTerm('');
    setFilterSize('');
    setFilterType('');
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

            {/* Type Filter */}
            <div className="w-full lg:w-48">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Types</option>
                <option value="Spinning">Spinning</option>
                <option value="Baitcasting">Baitcasting</option>
                <option value="Power Multiplier">Power Multiplier</option>
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
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Reel Name
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
                        {reel.Saltwater_Resistance === '💧' && (
                          <span className="text-blue-500" title="Saltwater Resistant">💧</span>
                        )}
                      </div>
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
                      {reel.Mechanism_Weight && reel.Mechanism_Weight !== '-' ? formatWeight(reel.Mechanism_Weight) : '-'}
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