import React, { useState } from 'react';
import { Search, DollarSign, MapPin } from 'lucide-react';

const WaterbodyPrices = () => {
  const [searchTerm, setSearchTerm] = useState('');

  // Waterbody price data from the screenshot
  const waterbodyData = [
    { location: "Mosquito Lake", travel: "Free", fishSell: "100%", tackle: "100%", hardware: "100%", grocery: "112.50%" },
    { location: "Elk Lake", travel: "Free", fishSell: "100%", tackle: "100%", hardware: "100%", grocery: "112.50%" },
    { location: "Winding Rivulet", travel: "Free", fishSell: "100%", tackle: "100%", hardware: "100%", grocery: "112.50%" },
    { location: "Old Burg", travel: "7.90", fishSell: "110%", tackle: "105%", hardware: "100%", grocery: "100%" },
    { location: "Belaya", travel: "8.90", fishSell: "110%", tackle: "110%", hardware: "100%", grocery: "125%" },
    { location: "Kouri Lake", travel: "25.90", fishSell: "110%", tackle: "115%", hardware: "150%", grocery: "162.50%" },
    { location: "Bear Lake", travel: "13.90", fishSell: "115%", tackle: "None", hardware: "None", grocery: "162.50%" },
    { location: "Volkhov River", travel: "14.90", fishSell: "115%", tackle: "100%", hardware: "100%", grocery: "125%" },
    { location: "Seversky Donets River", travel: "15.90", fishSell: "116%", tackle: "100%", hardware: "100%", grocery: "125%" },
    { location: "Sura River", travel: "16.90", fishSell: "117%", tackle: "100%", hardware: "100%", grocery: "125%" },
    { location: "Ladoga Lake", travel: "29.80", fishSell: "120%", tackle: "110%", hardware: "110%", grocery: "156.25%" },
    { location: "The Amber Lake", travel: "31.60", fishSell: "120%", tackle: "103%", hardware: "105%", grocery: "150%" },
    { location: "Ladoga Archipelago", travel: "33.80", fishSell: "120%", tackle: "113%", hardware: "None", grocery: "187.50%" },
    { location: "Akhtuba River", travel: "34.80", fishSell: "120%", tackle: "100%", hardware: "100%", grocery: "162.50%" },
    { location: "Copper Lake", travel: "44.90", fishSell: "?", tackle: "104%", hardware: "None", grocery: "None" },
    { location: "Lower Tunguska River", travel: "48.80", fishSell: "120%", tackle: "100%", hardware: "100%", grocery: "162.50%" },
    { location: "Yama River", travel: "98.80", fishSell: "120%", tackle: "100%", hardware: "100%", grocery: "162.50%" },
    { location: "Norwegian Sea", travel: "98.80", fishSell: "120%", tackle: "100%", hardware: "116%", grocery: "250%" }
  ];

  // Filter data based on search term
  const filteredData = waterbodyData.filter(item =>
    item.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Format travel cost
  const formatTravel = (travel) => {
    if (travel === "Free") return <span className="text-green-600 dark:text-green-400 font-medium">Free</span>;
    return <span className="text-gray-900 dark:text-white">{travel}</span>;
  };

  // Format percentage with color coding
  const formatPercentage = (percentage) => {
    if (percentage === "None") {
      return <span className="text-gray-400 dark:text-gray-500">None</span>;
    }
    if (percentage === "?") {
      return <span className="text-gray-400 dark:text-gray-500">?</span>;
    }
    
    const value = parseFloat(percentage.replace('%', ''));
    let colorClass = 'text-gray-900 dark:text-white';
    
    if (value > 120) {
      colorClass = 'text-red-600 dark:text-red-400 font-medium'; // Expensive
    } else if (value > 110) {
      colorClass = 'text-yellow-600 dark:text-yellow-400 font-medium'; // Moderate
    } else if (value === 100) {
      colorClass = 'text-green-600 dark:text-green-400 font-medium'; // Base price
    } else if (value < 100) {
      colorClass = 'text-blue-600 dark:text-blue-400 font-medium'; // Cheaper
    }
    
    return <span className={colorClass}>{percentage}</span>;
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center">
          <DollarSign className="w-8 h-8 mr-3 text-green-500" />
          Waterbody Prices
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Travel costs and price modifiers for different fishing locations
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search waterbodies..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Showing {filteredData.length} of {waterbodyData.length} waterbodies
        </p>
      </div>

      {/* Price Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-2" />
                    Location
                  </div>
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Travel Cost
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Fish Sell Value
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Tackle
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Hardware
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Grocery
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredData.map((item, index) => (
                <tr key={item.location} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-2.5 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {item.location}
                  </td>
                  <td className="px-6 py-2.5 whitespace-nowrap text-sm text-center">
                    {formatTravel(item.travel)}
                  </td>
                  <td className="px-6 py-2.5 whitespace-nowrap text-sm text-center">
                    {formatPercentage(item.fishSell)}
                  </td>
                  <td className="px-6 py-2.5 whitespace-nowrap text-sm text-center">
                    {formatPercentage(item.tackle)}
                  </td>
                  <td className="px-6 py-2.5 whitespace-nowrap text-sm text-center">
                    {formatPercentage(item.hardware)}
                  </td>
                  <td className="px-6 py-2.5 whitespace-nowrap text-sm text-center">
                    {formatPercentage(item.grocery)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredData.length === 0 && (
        <div className="text-center py-12">
          <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No waterbodies found matching your criteria</p>
        </div>
      )}
    </div>
  );
};

export default WaterbodyPrices;