import React, { useState } from 'react';

const AlcoholGuide = () => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });

  const alcoholData = [
    { name: 'Mulled Wine', percent: '5%', duration: 6, price: 124.75, portions: 30, costPerPortion: 4.16, costPerHour: 0.69, costPer100Hour: 13.86, crafted: 'Yes' },
    { name: 'Champagne Novopokrovskoe', percent: '4%', duration: 7, price: 313.63, portions: 20, costPerPortion: 15.68, costPerHour: 2.24, costPer100Hour: 56.01, crafted: 'No' },
    { name: 'Christmas Edition TT Strong Beer', percent: '4%', duration: 6, price: 8.6, portions: 1, costPerPortion: 8.60, costPerHour: 1.43, costPer100Hour: 35.83, crafted: 'No' },
    { name: 'Proletarian Vodka', percent: '4.60%', duration: 6, price: 188.5, portions: 20, costPerPortion: 9.43, costPerHour: 1.57, costPer100Hour: 34.15, crafted: 'No' },
    { name: 'Volkhov Moonshine', percent: '5%', duration: 6, price: 9.8, portions: 2, costPerPortion: 4.90, costPerHour: 0.82, costPer100Hour: 16.33, crafted: 'No' },
    { name: 'Glass of vodka', percent: '5%', duration: 6, price: 9.8, portions: 1, costPerPortion: 9.80, costPerHour: 1.63, costPer100Hour: 32.67, crafted: 'No' },
    { name: 'Generals Brandy', percent: '5.90%', duration: 6, price: 503.71, portions: 20, costPerPortion: 25.19, costPerHour: 4.20, costPer100Hour: 71.15, crafted: 'No' },
    { name: 'Mead', percent: '5.90%', duration: 8, price: 54.8, portions: 2, costPerPortion: 27.40, costPerHour: 3.43, costPer100Hour: 58.05, crafted: 'No' },
    { name: 'Champagne Novopokrovskoe Prestige', percent: '6%', duration: 12, price: 3985.34, portions: 160, costPerPortion: 24.91, costPerHour: 2.08, costPer100Hour: 34.59, crafted: 'No' },
    { name: "Boyar's Frosty Vodka", percent: '8%', duration: 9, price: 820.51, portions: 20, costPerPortion: 41.03, costPerHour: 4.56, costPer100Hour: 56.98, crafted: 'No' },
    { name: "Marshal's Brandy", percent: '8%', duration: 9, price: 1232.35, portions: 20, costPerPortion: 61.62, costPerHour: 6.85, costPer100Hour: 85.58, crafted: 'No' },
    { name: 'Vodka with pepper (donets)', percent: '8%', duration: 9, price: 119.6, portions: 2, costPerPortion: 59.80, costPerHour: 6.64, costPer100Hour: 83.06, crafted: 'No' },
    { name: 'Vodka TUNGUS', percent: '10%', duration: 9, price: 154.8, portions: 2, costPerPortion: 77.40, costPerHour: 8.60, costPer100Hour: 86.00, crafted: 'No' },
    { name: 'Vodka Golden Imperial', percent: '16%', duration: 12, price: 1577.66, portions: 20, costPerPortion: 78.88, costPerHour: 6.57, costPer100Hour: 41.08, crafted: 'No' },
    { name: 'Ruby Diamond', percent: '19%', duration: 12, price: 298.8, portions: 2, costPerPortion: 149.40, costPerHour: 12.45, costPer100Hour: 65.53, crafted: 'No' },
    { name: 'Kuban Blanche', percent: '19%', duration: 12, price: 298.8, portions: 2, costPerPortion: 149.40, costPerHour: 12.45, costPer100Hour: 65.53, crafted: 'No' }
  ];

  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const sortedData = React.useMemo(() => {
    let sortableData = [...alcoholData];
    if (sortConfig.key) {
      sortableData.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Handle percentage values
        if (sortConfig.key === 'percent') {
          aValue = parseFloat(aValue.replace('%', ''));
          bValue = parseFloat(bValue.replace('%', ''));
        }

        // Handle numeric values
        if (typeof aValue === 'number' || !isNaN(aValue)) {
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
    return sortableData;
  }, [sortConfig]);

  const getSortIcon = (columnName) => {
    if (sortConfig.key === columnName) {
      return sortConfig.direction === 'ascending' ? ' ↑' : ' ↓';
    }
    return '';
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Alcohol Guide
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Complete alcohol reference with percentages, durations, costs, and efficiency ratings for Russian Fishing 4.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto" style={{ minWidth: '1200px' }}>
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th 
                  onClick={() => handleSort('name')}
                  className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  Alcohol{getSortIcon('name')}
                </th>
                <th 
                  onClick={() => handleSort('percent')}
                  className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  Percent Bonus{getSortIcon('percent')}
                </th>
                <th 
                  onClick={() => handleSort('duration')}
                  className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  Duration{getSortIcon('duration')}
                </th>
                <th 
                  onClick={() => handleSort('price')}
                  className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  Price{getSortIcon('price')}
                </th>
                <th 
                  onClick={() => handleSort('portions')}
                  className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  Portions{getSortIcon('portions')}
                </th>
                <th 
                  onClick={() => handleSort('costPerPortion')}
                  className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  Cost Per Portion{getSortIcon('costPerPortion')}
                </th>
                <th 
                  onClick={() => handleSort('costPerHour')}
                  className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  Cost Per Hour{getSortIcon('costPerHour')}
                </th>
                <th 
                  onClick={() => handleSort('costPer100Hour')}
                  className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  Cost Per 100% Hour{getSortIcon('costPer100Hour')}
                </th>
                <th 
                  onClick={() => handleSort('crafted')}
                  className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  Crafted?{getSortIcon('crafted')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {sortedData.map((alcohol, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white">
                    {alcohol.name}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                      {alcohol.percent}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300">
                    {alcohol.duration}h
                  </td>
                  <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300">
                    {alcohol.price.toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300">
                    {alcohol.portions}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300">
                    {alcohol.costPerPortion.toFixed(2)}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300">
                    {alcohol.costPerHour.toFixed(2)}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300">
                    {alcohol.costPer100Hour.toFixed(2)}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      alcohol.crafted === 'Yes' 
                        ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                    }`}>
                      {alcohol.crafted}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-3">
            Best Value
          </h3>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <strong>Mulled Wine</strong> offers the best cost per hour at 0.69, and it's craftable!
          </p>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-3">
            Highest Bonus
          </h3>
          <p className="text-sm text-green-700 dark:text-green-300">
            <strong>Ruby Diamond</strong> and <strong>Kuban Blanche</strong> provide the highest bonus at 19%.
          </p>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-purple-800 dark:text-purple-200 mb-3">
            Longest Duration
          </h3>
          <p className="text-sm text-purple-700 dark:text-purple-300">
            <strong>Champagne Novopokrovskoe Prestige</strong>, <strong>Vodka Golden Imperial</strong>, and others last 12 hours.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AlcoholGuide; 