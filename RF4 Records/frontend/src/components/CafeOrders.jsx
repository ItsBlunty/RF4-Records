import React, { useState, useEffect } from 'react';
import { Coffee, Filter, MapPin } from 'lucide-react';

const CafeOrders = () => {
  const [orders, setOrders] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCafeOrders();
  }, [selectedLocation]);

  const fetchCafeOrders = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = selectedLocation ? `?location=${encodeURIComponent(selectedLocation)}` : '';
      const response = await fetch(`/api/cafe-orders${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch cafe orders');
      }

      const data = await response.json();
      setOrders(data.orders);
      setLocations(data.locations);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  const groupOrdersByLocationAndFish = () => {
    const grouped = {};
    orders.forEach(order => {
      if (!grouped[order.location]) {
        grouped[order.location] = {};
      }
      if (!grouped[order.location][order.fish_name]) {
        grouped[order.location][order.fish_name] = {
          fish_name: order.fish_name,
          location: order.location,
          orderVariants: {}
        };
      }
      
      const fishGroup = grouped[order.location][order.fish_name];
      const orderKey = `${order.quantity} × ${order.mass}`;
      
      if (!fishGroup.orderVariants[orderKey]) {
        fishGroup.orderVariants[orderKey] = {
          quantity: order.quantity,
          mass: order.mass,
          prices: []
        };
      }
      
      // Add this price to the variant
      const price = parseFloat(order.price_range?.split(' - ')[0] || order.min_price || order.price || 0);
      fishGroup.orderVariants[orderKey].prices.push(price);
    });
    
    // Convert nested object to array format and calculate average silver for sorting
    const result = {};
    Object.keys(grouped).forEach(location => {
      result[location] = Object.values(grouped[location]).map(fishGroup => {
        // Convert orderVariants object to array and calculate price ranges
        fishGroup.orderVariants = Object.values(fishGroup.orderVariants).map(variant => {
          const prices = variant.prices;
          const minPrice = Math.min(...prices);
          const maxPrice = Math.max(...prices);
          
          return {
            ...variant,
            priceRange: prices.length > 1 && minPrice !== maxPrice 
              ? `${minPrice.toFixed(2)} - ${maxPrice.toFixed(2)}`
              : minPrice.toFixed(2),
            averagePrice: prices.reduce((sum, p) => sum + p, 0) / prices.length
          };
        });
        
        // Calculate average silver for sorting (across all variants)
        const allPrices = fishGroup.orderVariants.flatMap(v => v.prices);
        fishGroup.averageSilver = allPrices.length > 0 
          ? allPrices.reduce((sum, p) => sum + p, 0) / allPrices.length 
          : 0;
        
        return fishGroup;
      }).sort((a, b) => b.averageSilver - a.averageSilver); // Sort by average silver descending
    });
    
    return result;
  };

  const groupedOrders = groupOrdersByLocationAndFish();

  return (
    <div className="max-w-7xl mx-auto p-4 bg-white dark:bg-gray-800">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
          <Coffee className="text-yellow-600 dark:text-yellow-400" />
          Cafe Orders Price Guide
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          View silver price ranges for cafe orders across different locations
        </p>
      </div>

      {/* Location Filter */}
      <div className="mb-4 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          <label htmlFor="location-filter" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Filter by Location:
          </label>
        </div>
        <select
          id="location-filter"
          value={selectedLocation}
          onChange={(e) => setSelectedLocation(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="">All Locations</option>
          {locations.map(location => (
            <option key={location} value={location}>{location}</option>
          ))}
        </select>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">Error: {error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Orders Display */}
          {Object.keys(groupedOrders).length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Coffee className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>No cafe orders found. Upload an image to add orders!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedOrders).map(([location, locationOrders]) => (
                <div key={location} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      {location}
                    </h2>
                  </div>
                  
                  {/* Five-column layout for fish */}
                  <div className="p-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {locationOrders.map((fishGroup, index) => (
                      <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 flex flex-col">
                        {/* Fish name header - centered at top */}
                        <div className="text-center mb-3">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            {fishGroup.fish_name}
                          </span>
                        </div>
                        
                        {/* Order variants - two mini columns */}
                        <div className="space-y-2">
                          {fishGroup.orderVariants.map((variant, variantIndex) => (
                            <div key={variantIndex} className="flex items-center justify-between text-xs">
                              {/* Left mini-column: order details */}
                              <div className="flex-1 text-center">
                                <span className="text-gray-700 dark:text-gray-300 font-medium">
                                  {variant.quantity} × {variant.mass}
                                </span>
                              </div>
                              
                              {/* Right mini-column: silver price/range */}
                              <div className="flex-1 text-center">
                                <span className="text-gray-600 dark:text-gray-400 font-medium">
                                  {variant.priceRange}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

        </>
      )}
    </div>
  );
};

export default CafeOrders;