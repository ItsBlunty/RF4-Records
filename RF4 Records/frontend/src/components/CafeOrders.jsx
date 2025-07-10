import React, { useState, useEffect } from 'react';
import { Coffee, Filter, MapPin, Fish } from 'lucide-react';

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
          orders: []
        };
      }
      
      const fishGroup = grouped[order.location][order.fish_name];
      fishGroup.orders.push(order);
    });
    
    // Convert nested object to array format for easier rendering
    const result = {};
    Object.keys(grouped).forEach(location => {
      result[location] = Object.values(grouped[location]);
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
            <div className="text-center py-12 text-gray-500">
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
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Fish Type
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Order Variants
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {locationOrders.map((fishGroup, index) => (
                          <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-4 py-3 align-top">
                              <div className="flex items-center">
                                <Fish className="w-5 h-5 text-blue-500 dark:text-blue-400 mr-2" />
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {fishGroup.fish_name}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="space-y-2">
                                {fishGroup.orders.map((order, orderIndex) => (
                                  <div key={orderIndex} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                                        {order.quantity} × {order.mass}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="text-gray-500 dark:text-gray-400">💰</span>
                                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                                        {order.price_range || `${order.min_price?.toFixed(2)} - ${order.max_price?.toFixed(2)}`}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Statistics Summary */}
          {orders.length > 0 && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Coffee className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="font-medium text-blue-900 dark:text-blue-100">Total Orders</h3>
                </div>
                <p className="text-xl font-bold text-blue-900 dark:text-blue-100">{orders.length}</p>
              </div>
              
              <div className="bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <h3 className="font-medium text-green-900 dark:text-green-100">Locations</h3>
                </div>
                <p className="text-xl font-bold text-green-900 dark:text-green-100">{locations.length}</p>
              </div>
              
              <div className="bg-purple-50 dark:bg-purple-900 border border-purple-200 dark:border-purple-700 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Fish className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <h3 className="font-medium text-purple-900 dark:text-purple-100">Fish Types</h3>
                </div>
                <p className="text-xl font-bold text-purple-900 dark:text-purple-100">
                  {new Set(orders.map(o => o.fish_name)).size}
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CafeOrders;