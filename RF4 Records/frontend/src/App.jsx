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
import ItemInfo from './components/ItemInfo.jsx';
import Lines from './components/Lines.jsx';
import Lures from './components/Lures.jsx';
import MapViewer from './components/MapViewer.jsx';
import LureCraftingRecipes from './components/LureCraftingRecipes.jsx';
import Timeline from './components/Timeline.jsx';
import QAPage from './components/QAPage.jsx';
import CafeOrders from './components/CafeOrders.jsx';
import LoadingOverlay from './components/LoadingOverlay.jsx';
import LocationBrowser from './components/LocationBrowser.jsx';
import { availableMaps } from './config/maps.js';
import { isWithinAgeRange } from './utils/dateUtils.js';
import { saveSearchToHistory } from './utils/searchHistory.js';
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
    if (location.pathname === '/records') return 'records';
    if (location.pathname === '/trophyweights') return 'trophyweights';
    if (location.pathname === '/topbaits') return 'topbaits';
    if (location.pathname === '/skillguides') return 'guides';
    if (location.pathname === '/skilltrees') return 'skilltrees';
    if (location.pathname === '/lurecrafting') return 'lurecrafting';
    if (location.pathname === '/wearcalc') return 'wearcalc';
    if (location.pathname === '/waterbodyprices') return 'waterbodyprices';
    if (location.pathname === '/alcohol') return 'alcohol';
    if (location.pathname === '/reelinfo') return 'reelinfo';
    if (location.pathname === '/rodinfo') return 'rodinfo';
    if (location.pathname === '/iteminfo') return 'iteminfo';
    if (location.pathname === '/iteminfo/lines') return 'lines';
    if (location.pathname === '/iteminfo/lures') return 'lures';
    if (location.pathname === '/timeline') return 'timeline';
    if (location.pathname === '/qa') return 'qa';
    if (location.pathname === '/cafeorders') return 'cafeorders';
    if (location.pathname.startsWith('/maps')) return 'maps';
    return 'locations';
  };
  
  // View mode state
  const [viewMode, setViewMode] = useState('grouped'); // 'grouped', 'fish-grouped', or 'list'
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState({
    key: 'count',
    direction: 'descending'
  });
  
  // Filter states - now supporting arrays for multi-select
  const [filters, setFilters] = useState({
    fish: [],
    waterbody: [],
    bait: [],
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
  
  // Unique values for dropdowns (includes fish-location mapping for dynamic filtering)
  const [uniqueValues, setUniqueValues] = useState({
    fish: [],
    waterbody: [],
    bait: [],
    fish_by_location: {},
    locations_by_fish: {}
  });

  // Add ref to prevent duplicate API calls in Strict Mode
  const hasFetched = useRef(false);

  // Add ref to prevent duplicate API calls from URL changes triggered by programmatic navigation
  const isNavigatingFromSubmit = useRef(false);
  
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
    if (page === 'locations') {
      navigate('/');
    } else if (page === 'records') {
      navigate('/records');
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
    } else if (page === 'lurecrafting') {
      navigate('/lurecrafting');
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
    } else if (page === 'iteminfo') {
      navigate('/iteminfo');
    } else if (page === 'lines') {
      navigate('/iteminfo/lines');
    } else if (page === 'lures') {
      navigate('/iteminfo/lures');
    } else if (page === 'timeline') {
      navigate('/timeline');
    } else if (page === 'qa') {
      navigate('/qa');
    } else if (page === 'cafeorders') {
      navigate('/cafeorders');
    } else if (page === 'maps') {
      // Navigate to first map in the availableMaps list dynamically
      const firstMapKey = Object.keys(availableMaps)[0];
      navigate(`/maps/${firstMapKey}`);
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
      
      // Set unique values for filters (includes fish-location mapping)
      setUniqueValues({
        fish: response.data.fish || [],
        waterbody: response.data.waterbody || [],
        bait: response.data.bait || [],
        fish_by_location: response.data.fish_by_location || {},
        locations_by_fish: response.data.locations_by_fish || {}
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
      if (filtersToUse.fish && filtersToUse.fish.length > 0) {
        params.append('fish', filtersToUse.fish.join(','));
      }
      if (filtersToUse.waterbody && filtersToUse.waterbody.length > 0) {
        params.append('waterbody', filtersToUse.waterbody.join(','));
      }
      if (filtersToUse.bait && filtersToUse.bait.length > 0) {
        params.append('bait', filtersToUse.bait.join(','));
      }
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
      
      // Save successful search to history
      console.log('App.jsx: About to save search to history:', filtersToUse, 'Results:', filteredRecords.length);
      saveSearchToHistory(filtersToUse, filteredRecords.length);
      console.log('App.jsx: saveSearchToHistory completed');
      
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
      
      // Extract unique values for filters (preserve existing mapping data)
      const fish = [...new Set(response.data.map(r => r.fish).filter(Boolean))].sort();
      const waterbody = [...new Set(response.data.map(r => r.waterbody).filter(Boolean))].sort();
      const bait = [...new Set(response.data.map(r => r.bait_display).filter(Boolean))].sort();

      setUniqueValues(prev => ({
        fish,
        waterbody,
        bait,
        fish_by_location: prev.fish_by_location || {},
        locations_by_fish: prev.locations_by_fish || {}
      }));
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
    return (filters.fish && filters.fish.length > 0) || 
           (filters.waterbody && filters.waterbody.length > 0) || 
           (filters.bait && filters.bait.length > 0);
  };
  
  // Helper function to check if any filters are applied with specific filter values
  const hasFiltersWithValues = (filtersToCheck) => {
    return (filtersToCheck.fish && filtersToCheck.fish.length > 0) || 
           (filtersToCheck.waterbody && filtersToCheck.waterbody.length > 0) || 
           (filtersToCheck.bait && filtersToCheck.bait.length > 0) || 
           filtersToCheck.dataAge;
  };

  useEffect(() => {
    // Prevent duplicate calls in React Strict Mode
    if (hasFetched.current) return;
    hasFetched.current = true;

    fetchFilterValues(); // Load filter values only, no records initially
  }, []);

  // Separate useEffect for URL parameter handling
  useEffect(() => {
    // Skip if this URL change was triggered by a filter submit (to prevent duplicate API calls)
    if (isNavigatingFromSubmit.current) {
      isNavigatingFromSubmit.current = false;
      return;
    }

    // Check for URL parameters and load them into filters
    const urlParams = new URLSearchParams(location.search);

    // Only update filters if there are URL parameters
    if (urlParams.get('fish') || urlParams.get('waterbody') || urlParams.get('bait') || urlParams.get('data_age')) {
      const urlFilters = {
        fish: urlParams.get('fish') ? urlParams.get('fish').split(',') : [],
        waterbody: urlParams.get('waterbody') ? urlParams.get('waterbody').split(',') : [],
        bait: urlParams.get('bait') ? urlParams.get('bait').split(',') : [],
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


  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const handleFilterSubmitWithValues = (filtersToUse) => {
    // Update URL with specified filters
    const params = new URLSearchParams();
    if (filtersToUse.fish && filtersToUse.fish.length > 0) {
      params.append('fish', filtersToUse.fish.join(','));
    }
    if (filtersToUse.waterbody && filtersToUse.waterbody.length > 0) {
      params.append('waterbody', filtersToUse.waterbody.join(','));
    }
    if (filtersToUse.bait && filtersToUse.bait.length > 0) {
      params.append('bait', filtersToUse.bait.join(','));
    }
    if (filtersToUse.dataAge && filtersToUse.dataAge !== '1-day') params.append('data_age', filtersToUse.dataAge);

    const newUrl = params.toString() ? `${location.pathname}?${params.toString()}` : location.pathname;

    // Auto-switch view mode based on search filters (only when search is submitted)
    if (filtersToUse.bait && filtersToUse.bait.length > 0 && (!filtersToUse.fish || filtersToUse.fish.length === 0)) {
      // If only bait is searched, switch to fish grouping to see which fish work with that bait
      setViewMode('fish-grouped');
    } else if (filtersToUse.fish && filtersToUse.fish.length > 0 && (!filtersToUse.bait || filtersToUse.bait.length === 0)) {
      // If only fish is searched, switch to bait grouping to see which baits work for that fish
      setViewMode('grouped');
    }
    // If both fish and bait are provided, don't auto-switch since both groupings show the same result

    // Set flag to prevent URL change useEffect from triggering duplicate API call
    isNavigatingFromSubmit.current = true;
    navigate(newUrl, { replace: true });

    // Fetch records (only once, not from URL change listener)
    fetchFilteredRecordsWithFilters(filtersToUse);
  };

  // Handler for LocationBrowser - sets location filter, view mode, and triggers search
  const handleLocationSelect = (waterbody, viewModeToSet) => {
    // Create new filters with the selected location
    const newFilters = {
      ...filters,
      waterbody: [waterbody],
      fish: [],
      bait: []
    };

    // Update filter state
    setFilters(newFilters);

    // Set the requested view mode
    setViewMode(viewModeToSet);

    // Trigger search with the new filters
    handleFilterSubmitWithValues(newFilters);
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
            onSubmitWithValues={handleFilterSubmitWithValues}
            onPageChange={handlePageChange}
            currentPage={getCurrentPage()}
          />
          <div className="mx-auto px-4 sm:px-6 lg:px-8 py-4">
            {displayRecords.length === 0 ? (
              /* Show empty state message when no search results */
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400 text-lg">
                  Use the filters above to search for records, or browse by{' '}
                  <button
                    onClick={() => handlePageChange('locations')}
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    location
                  </button>
                </p>
              </div>
            ) : (
              /* Show results UI when there are records */
              <>
                {/* View Mode Toggle */}
                <div className="mb-4 flex flex-col space-y-4">
                  <div className="flex flex-col space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setViewMode('grouped')}
                        className={`px-3 py-2 text-sm rounded-lg font-medium transition-colors ${
                          viewMode === 'grouped'
                            ? 'bg-primary-600 text-white'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        Grouped by Bait
                      </button>
                      <button
                        onClick={() => setViewMode('fish-grouped')}
                        className={`px-3 py-2 text-sm rounded-lg font-medium transition-colors ${
                          viewMode === 'fish-grouped'
                            ? 'bg-primary-600 text-white'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        Grouped by Fish
                      </button>
                      <button
                        onClick={() => setViewMode('list')}
                        className={`px-3 py-2 text-sm rounded-lg font-medium transition-colors ${
                          viewMode === 'list'
                            ? 'bg-primary-600 text-white'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        List View
                      </button>
                    </div>

                    {/* Record Count and Trophy Filters */}
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                        {displayRecords.length} of {cachedRecordCount || records.length} records
                        {!allRecordsLoaded && typeof totalRecords === 'number' && totalRecords > 0 && (
                          <span className="ml-1 text-xs">
                            (~{totalRecords} total)
                          </span>
                        )}
                      </span>

                      {/* Trophy Filter Buttons */}
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setTrophyFilter(trophyFilter === 'trophies' ? 'all' : 'trophies')}
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs sm:text-sm font-medium transition-colors ${
                            trophyFilter === 'trophies'
                              ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          <span className="hidden sm:inline">Only show</span> <img src={trophyIcon} alt="Trophy" className="ml-1 mr-1 inline-block" style={{ height: '16px', objectFit: 'contain' }} /> <span className="hidden sm:inline">and</span> <img src={superTrophyIcon} alt="Super Trophy" className="ml-1 inline-block" style={{ height: '16px', objectFit: 'contain' }} />
                        </button>

                        <button
                          onClick={() => setTrophyFilter(trophyFilter === 'records' ? 'all' : 'records')}
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs sm:text-sm font-medium transition-colors ${
                            trophyFilter === 'records'
                              ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          <span className="hidden sm:inline">Only show</span> <img src={superTrophyIcon} alt="Super Trophy" className="ml-1 inline-block" style={{ height: '16px', objectFit: 'contain' }} />
                        </button>
                      </div>

                      {loadingRemaining && (
                        <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                          <span>Loading...</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    {viewMode === 'grouped' || viewMode === 'fish-grouped' ? 'Click on a group to expand/collapse' : 'All records shown'}
                  </div>
                </div>

                <LoadingOverlay isLoading={loadingRemaining}>
                  {viewMode === 'grouped' ? (
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
              </>
            )}
          </div>
        </>
      ) : getCurrentPage() === 'links' ? (
        <Links />
      ) : getCurrentPage() === 'locations' ? (
        <LocationBrowser onLocationSelect={handleLocationSelect} />
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
      ) : getCurrentPage() === 'iteminfo' ? (
        <ItemInfo />
      ) : getCurrentPage() === 'lines' ? (
        <Lines />
      ) : getCurrentPage() === 'lures' ? (
        <Lures />
      ) : getCurrentPage() === 'maps' ? (
        <MapViewer />
      ) : getCurrentPage() === 'lurecrafting' ? (
        <LureCraftingRecipes />
      ) : getCurrentPage() === 'timeline' ? (
        <Timeline />
      ) : getCurrentPage() === 'qa' ? (
        <QAPage darkMode={darkMode} />
      ) : getCurrentPage() === 'cafeorders' ? (
        <CafeOrders />
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
        <Route path="/records" element={<AppContent />} />
        <Route path="/trophyweights" element={<AppContent />} />
        <Route path="/topbaits" element={<AppContent />} />
        <Route path="/skillguides" element={<AppContent />} />
        <Route path="/skilltrees" element={<AppContent />} />
        <Route path="/wearcalc" element={<AppContent />} />
        <Route path="/waterbodyprices" element={<AppContent />} />
        <Route path="/alcohol" element={<AppContent />} />
        <Route path="/reelinfo" element={<AppContent />} />
        <Route path="/rodinfo" element={<AppContent />} />
        <Route path="/iteminfo" element={<AppContent />} />
        <Route path="/iteminfo/lines" element={<AppContent />} />
        <Route path="/iteminfo/lures" element={<AppContent />} />
        <Route path="/maps" element={<AppContent />} />
        <Route path="/maps/:mapName" element={<AppContent />} />
        <Route path="/lurecrafting" element={<AppContent />} />
        <Route path="/timeline" element={<AppContent />} />
        <Route path="/qa" element={<AppContent />} />
        <Route path="/cafeorders" element={<AppContent />} />
      </Routes>
    </Router>
  );
}

export default App; 