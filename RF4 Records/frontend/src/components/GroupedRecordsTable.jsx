import React, { useState } from 'react';
import { formatWeight } from '../utils/formatWeight.js';
import useWindowScroll from '../hooks/useWindowScroll.js';
import trophyIcon from '../assets/trophy-clean.png';
import superTrophyIcon from '../assets/super-trophy-clean.png';

const GroupedRecordsTable = ({ records, sortConfig, onSort }) => {
  const [expandedGroups, setExpandedGroups] = useState(new Set());

  const getTrophyIcon = (trophyClass) => {
    if (trophyClass === 'record') {
      return <img src={superTrophyIcon} alt="Record" className="mr-1 inline-block" style={{ height: '20px', objectFit: 'contain' }} />;
    } else if (trophyClass === 'trophy') {
      return <img src={trophyIcon} alt="Trophy" className="mr-1 inline-block" style={{ height: '20px', objectFit: 'contain' }} />;
    }
    // Return spacer element to maintain alignment
    return <span className="w-3 mr-1 inline-block"></span>;
  };

  // Group records by bait
  const groupedRecords = records.reduce((groups, record) => {
    const bait = record.bait_display || 'Unknown Bait';
    if (!groups[bait]) {
      groups[bait] = [];
    }
    groups[bait].push(record);
    return groups;
  }, {});

  // Sort groups based on sortConfig
  let sortedGroups;
  if (sortConfig.key && sortConfig.direction) {
    // Sort groups by the specified field
    sortedGroups = Object.entries(groupedRecords).sort(([, groupA], [, groupB]) => {
      // Find the largest fish in each group for comparison
      const largestA = groupA.reduce((largest, record) => {
        if (!largest || (record.weight && record.weight > largest.weight)) {
          return record;
        }
        return largest;
      }, null);
      
      const largestB = groupB.reduce((largest, record) => {
        if (!largest || (record.weight && record.weight > largest.weight)) {
          return record;
        }
        return largest;
      }, null);
      
      let aValue, bValue;
      
      if (sortConfig.key === 'count') {
        aValue = groupA.length;
        bValue = groupB.length;
      } else if (sortConfig.key === 'fish') {
        aValue = largestA?.fish || groupA[0]?.fish || '';
        bValue = largestB?.fish || groupB[0]?.fish || '';
      } else if (sortConfig.key === 'bait') {
        aValue = largestA?.bait_display || largestA?.bait || groupA[0]?.bait_display || groupA[0]?.bait || '';
        bValue = largestB?.bait_display || largestB?.bait || groupB[0]?.bait_display || groupB[0]?.bait || '';
      } else if (sortConfig.key === 'weight') {
        aValue = largestA?.weight || 0;
        bValue = largestB?.weight || 0;
      } else if (sortConfig.key === 'trophies') {
        // Sort by total trophy count (records + trophies)
        const trophyCountsA = groupA.reduce((counts, record) => {
          if (record.trophy_class === 'trophy') counts.trophies++;
          else if (record.trophy_class === 'record') counts.records++;
          return counts;
        }, { trophies: 0, records: 0 });
        const trophyCountsB = groupB.reduce((counts, record) => {
          if (record.trophy_class === 'trophy') counts.trophies++;
          else if (record.trophy_class === 'record') counts.records++;
          return counts;
        }, { trophies: 0, records: 0 });
        aValue = trophyCountsA.trophies + trophyCountsA.records;
        bValue = trophyCountsB.trophies + trophyCountsB.records;
      } else if (sortConfig.key === 'waterbody') {
        aValue = largestA?.waterbody || groupA[0]?.waterbody || '';
        bValue = largestB?.waterbody || groupB[0]?.waterbody || '';
      } else if (sortConfig.key === 'date') {
        aValue = largestA?.date || groupA[0]?.date || '';
        bValue = largestB?.date || groupB[0]?.date || '';
      } else if (sortConfig.key === 'player') {
        aValue = largestA?.player || groupA[0]?.player || '';
        bValue = largestB?.player || groupB[0]?.player || '';
      } else if (sortConfig.key === 'region') {
        aValue = largestA?.region || groupA[0]?.region || '';
        bValue = largestB?.region || groupB[0]?.region || '';
      } else {
        // Default to bait name sorting
        aValue = largestA?.bait_display || largestA?.bait || groupA[0]?.bait_display || groupA[0]?.bait || '';
        bValue = largestB?.bait_display || largestB?.bait || groupB[0]?.bait_display || groupB[0]?.bait || '';
      }
      
      // Handle string comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.toLowerCase().localeCompare(bValue.toLowerCase());
        return sortConfig.direction === 'ascending' ? comparison : -comparison;
      }
      
      // Handle numeric comparison
      if (aValue < bValue) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
  } else {
    // Sort groups by bait name (default)
    sortedGroups = Object.entries(groupedRecords).sort(([a], [b]) => 
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
  }

  // Use window scroll for dynamic loading
  const { visibleData: visibleGroups, hasMore, displayCount, totalCount } = useWindowScroll(sortedGroups, 30, 20);

  const toggleGroup = (bait) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(bait)) {
        newSet.delete(bait);
      } else {
        newSet.add(bait);
      }
      return newSet;
    });
  };

  const getSortIndicator = (columnKey) => {
    if (sortConfig.key !== columnKey) return '↕';
    if (sortConfig.direction === 'ascending') return '↑';
    if (sortConfig.direction === 'descending') return '↓';
    return '↕';
  };

  const getColumnHeaderClass = (columnKey) => {
    const baseClass = "px-6 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none";
    if (sortConfig.key === columnKey) {
      return `${baseClass} bg-gray-100 dark:bg-gray-600`;
    }
    return baseClass;
  };

  if (!records || records.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400 text-lg">No records found matching your criteria.</p>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Try adjusting your filters to see more results.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full divide-y divide-gray-200 dark:divide-gray-700" style={{ minWidth: '1200px' }}>
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
                className={getColumnHeaderClass('count')}
                onClick={() => onSort('count')}
              >
                Count <span className="ml-1">{getSortIndicator('count')}</span>
              </th>
              <th 
                scope="col" 
                className={getColumnHeaderClass('bait')}
                onClick={() => onSort('bait')}
              >
                Bait <span className="ml-1">{getSortIndicator('bait')}</span>
              </th>
              <th 
                scope="col" 
                className={getColumnHeaderClass('trophies')}
                onClick={() => onSort('trophies')}
              >
                Trophies <span className="ml-1">{getSortIndicator('trophies')}</span>
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
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {visibleGroups.map(([bait, groupRecords]) => {
              const isExpanded = expandedGroups.has(bait);
              const recordCount = groupRecords.length;
              
              // Find the largest fish in this group
              const largestFish = groupRecords.reduce((largest, record) => {
                if (!largest || (record.weight && record.weight > largest.weight)) {
                  return record;
                }
                return largest;
              }, null);
              
              // Count trophies and super trophies in this group
              const trophyCounts = groupRecords.reduce((counts, record) => {
                if (record.trophy_class === 'trophy') {
                  counts.trophies++;
                } else if (record.trophy_class === 'record') {
                  counts.records++;
                }
                return counts;
              }, { trophies: 0, records: 0 });
              
              return (
                <React.Fragment key={bait}>
                  {/* Group Header Row */}
                  <tr 
                    className="bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer border-b-2 border-gray-200 dark:border-gray-600"
                    onClick={() => toggleGroup(bait)}
                  >
                    <td className="px-6 py-2.5 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      <div className="flex items-center">
                        <span className="mr-2">{isExpanded ? '▼' : '▶'}</span>
                        <span>{largestFish?.fish || groupRecords[0]?.fish || '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-2.5 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full text-xs font-medium">
                        {recordCount}
                      </span>
                    </td>
                    <td className="px-6 py-2.5 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {bait}
                    </td>
                    <td className="px-6 py-2.5 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {(trophyCounts.trophies > 0 || trophyCounts.records > 0) && (
                        <div className="flex items-center space-x-1">
                          {trophyCounts.records > 0 && (
                            <div className="flex items-center">
                              <img src={superTrophyIcon} alt="Super Trophy" className="inline-block" style={{ height: '16px', objectFit: 'contain' }} />
                              <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400 ml-0.5">{trophyCounts.records}</span>
                            </div>
                          )}
                          {trophyCounts.trophies > 0 && (
                            <div className="flex items-center">
                              <img src={trophyIcon} alt="Trophy" className="inline-block" style={{ height: '16px', objectFit: 'contain' }} />
                              <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400 ml-0.5">{trophyCounts.trophies}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-2.5 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {formatWeight(largestFish?.weight)}
                    </td>
                    <td className="px-6 py-2.5 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {largestFish?.waterbody || groupRecords[0]?.waterbody || '-'}
                    </td>
                    <td className="px-6 py-2.5 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {largestFish?.date || groupRecords[0]?.date || '-'}
                    </td>
                    <td className="px-6 py-2.5 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {largestFish?.player || groupRecords[0]?.player || '-'}
                    </td>
                    <td className="px-6 py-2.5 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {largestFish?.region || groupRecords[0]?.region || '-'}
                    </td>
                  </tr>
                  
                  {/* Expanded Records - Show all records except the heaviest one */}
                  {isExpanded && groupRecords
                    .sort((a, b) => {
                      // Sort by weight descending (heaviest first)
                      const weightA = a.weight || 0;
                      const weightB = b.weight || 0;
                      return weightB - weightA;
                    })
                    .filter((record, index) => {
                      // Skip the first record (heaviest) since it's already shown in the header
                      return index > 0;
                    })
                    .map((record, index) => (
                    <tr key={`${bait}-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-700 bg-gray-25 dark:bg-gray-850">
                      <td className="px-6 py-2.5 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300 pl-12">
                        {record.fish || '-'}
                      </td>
                      <td className="px-6 py-2.5 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                      </td>
                      <td className="px-6 py-2.5 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                        {record.bait_display || '-'}
                      </td>
                      <td className="px-6 py-2.5 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                      </td>
                      <td className="px-6 py-2.5 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {formatWeight(record.weight)}
                      </td>
                      <td className="px-6 py-2.5 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                        {record.waterbody || '-'}
                      </td>
                      <td className="px-6 py-2.5 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                        {record.date || '-'}
                      </td>
                      <td className="px-6 py-2.5 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                        {record.player || '-'}
                      </td>
                      <td className="px-6 py-2.5 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                        {record.region || '-'}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
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
              Loading more groups... ({displayCount} of {totalCount})
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupedRecordsTable; 
