import React, { useState, useMemo } from 'react';
import { Search, Trophy, Star } from 'lucide-react';

const TrophyWeights = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [rarityFilter, setRarityFilter] = useState('All');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });

  // Fish data from the CSV
  const fishData = [
    { name: "Albino Barbel", trophy: 8000, superTrophy: 12000, rarity: "Rarest species", cardValue: 1400, stars: 5 },
    { name: "Albino Catfish", trophy: 100000, superTrophy: 200000, rarity: "Not Rare", cardValue: null, stars: 5 },
    { name: "Albino Grass Carp", trophy: 28000, superTrophy: 40000, rarity: "Rarest species", cardValue: 1400, stars: 5 },
    { name: "Alfonsino", trophy: 9000, superTrophy: 12000, rarity: "Rare", cardValue: 450, stars: 4 },
    { name: "American plaice", trophy: 4000, superTrophy: 5000, rarity: "Not Rare", cardValue: 170, stars: 3 },
    { name: "Amur Catfish", trophy: 5000, superTrophy: 7000, rarity: "Not Rare", cardValue: 120, stars: 2 },
    { name: "Arctic Char", trophy: 11000, superTrophy: 16000, rarity: "Not Rare", cardValue: 140, stars: 2 },
    { name: "Arctic Grayling", trophy: 2000, superTrophy: 2500, rarity: "Not Rare", cardValue: 120, stars: 2 },
    { name: "Arctic Omul", trophy: 3000, superTrophy: 4000, rarity: "Not Rare", cardValue: 120, stars: 2 },
    { name: "Arctic skate", trophy: 8000, superTrophy: 10000, rarity: "Rare", cardValue: 280, stars: 4 },
    { name: "Asian Smelt", trophy: 270, superTrophy: 320, rarity: "Not Rare", cardValue: 50, stars: 1 },
    { name: "Asp", trophy: 8000, superTrophy: 13000, rarity: "Not Rare", cardValue: 140, stars: 2 },
    { name: "Atlantic bluefin tuna", trophy: 250000, superTrophy: 400000, rarity: "Rarest species", cardValue: 1250, stars: 5 },
    { name: "Atlantic cod", trophy: 50000, superTrophy: 65000, rarity: "Not Rare", cardValue: 240, stars: 3 },
    { name: "Atlantic footballfish", trophy: 7000, superTrophy: 10000, rarity: "Rarest species", cardValue: null, stars: 5 },
    { name: "Atlantic halibut", trophy: 150000, superTrophy: 220000, rarity: "Not Rare", cardValue: 500, stars: 4 },
    { name: "Atlantic herring", trophy: 800, superTrophy: 1000, rarity: "Not Rare", cardValue: 120, stars: 2 },
    { name: "Atlantic mackerel", trophy: 2000, superTrophy: 2800, rarity: "Not Rare", cardValue: 100, stars: 1 },
    { name: "Atlantic redfish", trophy: 9000, superTrophy: 11000, rarity: "Not Rare", cardValue: 280, stars: 4 },
    { name: "Atlantic Salmon", trophy: 30000, superTrophy: 40000, rarity: "Not Rare", cardValue: 300, stars: 3 },
    { name: "Atlantic saury", trophy: 600, superTrophy: 750, rarity: "Not Rare", cardValue: 80, stars: 2 },
    { name: "Atlantic wolffish", trophy: 14500, superTrophy: 19000, rarity: "Not Rare", cardValue: 240, stars: 3 },
    { name: "Atlantic wreckfish", trophy: 60000, superTrophy: 75000, rarity: "Rare", cardValue: 800, stars: 4 },
    { name: "Baikal Omul", trophy: 6000, superTrophy: 7000, rarity: "Not Rare", cardValue: 120, stars: 2 },
    { name: "Baltic Sturgeon", trophy: 200000, superTrophy: 300000, rarity: "Rare", cardValue: 300, stars: 4 },
    { name: "Basking shark", trophy: 1300000, superTrophy: 2500000, rarity: "Rarest species", cardValue: 1250, stars: 5 },
    { name: "Bastard Sturgeon", trophy: 50000, superTrophy: 70000, rarity: "Rare", cardValue: 350, stars: 4 },
    { name: "Beaked redfish", trophy: 5500, superTrophy: 7000, rarity: "Not Rare", cardValue: 170, stars: 3 },
    { name: "Beloribitsa Whitefish", trophy: 15000, superTrophy: 25000, rarity: "Not Rare", cardValue: 400, stars: 4 },
    { name: "Beluga", trophy: 500000, superTrophy: 1000000, rarity: "Not Rare", cardValue: 1450, stars: 5 },
    { name: "Bighead Carp", trophy: 30000, superTrophy: 45000, rarity: "Not Rare", cardValue: 190, stars: 3 },
    { name: "Black Buffalo", trophy: 15000, superTrophy: 20000, rarity: "Not Rare", cardValue: 400, stars: 4 },
    { name: "Black Carp", trophy: 28000, superTrophy: 40000, rarity: "Rare", cardValue: 240, stars: 3 },
    { name: "Black ruff", trophy: 24000, superTrophy: 29000, rarity: "Rare", cardValue: 500, stars: 4 },
    { name: "Black scabbardfish", trophy: null, superTrophy: null, rarity: "Rarest species", cardValue: 900, stars: 4 },
    { name: "Black Sea Beluga", trophy: 500000, superTrophy: 1000000, rarity: "Rarest species", cardValue: 1450, stars: 5 },
    { name: "Black Sea Kutum", trophy: 5500, superTrophy: 7500, rarity: "Rare", cardValue: 400, stars: 4 },
    { name: "Black Sea Shemaya", trophy: 500, superTrophy: 700, rarity: "Not Rare", cardValue: 150, stars: 2 },
    { name: "Black whitefish", trophy: 3500, superTrophy: 5000, rarity: "Not Rare", cardValue: 120, stars: 2 },
    { name: "Black-spined Herring", trophy: 250, superTrophy: 340, rarity: "Not Rare", cardValue: 120, stars: 2 },
    { name: "Bleak", trophy: 110, superTrophy: 160, rarity: "Not Rare", cardValue: 50, stars: 1 },
    { name: "Blue Bream", trophy: 750, superTrophy: 1100, rarity: "Not Rare", cardValue: 120, stars: 2 },
    { name: "Blue ling", trophy: 25000, superTrophy: 35000, rarity: "Not Rare", cardValue: 280, stars: 4 },
    { name: "Blue whiting", trophy: 900, superTrophy: 1200, rarity: "Not Rare", cardValue: 50, stars: 1 },
    { name: "Blunt-snouted lenok", trophy: 7500, superTrophy: 9000, rarity: "Not Rare", cardValue: 250, stars: 4 },
    { name: "Brazhnikov Herring", trophy: 700, superTrophy: 1000, rarity: "Not Rare", cardValue: 190, stars: 3 },
    { name: "Bream", trophy: 4400, superTrophy: 7000, rarity: "Not Rare", cardValue: 50, stars: 1 },
    { name: "Broad Whitefish", trophy: 7000, superTrophy: 10000, rarity: "Not Rare", cardValue: 100, stars: 1 },
    { name: "Brown Trout", trophy: 3000, superTrophy: 5000, rarity: "Not Rare", cardValue: 120, stars: 2 },
    { name: "Buffalo", trophy: 15000, superTrophy: 20000, rarity: "Not Rare", cardValue: 140, stars: 2 },
    { name: "Burbot", trophy: 9000, superTrophy: 14000, rarity: "Not Rare", cardValue: 120, stars: 2 },
    { name: "C2 SuperFreak", trophy: 30000, superTrophy: 40000, rarity: "Rare", cardValue: 300, stars: 3 },
    { name: "Caspian Brown Trout", trophy: 30000, superTrophy: 50000, rarity: "Rare", cardValue: 450, stars: 4 },
    { name: "Caspian Kutum", trophy: 5000, superTrophy: 7000, rarity: "Not Rare", cardValue: 350, stars: 4 },
    { name: "Caspian Lamprey", trophy: 150, superTrophy: 200, rarity: "Rarest species", cardValue: null, stars: 5 },
    { name: "Caspian Roach", trophy: 500, superTrophy: 800, rarity: "Not Rare", cardValue: 140, stars: 2 },
    { name: "Catfish", trophy: 100000, superTrophy: 200000, rarity: "Not Rare", cardValue: 300, stars: 3 },
    { name: "Char", trophy: 5000, superTrophy: 7600, rarity: "Not Rare", cardValue: 210, stars: 3 },
    { name: "Chinese Sleeper", trophy: 400, superTrophy: 700, rarity: "Not Rare", cardValue: 80, stars: 1 },
    { name: "Chinook Salmon", trophy: 40000, superTrophy: 60000, rarity: "Rare", cardValue: 350, stars: 4 },
    { name: "Chub", trophy: 4000, superTrophy: 7000, rarity: "Not Rare", cardValue: 75, stars: 1 },
    { name: "Chum Salmon", trophy: 8000, superTrophy: 10000, rarity: "Not Rare", cardValue: 100, stars: 2 },
    { name: "Clupeonella", trophy: 24, superTrophy: 28, rarity: "Not Rare", cardValue: 50, stars: 1 },
    { name: "Coho Salmon", trophy: 5500, superTrophy: 7000, rarity: "Not Rare", cardValue: 130, stars: 2 },
    { name: "Common Barbel", trophy: 8000, superTrophy: 12000, rarity: "Not Rare", cardValue: 150, stars: 2 },
    { name: "Common Carp", trophy: 20000, superTrophy: 30000, rarity: "Not Rare", cardValue: 100, stars: 2 },
    { name: "Common Ghost Carp", trophy: 20000, superTrophy: 30000, rarity: "Rare", cardValue: 350, stars: 4 },
    { name: "Common ling", trophy: 30000, superTrophy: 40000, rarity: "Rare", cardValue: 310, stars: 4 },
    { name: "Common Minnow", trophy: 100, superTrophy: 160, rarity: "Not Rare", cardValue: 50, stars: 1 },
    { name: "Common Roach", trophy: 1200, superTrophy: 2000, rarity: "Not Rare", cardValue: 50, stars: 1 },
    { name: "Common Scaly Albino Carp", trophy: 20000, superTrophy: 30000, rarity: "Rarest species", cardValue: 1300, stars: 5 },
    { name: "Conger", trophy: 60000, superTrophy: 75000, rarity: "Rare", cardValue: 550, stars: 4 },
    { name: "Crucian Carp", trophy: 1800, superTrophy: 2900, rarity: "Not Rare", cardValue: 50, stars: 1 },
    { name: "Cusk", trophy: 18000, superTrophy: 24000, rarity: "Not Rare", cardValue: 100, stars: 2 },
    { name: "Dace", trophy: 250, superTrophy: 390, rarity: "Not Rare", cardValue: 85, stars: 1 },
    { name: "Dinks leather carp", trophy: 35000, superTrophy: 45000, rarity: "Rarest species", cardValue: 700, stars: 4 },
    { name: "Dinks linear carp", trophy: 35000, superTrophy: 45000, rarity: "Rare", cardValue: 450, stars: 4 },
    { name: "Dinks mirror carp", trophy: 35000, superTrophy: 45000, rarity: "Not Rare", cardValue: 250, stars: 3 },
    { name: "Dolly Varden Trout", trophy: 7500, superTrophy: 10000, rarity: "Not Rare", cardValue: 150, stars: 2 },
    { name: "Donets Ruffe", trophy: 250, superTrophy: 350, rarity: "Rare", cardValue: 200, stars: 3 },
    { name: "Dryagin Char", trophy: 10000, superTrophy: 14000, rarity: "Not Rare", cardValue: 230, stars: 3 },
    { name: "East Siberian Grayling", trophy: 2000, superTrophy: 2500, rarity: "Not Rare", cardValue: 120, stars: 2 },
    { name: "East Siberian Sturgeon", trophy: 100000, superTrophy: 150000, rarity: "Rare", cardValue: 300, stars: 4 },
    { name: "Eastern Bream", trophy: 4400, superTrophy: 7000, rarity: "Not Rare", cardValue: 50, stars: 1 },
    { name: "Edible crab", trophy: 1800, superTrophy: 2200, rarity: "Rare", cardValue: 240, stars: 4 },
    { name: "Eel", trophy: 4000, superTrophy: 7500, rarity: "Not Rare", cardValue: 230, stars: 3 },
    { name: "Esmark's eelpout", trophy: 2500, superTrophy: 3300, rarity: "Rare", cardValue: 700, stars: 4 },
    { name: "European Angler", trophy: 35000, superTrophy: 45000, rarity: "Rare", cardValue: 750, stars: 4 },
    { name: "European chimaera", trophy: 1500, superTrophy: null, rarity: "Rarest species", cardValue: null, stars: 5 },
    { name: "European hake", trophy: 9000, superTrophy: 12000, rarity: "Not Rare", cardValue: 150, stars: 2 },
    { name: "European plaice", trophy: 4500, superTrophy: 5500, rarity: "Not Rare", cardValue: 120, stars: 2 },
    { name: "European squid", trophy: 2000, superTrophy: 2400, rarity: "Not Rare", cardValue: 170, stars: 3 },
    { name: "F1", trophy: 3000, superTrophy: 4000, rarity: "Not Rare", cardValue: 150, stars: 2 },
    { name: "Far Eastern Brook Lamprey", trophy: 40, superTrophy: null, rarity: "Rarest species", cardValue: null, stars: 5 },
    { name: "Frame-sided albino carp", trophy: 25000, superTrophy: 40000, rarity: "Rarest species", cardValue: null, stars: 5 },
    { name: "Frame-sided carp", trophy: 25000, superTrophy: 40000, rarity: "Not Rare", cardValue: 200, stars: 3 },
    { name: "Frame-sided Ghost Carp", trophy: 25000, superTrophy: 40000, rarity: "Rarest species", cardValue: 1250, stars: 5 },
    { name: "Freshwater Crayfish", trophy: 200, superTrophy: 330, rarity: "Not Rare", cardValue: 50, stars: 1 },
    { name: "Frilled shark", trophy: 50000, superTrophy: 70000, rarity: "Rarest species", cardValue: 1350, stars: 5 },
    { name: "Frog", trophy: 190, superTrophy: 250, rarity: "Not Rare", cardValue: 50, stars: 1 },
    { name: "Gibel Carp", trophy: 1900, superTrophy: 3200, rarity: "Not Rare", cardValue: 50, stars: 1 },
    { name: "Golden Tench", trophy: 4000, superTrophy: 6000, rarity: "Rare", cardValue: 300, stars: 3 },
    { name: "Grass Carp", trophy: 28000, superTrophy: 40000, rarity: "Not Rare", cardValue: 140, stars: 2 },
    { name: "Gray Char", trophy: 3000, superTrophy: 4500, rarity: "Rare", cardValue: 250, stars: 3 },
    { name: "Grayling", trophy: 3200, superTrophy: 5500, rarity: "Not Rare", cardValue: 120, stars: 2 },
    { name: "Greenland Halibut", trophy: 25000, superTrophy: 32000, rarity: "Rare", cardValue: 650, stars: 4 },
    { name: "Greenland shark", trophy: 600000, superTrophy: 900000, rarity: "Rarest species", cardValue: 1250, stars: 5 },
    { name: "Gudgeon", trophy: 100, superTrophy: 160, rarity: "Not Rare", cardValue: 60, stars: 1 },
    { name: "Haddock", trophy: 11000, superTrophy: 13000, rarity: "Not Rare", cardValue: 100, stars: 1 },
    { name: "Hi Utsuri", trophy: 25000, superTrophy: 32000, rarity: "Rarest species", cardValue: 1500, stars: 5 },
    { name: "Humpback Whitefish", trophy: 4500, superTrophy: 6000, rarity: "Not Rare", cardValue: 120, stars: 2 },
    { name: "Icelandic scallop", trophy: 350, superTrophy: 450, rarity: "Not Rare", cardValue: 240, stars: 4 },
    { name: "Ide", trophy: 4000, superTrophy: 6500, rarity: "Not Rare", cardValue: 120, stars: 2 },
    { name: "Kaluga", trophy: 500000, superTrophy: 1000000, rarity: "Rarest species", cardValue: 1450, stars: 5 },
    { name: "Kamchatkan Rainbow Trout", trophy: 8000, superTrophy: 10000, rarity: "Not Rare", cardValue: null, stars: 3 },
    { name: "Kessler's Herring", trophy: 1200, superTrophy: 1700, rarity: "Not Rare", cardValue: 75, stars: 1 },
    { name: "Kohaku", trophy: 25000, superTrophy: 32000, rarity: "Rarest species", cardValue: 650, stars: 4 },
    { name: "Kuori Char", trophy: 22000, superTrophy: 30000, rarity: "Rare", cardValue: 400, stars: 4 },
    { name: "Kuori Whitefish", trophy: 3500, superTrophy: 5000, rarity: "Not Rare", cardValue: 190, stars: 4 },
    { name: "Kvolsdorfsky tench", trophy: 4000, superTrophy: 6000, rarity: "Not Rare", cardValue: 400, stars: 4 },
    { name: "Ladoga Lake Whitefish", trophy: 3000, superTrophy: 4000, rarity: "Not Rare", cardValue: 120, stars: 2 },
    { name: "Ladoga salmon", trophy: 14000, superTrophy: 20000, rarity: "Not Rare", cardValue: 200, stars: 3 },
    { name: "Ladoga sturgeon", trophy: 60000, superTrophy: null, rarity: "Not Rare", cardValue: null, stars: 5 },
    { name: "Lake Minnow", trophy: 100, superTrophy: 160, rarity: "Not Rare", cardValue: 60, stars: 1 },
    { name: "Lake Trout", trophy: 10000, superTrophy: 15000, rarity: "Not Rare", cardValue: 120, stars: 2 },
    { name: "Leather Carp", trophy: 30000, superTrophy: 45000, rarity: "Rare", cardValue: 200, stars: 3 },
    { name: "Levanidov's Char", trophy: 1600, superTrophy: 2100, rarity: "Not Rare", cardValue: 230, stars: 3 },
    { name: "Linear albino carp", trophy: 25000, superTrophy: 40000, rarity: "Rarest species", cardValue: null, stars: 5 },
    { name: "Linear carp", trophy: 25000, superTrophy: 40000, rarity: "Not Rare", cardValue: 200, stars: 3 },
    { name: "Linear Ghost Carp", trophy: 25000, superTrophy: 40000, rarity: "Rarest species", cardValue: 1150, stars: 5 },
    { name: "Loach", trophy: 200, superTrophy: 250, rarity: "Not Rare", cardValue: 80, stars: 1 },
    { name: "Longear eelpout", trophy: 1200, superTrophy: 1500, rarity: "Rare", cardValue: 700, stars: 4 },
    { name: "Longhead dab", trophy: 3000, superTrophy: 4000, rarity: "Not Rare", cardValue: 120, stars: 2 },
    { name: "Longnose Sucker", trophy: 1800, superTrophy: 2200, rarity: "Not Rare", cardValue: 120, stars: 2 },
    { name: "Ludoga Whitefish", trophy: 3000, superTrophy: 5000, rarity: "Not Rare", cardValue: 120, stars: 2 },
    { name: "Lumpfish", trophy: 6000, superTrophy: 7500, rarity: "Not Rare", cardValue: 240, stars: 3 },
    { name: "Mameshibori Goshiki", trophy: 25000, superTrophy: 32000, rarity: "Rarest species", cardValue: 1100, stars: 5 },
    { name: "Masu", trophy: 6500, superTrophy: 8000, rarity: "Rare", cardValue: 250, stars: 4 },
    { name: "Masu sedentary", trophy: 5000, superTrophy: 6500, rarity: "Not Rare", cardValue: 150, stars: 3 },
    { name: "Meagre", trophy: 65000, superTrophy: 90000, rarity: "Rare", cardValue: 800, stars: 4 },
    { name: "Midori goi", trophy: 25000, superTrophy: 32000, rarity: "Rarest species", cardValue: 900, stars: 5 },
    { name: "Mirror Albino Carp", trophy: 25000, superTrophy: 40000, rarity: "Rarest species", cardValue: 1300, stars: 5 },
    { name: "Mirror Carp", trophy: 25000, superTrophy: 40000, rarity: "Not Rare", cardValue: 100, stars: 2 },
    { name: "Mirror ghost carp", trophy: 25000, superTrophy: 40000, rarity: "Rarest species", cardValue: 350, stars: 4 },
    { name: "Mongolian redfin", trophy: 2500, superTrophy: 3200, rarity: "Not Rare", cardValue: 250, stars: 3 },
    { name: "Muksun", trophy: 6000, superTrophy: 9000, rarity: "Not Rare", cardValue: 200, stars: 3 },
    { name: "Mussel", trophy: 130, superTrophy: 150, rarity: "Not Rare", cardValue: 240, stars: 4 },
    { name: "Narumi Asagi", trophy: 25000, superTrophy: 32000, rarity: "Rarest species", cardValue: 800, stars: 4 },
    { name: "Nase", trophy: 800, superTrophy: 1200, rarity: "Not Rare", cardValue: 100, stars: 1 },
    { name: "Neiva", trophy: 1400, superTrophy: 1700, rarity: "Rare", cardValue: null, stars: 4 },
    { name: "Nelma", trophy: 25000, superTrophy: 30000, rarity: "Not Rare", cardValue: null, stars: 4 },
    { name: "Nine-Spined Stickleback", trophy: 70, superTrophy: 90, rarity: "Not Rare", cardValue: null, stars: 1 },
    { name: "Northern wolffish", trophy: 13000, superTrophy: 17000, rarity: "Rare", cardValue: 900, stars: 4 },
    { name: "Opah", trophy: 140000, superTrophy: 200000, rarity: "Rarest species", cardValue: 800, stars: 5 },
    { name: "Orenji Ogon", trophy: 25000, superTrophy: 32000, rarity: "Rare", cardValue: 500, stars: 4 },
    { name: "Ostrog Whitefish", trophy: 3000, superTrophy: 4000, rarity: "Rare", cardValue: 300, stars: 4 },
    { name: "Oyster", trophy: 300, superTrophy: 370, rarity: "Not Rare", cardValue: 250, stars: 4 },
    { name: "Peled", trophy: 3000, superTrophy: 4000, rarity: "Not Rare", cardValue: 100, stars: 1 },
    { name: "Perch", trophy: 1600, superTrophy: 2700, rarity: "Not Rare", cardValue: 50, stars: 1 },
    { name: "Persian Sturgeon", trophy: 100000, superTrophy: 150000, rarity: "Rarest species", cardValue: null, stars: 5 },
    { name: "Pike", trophy: 12000, superTrophy: 20000, rarity: "Not Rare", cardValue: 120, stars: 2 },
    { name: "Pink Salmon", trophy: 3000, superTrophy: 4000, rarity: "Not Rare", cardValue: 200, stars: 3 },
    { name: "Pollock", trophy: 11000, superTrophy: 14000, rarity: "Not Rare", cardValue: 140, stars: 3 },
    { name: "Pontic shad", trophy: 650, superTrophy: 900, rarity: "Not Rare", cardValue: 100, stars: 1 },
    { name: "Porbeagle", trophy: 140000, superTrophy: 200000, rarity: "Rare", cardValue: 900, stars: 4 },
    { name: "Pumpkinseed Sunfish", trophy: 450, superTrophy: 600, rarity: "Not Rare", cardValue: 85, stars: 1 },
    { name: "Rainbow Trout", trophy: 10000, superTrophy: 13000, rarity: "Not Rare", cardValue: 190, stars: 3 },
    { name: "Red Char", trophy: 5000, superTrophy: 7600, rarity: "Not Rare", cardValue: 250, stars: 3 },
    { name: "Red king crab", trophy: 7500, superTrophy: 9000, rarity: "Rare", cardValue: 280, stars: 4 },
    { name: "Red Starvas Carp - Scaly", trophy: 20000, superTrophy: 30000, rarity: "Rarest species", cardValue: 350, stars: 4 },
    { name: "Ripus", trophy: 1200, superTrophy: 1700, rarity: "Not Rare", cardValue: 50, stars: 1 },
    { name: "River mussel", trophy: 190, superTrophy: 280, rarity: "Not Rare", cardValue: 50, stars: 1 },
    { name: "Roughhead grenadier", trophy: 3000, superTrophy: null, rarity: "Rare", cardValue: 900, stars: 4 },
    { name: "Round Whitefish", trophy: 1200, superTrophy: 1600, rarity: "Not Rare", cardValue: 210, stars: 3 },
    { name: "Rudd", trophy: 1500, superTrophy: 2000, rarity: "Not Rare", cardValue: 70, stars: 1 },
    { name: "Ruffe", trophy: 140, superTrophy: 220, rarity: "Not Rare", cardValue: 60, stars: 1 },
    { name: "Russian Sturgeon", trophy: 50000, superTrophy: 100000, rarity: "Rare", cardValue: 300, stars: 4 },
    { name: "Saithe", trophy: 19000, superTrophy: 25000, rarity: "Not Rare", cardValue: 80, stars: 1 },
    { name: "Sardine", trophy: 180, superTrophy: 240, rarity: "Not Rare", cardValue: 50, stars: 2 },
    { name: "Scaleless Albino Carp", trophy: 30000, superTrophy: 45000, rarity: "Rarest species", cardValue: null, stars: 5 },
    { name: "Scaleless Ghost Carp", trophy: 30000, superTrophy: 45000, rarity: "Rarest species", cardValue: 1200, stars: 5 },
    { name: "Sevan Trout", trophy: 9000, superTrophy: 15000, rarity: "Not Rare", cardValue: 160, stars: 3 },
    { name: "Sharp-snouted Lenok", trophy: 5500, superTrophy: 7000, rarity: "Not Rare", cardValue: 200, stars: 3 },
    { name: "Shemaya", trophy: 600, superTrophy: 900, rarity: "Not Rare", cardValue: 150, stars: 2 },
    { name: "Short-headed Barbel", trophy: 13000, superTrophy: 18000, rarity: "Rare", cardValue: 300, stars: 3 },
    { name: "Shorthorn sculpin", trophy: 3000, superTrophy: 4000, rarity: "Not Rare", cardValue: 100, stars: 1 },
    { name: "Siberian Char Loach", trophy: 60, superTrophy: 80, rarity: "Not Rare", cardValue: 60, stars: 1 },
    { name: "Siberian Dace", trophy: 250, superTrophy: 390, rarity: "Not Rare", cardValue: 85, stars: 1 },
    { name: "Siberian Gudgeon", trophy: 150, superTrophy: 200, rarity: "Not Rare", cardValue: 50, stars: 1 },
    { name: "Siberian Lamprey", trophy: 40, superTrophy: null, rarity: "Rarest species", cardValue: null, stars: 5 },
    { name: "Siberian Roach", trophy: 600, superTrophy: 700, rarity: "Not Rare", cardValue: 50, stars: 1 },
    { name: "Siberian Sardine Cisco", trophy: 800, superTrophy: 1100, rarity: "Not Rare", cardValue: 50, stars: 1 },
    { name: "Siberian Sculpin", trophy: 45, superTrophy: 55, rarity: "Not Rare", cardValue: 50, stars: 1 },
    { name: "Siberian Sterlet", trophy: 9000, superTrophy: 14000, rarity: "Rare", cardValue: 190, stars: 3 },
    { name: "Sichel", trophy: 1500, superTrophy: 2000, rarity: "Not Rare", cardValue: 75, stars: 1 },
    { name: "Silver Carp", trophy: 25000, superTrophy: 40000, rarity: "Not Rare", cardValue: 270, stars: 3 },
    { name: "Small redfish", trophy: 3000, superTrophy: 4000, rarity: "Not Rare", cardValue: 150, stars: 1 },
    { name: "Small Southern Stickleback", trophy: 70, superTrophy: 90, rarity: "Not Rare", cardValue: 50, stars: 1 },
    { name: "Smelt", trophy: 130, superTrophy: 200, rarity: "Not Rare", cardValue: 50, stars: 1 },
    { name: "Sockeye Salmon", trophy: 4500, superTrophy: 6000, rarity: "Not Rare", cardValue: 200, stars: 3 },
    { name: "Spiny dogfish", trophy: 7000, superTrophy: 10000, rarity: "Not Rare", cardValue: 240, stars: 3 },
    { name: "Spotted wolffish", trophy: 17000, superTrophy: 22000, rarity: "Not Rare", cardValue: 350, stars: 4 },
    { name: "Starvas Red Carp - Mirror", trophy: 25000, superTrophy: 40000, rarity: "Rarest species", cardValue: 350, stars: 4 },
    { name: "Stellate Sturgeon", trophy: 50000, superTrophy: 70000, rarity: "Rare", cardValue: 300, stars: 4 },
    { name: "Sterlet", trophy: 9000, superTrophy: 14000, rarity: "Not Rare", cardValue: 190, stars: 3 },
    { name: "Svir Whitefish", trophy: 3500, superTrophy: 5000, rarity: "Rarest species", cardValue: null, stars: 4 },
    { name: "Swordfish", trophy: 300000, superTrophy: 450000, rarity: "Rarest species", cardValue: 1100, stars: 5 },
    { name: "Taimen", trophy: 50000, superTrophy: 80000, rarity: "Not Rare", cardValue: 300, stars: 4 },
    { name: "Taran", trophy: 1300, superTrophy: 1800, rarity: "Not Rare", cardValue: 120, stars: 2 },
    { name: "Tench", trophy: 4000, superTrophy: 6000, rarity: "Not Rare", cardValue: 120, stars: 2 },
    { name: "Thorny skate", trophy: 11000, superTrophy: 14000, rarity: "Not Rare", cardValue: 280, stars: 4 },
    { name: "Three Toothed Lamprey", trophy: null, superTrophy: null, rarity: "Rarest species", cardValue: null, stars: 5 },
    { name: "Three-spined Stickleback", trophy: 70, superTrophy: 90, rarity: "Not Rare", cardValue: 50, stars: 1 },
    { name: "Tugun", trophy: 60, superTrophy: 70, rarity: "Not Rare", cardValue: 100, stars: 1 },
    { name: "Turbot", trophy: 14000, superTrophy: 18000, rarity: "Not Rare", cardValue: 240, stars: 3 },
    { name: "Ugui", trophy: 1200, superTrophy: 1500, rarity: "Not Rare", cardValue: 120, stars: 2 },
    { name: "Ukrainian Lamprey", trophy: 70, superTrophy: null, rarity: "Rarest species", cardValue: null, stars: 5 },
    { name: "Valaam Whitefish", trophy: 1500, superTrophy: 2500, rarity: "Not Rare", cardValue: 120, stars: 2 },
    { name: "Vendace", trophy: 500, superTrophy: 800, rarity: "Not Rare", cardValue: 50, stars: 1 },
    { name: "Vimba", trophy: 1500, superTrophy: 2400, rarity: "Not Rare", cardValue: 120, stars: 2 },
    { name: "Viviparous eelpout", trophy: 900, superTrophy: 1300, rarity: "Not Rare", cardValue: 120, stars: 2 },
    { name: "Volga Zander", trophy: 1400, superTrophy: 2200, rarity: "Not Rare", cardValue: 80, stars: 1 },
    { name: "Volkhov Whitefish", trophy: 4000, superTrophy: 7000, rarity: "Rare", cardValue: 300, stars: 4 },
    { name: "Vuoksa Whitefish", trophy: 3000, superTrophy: 5000, rarity: "Not Rare", cardValue: 120, stars: 2 },
    { name: "White Bream", trophy: 800, superTrophy: 1200, rarity: "Not Rare", cardValue: 60, stars: 1 },
    { name: "White-eye Bream", trophy: 600, superTrophy: 900, rarity: "Not Rare", cardValue: 80, stars: 1 },
    { name: "Whitespotted Char", trophy: 10000, superTrophy: 14000, rarity: "Not Rare", cardValue: 200, stars: 3 },
    { name: "Whiting", trophy: 3000, superTrophy: 4000, rarity: "Not Rare", cardValue: 170, stars: 3 },
    { name: "Wild Carp", trophy: 25000, superTrophy: 35000, rarity: "Not Rare", cardValue: 190, stars: 3 },
    { name: "Yotsushiro", trophy: 25000, superTrophy: 32000, rarity: "Rarest species", cardValue: 900, stars: 5 },
    { name: "Zander", trophy: 8000, superTrophy: 12000, rarity: "Not Rare", cardValue: 120, stars: 2 },
    { name: "Zebra Mussel", trophy: 150, superTrophy: 210, rarity: "Not Rare", cardValue: 60, stars: 1 },
    { name: "Largemouth Bass", trophy: 6000, superTrophy: 7500, rarity: "Not Rare", cardValue: 150, stars: 2 },
    { name: "Smallmouth Bass", trophy: 3000, superTrophy: 4500, rarity: "Not Rare", cardValue: 120, stars: 2 },
    { name: "White Crappie", trophy: 1350, superTrophy: 2000, rarity: "Not Rare", cardValue: 50, stars: 1 },
    { name: "Spotted Bass", trophy: 3000, superTrophy: null, rarity: "Not Rare", cardValue: null, stars: null },
    { name: "Warmouth", trophy: 650, superTrophy: 850, rarity: "Not Rare", cardValue: 55, stars: 1 },
    { name: "Freshwater Drum", trophy: 13500, superTrophy: null, rarity: "Not Rare", cardValue: 200, stars: 3 },
    { name: "White Bass", trophy: 1750, superTrophy: 2500, rarity: "Not Rare", cardValue: 70, stars: 1 },
    { name: "Butterfly Peacock Bass", trophy: 4000, superTrophy: 5500, rarity: "Not Rare", cardValue: null, stars: null },
    { name: "Walleye", trophy: 7000, superTrophy: 9000, rarity: "Not Rare", cardValue: 150, stars: 2 },
    { name: "Redear Sunfish", trophy: 1700, superTrophy: 2300, rarity: "Not Rare", cardValue: 90, stars: 1 },
    { name: "Hybrid Striped Bass", trophy: 8000, superTrophy: 10000, rarity: "Not Rare", cardValue: null, stars: null },
    { name: "Channel Catfish", trophy: 14000, superTrophy: 20000, rarity: "Not Rare", cardValue: 130, stars: 2 },
    { name: "Gizzard Shad", trophy: 1100, superTrophy: 1600, rarity: "Not Rare", cardValue: 50, stars: 1 },
    { name: "Flathead Catfish", trophy: 30000, superTrophy: 45000, rarity: "Not Rare", cardValue: 200, stars: 3 },
    { name: "Striped Bass", trophy: 30000, superTrophy: null, rarity: "Not Rare", cardValue: null, stars: null },
    { name: "Bluegill", trophy: 1200, superTrophy: 1700, rarity: "Not Rare", cardValue: 50, stars: 1 },
    { name: "Alligator Gar", trophy: null, superTrophy: null, rarity: "Rarest species", cardValue: null, stars: null },
    { name: "Spotted Gar", trophy: 3000, superTrophy: null, rarity: "Rare", cardValue: 600, stars: 4 },
    { name: "Black Crappie", trophy: 1600, superTrophy: 2200, rarity: "Not Rare", cardValue: null, stars: null }
  ];

  const formatWeight = (weight) => {
    if (!weight) return 'N/A';
    if (weight >= 1000000) {
      return `${(weight / 1000000).toFixed(1)}M g`;
    } else if (weight >= 1000) {
      return `${(weight / 1000).toFixed(weight % 1000 === 0 ? 0 : 1)} kg`;
    } else {
      return `${weight} g`;
    }
  };

  const getRarityColor = (rarity) => {
    switch (rarity) {
      case 'Rarest species':
        return 'text-purple-600 dark:text-purple-400 font-semibold';
      case 'Rare':
        return 'text-blue-600 dark:text-blue-400 font-medium';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (columnKey) => {
    if (sortConfig.key !== columnKey) return '↕';
    if (sortConfig.direction === 'ascending') return '↑';
    if (sortConfig.direction === 'descending') return '↓';
    return '↕';
  };

  const getColumnHeaderClass = (columnKey) => {
    const baseClass = "px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-600";
    if (sortConfig.key === columnKey) {
      return `${baseClass} bg-gray-100 dark:bg-gray-600`;
    }
    return baseClass;
  };

  const sortedAndFilteredFish = useMemo(() => {
    const filtered = fishData.filter(fish => {
      const matchesSearch = fish.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRarity = rarityFilter === 'All' || fish.rarity === rarityFilter;
      return matchesSearch && matchesRarity;
    });

    if (!sortConfig.key) return filtered;

    return [...filtered].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortConfig.direction === 'ascending' ? 1 : -1;
      if (bValue == null) return sortConfig.direction === 'ascending' ? -1 : 1;

      // Convert to numbers for numeric columns
      if (['trophy', 'superTrophy', 'cardValue', 'stars'].includes(sortConfig.key)) {
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
      }

      // Convert to strings for text comparison
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
  }, [searchTerm, rarityFilter, sortConfig]);

  const rarityOptions = ['All', 'Not Rare', 'Rare', 'Rarest species'];

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center">
          <Trophy className="w-8 h-8 mr-3 text-yellow-500" />
          Trophy Weights
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Complete list of fish trophy and super trophy weight requirements for Russian Fishing 4
        </p>
      </div>

      {/* Search and Filter Controls */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search fish..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={rarityFilter}
          onChange={(e) => setRarityFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {rarityOptions.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>

      {/* Results Count */}
      <div className="mb-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Showing {sortedAndFilteredFish.length} of {fishData.length} fish
        </p>
      </div>

      {/* Fish Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th 
                  className={getColumnHeaderClass('name')}
                  onClick={() => handleSort('name')}
                >
                  Fish Name <span className="ml-1">{getSortIndicator('name')}</span>
                </th>
                <th 
                  className={getColumnHeaderClass('trophy')}
                  onClick={() => handleSort('trophy')}
                >
                  Trophy Weight <span className="ml-1">{getSortIndicator('trophy')}</span>
                </th>
                <th 
                  className={getColumnHeaderClass('superTrophy')}
                  onClick={() => handleSort('superTrophy')}
                >
                  Super Trophy Weight <span className="ml-1">{getSortIndicator('superTrophy')}</span>
                </th>
                <th 
                  className={getColumnHeaderClass('rarity')}
                  onClick={() => handleSort('rarity')}
                >
                  Rarity <span className="ml-1">{getSortIndicator('rarity')}</span>
                </th>
                <th 
                  className={getColumnHeaderClass('cardValue')}
                  onClick={() => handleSort('cardValue')}
                >
                  Card Value <span className="ml-1">{getSortIndicator('cardValue')}</span>
                </th>
                <th 
                  className={getColumnHeaderClass('stars')}
                  onClick={() => handleSort('stars')}
                >
                  Stars <span className="ml-1">{getSortIndicator('stars')}</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {sortedAndFilteredFish.map((fish, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-2.5 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {fish.name}
                  </td>
                  <td className="px-6 py-2.5 whitespace-nowrap text-sm text-gray-900 dark:text-white font-mono">
                    {formatWeight(fish.trophy)}
                  </td>
                  <td className="px-6 py-2.5 whitespace-nowrap text-sm text-gray-900 dark:text-white font-mono">
                    {formatWeight(fish.superTrophy)}
                  </td>
                  <td className={`px-6 py-2.5 whitespace-nowrap text-sm ${getRarityColor(fish.rarity)}`}>
                    {fish.rarity}
                  </td>
                  <td className="px-6 py-2.5 whitespace-nowrap text-sm text-gray-900 dark:text-white font-mono">
                    {fish.cardValue || 'N/A'}
                  </td>
                  <td className="px-6 py-2.5 whitespace-nowrap text-sm">
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((starNum) => (
                        <Star 
                          key={starNum}
                          className={`w-4 h-4 ${starNum <= (fish.stars || 0) ? 'text-yellow-500' : 'text-gray-300 dark:text-gray-600'}`} 
                          fill="currentColor" 
                        />
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {sortedAndFilteredFish.length === 0 && (
        <div className="text-center py-12">
          <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No fish found matching your criteria</p>
        </div>
      )}
    </div>
  );
};

export default TrophyWeights;