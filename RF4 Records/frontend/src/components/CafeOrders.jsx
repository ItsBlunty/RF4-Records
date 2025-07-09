import React, { useState, useEffect } from 'react';
import { Coffee, Filter, MapPin, Fish, TrendingUp, TrendingDown, Minus } from 'lucide-react';

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

  const getPriceRangeIcon = (minPrice, maxPrice) => {
    const diff = maxPrice - minPrice;
    const percent = (diff / minPrice) * 100;
    
    if (percent > 20) {
      return <TrendingUp className="w-4 h-4 text-red-500" />;
    } else if (percent > 10) {
      return <TrendingUp className="w-4 h-4 text-orange-500" />;
    } else if (percent > 5) {
      return <TrendingUp className="w-4 h-4 text-yellow-500" />;
    } else {
      return <Minus className="w-4 h-4 text-green-500" />;
    }
  };

  const groupOrdersByLocation = () => {
    const grouped = {};
    orders.forEach(order => {
      if (!grouped[order.location]) {
        grouped[order.location] = [];
      }
      grouped[order.location].push(order);
    });
    return grouped;
  };

  const groupedOrders = groupOrdersByLocation();

  return (
    <div className="max-w-7xl mx-auto p-6 bg-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Coffee className="text-yellow-600" />
          Cafe Orders Price Guide
        </h1>
        <p className="text-gray-600">
          View silver price ranges for cafe orders across different locations
        </p>
      </div>

      {/* Location Filter */}
      <div className="mb-6 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-500" />
          <label htmlFor="location-filter" className="text-sm font-medium text-gray-700">
            Filter by Location:
          </label>
        </div>
        <select
          id="location-filter"
          value={selectedLocation}
          onChange={(e) => setSelectedLocation(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
            <div className="space-y-8">
              {Object.entries(groupedOrders).map(([location, locationOrders]) => (
                <div key={location} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-blue-600" />
                      {location}
                    </h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Fish Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Quantity
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Mass
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Silver Range
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Trend
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Samples
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {locationOrders.map((order, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <Fish className="w-5 h-5 text-blue-500 mr-2" />
                                <span className="text-sm font-medium text-gray-900">
                                  {order.fish_name}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-900">{order.quantity} pcs</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-900">{order.mass}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-1">
                                <span className="text-gray-500">💰</span>
                                <span className="text-sm font-medium text-gray-900">
                                  {order.price_range}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getPriceRangeIcon(order.min_price, order.max_price)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-500">{order.sample_count}</span>
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
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Coffee className="w-5 h-5 text-blue-600" />
                  <h3 className="font-medium text-blue-900">Total Orders</h3>
                </div>
                <p className="text-2xl font-bold text-blue-900">{orders.length}</p>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-5 h-5 text-green-600" />
                  <h3 className="font-medium text-green-900">Locations</h3>
                </div>
                <p className="text-2xl font-bold text-green-900">{locations.length}</p>
              </div>
              
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Fish className="w-5 h-5 text-purple-600" />
                  <h3 className="font-medium text-purple-900">Fish Types</h3>
                </div>
                <p className="text-2xl font-bold text-purple-900">
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