#!/usr/bin/env python3
"""
Load cafe order data into the database - designed to run on Railway
"""

from database import SessionLocal, CafeOrder, create_tables
from datetime import datetime

# All cafe order data from our annotations
ALL_CAFE_ORDERS = {
    "copper1.png": {
        "location": "Copper Lake",
        "orders": [
            {"fish": "Common Roach", "quantity": "6", "mass": "50 g", "price": "15.86"},
            {"fish": "Ide", "quantity": "1", "mass": "650 g", "price": "16.36"},
            {"fish": "Bleak", "quantity": "4", "mass": "20 g", "price": "17.04"},
            {"fish": "Mirror Carp", "quantity": "1", "mass": "4 kg", "price": "30.39"},
            {"fish": "Common Roach", "quantity": "7", "mass": "300 g", "price": "30.80"},
            {"fish": "Bleak", "quantity": "5", "mass": "72 g", "price": "55.16"},
            {"fish": "Kvolsdorfsky tench", "quantity": "1", "mass": "750 g", "price": "90.41"},
            {"fish": "Pike", "quantity": "2", "mass": "2 kg", "price": "126.71"},
            {"fish": "Chub", "quantity": "1", "mass": "5 kg", "price": "217.64"},
            {"fish": "Dinks mirror carp", "quantity": "1", "mass": "35 kg", "price": "796.04"}
        ]
    },
    "norway1.png": {
        "location": "Norwegian Sea",
        "orders": [
            {"fish": "Blue whiting", "quantity": "1", "mass": "900 g", "price": "63.77"},
            {"fish": "American plaice", "quantity": "1", "mass": "700 g", "price": "95.72"},
            {"fish": "Cusk", "quantity": "2", "mass": "2.5 kg", "price": "104.98"},
            {"fish": "Atlantic herring", "quantity": "1", "mass": "489 g", "price": "144.56"},
            {"fish": "Edible crab", "quantity": "1", "mass": "500 g", "price": "186.34"},
            {"fish": "Blue whiting", "quantity": "6", "mass": "549 g", "price": "220.13"},
            {"fish": "Small redfish", "quantity": "5", "mass": "1.799 kg", "price": "349.82"},
            {"fish": "Turbot", "quantity": "1", "mass": "14 kg", "price": "967.54"}
        ]
    },
    "norway2.png": {
        "location": "Norwegian Sea",
        "orders": [
            {"fish": "European hake", "quantity": "1", "mass": "1.5 kg", "price": "66.51"},
            {"fish": "Cusk", "quantity": "2", "mass": "2.5 kg", "price": "77.38"},
            {"fish": "Atlantic wolffish", "quantity": "1", "mass": "2 kg", "price": "97.43"},
            {"fish": "Saithe", "quantity": "4", "mass": "3 kg", "price": "148.93"},
            {"fish": "Blue whiting", "quantity": "6", "mass": "549 g", "price": "164.11"},
            {"fish": "Mussel", "quantity": "1", "mass": "84 g", "price": "194.37"},
            {"fish": "Cusk", "quantity": "1", "mass": "20.999 kg", "price": "619.06"},
            {"fish": "Pollock", "quantity": "1", "mass": "12.499 kg", "price": "737.54"}
        ]
    },
    "Screenshot 2025-07-10 082415.png": {
        "location": "Norwegian Sea",
        "orders": [
            {"fish": "Atlantic wolffish", "quantity": "1", "mass": "2 kg", "price": "70.18"},
            {"fish": "Blue whiting", "quantity": "6", "mass": "200 g", "price": "79.04"},
            {"fish": "Cusk", "quantity": "2", "mass": "2.5 kg", "price": "93.97"},
            {"fish": "Viviparous eelpout", "quantity": "2", "mass": "180 g", "price": "98.56"},
            {"fish": "Saithe", "quantity": "4", "mass": "3 kg", "price": "114.18"},
            {"fish": "Atlantic herring", "quantity": "1", "mass": "489 g", "price": "160.57"},
            {"fish": "Beaked redfish", "quantity": "1", "mass": "5 kg", "price": "598.93"},
            {"fish": "Northern wolffish", "quantity": "1", "mass": "13 kg", "price": "3685.74"}
        ]
    },
    "Screenshot 2025-07-10 082442.png": {
        "location": "Norwegian Sea",
        "orders": [
            {"fish": "Longhead dab", "quantity": "1", "mass": "450 g", "price": "71.36"},
            {"fish": "Blue whiting", "quantity": "6", "mass": "200 g", "price": "102.24"},
            {"fish": "Atlantic mackerel", "quantity": "4", "mass": "400 g", "price": "124.16"},
            {"fish": "Atlantic mackerel", "quantity": "1", "mass": "2 kg", "price": "132.79"},
            {"fish": "Saithe", "quantity": "4", "mass": "3 kg", "price": "133.74"},
            {"fish": "American plaice", "quantity": "1", "mass": "2.349 kg", "price": "170.42"},
            {"fish": "Small redfish", "quantity": "5", "mass": "600 g", "price": "174.24"},
            {"fish": "Edible crab", "quantity": "1", "mass": "1.999 kg", "price": "738.70"}
        ]
    },
    "Screenshot 2025-07-10 082449.png": {
        "location": "Norwegian Sea", 
        "orders": [
            {"fish": "Sardine", "quantity": "3", "mass": "50 g", "price": "106.31"},
            {"fish": "Haddock", "quantity": "3", "mass": "1.5 kg", "price": "112.81"},
            {"fish": "European hake", "quantity": "1", "mass": "5.249 kg", "price": "121.65"},
            {"fish": "Atlantic mackerel", "quantity": "1", "mass": "2.399 kg", "price": "150.68"},
            {"fish": "Icelandic scallop", "quantity": "1", "mass": "224 g", "price": "161.57"},
            {"fish": "Viviparous eelpout", "quantity": "2", "mass": "539 g", "price": "206.98"},
            {"fish": "Saithe", "quantity": "4", "mass": "10.999 kg", "price": "238.35"},
            {"fish": "Beaked redfish", "quantity": "1", "mass": "5.5 kg", "price": "612.23"}
        ]
    },
    "Screenshot 2025-07-10 082458.png": {
        "location": "Norwegian Sea",
        "orders": [
            {"fish": "Cusk", "quantity": "2", "mass": "2.5 kg", "price": "87.89"},
            {"fish": "Blue whiting", "quantity": "6", "mass": "549 g", "price": "98.66"},
            {"fish": "Sardine", "quantity": "3", "mass": "50 g", "price": "113.64"},
            {"fish": "Atlantic wolffish", "quantity": "1", "mass": "2 kg", "price": "124.75"},
            {"fish": "Saithe", "quantity": "4", "mass": "3 kg", "price": "133.77"},
            {"fish": "Haddock", "quantity": "3", "mass": "1.5 kg", "price": "140.89"},
            {"fish": "Beaked redfish", "quantity": "1", "mass": "5 kg", "price": "443.28"},
            {"fish": "Small redfish", "quantity": "5", "mass": "600 g", "price": "488.43"}
        ]
    },
    "Screenshot 2025-07-10 082602.png": {
        "location": "Sura River",
        "orders": [
            {"fish": "Volga zander", "quantity": "1", "mass": "800 g", "price": "17.73"},
            {"fish": "Ide", "quantity": "1", "mass": "650 g", "price": "20.27"},
            {"fish": "Black-Dnieper roach", "quantity": "5", "mass": "120 g", "price": "32.63"},
            {"fish": "Pike", "quantity": "2", "mass": "2 kg", "price": "56.52"},
            {"fish": "Chub", "quantity": "1", "mass": "5 kg", "price": "67.61"},
            {"fish": "Wild Carp", "quantity": "1", "mass": "7 kg", "price": "88.31"},
            {"fish": "Sterlet", "quantity": "1", "mass": "1.399 kg", "price": "170.51"},
            {"fish": "Beluga", "quantity": "1", "mass": "23 kg", "price": "351.21"}
        ]
    },
    "Screenshot 2025-07-10 082622.png": {
        "location": "Sura River",
        "orders": [
            {"fish": "Common Roach", "quantity": "6", "mass": "50 g", "price": "17.04"},
            {"fish": "Black-Dnieper roach", "quantity": "5", "mass": "120 g", "price": "17.62"},
            {"fish": "Common dace", "quantity": "4", "mass": "150 g", "price": "23.42"},
            {"fish": "Chub", "quantity": "1", "mass": "3 kg", "price": "64.07"},
            {"fish": "Volga zander", "quantity": "1", "mass": "1.799 kg", "price": "82.31"},
            {"fish": "Caspian kutum", "quantity": "1", "mass": "1.5 kg", "price": "94.77"},
            {"fish": "Wild Carp", "quantity": "1", "mass": "11 kg", "price": "168.09"},
            {"fish": "Beluga", "quantity": "1", "mass": "72 kg", "price": "659.20"}
        ]
    },
    "Screenshot 2025-07-10 082652.png": {
        "location": "Sura River",
        "orders": [
            {"fish": "Ruffe", "quantity": "6", "mass": "20 g", "price": "10.22"},
            {"fish": "Ide", "quantity": "1", "mass": "650 g", "price": "15.71"},
            {"fish": "Perch", "quantity": "5", "mass": "100 g", "price": "19.62"},
            {"fish": "Common dace", "quantity": "4", "mass": "75 g", "price": "29.52"},
            {"fish": "Chub", "quantity": "1", "mass": "3 kg", "price": "47.48"},
            {"fish": "Chinese sleeper", "quantity": "1", "mass": "249 g", "price": "65.36"},
            {"fish": "Volga zander", "quantity": "1", "mass": "2.799 kg", "price": "68.51"},
            {"fish": "Asp", "quantity": "1", "mass": "9 kg", "price": "308.18"}
        ]
    },
    "Screenshot 2025-07-10 082946.png": {
        "location": "Sura River",
        "orders": [
            {"fish": "Tench", "quantity": "1", "mass": "650 g", "price": "12.44"},
            {"fish": "Common Roach", "quantity": "5", "mass": "50 g", "price": "13.54"},
            {"fish": "Gudgeon", "quantity": "3", "mass": "15 g", "price": "13.07"},
            {"fish": "Burbot", "quantity": "1", "mass": "1.2 kg", "price": "24.02"},
            {"fish": "Freshwater Crayfish", "quantity": "1", "mass": "140 g", "price": "34.42"},
            {"fish": "Zebra Mussel", "quantity": "1", "mass": "119 g", "price": "40.39"},
            {"fish": "Ruffe", "quantity": "5", "mass": "40 g", "price": "42.68"},
            {"fish": "Pike", "quantity": "2", "mass": "2 kg", "price": "126.84"},
            {"fish": "Asp", "quantity": "1", "mass": "10.999 kg", "price": "602.56"},
            {"fish": "Catfish", "quantity": "1", "mass": "100 kg", "price": "1901.61"}
        ]
    },
    "Screenshot 2025-07-10 083006.png": {
        "location": "The Amber Lake",
        "orders": [
            {"fish": "Common Roach", "quantity": "6", "mass": "50 g", "price": "15.55"},
            {"fish": "Bleak", "quantity": "5", "mass": "29 g", "price": "21.92"},
            {"fish": "Mirror Carp", "quantity": "1", "mass": "4 kg", "price": "25.51"},
            {"fish": "Ruffe", "quantity": "4", "mass": "40 g", "price": "40.83"},
            {"fish": "Ide", "quantity": "1", "mass": "2.324 kg", "price": "45.99"},
            {"fish": "Bleak", "quantity": "6", "mass": "40 g", "price": "49.18"},
            {"fish": "White Bream", "quantity": "6", "mass": "140 g", "price": "49.48"},
            {"fish": "Common Roach", "quantity": "7", "mass": "749 g", "price": "50.39"},
            {"fish": "Ide", "quantity": "1", "mass": "4 kg", "price": "226.76"},
            {"fish": "Catfish", "quantity": "1", "mass": "160 kg", "price": "2042.28"}
        ]
    },
    "Screenshot 2025-07-10 083019.png": {
        "location": "Norwegian Sea",
        "orders": [
            {"fish": "Haddock", "quantity": "3", "mass": "1.5 kg", "price": "92.23"},
            {"fish": "Shorthorn sculpin", "quantity": "6", "mass": "600 g", "price": "112.47"},
            {"fish": "Atlantic herring", "quantity": "1", "mass": "489 g", "price": "134.46"},
            {"fish": "Atlantic mackerel", "quantity": "4", "mass": "1.199 kg", "price": "191.84"},
            {"fish": "Blue whiting", "quantity": "6", "mass": "549 g", "price": "218.67"},
            {"fish": "Edible crab", "quantity": "1", "mass": "1.149 kg", "price": "318.89"},
            {"fish": "Spiny dogfish", "quantity": "1", "mass": "7 kg", "price": "876.92"},
            {"fish": "Esmark's eelpout", "quantity": "1", "mass": "2.899 kg", "price": "1940.24"}
        ]
    },
    "Screenshot 2025-07-10 083106.png": {
        "location": "Volkhov River",
        "orders": [
            {"fish": "Frog", "quantity": "1", "mass": "64 g", "price": "2.15"},
            {"fish": "River mussel", "quantity": "1", "mass": "139 g", "price": "7.95"},
            {"fish": "Gibel Carp", "quantity": "5", "mass": "189 g", "price": "8.71"},
            {"fish": "White-eye Bream", "quantity": "3", "mass": "110 g", "price": "26.24"},
            {"fish": "Perch", "quantity": "8", "mass": "100 g", "price": "47.20"},
            {"fish": "Bleak", "quantity": "7", "mass": "40 g", "price": "60.66"},
            {"fish": "Gibel Carp", "quantity": "6", "mass": "1.124 kg", "price": "61.97"},
            {"fish": "Bream", "quantity": "4", "mass": "2.699 kg", "price": "82.14"},
            {"fish": "Ide", "quantity": "1", "mass": "5.249 kg", "price": "262.99"},
            {"fish": "Burbot", "quantity": "1", "mass": "9 kg", "price": "366.18"}
        ]
    },
    "Screenshot 2025-07-10 083116.png": {
        "location": "Norwegian Sea",
        "orders": [
            {"fish": "Pollock", "quantity": "1", "mass": "5.5 kg", "price": "68.61"},
            {"fish": "Viviparous eelpout", "quantity": "2", "mass": "180 g", "price": "104.37"},
            {"fish": "Haddock", "quantity": "3", "mass": "1.5 kg", "price": "107.02"},
            {"fish": "Shorthorn sculpin", "quantity": "6", "mass": "460 g", "price": "139.24"},
            {"fish": "Atlantic wolffish", "quantity": "1", "mass": "6.349 kg", "price": "185.35"},
            {"fish": "Small redfish", "quantity": "1", "mass": "1 kg", "price": "218.13"},
            {"fish": "Blue whiting", "quantity": "6", "mass": "549 g", "price": "232.91"},
            {"fish": "Atlantic redfish", "quantity": "1", "mass": "5.399 kg", "price": "2667.49"}
        ]
    },
    "Screenshot 2025-07-10 083123.png": {
        "location": "Akhtuba River",
        "orders": [
            {"fish": "River mussel", "quantity": "1", "mass": "90 g", "price": "3.52"},
            {"fish": "Crucian Carp", "quantity": "3", "mass": "340 g", "price": "7.53"},
            {"fish": "White Bream", "quantity": "6", "mass": "50 g", "price": "12.93"},
            {"fish": "Freshwater Crayfish", "quantity": "1", "mass": "100 g", "price": "19.18"},
            {"fish": "Loach", "quantity": "2", "mass": "20 g", "price": "22.34"},
            {"fish": "Buffalo", "quantity": "1", "mass": "6.999 kg", "price": "46.59"},
            {"fish": "Chub", "quantity": "3", "mass": "750 g", "price": "57.28"},
            {"fish": "Common Roach", "quantity": "1", "mass": "1.2 kg", "price": "63.41"},
            {"fish": "Caspian Roach", "quantity": "1", "mass": "649 g", "price": "133.69"},
            {"fish": "Pike", "quantity": "3", "mass": "6.999 kg", "price": "174.79"}
        ]
    },
    "Screenshot 2025-07-10 083131.png": {
        "location": "Old Burg Lake",
        "orders": [
            {"fish": "Crucian Carp", "quantity": "3", "mass": "100 g", "price": "9.13"},
            {"fish": "Gibel Carp", "quantity": "4", "mass": "350 g", "price": "19.69"},
            {"fish": "Bleak", "quantity": "6", "mass": "20 g", "price": "19.91"},
            {"fish": "Burbot", "quantity": "1", "mass": "1.2 kg", "price": "20.43"},
            {"fish": "Common Roach", "quantity": "7", "mass": "300 g", "price": "34.28"},
            {"fish": "Ruffe", "quantity": "6", "mass": "40 g", "price": "52.97"},
            {"fish": "Bream", "quantity": "3", "mass": "1 kg", "price": "56.80"},
            {"fish": "Bleak", "quantity": "6", "mass": "74 g", "price": "86.26"},
            {"fish": "Grass Carp", "quantity": "1", "mass": "28 kg", "price": "344.50"},
            {"fish": "Pike", "quantity": "1", "mass": "15.5 kg", "price": "580.89"}
        ]
    },
    "Screenshot 2025-07-10 083353.png": {
        "location": "Sura River",
        "orders": [
            {"fish": "Chinese Sleeper", "quantity": "1", "mass": "222 g", "price": "50.22"},
            {"fish": "White Bream", "quantity": "5", "mass": "140 g", "price": "46.38"},
            {"fish": "Gibel Carp", "quantity": "3", "mass": "180 g", "price": "27.71"},
            {"fish": "Crucian Carp", "quantity": "3", "mass": "340 g", "price": "20.64"},
            {"fish": "Mirror Carp", "quantity": "1", "mass": "3 kg", "price": "26.93"},
            {"fish": "Common Carp", "quantity": "1", "mass": "3 kg", "price": "57.88"},
            {"fish": "Tench", "quantity": "1", "mass": "1.249 kg", "price": "48.38"}
        ]
    },
    "Screenshot 2025-07-10 083357.png": {
        "location": "Mosquito Lake",
        "orders": [
            {"fish": "Frog", "quantity": "1", "mass": "30 g", "price": "1.59"},
            {"fish": "Gibel Carp", "quantity": "3", "mass": "180 g", "price": "3.19"},
            {"fish": "Common Roach", "quantity": "6", "mass": "50 g", "price": "11.61"},
            {"fish": "Perch", "quantity": "5", "mass": "100 g", "price": "14.50"},
            {"fish": "Ide", "quantity": "1", "mass": "650 g", "price": "15.33"},
            {"fish": "Loach", "quantity": "2", "mass": "20 g", "price": "17.00"},
            {"fish": "Bleak", "quantity": "6", "mass": "40 g", "price": "30.41"},
            {"fish": "White Bream", "quantity": "6", "mass": "469 g", "price": "63.62"},
            {"fish": "Pike", "quantity": "2", "mass": "2 kg", "price": "70.10"},
            {"fish": "Pike", "quantity": "1", "mass": "12 kg", "price": "420.07"}
        ]
    },
    "Screenshot 2025-07-10 083401.png": {
        "location": "Tri Lake",
        "orders": [
            {"fish": "Gizzard shad", "quantity": "6", "mass": "30 g", "price": "10.01"},
            {"fish": "Warmouth", "quantity": "5", "mass": "30 g", "price": "10.46"},
            {"fish": "White crappie", "quantity": "9", "mass": "50 g", "price": "11.95"},
            {"fish": "Bluegill", "quantity": "9", "mass": "50 g", "price": "13.23"},
            {"fish": "Warmouth", "quantity": "7", "mass": "110 g", "price": "41.50"},
            {"fish": "Gizzard shad", "quantity": "8", "mass": "30 g", "price": "57.93"},
            {"fish": "Largemouth bass", "quantity": "1", "mass": "3.399 kg", "price": "80.92"},
            {"fish": "Striped Bass (Striper)", "quantity": "1", "mass": "30 kg", "price": "820.11"}
        ]
    },
    "Screenshot 2025-07-10 083404.png": {
        "location": "Winding Rivulet",
        "orders": [
            {"fish": "River mussel", "quantity": "1", "mass": "30 g", "price": "5.03"},
            {"fish": "Chinese Sleeper", "quantity": "2", "mass": "30 g", "price": "6.04"},
            {"fish": "Ruffe", "quantity": "5", "mass": "20 g", "price": "8.37"},
            {"fish": "Common Roach", "quantity": "4", "mass": "50 g", "price": "9.11"},
            {"fish": "Perch", "quantity": "5", "mass": "199 g", "price": "12.75"},
            {"fish": "Tench", "quantity": "1", "mass": "600 g", "price": "13.28"},
            {"fish": "Common Carp", "quantity": "1", "mass": "3 kg", "price": "19.16"},
            {"fish": "Gudgeon", "quantity": "5", "mass": "15 g", "price": "19.41"},
            {"fish": "Pike", "quantity": "2", "mass": "2 kg", "price": "77.49"},
            {"fish": "White-eye Bream", "quantity": "1", "mass": "600 g", "price": "86.93"}
        ]
    },
    "Screenshot 2025-07-10 083407.png": {
        "location": "The Amber Lake",
        "orders": [
            {"fish": "Common Roach", "quantity": "6", "mass": "50 g", "price": "13.32"},
            {"fish": "White Bream", "quantity": "5", "mass": "50 g", "price": "18.54"},
            {"fish": "Bleak", "quantity": "4", "mass": "20 g", "price": "20.75"},
            {"fish": "Ruffe", "quantity": "4", "mass": "20 g", "price": "20.83"},
            {"fish": "Bleak", "quantity": "5", "mass": "29 g", "price": "29.18"},
            {"fish": "White Bream", "quantity": "6", "mass": "140 g", "price": "33.51"},
            {"fish": "Perch", "quantity": "8", "mass": "100 g", "price": "38.89"},
            {"fish": "Common Roach", "quantity": "7", "mass": "749 g", "price": "45.04"},
            {"fish": "Common Carp", "quantity": "1", "mass": "9 kg", "price": "74.78"},
            {"fish": "Pike", "quantity": "1", "mass": "12 kg", "price": "361.51"}
        ]
    },
    "Screenshot 2025-07-10 083410.png": {
        "location": "Volkhov River", 
        "orders": [
            {"fish": "Common Roach", "quantity": "6", "mass": "50 g", "price": "13.68"},
            {"fish": "Bleak", "quantity": "6", "mass": "30 g", "price": "18.12"},
            {"fish": "Crucian Carp", "quantity": "3", "mass": "340 g", "price": "18.48"},
            {"fish": "Gibel Carp", "quantity": "5", "mass": "189 g", "price": "23.77"},
            {"fish": "Ruffe", "quantity": "6", "mass": "40 g", "price": "29.31"},
            {"fish": "Perch", "quantity": "8", "mass": "100 g", "price": "34.67"},
            {"fish": "Gibel Carp", "quantity": "6", "mass": "1.124 kg", "price": "47.36"},
            {"fish": "White-eye Bream", "quantity": "3", "mass": "599 g", "price": "49.28"},
            {"fish": "Bream", "quantity": "4", "mass": "2.699 kg", "price": "66.93"},
            {"fish": "Pike", "quantity": "1", "mass": "12 kg", "price": "306.24"}
        ]
    },
    "Screenshot 2025-07-10 083414.png": {
        "location": "Old Burg Lake",
        "orders": [
            {"fish": "Crucian Carp", "quantity": "3", "mass": "100 g", "price": "11.26"},
            {"fish": "Gibel Carp", "quantity": "4", "mass": "350 g", "price": "19.69"},
            {"fish": "White Bream", "quantity": "1", "mass": "50 g", "price": "20.22"},
            {"fish": "Common Roach", "quantity": "7", "mass": "300 g", "price": "31.69"},
            {"fish": "Chinese sleeper", "quantity": "1", "mass": "249 g", "price": "39.44"},
            {"fish": "Ruffe", "quantity": "6", "mass": "40 g", "price": "41.68"},
            {"fish": "Bream", "quantity": "3", "mass": "1 kg", "price": "62.28"},
            {"fish": "Ide", "quantity": "1", "mass": "2 kg", "price": "89.06"},
            {"fish": "Common Carp", "quantity": "1", "mass": "15 kg", "price": "178.05"},
            {"fish": "Pike", "quantity": "1", "mass": "15.5 kg", "price": "523.63"}
        ]
    },
    "Screenshot 2025-07-10 083417.png": {
        "location": "Sura River",
        "orders": [
            {"fish": "Chinese Sleeper", "quantity": "1", "mass": "249 g", "price": "73.29"},
            {"fish": "Common Roach", "quantity": "7", "mass": "300 g", "price": "31.19"},
            {"fish": "Common dace", "quantity": "4", "mass": "150 g", "price": "26.89"},
            {"fish": "Black-Dnieper roach", "quantity": "5", "mass": "120 g", "price": "29.64"},
            {"fish": "Ide", "quantity": "1", "mass": "650 g", "price": "25.22"},
            {"fish": "Chub", "quantity": "1", "mass": "3 kg", "price": "50.51"},
            {"fish": "Volga zander", "quantity": "1", "mass": "2.799 kg", "price": "60.60"}
        ]
    },
    "Screenshot 2025-07-10 083421.png": {
        "location": "Norwegian Sea",
        "orders": [
            {"fish": "Blue whiting", "quantity": "6", "mass": "200 g", "price": "101.01"},
            {"fish": "Sardine", "quantity": "3", "mass": "50 g", "price": "125.64"},
            {"fish": "Atlantic mackerel", "quantity": "4", "mass": "400 g", "price": "150.66"},
            {"fish": "Saithe", "quantity": "4", "mass": "3 kg", "price": "153.17"},
            {"fish": "Haddock", "quantity": "3", "mass": "1.5 kg", "price": "171.19"},
            {"fish": "Cusk", "quantity": "2", "mass": "10.999 kg", "price": "190.89"},
            {"fish": "European hake", "quantity": "1", "mass": "7.299 kg", "price": "225.65"},
            {"fish": "Atlantic redfish", "quantity": "1", "mass": "5.399 kg", "price": "2901.54"}
        ]
    },
    "Screenshot 2025-07-10 083424.png": {
        "location": "Mosquito Lake",
        "orders": [
            {"fish": "Chinese sleeper", "quantity": "1", "mass": "30 g", "price": "1.98"},
            {"fish": "Gibel Carp", "quantity": "3", "mass": "180 g", "price": "5.02"},
            {"fish": "Common Roach", "quantity": "6", "mass": "50 g", "price": "13.48"},
            {"fish": "Crucian Carp", "quantity": "3", "mass": "100 g", "price": "15.21"},
            {"fish": "White Bream", "quantity": "5", "mass": "149 g", "price": "28.91"},
            {"fish": "Perch", "quantity": "5", "mass": "299 g", "price": "36.84"},
            {"fish": "Bleak", "quantity": "6", "mass": "40 g", "price": "41.62"},
            {"fish": "White Bream", "quantity": "6", "mass": "469 g", "price": "56.53"},
            {"fish": "Pike", "quantity": "2", "mass": "2 kg", "price": "59.89"},
            {"fish": "Tench", "quantity": "1", "mass": "5.449 kg", "price": "249.55"}
        ]
    },
    "Screenshot 2025-07-10 083427.png": {
        "location": "Winding Rivulet",
        "orders": [
            {"fish": "River mussel", "quantity": "1", "mass": "30 g", "price": "6.59"},
            {"fish": "Chinese Sleeper", "quantity": "2", "mass": "30 g", "price": "7.42"},
            {"fish": "Ruffe", "quantity": "5", "mass": "20 g", "price": "8.91"},
            {"fish": "Common Roach", "quantity": "4", "mass": "50 g", "price": "8.91"},
            {"fish": "Perch", "quantity": "5", "mass": "199 g", "price": "12.24"},
            {"fish": "Common Carp", "quantity": "1", "mass": "3 kg", "price": "20.85"},
            {"fish": "Gudgeon", "quantity": "5", "mass": "15 g", "price": "21.10"},
            {"fish": "Tench", "quantity": "1", "mass": "600 g", "price": "22.48"},
            {"fish": "Grass Carp", "quantity": "1", "mass": "28 kg", "price": "380.74"},
            {"fish": "White-eye Bream", "quantity": "1", "mass": "1.199 kg", "price": "407.49"}
        ]
    },
    "Screenshot 2025-07-10 083431.png": {
        "location": "The Amber Lake",
        "orders": [
            {"fish": "Common Roach", "quantity": "6", "mass": "50 g", "price": "14.81"},
            {"fish": "White Bream", "quantity": "5", "mass": "50 g", "price": "17.61"},
            {"fish": "Bleak", "quantity": "4", "mass": "20 g", "price": "18.01"},
            {"fish": "Ruffe", "quantity": "4", "mass": "20 g", "price": "25.28"},
            {"fish": "Perch", "quantity": "8", "mass": "100 g", "price": "40.21"},
            {"fish": "Common Roach", "quantity": "7", "mass": "749 g", "price": "46.70"},
            {"fish": "White Bream", "quantity": "6", "mass": "449 g", "price": "84.48"},
            {"fish": "Bream", "quantity": "4", "mass": "850 g", "price": "98.51"},
            {"fish": "Common Carp", "quantity": "1", "mass": "15 kg", "price": "190.44"},
            {"fish": "Pike", "quantity": "1", "mass": "15.5 kg", "price": "472.37"}
        ]
    },
    "Screenshot 2025-07-10 083434.png": {
        "location": "Volkhov River",
        "orders": [
            {"fish": "Frog", "quantity": "1", "mass": "64 g", "price": "2.10"},
            {"fish": "River mussel", "quantity": "1", "mass": "139 g", "price": "7.06"},
            {"fish": "Gibel Carp", "quantity": "5", "mass": "189 g", "price": "9.51"},
            {"fish": "Crucian Carp", "quantity": "3", "mass": "340 g", "price": "17.14"},
            {"fish": "Ruffe", "quantity": "6", "mass": "40 g", "price": "31.83"},
            {"fish": "Perch", "quantity": "8", "mass": "100 g", "price": "43.29"},
            {"fish": "Bleak", "quantity": "7", "mass": "72 g", "price": "63.02"},
            {"fish": "Gibel Carp", "quantity": "6", "mass": "1.124 kg", "price": "65.04"},
            {"fish": "White-eye Bream", "quantity": "3", "mass": "599 g", "price": "65.41"},
            {"fish": "Ide", "quantity": "1", "mass": "5.249 kg", "price": "225.71"}
        ]
    },
    "Screenshot 2025-07-10 083437.png": {
        "location": "Old Burg Lake",
        "orders": [
            {"fish": "Crucian Carp", "quantity": "3", "mass": "100 g", "price": "11.16"},
            {"fish": "Gibel Carp", "quantity": "4", "mass": "350 g", "price": "17.48"},
            {"fish": "Common Roach", "quantity": "7", "mass": "300 g", "price": "31.54"},
            {"fish": "Ruffe", "quantity": "6", "mass": "40 g", "price": "41.61"},
            {"fish": "Bream", "quantity": "3", "mass": "1 kg", "price": "45.40"},
            {"fish": "Chinese sleeper", "quantity": "1", "mass": "249 g", "price": "46.24"},
            {"fish": "Ide", "quantity": "1", "mass": "2 kg", "price": "108.24"},
            {"fish": "Grass Carp", "quantity": "1", "mass": "28 kg", "price": "295.43"},
            {"fish": "Common Carp", "quantity": "1", "mass": "25 kg", "price": "424.39"},
            {"fish": "Pike", "quantity": "1", "mass": "18 kg", "price": "551.15"}
        ]
    },
    "Screenshot 2025-07-10 083441.png": {
        "location": "Akhtuba River",
        "orders": [
            {"fish": "River mussel", "quantity": "1", "mass": "90 g", "price": "3.11"},
            {"fish": "Crucian Carp", "quantity": "3", "mass": "340 g", "price": "7.78"},
            {"fish": "White Bream", "quantity": "6", "mass": "50 g", "price": "11.00"},
            {"fish": "Loach", "quantity": "2", "mass": "20 g", "price": "20.65"},
            {"fish": "Chub", "quantity": "3", "mass": "750 g", "price": "48.51"},
            {"fish": "Common Roach", "quantity": "1", "mass": "1.2 kg", "price": "50.39"},
            {"fish": "Freshwater Crayfish", "quantity": "1", "mass": "199 g", "price": "68.66"},
            {"fish": "Buffalo", "quantity": "1", "mass": "10.999 kg", "price": "82.10"},
            {"fish": "Caspian Roach", "quantity": "1", "mass": "649 g", "price": "140.61"},
            {"fish": "Pike", "quantity": "3", "mass": "6.999 kg", "price": "144.49"}
        ]
    },
    "Screenshot 2025-07-10 083444.png": {
        "location": "Tri Lake",
        "orders": [
            {"fish": "Warmouth", "quantity": "5", "mass": "30 g", "price": "11.62"},
            {"fish": "Gizzard shad", "quantity": "6", "mass": "30 g", "price": "12.52"},
            {"fish": "White crappie", "quantity": "9", "mass": "50 g", "price": "13.11"},
            {"fish": "Bluegill", "quantity": "9", "mass": "50 g", "price": "13.74"},
            {"fish": "Warmouth", "quantity": "7", "mass": "110 g", "price": "35.62"},
            {"fish": "Redear sunfish", "quantity": "2", "mass": "550 g", "price": "41.42"},
            {"fish": "Gizzard shad", "quantity": "8", "mass": "30 g", "price": "62.01"},
            {"fish": "Largemouth bass", "quantity": "1", "mass": "3.399 kg", "price": "83.18"}
        ]
    },
    "Screenshot 2025-07-10 083447.png": {
        "location": "Winding Rivulet",
        "orders": [
            {"fish": "River mussel", "quantity": "1", "mass": "30 g", "price": "5.76"},
            {"fish": "Chinese Sleeper", "quantity": "2", "mass": "30 g", "price": "6.63"},
            {"fish": "Ruffe", "quantity": "5", "mass": "20 g", "price": "9.45"},
            {"fish": "Common Roach", "quantity": "4", "mass": "50 g", "price": "9.66"},
            {"fish": "Gudgeon", "quantity": "5", "mass": "15 g", "price": "17.49"},
            {"fish": "Perch", "quantity": "5", "mass": "199 g", "price": "20.22"},
            {"fish": "Common Carp", "quantity": "1", "mass": "3 kg", "price": "26.48"},
            {"fish": "Tench", "quantity": "1", "mass": "600 g", "price": "29.20"},
            {"fish": "White-eye Bream", "quantity": "1", "mass": "600 g", "price": "116.89"},
            {"fish": "Grass Carp", "quantity": "1", "mass": "40 kg", "price": "536.73"}
        ]
    },
    "norway4.png": {
        "location": "Norwegian Sea",
        "orders": [
            {"fish": "Viviparous eelpout", "quantity": "2", "mass": "180 g", "price": "98.36"},
            {"fish": "American plaice", "quantity": "1", "mass": "700 g", "price": "100.82"},
            {"fish": "Haddock", "quantity": "3", "mass": "1.5 kg", "price": "107.46"},
            {"fish": "Atlantic mackerel", "quantity": "4", "mass": "400 g", "price": "130.37"},
            {"fish": "Pollock", "quantity": "1", "mass": "6.249 kg", "price": "174.26"},
            {"fish": "Saithe", "quantity": "4", "mass": "10.999 kg", "price": "207.46"},
            {"fish": "Viviparous eelpout", "quantity": "1", "mass": "900 g", "price": "218.23"},
            {"fish": "Saithe", "quantity": "1", "mass": "21.999 kg", "price": "340.38"}
        ]
    },
    "norway5.png": {
        "location": "Norwegian Sea",
        "orders": [
            {"fish": "Blue whiting", "quantity": "6", "mass": "200 g", "price": "74.34"},
            {"fish": "Atlantic wolffish", "quantity": "1", "mass": "2 kg", "price": "91.64"},
            {"fish": "Haddock", "quantity": "3", "mass": "1.5 kg", "price": "107.69"},
            {"fish": "Cusk", "quantity": "2", "mass": "2.5 kg", "price": "112.48"},
            {"fish": "European hake", "quantity": "1", "mass": "5.249 kg", "price": "135.89"},
            {"fish": "Sardine", "quantity": "3", "mass": "154 g", "price": "191.48"},
            {"fish": "Blue whiting", "quantity": "6", "mass": "549 g", "price": "220.70"},
            {"fish": "Turbot", "quantity": "1", "mass": "14 kg", "price": "1031.59"}
        ]
    },
    "norway6.png": {
        "location": "Norwegian Sea",
        "orders": [
            {"fish": "Blue whiting", "quantity": "6", "mass": "200 g", "price": "72.62"},
            {"fish": "Sardine", "quantity": "3", "mass": "50 g", "price": "91.00"},
            {"fish": "European hake", "quantity": "1", "mass": "1.5 kg", "price": "92.66"},
            {"fish": "Atlantic wolffish", "quantity": "1", "mass": "2 kg", "price": "101.66"},
            {"fish": "Cusk", "quantity": "2", "mass": "2.5 kg", "price": "106.60"},
            {"fish": "Saithe", "quantity": "4", "mass": "3 kg", "price": "133.20"},
            {"fish": "Small redfish", "quantity": "5", "mass": "600 g", "price": "173.60"},
            {"fish": "Atlantic redfish", "quantity": "1", "mass": "2.899 kg", "price": "1451.15"}
        ]
    }
}

def load_cafe_orders():
    """Load all cafe orders to the database"""
    db = SessionLocal()
    try:
        # Create tables if they don't exist
        create_tables()
        
        # Check existing count and only add new entries
        existing_count = db.query(CafeOrder).count()
        print(f"Found {existing_count} existing cafe orders")
        
        total_orders = 0
        new_orders = 0
        
        for image_name, data in ALL_CAFE_ORDERS.items():
            location = data['location']
            orders = data['orders']
            
            print(f"\nProcessing {image_name} - {location}:")
            
            for order in orders:
                # Parse price (remove commas)
                price_str = order['price'].replace(',', '')
                price = float(price_str)
                
                # Check if exact order exists (efficient single query)
                exists = db.query(CafeOrder).filter(
                    CafeOrder.fish_name == order['fish'],
                    CafeOrder.location == location,
                    CafeOrder.quantity == int(order['quantity']),
                    CafeOrder.mass == order['mass'],
                    CafeOrder.price == price
                ).first() is not None
                
                if not exists:
                    cafe_order = CafeOrder(
                        fish_name=order['fish'],
                        location=location,
                        quantity=int(order['quantity']),
                        mass=order['mass'],
                        price=price
                    )
                    db.add(cafe_order)
                    new_orders += 1
                    print(f"  ✅ {order['fish']} x{order['quantity']} ({order['mass']}) = ${price}")
                
                total_orders += 1
            
            # Commit after each image
            db.commit()
        
        print(f"\n✅ Successfully processed {total_orders} cafe orders - {new_orders} new, {total_orders - new_orders} already existed")
        
        # Verify by counting
        count = db.query(CafeOrder).count()
        print(f"📊 Total cafe orders in database: {count}")
        
        # Show sample queries
        print("\n📈 Sample statistics:")
        
        # Most expensive order
        most_expensive = db.query(CafeOrder).order_by(CafeOrder.price.desc()).first()
        print(f"Most expensive: {most_expensive.fish_name} at {most_expensive.location} - ${most_expensive.price}")
        
        # Count by location
        print("\nOrders by location:")
        locations = db.query(CafeOrder.location).distinct().all()
        for loc in locations:
            count = db.query(CafeOrder).filter(CafeOrder.location == loc[0]).count()
            print(f"  - {loc[0]}: {count} orders")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    load_cafe_orders()