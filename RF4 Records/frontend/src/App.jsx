import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Header from './components/Header.jsx';
import Filters from './components/Filters.jsx';
import RecordsTable from './components/RecordsTable.jsx';
import GroupedRecordsTable from './components/GroupedRecordsTable.jsx';
import FishGroupedRecordsTable from './components/FishGroupedRecordsTable.jsx';

// Configure API base URL - in production, frontend and backend are served from same domain
// In development, use proxy configuration in vite.config.js

function App() {
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Dark mode state
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  
  // View mode state
  const [viewMode, setViewMode] = useState('grouped'); // 'grouped', 'fish-grouped', or 'list'
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: null
  });
  
  // Filter states
  const [filters, setFilters] = useState({
    fish: '',
    waterbody: '',
    bait: ''
  });
  
  // Unique values for dropdowns
  const [uniqueValues, setUniqueValues] = useState({
    fish: [],
    waterbody: [],
    bait: []
  });

  // Add ref to prevent duplicate API calls in Strict Mode
  const hasFetched = useRef(false);
  
  // Auto-refresh state
  const [lastRefresh, setLastRefresh] = useState(null);

  // Dark mode effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Fetch records from API
    const fetchRecords = async () => {
      try {
        setLoading(true);
      setError(null);
      console.log('Fetching records from API...');
      const response = await axios.get(import.meta.env.DEV ? '/api/records' : '/records');
      console.log('API Response:', response);
      console.log('Response data:', response.data);
      console.log('Response status:', response.status);
      
      // Check if response.data is an array
      if (!Array.isArray(response.data)) {
        console.error('Response data is not an array:', response.data);
        throw new Error('Invalid response format - expected array');
      }
      
        setRecords(response.data);
        
        // Extract unique values for filters
        const fish = [...new Set(response.data.map(r => r.fish).filter(Boolean))].sort();
        const waterbody = [...new Set(response.data.map(r => r.waterbody).filter(Boolean))].sort();
              const bait = [...new Set(response.data.map(r => r.bait_display).filter(Boolean))].sort();
        
      setUniqueValues({ fish, waterbody, bait });
        setFilteredRecords(response.data);
      setLastRefresh(new Date());
      console.log(`Successfully loaded ${response.data.length} records`);
      } catch (err) {
        console.error('Detailed error:', err);
        console.error('Error response:', err.response);
        setError(`Failed to fetch records: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

  // Manual refresh function
  const handleRefresh = () => {
    hasFetched.current = false;
    fetchRecords();
  };

  useEffect(() => {
    // Prevent duplicate calls in React Strict Mode
    if (hasFetched.current) return;
    hasFetched.current = true;

    fetchRecords();
  }, []);

  // No automatic refresh - users can manually refresh by reloading the page
  // All filtering and sorting is done client-side with cached data

  // Apply filters and sorting
  useEffect(() => {
    let filtered = records;

    // Apply filters
    if (filters.fish) {
      filtered = filtered.filter(r => 
        r.fish && r.fish.toLowerCase().includes(filters.fish.toLowerCase())
      );
    }
    if (filters.waterbody) {
      filtered = filtered.filter(r => 
        r.waterbody && r.waterbody.toLowerCase().includes(filters.waterbody.toLowerCase())
      );
    }
    if (filters.bait) {
      filtered = filtered.filter(r => 
        r.bait_display && r.bait_display.toLowerCase().includes(filters.bait.toLowerCase())
      );
    }

    // Apply sorting
    if (sortConfig.key && sortConfig.direction) {
      const sorted = [...filtered].sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Handle null/undefined values
        if (!aValue) return 1;
        if (!bValue) return -1;
        
        // Special handling for weight which is stored in grams
        if (sortConfig.key === 'weight') {
          aValue = Number(aValue);
          bValue = Number(bValue);
    }

        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
      filtered = sorted;
    }

    setFilteredRecords(filtered);
  }, [records, filters, sortConfig]);

  // Watch filters and auto-switch view mode
  useEffect(() => {
    if (filters.bait && viewMode !== 'fish-grouped') {
      setViewMode('fish-grouped');
    } else if (filters.fish && viewMode !== 'grouped') {
      setViewMode('grouped');
    }
    // Do not auto-switch if both are empty or both are set
  }, [filters.bait, filters.fish]);

  const clearFilters = () => {
    setFilters({
      fish: '',
      waterbody: '',
      bait: ''
    });
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const handleSort = (key) => {
    setSortConfig(prevConfig => {
      if (prevConfig.key === key) {
        // If clicking the same column
        if (prevConfig.direction === 'ascending') {
          return { key, direction: 'descending' };
        } else if (prevConfig.direction === 'descending') {
          return { key: null, direction: null };
        }
      }
      // First click or different column
      return { key, direction: 'ascending' };
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading records...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">Connection Error</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-800"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header 
        total={records.length} 
        filtered={filteredRecords.length} 
        onRefresh={handleRefresh} 
        lastRefresh={lastRefresh}
      />
      <Filters
        filters={filters}
        uniqueValues={uniqueValues}
        onChange={handleFilterChange}
        onClear={clearFilters}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* View Mode Toggle */}
        <div className="mb-6 flex justify-between items-center">
          <div className="flex space-x-4">
            <button
              onClick={() => setViewMode('grouped')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'grouped'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              Grouped by Bait
            </button>
            <button
              onClick={() => setViewMode('fish-grouped')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'fish-grouped'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              Grouped by Fish
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              List View
            </button>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {viewMode === 'grouped' || viewMode === 'fish-grouped' ? 'Click on a group to expand/collapse' : 'All records shown'}
          </div>
        </div>
        
        {viewMode === 'grouped' ? (
          <GroupedRecordsTable 
            records={filteredRecords} 
            sortConfig={sortConfig}
            onSort={handleSort}
          />
        ) : viewMode === 'fish-grouped' ? (
          <FishGroupedRecordsTable 
            records={filteredRecords} 
            sortConfig={sortConfig}
            onSort={handleSort}
          />
        ) : (
          <RecordsTable 
            records={filteredRecords} 
            sortConfig={sortConfig}
            onSort={handleSort}
          />
        )}
      </div>
      
      {/* Floating Dark Mode Toggle */}
      <div className="fixed top-6 right-6 z-50">
        <button
          onClick={toggleDarkMode}
          className="group relative flex items-center justify-center w-14 h-8 bg-gray-200 dark:bg-gray-600 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {/* Toggle Track */}
          <div className="absolute inset-0 rounded-full bg-gray-200 dark:bg-gray-600 transition-colors duration-300"></div>
          
          {/* Toggle Circle */}
          <div className={`absolute w-6 h-6 bg-white dark:bg-gray-800 rounded-full shadow-md transform transition-all duration-300 flex items-center justify-center ${
            darkMode ? 'translate-x-3' : '-translate-x-3'
          }`}>
            {darkMode ? (
              <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-3 h-3 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            )}
          </div>
          
          {/* Hover tooltip */}
          <div className="absolute top-full right-0 mt-2 px-2 py-1 text-xs text-white bg-gray-900 dark:bg-gray-700 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
            {darkMode ? 'Light mode' : 'Dark mode'}
          </div>
        </button>
      </div>
    </div>
  );
}

export default App; 