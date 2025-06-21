import React from 'react';
import { formatWeight } from '../utils/formatWeight.js';

const RecordsTable = ({ records }) => {
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
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Fish</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Bait</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Weight</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Location</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Date</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Player</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Region</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
            {records.map((record, idx) => (
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
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-gray-100">{record.fish || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">{record.bait_display || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap font-semibold text-blue-800 dark:text-blue-400">
                  {formatWeight(record.weight)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">{record.waterbody || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">{record.date || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">{record.player || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">{record.region || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecordsTable; 