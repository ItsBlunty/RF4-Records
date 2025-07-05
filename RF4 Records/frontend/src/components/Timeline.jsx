import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, ExternalLink, Calendar, MapPin, Package, Info } from 'lucide-react';

const Timeline = () => {
  const [timelineData, setTimelineData] = useState([]);
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadTimelineData = async () => {
      try {
        const response = await fetch('/RF4UpdateTimeline.csv');
        if (!response.ok) {
          throw new Error('Failed to load timeline data');
        }
        const csvText = await response.text();
        const parsedData = parseCSV(csvText);
        setTimelineData(parsedData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadTimelineData();
  }, []);

  const parseCSV = (csvText) => {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(header => header.trim());
    
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length >= headers.length) {
        const item = {};
        headers.forEach((header, index) => {
          item[header] = values[index] ? values[index].trim() : '';
        });
        if (item.Date) {
          data.push(item);
        }
      }
    }
    
    // Sort by date (newest first)
    return data.sort((a, b) => new Date(b.Date) - new Date(a.Date));
  };

  const parseCSVLine = (line) => {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"' && (i === 0 || line[i-1] === ',')) {
        inQuotes = true;
      } else if (char === '"' && inQuotes && (i === line.length - 1 || line[i+1] === ',')) {
        inQuotes = false;
      } else if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current);
    
    return values;
  };

  const toggleExpand = (index) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading timeline...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">Error Loading Timeline</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Russian Fishing 4 - Update Timeline
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Complete history of game updates, patches, and major features. Click on any entry to see detailed changes.
          </p>
        </div>

        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-300 dark:bg-gray-600"></div>
          
          {timelineData.map((item, index) => {
            const isExpanded = expandedItems.has(index);
            const hasMajorFeatures = item['Major Features in Patch'] && item['Major Features in Patch'].trim();
            const hasChangeList = item['Change List'] && item['Change List'].trim();
            const hasLink = item['Link To Notes/Vid/etc'] && item['Link To Notes/Vid/etc'].trim();
            
            return (
              <div key={index} className="relative mb-4">
                {/* Timeline dot */}
                <div className="absolute left-4 w-3 h-3 rounded-full bg-blue-600 border-2 border-blue-600 dark:border-gray-600"></div>
                
                {/* Timeline content */}
                <div className="ml-12">
                  <div 
                    className="p-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-500"
                    onClick={() => toggleExpand(index)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-1">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                            {formatDate(item.Date)}
                          </h3>
                          {hasLink && (
                            <a
                              href={item['Link To Notes/Vid/etc']}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-3 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                        
                        {hasMajorFeatures ? (
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {item['Major Features in Patch']}
                          </p>
                        ) : (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Minor update / Bug fixes
                          </p>
                        )}
                        
                        {isExpanded && hasChangeList && (
                          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                            <h4 className="font-medium text-xs mb-1 text-gray-700 dark:text-gray-300">
                              Detailed Changes:
                            </h4>
                            <p className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                              {item['Change List']}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <div className="ml-4 flex-shrink-0">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-12 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Timeline data compiled from official Russian Fishing 4 patch notes and community sources.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Timeline;