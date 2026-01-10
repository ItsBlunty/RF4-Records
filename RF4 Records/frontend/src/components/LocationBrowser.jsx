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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
      <div className="text-center mb-4">
        <h3 className="text-base font-medium text-gray-600 dark:text-gray-400">
          Select a location to browse records
        </h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {LOCATION_DATA.map((location) => (
          <div
            key={location.waterbody}
            className="group relative rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
          >
            <img
              src={`/images/LocationImages/${location.image}`}
              alt={location.displayName}
              className="w-full h-28 object-cover"
              loading="lazy"
            />

            {/* Overlay with name and buttons */}
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/40 to-transparent flex flex-col justify-end p-2">
              <h4 className="text-white font-medium text-xs mb-1.5 truncate">
                {location.displayName}
              </h4>

              <div className="flex gap-1.5">
                <button
                  onClick={() => handleBaitsClick(location.waterbody)}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs font-medium rounded bg-blue-600/90 hover:bg-blue-500 text-white transition-colors"
                >
                  <Target className="w-3 h-3" />
                  Baits
                </button>
                <button
                  onClick={() => handleFishClick(location.waterbody)}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs font-medium rounded bg-white/90 hover:bg-white text-gray-700 transition-colors"
                >
                  <Fish className="w-3 h-3" />
                  Fish
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LocationBrowser;
