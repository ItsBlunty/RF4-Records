"""
Trophy Classification Utility for RF4 Records

This module contains the trophy weight data and classification logic
to determine if a fish catch qualifies as a record, trophy, or normal catch.
"""

# Trophy weight data from the TrophyWeights component
TROPHY_WEIGHTS = {
    "Albino Barbel": {"trophy": 8000, "record": 12000},
    "Albino Catfish": {"trophy": 100000, "record": 200000},
    "Albino Grass Carp": {"trophy": 28000, "record": 40000},
    "Alfonsino": {"trophy": 9000, "record": 12000},
    "American plaice": {"trophy": 4000, "record": 5000},
    "Amur Catfish": {"trophy": 5000, "record": 7000},
    "Arctic Char": {"trophy": 11000, "record": 16000},
    "Arctic Grayling": {"trophy": 2000, "record": 2500},
    "Arctic Omul": {"trophy": 3000, "record": 4000},
    "Arctic skate": {"trophy": 8000, "record": 10000},
    "Asian Smelt": {"trophy": 270, "record": 320},
    "Asp": {"trophy": 8000, "record": 13000},
    "Atlantic bluefin tuna": {"trophy": 250000, "record": 400000},
    "Atlantic cod": {"trophy": 50000, "record": 65000},
    "Atlantic footballfish": {"trophy": 7000, "record": 10000},
    "Atlantic halibut": {"trophy": 150000, "record": 220000},
    "Atlantic herring": {"trophy": 800, "record": 1000},
    "Atlantic mackerel": {"trophy": 2000, "record": 2800},
    "Atlantic redfish": {"trophy": 9000, "record": 11000},
    "Atlantic Salmon": {"trophy": 30000, "record": 40000},
    "Atlantic saury": {"trophy": 600, "record": 750},
    "Atlantic wolffish": {"trophy": 14500, "record": 19000},
    "Atlantic wreckfish": {"trophy": 60000, "record": 75000},
    "Baikal Omul": {"trophy": 6000, "record": 7000},
    "Baltic Sturgeon": {"trophy": 200000, "record": 300000},
    "Basking shark": {"trophy": 1300000, "record": 2500000},
    "Bastard Sturgeon": {"trophy": 50000, "record": 70000},
    "Beaked redfish": {"trophy": 5500, "record": 7000},
    "Beloribitsa Whitefish": {"trophy": 15000, "record": 25000},
    "Beluga": {"trophy": 500000, "record": 1000000},
    "Bighead Carp": {"trophy": 30000, "record": 45000},
    "Black Buffalo": {"trophy": 15000, "record": 20000},
    "Black Carp": {"trophy": 28000, "record": 40000},
    "Black ruff": {"trophy": 24000, "record": 29000},
    "Black Sea Beluga": {"trophy": 500000, "record": 1000000},
    "Black Sea Kutum": {"trophy": 5500, "record": 7500},
    "Black Sea Shemaya": {"trophy": 500, "record": 700},
    "Black whitefish": {"trophy": 3500, "record": 5000},
    "Black-spined Herring": {"trophy": 250, "record": 340},
    "Bleak": {"trophy": 110, "record": 160},
    "Blue Bream": {"trophy": 750, "record": 1100},
    "Blue ling": {"trophy": 25000, "record": 35000},
    "Blue whiting": {"trophy": 900, "record": 1200},
    "Blunt-snouted lenok": {"trophy": 7500, "record": 9000},
    "Brazhnikov Herring": {"trophy": 700, "record": 1000},
    "Bream": {"trophy": 4400, "record": 7000},
    "Broad Whitefish": {"trophy": 7000, "record": 10000},
    "Brown Trout": {"trophy": 3000, "record": 5000},
    "Buffalo": {"trophy": 15000, "record": 20000},
    "Burbot": {"trophy": 9000, "record": 14000},
    "C2 SuperFreak": {"trophy": 30000, "record": 40000},
    "Caspian Brown Trout": {"trophy": 30000, "record": 50000},
    "Caspian Kutum": {"trophy": 5000, "record": 7000},
    "Caspian Lamprey": {"trophy": 150, "record": 200},
    "Caspian Roach": {"trophy": 500, "record": 800},
    "Catfish": {"trophy": 100000, "record": 200000},
    "Char": {"trophy": 5000, "record": 7600},
    "Chinese Sleeper": {"trophy": 400, "record": 700},
    "Chinook Salmon": {"trophy": 40000, "record": 60000},
    "Chub": {"trophy": 4000, "record": 7000},
    "Chum Salmon": {"trophy": 8000, "record": 10000},
    "Clupeonella": {"trophy": 24, "record": 28},
    "Coho Salmon": {"trophy": 5500, "record": 7000},
    "Common Barbel": {"trophy": 8000, "record": 12000},
    "Common Carp": {"trophy": 20000, "record": 30000},
    "Common Ghost Carp": {"trophy": 20000, "record": 30000},
    "Common ling": {"trophy": 30000, "record": 40000},
    "Common Minnow": {"trophy": 100, "record": 160},
    "Common Roach": {"trophy": 1200, "record": 2000},
    "Common Scaly Albino Carp": {"trophy": 20000, "record": 30000},
    "Conger": {"trophy": 60000, "record": 75000},
    "Crucian Carp": {"trophy": 1800, "record": 2900},
    "Cusk": {"trophy": 18000, "record": 24000},
    "Dace": {"trophy": 250, "record": 390},
    "Dinks leather carp": {"trophy": 35000, "record": 45000},
    "Dinks linear carp": {"trophy": 35000, "record": 45000},
    "Dinks mirror carp": {"trophy": 35000, "record": 45000},
    "Dolly Varden Trout": {"trophy": 7500, "record": 10000},
    "Donets Ruffe": {"trophy": 250, "record": 350},
    "Dryagin Char": {"trophy": 10000, "record": 14000},
    "East Siberian Grayling": {"trophy": 2000, "record": 2500},
    "East Siberian Sturgeon": {"trophy": 100000, "record": 150000},
    "Eastern Bream": {"trophy": 4400, "record": 7000},
    "Edible crab": {"trophy": 1800, "record": 2200},
    "Eel": {"trophy": 4000, "record": 7500},
    "Esmark's eelpout": {"trophy": 2500, "record": 3300},
    "European Angler": {"trophy": 35000, "record": 45000},
    "European hake": {"trophy": 9000, "record": 12000},
    "European plaice": {"trophy": 4500, "record": 5500},
    "European squid": {"trophy": 2000, "record": 2400},
    "F1": {"trophy": 3000, "record": 4000},
    "Frame-sided carp": {"trophy": 25000, "record": 40000},
    "Frame-sided albino carp": {"trophy": 25000, "record": 40000},
    "Frame-sided Ghost Carp": {"trophy": 25000, "record": 40000},
    "Freshwater Crayfish": {"trophy": 200, "record": 330},
    "Frilled shark": {"trophy": 50000, "record": 70000},
    "Frog": {"trophy": 190, "record": 250},
    "Gibel Carp": {"trophy": 1900, "record": 3200},
    "Golden Tench": {"trophy": 4000, "record": 6000},
    "Grass Carp": {"trophy": 28000, "record": 40000},
    "Gray Char": {"trophy": 3000, "record": 4500},
    "Grayling": {"trophy": 3200, "record": 5500},
    "Greenland Halibut": {"trophy": 25000, "record": 32000},
    "Greenland shark": {"trophy": 600000, "record": 900000},
    "Gudgeon": {"trophy": 100, "record": 160},
    "Haddock": {"trophy": 11000, "record": 13000},
    "Hi Utsuri": {"trophy": 25000, "record": 32000},
    "Humpback Whitefish": {"trophy": 4500, "record": 6000},
    "Icelandic scallop": {"trophy": 350, "record": 450},
    "Ide": {"trophy": 4000, "record": 6500},
    "Kaluga": {"trophy": 500000, "record": 1000000},
    "Kamchatkan Rainbow Trout": {"trophy": 8000, "record": 10000},
    "Kessler's Herring": {"trophy": 1200, "record": 1700},
    "Kohaku": {"trophy": 25000, "record": 32000},
    "Kuori Char": {"trophy": 22000, "record": 30000},
    "Kuori Whitefish": {"trophy": 3500, "record": 5000},
    "Kvolsdorfsky tench": {"trophy": 4000, "record": 6000},
    "Ladoga Lake Whitefish": {"trophy": 3000, "record": 4000},
    "Ladoga salmon": {"trophy": 14000, "record": 20000},
    "Ladoga sturgeon": {"trophy": 60000, "record": None},
    "Lake Minnow": {"trophy": 100, "record": 160},
    "Lake Trout": {"trophy": 10000, "record": 15000},
    "Leather Carp": {"trophy": 30000, "record": 45000},
    "Levanidov's Char": {"trophy": 1600, "record": 2100},
    "Linear albino carp": {"trophy": 25000, "record": 40000},
    "Linear carp": {"trophy": 25000, "record": 40000},
    "Linear Ghost Carp": {"trophy": 25000, "record": 40000},
    "Loach": {"trophy": 200, "record": 250},
    "Longear eelpout": {"trophy": 1200, "record": 1500},
    "Longhead dab": {"trophy": 3000, "record": 4000},
    "Longnose Sucker": {"trophy": 1800, "record": 2200},
    "Ludoga Whitefish": {"trophy": 3000, "record": 5000},
    "Lumpfish": {"trophy": 6000, "record": 7500},
    "Mameshibori Goshiki": {"trophy": 25000, "record": 32000},
    "Masu": {"trophy": 6500, "record": 8000},
    "Masu sedentary": {"trophy": 5000, "record": 6500},
    "Meagre": {"trophy": 65000, "record": 90000},
    "Midori goi": {"trophy": 25000, "record": 32000},
    "Mirror Albino Carp": {"trophy": 25000, "record": 40000},
    "Mirror Carp": {"trophy": 25000, "record": 40000},
    "Mirror ghost carp": {"trophy": 25000, "record": 40000},
    "Mongolian redfin": {"trophy": 2500, "record": 3200},
    "Muksun": {"trophy": 6000, "record": 9000},
    "Mussel": {"trophy": 130, "record": 150},
    "Narumi Asagi": {"trophy": 25000, "record": 32000},
    "Nase": {"trophy": 800, "record": 1200},
    "Neiva": {"trophy": 1400, "record": 1700},
    "Nelma": {"trophy": 25000, "record": 30000},
    "Nine-Spined Stickleback": {"trophy": 70, "record": 90},
    "Northern wolffish": {"trophy": 13000, "record": 17000},
    "Opah": {"trophy": 140000, "record": 200000},
    "Orenji Ogon": {"trophy": 25000, "record": 32000},
    "Ostrog Whitefish": {"trophy": 3000, "record": 4000},
    "Oyster": {"trophy": 300, "record": 370},
    "Peled": {"trophy": 3000, "record": 4000},
    "Perch": {"trophy": 1600, "record": 2700},
    "Pike": {"trophy": 12000, "record": 20000},
    "Pink Salmon": {"trophy": 3000, "record": 4000},
    "Pollock": {"trophy": 11000, "record": 14000},
    "Pontic shad": {"trophy": 650, "record": 900},
    "Porbeagle": {"trophy": 140000, "record": 200000},
    "Pumpkinseed Sunfish": {"trophy": 450, "record": 600},
    "Rainbow Trout": {"trophy": 10000, "record": 13000},
    "Red Char": {"trophy": 5000, "record": 7600},
    "Red king crab": {"trophy": 7500, "record": 9000},
    "Red Starvas Carp - Scaly": {"trophy": 20000, "record": 30000},
    "Ripus": {"trophy": 1200, "record": 1700},
    "River mussel": {"trophy": 190, "record": 280},
    "Roughhead grenadier": {"trophy": 3000, "record": None},
    "Round Whitefish": {"trophy": 1200, "record": 1600},
    "Rudd": {"trophy": 1500, "record": 2000},
    "Ruffe": {"trophy": 140, "record": 220},
    "Russian Sturgeon": {"trophy": 50000, "record": 100000},
    "Saithe": {"trophy": 19000, "record": 25000},
    "Sardine": {"trophy": 180, "record": 240},
    "Scaleless Albino Carp": {"trophy": 30000, "record": 45000},
    "Scaleless Ghost Carp": {"trophy": 30000, "record": 45000},
    "Sevan Trout": {"trophy": 9000, "record": 15000},
    "Sharp-snouted Lenok": {"trophy": 5500, "record": 7000},
    "Shemaya": {"trophy": 600, "record": 900},
    "Short-headed Barbel": {"trophy": 13000, "record": 18000},
    "Shorthorn sculpin": {"trophy": 3000, "record": 4000},
    "Siberian Char Loach": {"trophy": 60, "record": 80},
    "Siberian Dace": {"trophy": 250, "record": 390},
    "Siberian Gudgeon": {"trophy": 150, "record": 200},
    "Siberian Roach": {"trophy": 600, "record": 700},
    "Siberian Sardine Cisco": {"trophy": 800, "record": 1100},
    "Siberian Sculpin": {"trophy": 45, "record": 55},
    "Siberian Sterlet": {"trophy": 9000, "record": 14000},
    "Sichel": {"trophy": 1500, "record": 2000},
    "Silver Carp": {"trophy": 25000, "record": 40000},
    "Small redfish": {"trophy": 3000, "record": 4000},
    "Small Southern Stickleback": {"trophy": 70, "record": 90},
    "Smelt": {"trophy": 130, "record": 200},
    "Sockeye Salmon": {"trophy": 4500, "record": 6000},
    "Spiny dogfish": {"trophy": 7000, "record": 10000},
    "Spotted wolffish": {"trophy": 17000, "record": 22000},
    "Starvas Red Carp - Mirror": {"trophy": 25000, "record": 40000},
    "Stellate Sturgeon": {"trophy": 50000, "record": 70000},
    "Sterlet": {"trophy": 9000, "record": 14000},
    "Swordfish": {"trophy": 300000, "record": 450000},
    "Taimen": {"trophy": 50000, "record": 80000},
    "Taran": {"trophy": 1300, "record": 1800},
    "Tench": {"trophy": 4000, "record": 6000},
    "Thorny skate": {"trophy": 11000, "record": 14000},
    "Three-spined Stickleback": {"trophy": 70, "record": 90},
    "Tugun": {"trophy": 60, "record": 70},
    "Turbot": {"trophy": 14000, "record": 18000},
    "Ugui": {"trophy": 1200, "record": 1500},
    "Valaam Whitefish": {"trophy": 1500, "record": 2500},
    "Vendace": {"trophy": 500, "record": 800},
    "Vimba": {"trophy": 1500, "record": 2400},
    "Viviparous eelpout": {"trophy": 900, "record": 1300},
    "Volga Zander": {"trophy": 1400, "record": 2200},
    "Volkhov Whitefish": {"trophy": 4000, "record": 7000},
    "Vuoksa Whitefish": {"trophy": 3000, "record": 5000},
    "White Bream": {"trophy": 800, "record": 1200},
    "White-eye Bream": {"trophy": 600, "record": 900},
    "Whitespotted Char": {"trophy": 10000, "record": 14000},
    "Whiting": {"trophy": 3000, "record": 4000},
    "Wild Carp": {"trophy": 25000, "record": 35000},
    "Yotsushiro": {"trophy": 25000, "record": 32000},
    "Zander": {"trophy": 8000, "record": 12000},
    "Zebra Mussel": {"trophy": 150, "record": 210},
    "Largemouth Bass": {"trophy": 6000, "record": 7500},
    "Smallmouth Bass": {"trophy": 3000, "record": 4500},
    "White Crappie": {"trophy": 1350, "record": 2000},
    "Spotted Bass": {"trophy": 3000, "record": None},
    "Warmouth": {"trophy": 650, "record": 850},
    "Freshwater Drum": {"trophy": 13500, "record": None},
    "White Bass": {"trophy": 1750, "record": 2500},
    "Butterfly Peacock Bass": {"trophy": 4000, "record": 5500},
    "Walleye": {"trophy": 7000, "record": 9000},
    "Redear Sunfish": {"trophy": 1700, "record": 2300},
    "Hybrid Striped Bass (Whiterock Bass)": {"trophy": 8000, "record": 10000},
    "Striped Bass (Striper)": {"trophy": 8000, "record": 12000},
    "Channel Catfish": {"trophy": 14000, "record": 20000},
    "Gizzard Shad": {"trophy": 1100, "record": 1600},
    "Flathead Catfish": {"trophy": 30000, "record": 45000},
    "Bluegill": {"trophy": 1200, "record": 1700},
    "Spotted Gar": {"trophy": 3000, "record": None},
    "Black Crappie": {"trophy": 1600, "record": 2200},
}


def classify_trophy(fish_name: str, weight_grams: int) -> str:
    """
    Classify a fish catch based on its weight and trophy requirements.
    
    Args:
        fish_name (str): The name of the fish species
        weight_grams (int): The weight of the catch in grams
        
    Returns:
        str: Classification - 'record', 'trophy', or 'normal'
    """
    # Get trophy requirements for this fish - use case-insensitive matching
    requirements = None
    for trophy_fish_name, trophy_data in TROPHY_WEIGHTS.items():
        if fish_name.lower() == trophy_fish_name.lower():
            requirements = trophy_data
            break
    
    if not requirements:
        # Fish not in trophy requirements - classify as normal
        return 'normal'
    
    trophy_weight = requirements.get('trophy')
    record_weight = requirements.get('record')
    
    # Check for record (super trophy) first
    if record_weight and weight_grams >= record_weight:
        return 'record'
    
    # Check for trophy
    if trophy_weight and weight_grams >= trophy_weight:
        return 'trophy'
    
    # Below trophy requirements
    return 'normal'


def get_trophy_requirements(fish_name: str) -> dict:
    """
    Get trophy weight requirements for a specific fish.
    
    Args:
        fish_name (str): The name of the fish species
        
    Returns:
        dict: Trophy requirements with 'trophy' and 'record' weights, or empty dict if not found
    """
    return TROPHY_WEIGHTS.get(fish_name, {})


def get_all_trophy_fish() -> list:
    """
    Get a list of all fish that have trophy requirements.
    
    Returns:
        list: List of fish names that have trophy weight requirements
    """
    return list(TROPHY_WEIGHTS.keys())