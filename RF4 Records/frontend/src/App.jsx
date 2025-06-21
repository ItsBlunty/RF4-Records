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
    console.log('Dark mode useEffect triggered:', darkMode);
    if (darkMode) {
      document.documentElement.classList.add('dark');
      console.log('Added dark class. Current classes:', document.documentElement.className);
    } else {
      document.documentElement.classList.remove('dark');
      console.log('Removed dark class. Current classes:', document.documentElement.className);
    }
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  const toggleDarkMode = () => {
    console.log('Toggle dark mode clicked. Current:', darkMode, 'Will become:', !darkMode);
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
    </div>
  );
}

export default App; 