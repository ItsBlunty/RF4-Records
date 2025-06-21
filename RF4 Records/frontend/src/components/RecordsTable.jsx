import React from 'react';
import { formatWeight } from '../utils/formatWeight.js';
import useWindowScroll from '../hooks/useWindowScroll.js';

const RecordsTable = ({ records, sortConfig, onSort }) => {
  // Use window scroll for dynamic loading
  const { visibleData: visibleRecords, hasMore, displayCount, totalCount } = useWindowScroll(records || [], 100, 50);

  const getSortIndicator = (columnKey) => {
    if (sortConfig.key !== columnKey) return '↕';
    if (sortConfig.direction === 'ascending') return '↑';
    if (sortConfig.direction === 'descending') return '↓';
    return '↕';
  };

  const getColumnHeaderClass = (columnKey) => {
    const baseClass = "px-6 py-2 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-600";
    if (sortConfig.key === columnKey) {
      return `${baseClass} bg-gray-100 dark:bg-gray-600`;
    }
    return baseClass;
  };
  if (!records || records.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400 text-lg">No records found matching your criteria.</p>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Try adjusting your filters to see more results.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm" style={{ minWidth: '1200px' }}>
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th 
                scope="col" 
                className={getColumnHeaderClass('fish')}
                onClick={() => onSort('fish')}
              >
                Fish <span className="ml-1">{getSortIndicator('fish')}</span>
              </th>
              <th 
                scope="col" 
                className={getColumnHeaderClass('bait_display')}
                onClick={() => onSort('bait_display')}
              >
                Bait <span className="ml-1">{getSortIndicator('bait_display')}</span>
              </th>
              <th 
                scope="col" 
                className={getColumnHeaderClass('weight')}
                onClick={() => onSort('weight')}
              >
                Weight <span className="ml-1">{getSortIndicator('weight')}</span>
              </th>
              <th 
                scope="col" 
                className={getColumnHeaderClass('waterbody')}
                onClick={() => onSort('waterbody')}
              >
                Location <span className="ml-1">{getSortIndicator('waterbody')}</span>
              </th>
              <th 
                scope="col" 
                className={getColumnHeaderClass('date')}
                onClick={() => onSort('date')}
              >
                Date <span className="ml-1">{getSortIndicator('date')}</span>
              </th>
              <th 
                scope="col" 
                className={getColumnHeaderClass('player')}
                onClick={() => onSort('player')}
              >
                Player <span className="ml-1">{getSortIndicator('player')}</span>
              </th>
              <th 
                scope="col" 
                className={getColumnHeaderClass('region')}
                onClick={() => onSort('region')}
              >
                Region <span className="ml-1">{getSortIndicator('region')}</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
            {visibleRecords.map((record, idx) => (
              <tr
                key={idx}
                className={
                  `transition hover:bg-blue-50 dark:hover:bg-gray-700 ${
                    idx % 2 === 0 
                      ? 'bg-gray-50 dark:bg-gray-900' 
                      : 'bg-white dark:bg-gray-800'
                  }`
                }
              >
                            <td className="px-6 py-2.5 whitespace-nowrap font-medium text-gray-900 dark:text-gray-100">{record.fish || '-'}</td>
            <td className="px-6 py-2.5 whitespace-nowrap text-gray-700 dark:text-gray-300">{record.bait_display || '-'}</td>
            <td className="px-6 py-2.5 whitespace-nowrap font-semibold text-blue-800 dark:text-blue-400">
              {formatWeight(record.weight)}
            </td>
            <td className="px-6 py-2.5 whitespace-nowrap text-gray-700 dark:text-gray-300">{record.waterbody || '-'}</td>
            <td className="px-6 py-2.5 whitespace-nowrap text-gray-700 dark:text-gray-300">{record.date || '-'}</td>
            <td className="px-6 py-2.5 whitespace-nowrap text-gray-700 dark:text-gray-300">{record.player || '-'}</td>
            <td className="px-6 py-2.5 whitespace-nowrap text-gray-700 dark:text-gray-300">{record.region || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {/* Loading indicator at bottom */}
        {hasMore && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <div className="inline-flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Loading more records... ({displayCount} of {totalCount})
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecordsTable; 