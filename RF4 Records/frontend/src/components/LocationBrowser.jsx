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
    <div className="p-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-1">
          Explore Fishing Records Across Beautiful Locations
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Select a location to browse fishing records
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {LOCATION_DATA.map((location) => (
          <div
            key={location.waterbody}
            className="relative rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow cursor-pointer group aspect-[4/3]"
          >
            <img
              src={`/images/LocationImages/${location.image}`}
              alt={location.displayName}
              className="w-full h-full object-cover"
              loading="lazy"
            />

            {/* Dark overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/40" />

            {/* Location name at top-left */}
            <div className="absolute top-0 left-0 p-3">
              <h4 className="text-white font-semibold text-base drop-shadow-lg">
                {location.displayName}
              </h4>
            </div>

            {/* Buttons at bottom-left */}
            <div className="absolute bottom-0 left-0 p-3 flex gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); handleBaitsClick(location.waterbody); }}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-md"
              >
                <Target className="w-3 h-3" />
                Baits
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleFishClick(location.waterbody); }}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-md"
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
