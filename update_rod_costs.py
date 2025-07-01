#!/usr/bin/env python3
"""
Script to update rod costs from NewRodPrices.csv to RodList.csv
"""

import csv
import re

def clean_price(price_str):
    """Clean price string by removing commas and quotes"""
    if not price_str:
        return None
    # Remove quotes and commas, convert to float
    cleaned = str(price_str).replace('"', '').replace(',', '').strip()
    try:
        return float(cleaned)
    except ValueError:
        return None

def normalize_rod_name(name):
    """Normalize rod name for matching"""
    if not name:
        return ""
    # Remove extra spaces and convert to lowercase for comparison
    return ' '.join(name.strip().split()).lower()

def read_new_prices(csv_file):
    """Read the new rod prices from NewRodPrices.csv"""
    price_updates = {}
    try:
        with open(csv_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                name = row.get('Name', '').strip()
                cost = row.get('Cost (pushed up)', '').strip()
                
                # Skip empty names or section headers
                if not name or not cost or 'Rods' in name:
                    continue
                
                cleaned_cost = clean_price(cost)
                if cleaned_cost is not None:
                    price_updates[name] = cleaned_cost
                    
        print(f"Read {len(price_updates)} price updates from {csv_file}")
        return price_updates
    except Exception as e:
        print(f"Error reading {csv_file}: {e}")
        return {}

def read_current_rod_list(csv_file):
    """Read the current RodList.csv"""
    rods = []
    try:
        with open(csv_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                rods.append(row)
        print(f"Read {len(rods)} rods from {csv_file}")
        return rods
    except Exception as e:
        print(f"Error reading {csv_file}: {e}")
        return []

def find_best_match(target_name, available_names):
    """Find the best matching rod name"""
    target_norm = normalize_rod_name(target_name)
    
    # First try exact match
    for name in available_names:
        if normalize_rod_name(name) == target_norm:
            return name
    
    # Try partial matches - look for names that contain all words
    target_words = target_norm.split()
    best_match = None
    best_score = 0
    
    for name in available_names:
        name_norm = normalize_rod_name(name)
        name_words = name_norm.split()
        
        # Count how many target words are in the current name
        matching_words = sum(1 for word in target_words if word in name_words)
        score = matching_words / len(target_words)
        
        if score > best_score and score >= 0.7:  # At least 70% word match
            best_match = name
            best_score = score
    
    return best_match

def update_rod_prices(rods, price_updates):
    """Update rod prices with new data"""
    updated_count = 0
    unmatched_prices = []
    
    # Create a mapping of rod names for easier lookup
    rod_lookup = {rod['Rod']: rod for rod in rods}
    rod_names = list(rod_lookup.keys())
    
    for new_rod_name, new_price in price_updates.items():
        # Try to find exact match first
        if new_rod_name in rod_lookup:
            old_price = rod_lookup[new_rod_name]['Cost']
            rod_lookup[new_rod_name]['Cost'] = str(new_price)
            print(f"✓ Updated '{new_rod_name}': {old_price} -> {new_price}")
            updated_count += 1
        else:
            # Try to find partial match
            best_match = find_best_match(new_rod_name, rod_names)
            if best_match:
                old_price = rod_lookup[best_match]['Cost']
                rod_lookup[best_match]['Cost'] = str(new_price)
                print(f"✓ Updated '{best_match}' (matched from '{new_rod_name}'): {old_price} -> {new_price}")
                updated_count += 1
            else:
                unmatched_prices.append(new_rod_name)
                print(f"✗ No match found for: '{new_rod_name}'")
    
    print(f"\n=== Update Summary ===")
    print(f"Updated {updated_count} rod prices")
    print(f"Unmatched rods: {len(unmatched_prices)}")
    
    if unmatched_prices:
        print(f"\nUnmatched rods from price sheet:")
        for rod in unmatched_prices:
            print(f"  - {rod}")
    
    return rods, unmatched_prices

def write_updated_csv(rods, output_file):
    """Write the updated rod list to CSV"""
    if not rods:
        print("No rods to write")
        return
    
    try:
        with open(output_file, 'w', newline='', encoding='utf-8') as f:
            fieldnames = rods[0].keys()
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rods)
        print(f"Updated rod list written to {output_file}")
    except Exception as e:
        print(f"Error writing {output_file}: {e}")

def main():
    # File paths
    price_file = "NewRodPrices.csv"
    rod_file = "RodList.csv"
    output_file = "RodList_updated.csv"
    
    print("=== Rod Cost Update Script ===")
    
    # Read new prices
    print(f"\n1. Reading new prices from {price_file}...")
    price_updates = read_new_prices(price_file)
    
    if not price_updates:
        print("No price updates found. Exiting.")
        return
    
    # Read current rod list
    print(f"\n2. Reading current rod list from {rod_file}...")
    current_rods = read_current_rod_list(rod_file)
    
    if not current_rods:
        print("Failed to read current rod list. Exiting.")
        return
    
    # Update prices
    print(f"\n3. Matching and updating rod prices...")
    updated_rods, unmatched = update_rod_prices(current_rods, price_updates)
    
    # Write updated CSV
    print(f"\n4. Writing updated CSV...")
    write_updated_csv(updated_rods, output_file)
    
    print(f"\n=== Final Summary ===")
    print(f"Total rods in master list: {len(current_rods)}")
    print(f"Total price updates available: {len(price_updates)}")
    print(f"Price updates applied: {len(price_updates) - len(unmatched)}")
    print(f"Unmatched rod names: {len(unmatched)}")
    
    if len(unmatched) > 0:
        print(f"\nMatch rate: {((len(price_updates) - len(unmatched))/len(price_updates)*100):.1f}%")

if __name__ == "__main__":
    main()