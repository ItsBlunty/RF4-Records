import React, { useState, useEffect, useRef, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from './components/Header.jsx';
import Filters from './components/Filters.jsx';
import RecordsTable from './components/RecordsTable.jsx';
import GroupedRecordsTable from './components/GroupedRecordsTable.jsx';
import FishGroupedRecordsTable from './components/FishGroupedRecordsTable.jsx';
import About from './components/About.jsx';
import SkillLevelingGuides from './components/SkillLevelingGuides.jsx';
import TrophyWeights from './components/TrophyWeights.jsx';
import TopBaits from './components/TopBaits.jsx';
import WearCalculator from './components/WearCalculator.jsx';
import AlcoholGuide from './components/AlcoholGuide.jsx';
import WaterbodyPrices from './components/WaterbodyPrices.jsx';
import Links from './components/Links.jsx';
import SkillTrees from './components/SkillTrees.jsx';
import ReelInfo from './components/ReelInfo.jsx';
import RodInfo from './components/RodInfo.jsx';
import LoadingOverlay from './components/LoadingOverlay.jsx';
import { isWithinAgeRange } from './utils/dateUtils.js';
import trophyIcon from './assets/trophy-clean.png';
import superTrophyIcon from './assets/super-trophy-clean.png';

// Configure API base URL - in production, frontend and backend are served from same domain
// In development, use proxy configuration in vite.config.js

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingRemaining, setLoadingRemaining] = useState(false);
  const [isLoadingOlderRecords, setIsLoadingOlderRecords] = useState(false);
  const [allRecordsLoaded, setAllRecordsLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [totalRecords, setTotalRecords] = useState(0);
  const [cachedRecordCount, setCachedRecordCount] = useState(0);
  
  // Dark mode state
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : true;
  });
  
  // Get current page from URL
  const getCurrentPage = () => {
    if (location.pathname === '/links') return 'links';
    if (location.pathname === '/trophyweights') return 'trophyweights';
    if (location.pathname === '/topbaits') return 'topbaits';
    if (location.pathname === '/skillguides') return 'guides';
    if (location.pathname === '/skilltrees') return 'skilltrees';
    if (location.pathname === '/wearcalc') return 'wearcalc';
    if (location.pathname === '/waterbodyprices') return 'waterbodyprices';
    if (location.pathname === '/alcohol') return 'alcohol';
    if (location.pathname === '/reelinfo') return 'reelinfo';
    if (location.pathname === '/rodinfo') return 'rodinfo';
    return 'records';
  };
  
  // View mode state
  const [viewMode, setViewMode] = useState('grouped'); // 'grouped', 'fish-grouped', or 'list'
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState({
    key: 'count',
    direction: 'descending'
  });
  
  // Filter states
  const [filters, setFilters] = useState({
    fish: '',
    waterbody: '',
    bait: '',
    dataAge: '1-day'
  });

  // Trophy filter state
  const [trophyFilter, setTrophyFilter] = useState('all'); // 'all', 'trophies', 'records'

  // Apply trophy filter to records
  const displayRecords = useMemo(() => {
    if (trophyFilter === 'all') {
      return filteredRecords;
    } else if (trophyFilter === 'trophies') {
      return filteredRecords.filter(record => record.trophy_class === 'trophy' || record.trophy_class === 'record');
    } else if (trophyFilter === 'records') {
      return filteredRecords.filter(record => record.trophy_class === 'record');
    }
    return filteredRecords;
  }, [filteredRecords, trophyFilter]);
  
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
  
  // About modal state
  const [showAbout, setShowAbout] = useState(false);

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

  const handleAboutClick = () => {
    setShowAbout(true);
  };

  const handleAboutClose = () => {
    setShowAbout(false);
  };

  const handlePageChange = (page) => {
    if (page === 'records') {
      navigate('/');
    } else if (page === 'links') {
      navigate('/links');
    } else if (page === 'trophyweights') {
      navigate('/trophyweights');
    } else if (page === 'topbaits') {
      navigate('/topbaits');
    } else if (page === 'guides') {
      navigate('/skillguides');
    } else if (page === 'skilltrees') {
      navigate('/skilltrees');
    } else if (page === 'wearcalc') {
      navigate('/wearcalc');
    } else if (page === 'waterbodyprices') {
      navigate('/waterbodyprices');
    } else if (page === 'alcohol') {
      navigate('/alcohol');
    } else if (page === 'reelinfo') {
      navigate('/reelinfo');
    } else if (page === 'rodinfo') {
      navigate('/rodinfo');
    }
  };

  // Load filter values only (no records initially)
  const fetchFilterValues = async () => {
    try {
      setError(null);
      const response = await axios.get(import.meta.env.DEV ? '/api/records/filter-values' : '/records/filter-values');
      
      if (!response.data) {
        console.error('Invalid filter values response format:', response.data);
        throw new Error('Invalid response format - expected filter values object');
      }
      
      // Set unique values for filters
      setUniqueValues({
        fish: response.data.fish || [],
        waterbody: response.data.waterbody || [],
        bait: response.data.bait || []
      });
      
      // Filter values loaded - records state managed separately
      setLastRefresh(new Date());
      
    } catch (err) {
      console.error('Error fetching filter values:', err);
      setError(`Failed to fetch filter values: ${err.message}`);
    }
  };

  // Fetch filtered records from backend
  const fetchFilteredRecords = async () => {
    await fetchFilteredRecordsWithFilters(filters);
  };
  
  // Helper function to fetch filtered records with specific filters
  const fetchFilteredRecordsWithFilters = async (filtersToUse) => {
    if (!hasFiltersWithValues(filtersToUse)) {
      // No filters applied, show empty table
      setRecords([]);
      setFilteredRecords([]);
      return;
    }
    
    try {
      setLoadingRemaining(true);
      setError(null);
      
      // Build query parameters
      const params = new URLSearchParams();
      if (filtersToUse.fish) params.append('fish', filtersToUse.fish);
      if (filtersToUse.waterbody) params.append('waterbody', filtersToUse.waterbody);
      if (filtersToUse.bait) params.append('bait', filtersToUse.bait);
      if (filtersToUse.dataAge) params.append('data_age', filtersToUse.dataAge);
      
      const url = import.meta.env.DEV ? '/api/records/filtered' : '/records/filtered';
      const queryString = params.toString();
      const fullUrl = queryString ? `${url}?${queryString}` : url;
      
      const response = await axios.get(fullUrl);
      
      if (!response.data || !Array.isArray(response.data.records)) {
        console.error('Invalid filtered response format:', response.data);
        throw new Error('Invalid response format - expected records array');
      }
      
      const { records: filteredRecords, total_filtered } = response.data;
      
      setRecords(filteredRecords);
      setTotalRecords(total_filtered);
      setCachedRecordCount(filteredRecords.length); // Track cached records
      setLastRefresh(new Date());
      
    } catch (err) {
      console.error('Error fetching filtered records:', err);
      setError(`Failed to fetch filtered records: ${err.message}`);
    } finally {
      setLoadingRemaining(false);
    }
  };

  // Force load older records (for user interactions requiring all data)
  const ensureAllRecordsLoaded = async () => {
    if (!allRecordsLoaded && !isLoadingOlderRecords) {
      setLoadingRemaining(true);
      try {
        await fetchOlderRecords();
      } finally {
        setLoadingRemaining(false);
      }
    }
  };

  // Legacy fetch all records function (for manual refresh)
  const fetchAllRecords = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(import.meta.env.DEV ? '/api/records' : '/records');
      
      if (!Array.isArray(response.data)) {
        throw new Error('Invalid response format - expected array');
      }
      
      setRecords(response.data);
      setTotalRecords(response.data.length);
      setAllRecordsLoaded(true);
      
      // Extract unique values for filters
      const fish = [...new Set(response.data.map(r => r.fish).filter(Boolean))].sort();
      const waterbody = [...new Set(response.data.map(r => r.waterbody).filter(Boolean))].sort();
      const bait = [...new Set(response.data.map(r => r.bait_display).filter(Boolean))].sort();
      
      setUniqueValues({ fish, waterbody, bait });
      setLastRefresh(new Date());
      
    } catch (err) {
      console.error('Error fetching all records:', err);
      setError(`Failed to fetch records: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Manual refresh function
  const handleRefresh = () => {
    hasFetched.current = false;
    setAllRecordsLoaded(false);
    setFilters(prev => ({ ...prev, dataAge: '' })); // Clear age filter for full refresh
    fetchAllRecords(); // Use legacy endpoint for manual refresh to get everything
  };

  // Helper function to check if any filters are applied
  const hasFilters = () => {
    return filters.fish || filters.waterbody || filters.bait;
  };
  
  // Helper function to check if any filters are applied with specific filter values
  const hasFiltersWithValues = (filtersToCheck) => {
    return filtersToCheck.fish || filtersToCheck.waterbody || filtersToCheck.bait || filtersToCheck.dataAge;
  };

  useEffect(() => {
    // Prevent duplicate calls in React Strict Mode
    if (hasFetched.current) return;
    hasFetched.current = true;

    fetchFilterValues(); // Load filter values only, no records initially
  }, []);

  // Separate useEffect for URL parameter handling
  useEffect(() => {
    // Check for URL parameters and load them into filters
    const urlParams = new URLSearchParams(location.search);
    
    // Only update filters if there are URL parameters
    if (urlParams.get('fish') || urlParams.get('waterbody') || urlParams.get('bait') || urlParams.get('data_age')) {
      const urlFilters = {
        fish: urlParams.get('fish') || '',
        waterbody: urlParams.get('waterbody') || '',
        bait: urlParams.get('bait') || '',
        dataAge: urlParams.get('data_age') || '1-day'
      };
      
      setFilters(prevFilters => ({
        ...prevFilters,
        ...urlFilters
      }));
      
      // Force search execution since we know there are meaningful URL parameters
      setTimeout(() => {
        fetchFilteredRecordsWithFilters(urlFilters);
      }, 300);
    }
  }, [location.search]);

  // No automatic refresh - users can manually refresh by reloading the page
  // All filtering and sorting is done client-side with cached data

  // Apply filters by calling backend API when specifically requested
  // No automatic triggering on filter changes

  // Apply client-side sorting to filtered results from backend
  useEffect(() => {
    let sorted = [...records];

    // Apply sorting
    if (sortConfig.key && sortConfig.direction) {
      sorted = sorted.sort((a, b) => {
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
    }

    setFilteredRecords(sorted);
  }, [records, sortConfig]);


  const clearFilters = () => {
    setFilters({
      fish: '',
      waterbody: '',
      bait: '',
      dataAge: '1-day'
    });
    // Clear displayed records but keep cached data
    setFilteredRecords([]);
    // Clear URL parameters
    navigate(location.pathname, { replace: true });
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const handleFilterSubmit = () => {
    // Update URL with current filters
    const params = new URLSearchParams();
    if (filters.fish) params.append('fish', filters.fish);
    if (filters.waterbody) params.append('waterbody', filters.waterbody);
    if (filters.bait) params.append('bait', filters.bait);
    if (filters.dataAge && filters.dataAge !== '1-day') params.append('data_age', filters.dataAge);
    
    const newUrl = params.toString() ? `${location.pathname}?${params.toString()}` : location.pathname;
    navigate(newUrl, { replace: true });
    
    // Auto-switch view mode based on search filters (only when search is submitted)
    if (filters.bait && !filters.fish) {
      // If only bait is searched, switch to fish grouping to see which fish work with that bait
      setViewMode('fish-grouped');
    } else if (filters.fish && !filters.bait) {
      // If only fish is searched, switch to bait grouping to see which baits work for that fish
      setViewMode('grouped');
    }
    // If both fish and bait are provided, don't auto-switch since both groupings show the same result
    
    fetchFilteredRecords();
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
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading filters...</p>
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
        filtered={displayRecords.length} 
        onRefresh={handleRefresh} 
        lastRefresh={lastRefresh}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
        onAboutClick={handleAboutClick}
        currentPage={getCurrentPage()}
        onPageChange={handlePageChange}
      />
      
      {getCurrentPage() === 'records' ? (
        <>
          <Filters
            filters={filters}
            uniqueValues={uniqueValues}
            onChange={handleFilterChange}
            onSubmit={handleFilterSubmit}
            onClear={clearFilters}
            onPageChange={handlePageChange}
            currentPage={getCurrentPage()}
          />
          <div className="mx-auto px-4 sm:px-6 lg:px-8 py-4">
            {/* View Mode Toggle */}
            <div className="mb-4 flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
              <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
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
                
                {/* Record Count and Trophy Filters */}
                <div className="flex items-center space-x-3">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                    {displayRecords.length} of {cachedRecordCount || records.length} records
                    {!allRecordsLoaded && typeof totalRecords === 'number' && totalRecords > 0 && (
                      <span className="ml-1 text-xs">
                        (~{totalRecords} total)
                      </span>
                    )}
                  </span>
                  
                  {/* Trophy Filter Buttons */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setTrophyFilter(trophyFilter === 'trophies' ? 'all' : 'trophies')}
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        trophyFilter === 'trophies'
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      Only show <img src={trophyIcon} alt="Trophy" className="ml-1 mr-1 inline-block" style={{ height: '20px', objectFit: 'contain' }} /> and <img src={superTrophyIcon} alt="Super Trophy" className="ml-1 mr-1 inline-block" style={{ height: '20px', objectFit: 'contain' }} />
                    </button>
                    
                    <button
                      onClick={() => setTrophyFilter(trophyFilter === 'records' ? 'all' : 'records')}
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        trophyFilter === 'records'
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      Only show <img src={superTrophyIcon} alt="Super Trophy" className="ml-1 mr-1 inline-block" style={{ height: '20px', objectFit: 'contain' }} />
                    </button>
                  </div>
                  
                  {loadingRemaining && (
                    <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                      <span>Loading filtered records...</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {viewMode === 'grouped' || viewMode === 'fish-grouped' ? 'Click on a group to expand/collapse' : 'All records shown'}
              </div>
            </div>
            
            <LoadingOverlay isLoading={loadingRemaining}>
              {displayRecords.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                  <div className="text-gray-400 dark:text-gray-500 text-6xl mb-4">🎣</div>
                  <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Welcome to RF4 Records
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                    Enter a fish, location, or bait in the filters above, pick a time frame, then press Enter or click Search. 
                    Use the view modes to explore records by individual entries, grouped by bait, or grouped by fish.
                  </p>
                </div>
              ) : viewMode === 'grouped' ? (
                <GroupedRecordsTable 
                  records={displayRecords} 
                  sortConfig={sortConfig}
                  onSort={handleSort}
                />
              ) : viewMode === 'fish-grouped' ? (
                <FishGroupedRecordsTable 
                  records={displayRecords} 
                  sortConfig={sortConfig}
                  onSort={handleSort}
                />
              ) : (
                <RecordsTable 
                  records={displayRecords} 
                  sortConfig={sortConfig}
                  onSort={handleSort}
                />
              )}
            </LoadingOverlay>
          </div>
        </>
      ) : getCurrentPage() === 'links' ? (
        <Links />
      ) : getCurrentPage() === 'trophyweights' ? (
        <TrophyWeights />
      ) : getCurrentPage() === 'topbaits' ? (
        <TopBaits />
      ) : getCurrentPage() === 'guides' ? (
        <SkillLevelingGuides />
      ) : getCurrentPage() === 'skilltrees' ? (
        <SkillTrees />
      ) : getCurrentPage() === 'wearcalc' ? (
        <WearCalculator />
      ) : getCurrentPage() === 'waterbodyprices' ? (
        <WaterbodyPrices />
      ) : getCurrentPage() === 'alcohol' ? (
        <AlcoholGuide />
      ) : getCurrentPage() === 'reelinfo' ? (
        <ReelInfo />
      ) : getCurrentPage() === 'rodinfo' ? (
        <RodInfo />
      ) : null}
      
      {/* About Modal */}
      {showAbout && (
        <About onClose={handleAboutClose} />
      )}
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AppContent />} />
        <Route path="/links" element={<AppContent />} />
        <Route path="/trophyweights" element={<AppContent />} />
        <Route path="/topbaits" element={<AppContent />} />
        <Route path="/skillguides" element={<AppContent />} />
        <Route path="/skilltrees" element={<AppContent />} />
        <Route path="/wearcalc" element={<AppContent />} />
        <Route path="/waterbodyprices" element={<AppContent />} />
        <Route path="/alcohol" element={<AppContent />} />
        <Route path="/reelinfo" element={<AppContent />} />
        <Route path="/rodinfo" element={<AppContent />} />
      </Routes>
    </Router>
  );
}

export default App; 