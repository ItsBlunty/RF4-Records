import React, { useState, useEffect } from 'react';
import { Search, Calendar, User, ExternalLink, MessageCircle, Clock, Tag } from 'lucide-react';

const QAPage = ({ darkMode }) => {
  const [qaItems, setQaItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [topicFilter, setTopicFilter] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Fetch all Q&A items on component mount
  useEffect(() => {
    fetchQAItems();
  }, []);

  const fetchQAItems = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/qa');
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', response.status, errorText);
        throw new Error(`Failed to fetch Q&A data (${response.status}): ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Q&A API Response:', data);
      setQaItems(data.qa_items || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching Q&A data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Search function
  const handleSearch = async () => {
    if (!searchQuery.trim() && !topicFilter) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    try {
      setIsSearching(true);
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append('q', searchQuery.trim());
      if (topicFilter) params.append('topic', topicFilter);

      const response = await fetch(`/api/qa/search?${params}`);
      
      if (!response.ok) {
        throw new Error('Search failed');
      }
      
      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (err) {
      console.error('Search error:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
    setTopicFilter('');
    setSearchResults([]);
    setIsSearching(false);
  };

  // Get unique topics for filter dropdown
  const uniqueTopics = [...new Set(qaItems.map(item => item.topic).filter(Boolean))];

  // Determine which items to display
  const displayItems = searchQuery || topicFilter ? searchResults : qaItems;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading FAQ...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center">
            <MessageCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Error Loading FAQ</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <button
              onClick={fetchQAItems}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            RF4 Developer FAQ
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Questions and answers from the RF4 development team
          </p>
        </div>

        {/* Search and Filter */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search questions and answers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="md:w-48">
              <select
                value={topicFilter}
                onChange={(e) => setTopicFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Topics</option>
                {uniqueTopics.map(topic => (
                  <option key={topic} value={topic}>{topic}</option>
                ))}
              </select>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={handleSearch}
                disabled={isSearching}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSearching ? 'Searching...' : 'Search'}
              </button>
              
              {(searchQuery || topicFilter) && (
                <button
                  onClick={clearSearch}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Results Summary */}
        {(searchQuery || topicFilter) && (
          <div className="mb-4">
            <p className="text-gray-600 dark:text-gray-400">
              {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
              {searchQuery && ` for "${searchQuery}"`}
              {topicFilter && ` in "${topicFilter}"`}
            </p>
          </div>
        )}

        {/* Q&A Items */}
        <div className="space-y-6">
          {displayItems.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {searchQuery || topicFilter ? 'No results found' : 'No FAQ items available'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {searchQuery || topicFilter 
                  ? 'Try adjusting your search terms or clearing filters'
                  : 'FAQ items will appear here when they are added'
                }
              </p>
            </div>
          ) : (
            displayItems.map((item) => (
              <div
                key={item.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
              >
                {/* Question */}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Q: {item.question}
                  </h3>
                </div>

                {/* Answer */}
                <div className="mb-4">
                  <div className="text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500">
                    <span className="font-medium text-blue-700 dark:text-blue-300">A: </span>
                    <span style={{ whiteSpace: 'pre-line' }}>{item.answer}</span>
                  </div>
                </div>

                {/* Metadata */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-4">
                  {item.topic && (
                    <div className="flex items-center">
                      <Tag className="w-4 h-4 mr-1" />
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs">
                        {item.topic}
                      </span>
                    </div>
                  )}
                  
                  {item.original_poster && (
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-1" />
                      <span>{item.original_poster}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    <span>{formatDate(item.date_added)}</span>
                  </div>
                  
                  {item.post_link && (
                    <a
                      href={item.post_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      <span>Original Post</span>
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
          <p className="text-gray-600 dark:text-gray-400">
            Total FAQ items: {qaItems.length}
          </p>
        </div>
      </div>
    </div>
  );
};

export default QAPage;