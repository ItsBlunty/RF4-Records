const SEARCH_HISTORY_KEY = 'rf4_search_history';
const MAX_HISTORY_ITEMS = 15;

export const saveSearchToHistory = (filters, resultCount = 0) => {
  console.log('saveSearchToHistory called with:', filters, 'resultCount:', resultCount);
  
  // Don't save empty searches
  if (!hasValidFilters(filters)) {
    console.log('saveSearchToHistory: No valid filters, not saving');
    return;
  }
  
  console.log('saveSearchToHistory: Valid filters found, proceeding to save');

  const searchEntry = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    filters: {
      fish: filters.fish || [],
      waterbody: filters.waterbody || [],
      bait: filters.bait || [],
      dataAge: filters.dataAge || '1-day'
    },
    resultCount,
    displayText: generateDisplayText(filters)
  };

  const history = getSearchHistory();
  
  // Check if this exact search already exists
  const existingIndex = history.findIndex(item => 
    JSON.stringify(item.filters) === JSON.stringify(searchEntry.filters)
  );
  
  if (existingIndex !== -1) {
    // Update existing entry with new timestamp and result count
    history[existingIndex] = { ...searchEntry, id: history[existingIndex].id };
  } else {
    // Add new entry to the beginning
    history.unshift(searchEntry);
  }
  
  // Keep only the most recent items
  const trimmedHistory = history.slice(0, MAX_HISTORY_ITEMS);
  
  try {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(trimmedHistory));
    console.log('Search saved to history:', searchEntry.displayText, 'Total items:', trimmedHistory.length);
    // Dispatch custom event to notify components of history update
    window.dispatchEvent(new CustomEvent('searchHistoryUpdated'));
    console.log('searchHistoryUpdated event dispatched');
  } catch (error) {
    console.warn('Failed to save search history:', error);
  }
};

export const getSearchHistory = () => {
  try {
    const history = localStorage.getItem(SEARCH_HISTORY_KEY);
    return history ? JSON.parse(history) : [];
  } catch (error) {
    console.warn('Failed to load search history:', error);
    return [];
  }
};

export const clearSearchHistory = () => {
  try {
    localStorage.removeItem(SEARCH_HISTORY_KEY);
    // Dispatch custom event to notify components of history update
    window.dispatchEvent(new CustomEvent('searchHistoryUpdated'));
  } catch (error) {
    console.warn('Failed to clear search history:', error);
  }
};

export const removeSearchFromHistory = (searchId) => {
  const history = getSearchHistory();
  const filteredHistory = history.filter(item => item.id !== searchId);
  
  try {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(filteredHistory));
    // Dispatch custom event to notify components of history update
    window.dispatchEvent(new CustomEvent('searchHistoryUpdated'));
  } catch (error) {
    console.warn('Failed to remove search from history:', error);
  }
};

const hasValidFilters = (filters) => {
  return (filters.fish && filters.fish.length > 0) ||
         (filters.waterbody && filters.waterbody.length > 0) ||
         (filters.bait && filters.bait.length > 0);
};

const generateDisplayText = (filters) => {
  const parts = [];
  
  if (filters.fish && filters.fish.length > 0) {
    parts.push(`Fish: ${filters.fish.join(', ')}`);
  }
  
  if (filters.waterbody && filters.waterbody.length > 0) {
    parts.push(`Location: ${filters.waterbody.join(', ')}`);
  }
  
  if (filters.bait && filters.bait.length > 0) {
    parts.push(`Bait: ${filters.bait.join(', ')}`);
  }
  
  if (filters.dataAge && filters.dataAge !== '1-day') {
    const ageLabels = {
      '1-day': 'Last Day',
      '2-days': 'Last 2 Days', 
      '3-days': 'Last 3 Days',
      'since-reset': 'Since Reset'
    };
    parts.push(`Age: ${ageLabels[filters.dataAge] || filters.dataAge}`);
  }
  
  return parts.join(' • ');
};

export const formatRelativeTime = (timestamp) => {
  const now = new Date();
  const searchTime = new Date(timestamp);
  const diffMs = now - searchTime;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return searchTime.toLocaleDateString();
};