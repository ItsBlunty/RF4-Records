#!/usr/bin/env python3
"""
Script to populate cafe orders table with extracted data from screenshots.
This script contains the manually extracted and verified data from the first 4 cafe order images.
"""

import requests
import sys
import os

# Add the backend directory to the path to import database modules
sys.path.append(os.path.join(os.path.dirname(__file__), 'RF4 Records', 'backend'))

def populate_cafe_orders():
    """Populate the cafe orders table with extracted data."""
    
    # Data extracted from Screenshot 2025-07-10 082415.png
    norwegian_sea_orders_1 = [
        {"fish_name": "Atlantic wolffish", "location": "Norwegian Sea", "quantity": 1, "mass": "2 kg", "price": 70.18},
        {"fish_name": "Blue whiting", "location": "Norwegian Sea", "quantity": 6, "mass": "200 g", "price": 79.04},
        {"fish_name": "Cusk", "location": "Norwegian Sea", "quantity": 2, "mass": "2.5 kg", "price": 93.97},
        {"fish_name": "Viviparous eelpout", "location": "Norwegian Sea", "quantity": 2, "mass": "180 g", "price": 98.56},
        {"fish_name": "Saithe", "location": "Norwegian Sea", "quantity": 4, "mass": "3 kg", "price": 114.18},
        {"fish_name": "Atlantic herring", "location": "Norwegian Sea", "quantity": 1, "mass": "489 g", "price": 160.57},
        {"fish_name": "Beaked redfish", "location": "Norwegian Sea", "quantity": 1, "mass": "5.5 kg", "price": 598.93},
        {"fish_name": "Northern wolffish", "location": "Norwegian Sea", "quantity": 1, "mass": "13 kg", "price": 3685.74},
    ]
    
    # Data extracted from Screenshot 2025-07-10 082442.png
    norwegian_sea_orders_2 = [
        {"fish_name": "Longhead dab", "location": "Norwegian Sea", "quantity": 1, "mass": "450 g", "price": 71.36},
        {"fish_name": "Blue whiting", "location": "Norwegian Sea", "quantity": 6, "mass": "200 g", "price": 102.24},
        {"fish_name": "Atlantic mackerel", "location": "Norwegian Sea", "quantity": 4, "mass": "400 g", "price": 124.16},
        {"fish_name": "Atlantic mackerel", "location": "Norwegian Sea", "quantity": 1, "mass": "2 kg", "price": 132.79},
        {"fish_name": "Saithe", "location": "Norwegian Sea", "quantity": 4, "mass": "3 kg", "price": 133.74},
        {"fish_name": "American plaice", "location": "Norwegian Sea", "quantity": 1, "mass": "2.349 kg", "price": 170.42},
        {"fish_name": "Small redfish", "location": "Norwegian Sea", "quantity": 5, "mass": "600 g", "price": 174.24},
        {"fish_name": "Edible crab", "location": "Norwegian Sea", "quantity": 1, "mass": "1.999 kg", "price": 738.70},
    ]
    
    # Data extracted from Screenshot 2025-07-10 082449.png (corrected mass for Viviparous eelpout)
    norwegian_sea_orders_3 = [
        {"fish_name": "Sardine", "location": "Norwegian Sea", "quantity": 3, "mass": "50 g", "price": 106.31},
        {"fish_name": "Haddock", "location": "Norwegian Sea", "quantity": 3, "mass": "1.5 kg", "price": 112.81},
        {"fish_name": "European hake", "location": "Norwegian Sea", "quantity": 1, "mass": "5.249 kg", "price": 121.65},
        {"fish_name": "Atlantic mackerel", "location": "Norwegian Sea", "quantity": 1, "mass": "2.399 kg", "price": 150.68},
        {"fish_name": "Icelandic scallop", "location": "Norwegian Sea", "quantity": 1, "mass": "224 g", "price": 161.57},
        {"fish_name": "Viviparous eelpout", "location": "Norwegian Sea", "quantity": 2, "mass": "539 g", "price": 206.98},
        {"fish_name": "Saithe", "location": "Norwegian Sea", "quantity": 4, "mass": "10.999 kg", "price": 238.35},
        {"fish_name": "Beaked redfish", "location": "Norwegian Sea", "quantity": 1, "mass": "5.5 kg", "price": 612.23},
    ]
    
    # Data extracted from Screenshot 2025-07-10 082458.png (corrected mass for American plaice)
    norwegian_sea_orders_4 = [
        {"fish_name": "Mussel", "location": "Norwegian Sea", "quantity": 1, "mass": "40 g", "price": 102.71},
        {"fish_name": "Shorthorn sculpin", "location": "Norwegian Sea", "quantity": 6, "mass": "600 g", "price": 105.72},
        {"fish_name": "Sardine", "location": "Norwegian Sea", "quantity": 1, "mass": "180 g", "price": 125.12},
        {"fish_name": "Sardine", "location": "Norwegian Sea", "quantity": 3, "mass": "114 g", "price": 177.25},
        {"fish_name": "American plaice", "location": "Norwegian Sea", "quantity": 1, "mass": "2.349 kg", "price": 187.51},
        {"fish_name": "Atlantic saury", "location": "Norwegian Sea", "quantity": 4, "mass": "374 g", "price": 269.32},
        {"fish_name": "Atlantic mackerel", "location": "Norwegian Sea", "quantity": 4, "mass": "1.199 kg", "price": 282.40},
        {"fish_name": "Atlantic redfish", "location": "Norwegian Sea", "quantity": 1, "mass": "9 kg", "price": 1919.94},
    ]
    
    # Data extracted from Screenshot 2025-07-10 082602.png
    seversky_donets_orders = [
        {"fish_name": "Crucian Carp", "location": "Seversky Donets River", "quantity": 2, "mass": "189 g", "price": 4.25},
        {"fish_name": "River mussel", "location": "Seversky Donets River", "quantity": 1, "mass": "139 g", "price": 11.48},
        {"fish_name": "Sichel", "location": "Seversky Donets River", "quantity": 4, "mass": "149 g", "price": 14.83},
        {"fish_name": "Burbot", "location": "Seversky Donets River", "quantity": 1, "mass": "1.2 kg", "price": 22.59},
        {"fish_name": "Gibel Carp", "location": "Seversky Donets River", "quantity": 6, "mass": "350 g", "price": 23.69},
        {"fish_name": "Zander", "location": "Seversky Donets River", "quantity": 1, "mass": "1.5 kg", "price": 34.14},
        {"fish_name": "Clupeenella", "location": "Seversky Donets River", "quantity": 4, "mass": "16 g", "price": 50.62},
        {"fish_name": "Common Carp", "location": "Seversky Donets River", "quantity": 1, "mass": "11.499 kg", "price": 54.92},
        {"fish_name": "Donets Ruffe", "location": "Seversky Donets River", "quantity": 1, "mass": "299 g", "price": 339.15},
        {"fish_name": "Grass Carp", "location": "Seversky Donets River", "quantity": 1, "mass": "28 kg", "price": 431.87},
    ]
    
    # Combine all orders
    all_orders = (
        norwegian_sea_orders_1 + 
        norwegian_sea_orders_2 + 
        norwegian_sea_orders_3 + 
        norwegian_sea_orders_4 + 
        seversky_donets_orders
    )
    
    # Try to use the API endpoint if server is running
    try:
        response = requests.post('http://localhost:8000/api/cafe-orders/confirm', json=all_orders)
        if response.status_code == 200:
            print(f"Successfully inserted {len(all_orders)} cafe orders via API")
            return True
        else:
            print(f"API request failed with status {response.status_code}: {response.text}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"Could not connect to API: {e}")
        print("Attempting direct database insertion...")
        
        # Fallback to direct database insertion
        try:
            from database import get_db
            from sqlalchemy.orm import Session
            from models import CafeOrder
            
            # Get database session
            db_gen = get_db()
            db: Session = next(db_gen)
            
            # Insert orders
            for order in all_orders:
                cafe_order = CafeOrder(**order)
                db.add(cafe_order)
            
            db.commit()
            print(f"Successfully inserted {len(all_orders)} cafe orders directly to database")
            return True
            
        except Exception as e:
            print(f"Direct database insertion failed: {e}")
            return False

if __name__ == "__main__":
    success = populate_cafe_orders()
    if success:
        print("Cafe orders population completed successfully!")
    else:
        print("Failed to populate cafe orders. Check error messages above.")
        sys.exit(1)