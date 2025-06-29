import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const WearCalculator = () => {
  const [gearKg, setGearKg] = useState('');
  const [currentWear, setCurrentWear] = useState('');
  const [result, setResult] = useState(null);
  const [selectedReel, setSelectedReel] = useState('');
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);

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
      
      // Extract reel data - only Name and Mechanism_Weight for our purposes
      const reel = {
        Name: values[1] || '',
        Mechanism_Weight: values[19] || '' // Column 20 (0-indexed = 19)
      };
      
      // Only add if it has a valid name and mechanism weight
      if (reel.Name && reel.Name.trim() !== '' && reel.Mechanism_Weight && reel.Mechanism_Weight !== '-') {
        reelData.push(reel);
      }
    }
    
    return reelData;
  };

  // Load reels data
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
      } catch (err) {
        console.error('Error loading reels:', err);
      } finally {
        setLoading(false);
      }
    };

    loadReels();
  }, []);

  // Calculate the current KG strength whenever inputs change
  useEffect(() => {
    if (gearKg && currentWear) {
      const x = parseFloat(gearKg);
      const y = parseFloat(currentWear) / 100; // Convert percentage to decimal
      
      if (!isNaN(x) && !isNaN(y) && y >= 0 && y <= 1) {
        // Formula: (0.7 * X) * (1-Y) + (0.3 * X)
        const currentStrength = (0.7 * x) * (1 - y) + (0.3 * x);
        setResult(currentStrength);
      } else {
        setResult(null);
      }
    } else {
      setResult(null);
    }
  }, [gearKg, currentWear]);

  const handleGearKgChange = (e) => {
    setGearKg(e.target.value);
  };

  const handleCurrentWearChange = (e) => {
    setCurrentWear(e.target.value);
  };

  const handleReelChange = (e) => {
    const reelName = e.target.value;
    setSelectedReel(reelName);
    
    // Find the selected reel and autofill Gear KG with Mechanism Weight
    const selectedReelData = reels.find(reel => reel.Name === reelName);
    if (selectedReelData && selectedReelData.Mechanism_Weight) {
      // Clean up the mechanism weight value (remove 'kg' suffix if present)
      const cleanWeight = selectedReelData.Mechanism_Weight.toString().replace(/[^\d.-]/g, '');
      setGearKg(cleanWeight);
    }
  };

  const clearReelFilter = () => {
    setSelectedReel('');
  };

  const clearFields = () => {
    setGearKg('');
    setCurrentWear('');
    setSelectedReel('');
    setResult(null);
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Wear Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Calculate the current KG strength of your gear based on its original KG rating and current wear percentage.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Input Fields */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Enter Gear Information
            </h2>
            
            {/* Reel Filter */}
            <div>
              <label htmlFor="reelFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Reel (Optional - Auto-fills Gear KG)
              </label>
              <div className="relative">
                <input
                  type="search"
                  id="reelFilter"
                  list="reel-list"
                  placeholder="Search and select a reel..."
                  value={selectedReel}
                  onChange={handleReelChange}
                  autoComplete="off"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
                <datalist id="reel-list">
                  {reels.map((reel, idx) => (
                    <option key={idx} value={reel.Name} />
                  ))}
                </datalist>
                {selectedReel && (
                  <button
                    type="button"
                    onClick={clearReelFilter}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Gear KG Field */}
            <div>
              <label htmlFor="gearKg" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Gear KG (Rod Blank or Mech KG)
              </label>
              <input
                type="number"
                id="gearKg"
                value={gearKg}
                onChange={handleGearKgChange}
                placeholder="Enter gear KG rating"
                min="0"
                step="0.1"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            {/* Current Wear Field */}
            <div>
              <label htmlFor="currentWear" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Current Wear % On Item
              </label>
              <input
                type="number"
                id="currentWear"
                value={currentWear}
                onChange={handleCurrentWearChange}
                placeholder="Enter wear percentage (0-100)"
                min="0"
                max="100"
                step="0.1"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            {/* Clear Button */}
            <button
              onClick={clearFields}
              className="w-full px-4 py-2 bg-gray-500 dark:bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-600 dark:hover:bg-gray-700 transition-colors"
            >
              Clear Fields
            </button>
          </div>

          {/* Results */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Calculation Result
            </h2>
            
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
              {result !== null ? (
                <div className="text-center">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Current KG Strength Of Item
                  </div>
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {result.toFixed(2)} KG
                  </div>
                  
                  {/* Additional Info */}
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <div>Original KG: {gearKg} KG</div>
                      <div>Current Wear: {currentWear}%</div>
                      <div>Strength Remaining: {((result / parseFloat(gearKg)) * 100).toFixed(1)}%</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <div className="text-lg mb-2">Enter gear information to calculate</div>
                  <div className="text-sm">Fill in both fields above to see the result</div>
                </div>
              )}
            </div>

            {/* Formula Explanation */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">
                Formula Used
              </h3>
              <div className="text-sm text-blue-700 dark:text-blue-300 font-mono">
                (0.7 × KG) × (1 - Wear%) + (0.3 × KG)
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                This formula accounts for how wear affects the durability portion (70%) while leaving the base strength (30%) intact.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WearCalculator; 