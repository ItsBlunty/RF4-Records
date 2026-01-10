import React from 'react';
import { Fish, Target } from 'lucide-react';

// Map image filenames to database waterbody names
// Order matches the maps page, with Prison Pond at the end (no map)
const LOCATION_DATA = [
  { image: 'Mosquito Lake.jpg', waterbody: 'Mosquito Lake', displayName: 'Mosquito Lake' },
  { image: 'Elk Lake.jpg', waterbody: 'Elk Lake', displayName: 'Elk Lake' },
  { image: 'Winding Rivulet.jpg', waterbody: 'Winding Rivulet', displayName: 'Winding Rivulet' },
  { image: 'Old Burg Lake.jpg', waterbody: 'Old Burg Lake', displayName: 'Old Burg Lake' },
  { image: 'Belaya River.jpg', waterbody: 'Belaya River', displayName: 'Belaya River' },
  { image: 'Kuori Lake.jpg', waterbody: 'Kuori Lake', displayName: 'Kuori Lake' },
  { image: 'Bear Lake.jpg', waterbody: 'Bear Lake', displayName: 'Bear Lake' },
  { image: 'Volkhov Lake.jpg', waterbody: 'Volkhov River', displayName: 'Volkhov River' },
  { image: 'Seversky Donets River.jpg', waterbody: 'Seversky Donets River', displayName: 'Seversky Donets River' },
  { image: 'Sura River.jpg', waterbody: 'Sura River', displayName: 'Sura River' },
  { image: 'Ladoga Lake.jpg', waterbody: 'Ladoga Lake', displayName: 'Ladoga Lake' },
  { image: 'Amber Lake.jpg', waterbody: 'The Amber Lake', displayName: 'Amber Lake' },
  { image: 'Ladoga Archipelago.jpg', waterbody: 'Ladoga archipelago', displayName: 'Ladoga Archipelago' },
  { image: 'Akhtuba River.jpg', waterbody: 'Akhtuba River', displayName: 'Akhtuba River' },
  { image: 'Copper Lake.jpg', waterbody: 'Copper lake', displayName: 'Copper Lake' },
  { image: 'Lower Tunguska River.jpg', waterbody: 'Lower Tunguska River', displayName: 'Lower Tunguska River' },
  { image: 'Yama River.jpg', waterbody: 'Yama River', displayName: 'Yama River' },
  { image: 'Norwegian Sea.jpg', waterbody: 'Norwegian Sea', displayName: 'Norwegian Sea' },
  { image: 'Prison Pond.jpg', waterbody: 'Penalty pond', displayName: 'Penalty Pond' },
];

const LocationBrowser = ({ onLocationSelect }) => {
  const handleBaitsClick = (waterbody) => {
    onLocationSelect(waterbody, 'grouped');
  };

  const handleFishClick = (waterbody) => {
    onLocationSelect(waterbody, 'fish-grouped');
  };

  return (
    <div className="p-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {LOCATION_DATA.map((location) => (
          <div
            key={location.waterbody}
            className="relative rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow cursor-pointer group aspect-[4/3]"
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
            <div className="absolute top-0 left-0 p-2">
              <h4 className="text-white font-semibold text-sm drop-shadow-lg">
                {location.displayName}
              </h4>
            </div>

            {/* Buttons at bottom-left */}
            <div className="absolute bottom-0 left-0 p-2 flex gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); handleBaitsClick(location.waterbody); }}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-full bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-md"
              >
                <Target className="w-4 h-4" />
                Baits
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleFishClick(location.waterbody); }}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-full bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-md"
              >
                <Fish className="w-4 h-4" />
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
