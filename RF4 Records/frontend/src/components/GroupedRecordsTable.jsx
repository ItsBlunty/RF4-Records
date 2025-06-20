import React, { useState } from 'react';
import { formatWeight } from '../utils/formatWeight.js';

const GroupedRecordsTable = ({ records, sortConfig, onSort }) => {
  const [expandedGroups, setExpandedGroups] = useState(new Set());

  // Group records by bait
  const groupedRecords = records.reduce((groups, record) => {
    const bait = record.bait_display || record.bait || 'Unknown Bait';
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
    const baseClass = "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none";
    if (sortConfig.key === columnKey) {
      return `${baseClass} bg-gray-100`;
    }
    return baseClass;
  };

  if (!records || records.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <p className="text-gray-500 text-lg">No records found matching your criteria.</p>
        <p className="text-gray-400 text-sm mt-2">Try adjusting your filters to see more results.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
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
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedGroups.map(([bait, groupRecords]) => {
              const isExpanded = expandedGroups.has(bait);
              const recordCount = groupRecords.length;
              
              // Find the largest fish in this group
              const largestFish = groupRecords.reduce((largest, record) => {
                if (!largest || (record.weight && record.weight > largest.weight)) {
                  return record;
                }
                return largest;
              }, null);
              
              return (
                <React.Fragment key={bait}>
                  {/* Group Header Row */}
                  <tr 
                    className="bg-gray-50 hover:bg-gray-100 cursor-pointer border-b-2 border-gray-200"
                    onClick={() => toggleGroup(bait)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div className="flex items-center">
                        <span className="mr-2">{isExpanded ? '▼' : '▶'}</span>
                        <span>{largestFish?.fish || groupRecords[0]?.fish || '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                        {recordCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {bait}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                      {formatWeight(largestFish?.weight)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {largestFish?.waterbody || groupRecords[0]?.waterbody || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {largestFish?.date || groupRecords[0]?.date || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {largestFish?.player || groupRecords[0]?.player || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
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
                    <tr key={`${bait}-${index}`} className="hover:bg-gray-50 bg-gray-25">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 pl-12">
                        {record.fish || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        -
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.bait_display || record.bait || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                            {formatWeight(record.weight)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.waterbody || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.date || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.player || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.region || '-'}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GroupedRecordsTable; 