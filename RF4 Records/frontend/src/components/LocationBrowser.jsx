import React from 'react';
import { Fish, Target } from 'lucide-react';

// Map image filenames to database waterbody names
// Order matches the maps page, with Prison Pond at the end (no map)
const LOCATION_DATA = [
  { image: 'Mosquito Lake.png', waterbody: 'Mosquito Lake', displayName: 'Mosquito Lake' },
  { image: 'Elk Lake.png', waterbody: 'Elk Lake', displayName: 'Elk Lake' },
  { image: 'Winding Rivulet.png', waterbody: 'Winding Rivulet', displayName: 'Winding Rivulet' },
  { image: 'Old Burg Lake.png', waterbody: 'Old Burg Lake', displayName: 'Old Burg Lake' },
  { image: 'Belaya River.png', waterbody: 'Belaya River', displayName: 'Belaya River' },
  { image: 'Kuori Lake.png', waterbody: 'Kuori Lake', displayName: 'Kuori Lake' },
  { image: 'Bear Lake.png', waterbody: 'Bear Lake', displayName: 'Bear Lake' },
  { image: 'Volkhov Lake.png', waterbody: 'Volkhov River', displayName: 'Volkhov River' },
  { image: 'Seversky Donets River.png', waterbody: 'Seversky Donets River', displayName: 'Seversky Donets River' },
  { image: 'Sura River.png', waterbody: 'Sura River', displayName: 'Sura River' },
  { image: 'Ladoga Lake.png', waterbody: 'Ladoga Lake', displayName: 'Ladoga Lake' },
  { image: 'Amber Lake.png', waterbody: 'The Amber Lake', displayName: 'Amber Lake' },
  { image: 'Ladoga Archipelago.png', waterbody: 'Ladoga archipelago', displayName: 'Ladoga Archipelago' },
  { image: 'Akhtuba River.png', waterbody: 'Akhtuba River', displayName: 'Akhtuba River' },
  { image: 'Copper Lake.png', waterbody: 'Copper lake', displayName: 'Copper Lake' },
  { image: 'Lower Tunguska River.png', waterbody: 'Lower Tunguska River', displayName: 'Lower Tunguska River' },
  { image: 'Yama River.png', waterbody: 'Yama River', displayName: 'Yama River' },
  { image: 'Norwegian Sea.png', waterbody: 'Norwegian Sea', displayName: 'Norwegian Sea' },
  { image: 'Prison Pond.png', waterbody: 'Penalty pond', displayName: 'Penalty Pond' },
];

const LocationBrowser = ({ onLocationSelect }) => {
  const handleBaitsClick = (waterbody) => {
    onLocationSelect(waterbody, 'grouped');
  };

  const handleFishClick = (waterbody) => {
    onLocationSelect(waterbody, 'fish-grouped');
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
          Browse by Location
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Click a button to view records grouped by baits or fish for each location
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {LOCATION_DATA.map((location) => (
          <div
            key={location.waterbody}
            className="bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
          >
            <div className="relative">
              <img
                src={`/images/LocationImages/${location.image}`}
                alt={location.displayName}
                className="w-full h-32 object-cover"
                loading="lazy"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                <h4 className="text-white font-medium text-sm truncate">
                  {location.displayName}
                </h4>
              </div>
            </div>

            <div className="p-2 flex gap-2">
              <button
                onClick={() => handleBaitsClick(location.waterbody)}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors"
              >
                <Target className="w-3 h-3" />
                Baits
              </button>
              <button
                onClick={() => handleFishClick(location.waterbody)}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium rounded-md bg-green-600 hover:bg-green-700 text-white transition-colors"
              >
                <Fish className="w-3 h-3" />
                Fish
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LocationBrowser;
