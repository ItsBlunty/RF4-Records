import React, { useState, useEffect } from 'react';
import { Coffee, Filter, MapPin } from 'lucide-react';

const CafeOrders = () => {
  const [orders, setOrders] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Location ordering to match maps page
  const locationOrder = [
    'Mosquito Lake',
    'Elk Lake',
    'Winding Rivulet',
    'Old Burg Lake',
    'Belaya River',
    'Kuori Lake',
    'Bear Lake',
    'Volkhov River',
    'Seversky Donets River',
    'Sura River',
    'Ladoga Lake',
    'The Amber Lake',
    'Ladoga archipelago',
    'Akhtuba River',
    'Copper Lake', // Normalized form - will include both "Copper lake" and "Copper Lake"
    'Lower Tunguska River',
    'Yana River',
    'Norwegian Sea'
  ];

  // Function to sort locations according to maps page order
  const sortLocationsByMapOrder = (locations) => {
    // First normalize and deduplicate locations
    const normalizedLocations = [...new Set(locations.map(normalizeLocationName))];
    
    return normalizedLocations.sort((a, b) => {
      const indexA = locationOrder.indexOf(a);
      const indexB = locationOrder.indexOf(b);
      
      // If both locations are in the order array, sort by their index
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      
      // If only one is in the array, prioritize it
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      
      // If neither is in the array, sort alphabetically
      return a.localeCompare(b);
    });
  };

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
      setLocations(sortLocationsByMapOrder(data.locations));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  // Helper function to normalize location names for grouping
  const normalizeLocationName = (locationName) => {
    // Normalize "Copper Lake" and "Copper lake" to same group
    if (locationName.toLowerCase() === 'copper lake') {
      return 'Copper Lake';
    }
    return locationName;
  };

  // Helper function to parse weight strings and convert to grams
  const parseWeightToGrams = (weightStr) => {
    if (!weightStr) return 0;
    const numMatch = weightStr.match(/([0-9.]+)/);
    if (!numMatch) return 0;
    
    const num = parseFloat(numMatch[1]);
    if (weightStr.toLowerCase().includes('kg')) {
      return num * 1000; // Convert kg to grams
    }
    return num; // Already in grams
  };

  const groupOrdersByLocationAndFish = () => {
    const grouped = {};
    orders.forEach(order => {
      const normalizedLocation = normalizeLocationName(order.location);
      if (!grouped[normalizedLocation]) {
        grouped[normalizedLocation] = {};
      }
      if (!grouped[normalizedLocation][order.fish_name]) {
        grouped[normalizedLocation][order.fish_name] = {
          fish_name: order.fish_name,
          location: normalizedLocation,
          orderVariants: {}
        };
      }
      
      const fishGroup = grouped[normalizedLocation][order.fish_name];
      const orderKey = `${order.quantity} × ${order.mass}`;
      
      if (!fishGroup.orderVariants[orderKey]) {
        fishGroup.orderVariants[orderKey] = {
          quantity: order.quantity,
          mass: order.mass
        };
      }
      
      // Store the complete price info from the API
      if (!fishGroup.orderVariants[orderKey].priceInfo) {
        fishGroup.orderVariants[orderKey].priceInfo = {
          price_range: order.price_range,
          min_price: order.min_price,
          max_price: order.max_price,
          sample_count: order.sample_count
        };
        // Add weight in grams for sorting
        fishGroup.orderVariants[orderKey].weightInGrams = parseWeightToGrams(order.mass);
      }
    });
    
    // Convert nested object to array format and calculate average silver for sorting
    const result = {};
    Object.keys(grouped).forEach(location => {
      result[location] = Object.values(grouped[location]).map(fishGroup => {
        // Convert orderVariants object to array and use API-provided price ranges
        fishGroup.orderVariants = Object.values(fishGroup.orderVariants).map(variant => {
          const priceInfo = variant.priceInfo;
          
          return {
            ...variant,
            priceRange: priceInfo?.price_range || priceInfo?.min_price?.toFixed(2) || '0.00',
            averagePrice: priceInfo ? (priceInfo.min_price + priceInfo.max_price) / 2 : 0,
            sampleCount: priceInfo?.sample_count || 1,
            weightInGrams: variant.weightInGrams || 0
          };
        }).sort((a, b) => a.weightInGrams - b.weightInGrams); // Sort variants by weight (lowest to highest)
        
        // Calculate average weight for sorting (across all variants)
        const weights = fishGroup.orderVariants.map(v => v.weightInGrams).filter(w => w > 0);
        fishGroup.averageWeight = weights.length > 0 
          ? weights.reduce((sum, w) => sum + w, 0) / weights.length 
          : 0;
        
        return fishGroup;
      }).sort((a, b) => a.averageWeight - b.averageWeight); // Sort by average weight ascending (lowest to highest)
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
              {Object.entries(groupedOrders)
                .sort(([locationA], [locationB]) => {
                  const indexA = locationOrder.indexOf(locationA);
                  const indexB = locationOrder.indexOf(locationB);
                  
                  if (indexA !== -1 && indexB !== -1) {
                    return indexA - indexB;
                  }
                  if (indexA !== -1) return -1;
                  if (indexB !== -1) return 1;
                  return locationA.localeCompare(locationB);
                })
                .map(([location, locationOrders]) => (
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