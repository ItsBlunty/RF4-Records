#!/usr/bin/env python3
"""
Enhanced script to update rod costs from NewRodPrices.csv to RodList.csv
Includes improved matching logic for naming pattern differences
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

def enhance_rod_name_for_matching(name):
    """Apply enhanced normalization patterns for better matching"""
    if not name:
        return ""
    
    # Convert to lowercase and normalize spaces
    enhanced = normalize_rod_name(name)
    
    # Pattern 1: Normalize hyphen spacing (e.g., "- 80 -" -> "-80-")
    enhanced = re.sub(r'\s*-\s*(\d+)\s*-\s*', r'-\1-', enhanced)
    
    # Pattern 2: Remove brand prefixes that appear inconsistently
    brand_prefixes = [
        'blade ', 'kingfisher ', 'westhill ', 'kama ', 'onega ', 'syberia ',
        'segun ', 'zeiman ', 'heaven creek ', 'express fishing ', 'silver fish '
    ]
    for prefix in brand_prefixes:
        if enhanced.startswith(prefix):
            enhanced = enhanced[len(prefix):]
    
    # Pattern 3: Handle model code variations (missing X)
    # e.g., "cstf88h" -> "cstxf88h" and vice versa
    enhanced = re.sub(r'(cst)([fmp])(\d+)', r'\1x\2\3', enhanced)
    enhanced = re.sub(r'(cst)(x{2,})([fmp])(\d+)', r'\1x\3\4', enhanced)  # Remove double X
    
    # Pattern 4: Handle common spelling variations
    spelling_fixes = {
        'inregra': 'integra',
        'premuim': 'premium', 
        'trister': 'tristar'
    }
    for wrong, correct in spelling_fixes.items():
        enhanced = enhanced.replace(wrong, correct)
    
    # Pattern 5: Normalize CST formatting
    enhanced = re.sub(r'cst-([fmp])', r'cst \1', enhanced)
    
    return enhanced

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

def find_best_match(target_name, available_names, rod_lookup):
    """Find the best matching rod name using enhanced matching"""
    target_norm = normalize_rod_name(target_name)
    target_enhanced = enhance_rod_name_for_matching(target_name)
    
    # First try exact match on original name
    if target_name in rod_lookup:
        return target_name
    
    # Try exact match on normalized name
    for name in available_names:
        if normalize_rod_name(name) == target_norm:
            return name
    
    # Try enhanced matching
    for name in available_names:
        name_enhanced = enhance_rod_name_for_matching(name)
        if name_enhanced == target_enhanced:
            return name
    
    # Try partial matches with enhanced names
    target_words = target_enhanced.split()
    best_match = None
    best_score = 0
    
    for name in available_names:
        name_enhanced = enhance_rod_name_for_matching(name)
        name_words = name_enhanced.split()
        
        # Count how many target words are in the current name
        matching_words = sum(1 for word in target_words if word in name_words)
        score = matching_words / len(target_words) if target_words else 0
        
        if score > best_score and score >= 0.8:  # Increased threshold for enhanced matching
            best_match = name
            best_score = score
    
    return best_match

def update_rod_prices(rods, price_updates):
    """Update rod prices with new data using enhanced matching"""
    updated_count = 0
    unmatched_prices = []
    match_details = []
    
    # Create a mapping of rod names for easier lookup
    rod_lookup = {rod['Rod']: rod for rod in rods}
    rod_names = list(rod_lookup.keys())
    
    for new_rod_name, new_price in price_updates.items():
        # Try to find best match
        best_match = find_best_match(new_rod_name, rod_names, rod_lookup)
        
        if best_match:
            old_price = rod_lookup[best_match]['Cost']
            rod_lookup[best_match]['Cost'] = str(new_price)
            
            # Determine match type for reporting
            if best_match == new_rod_name:
                match_type = "exact"
            elif normalize_rod_name(best_match) == normalize_rod_name(new_rod_name):
                match_type = "normalized"
            else:
                match_type = "enhanced"
            
            print(f"✓ Updated '{best_match}' ({match_type} match from '{new_rod_name}'): {old_price} -> {new_price}")
            match_details.append({
                'original': new_rod_name,
                'matched': best_match,
                'type': match_type,
                'old_price': old_price,
                'new_price': new_price
            })
            updated_count += 1
        else:
            unmatched_prices.append(new_rod_name)
            print(f"✗ No match found for: '{new_rod_name}'")
    
    print(f"\n=== Update Summary ===")
    print(f"Updated {updated_count} rod prices")
    print(f"Unmatched rods: {len(unmatched_prices)}")
    
    # Summary by match type
    match_types = {}
    for detail in match_details:
        match_types[detail['type']] = match_types.get(detail['type'], 0) + 1
    
    print(f"\nMatch breakdown:")
    for match_type, count in match_types.items():
        print(f"  {match_type}: {count}")
    
    if unmatched_prices:
        print(f"\nUnmatched rods from price sheet:")
        for rod in unmatched_prices[:20]:  # Show first 20
            print(f"  - {rod}")
        if len(unmatched_prices) > 20:
            print(f"  ... and {len(unmatched_prices) - 20} more")
    
    return rods, unmatched_prices, match_details

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
    output_file = "RodList_updated_enhanced.csv"
    
    print("=== Enhanced Rod Cost Update Script ===")
    print("Features: Enhanced matching for naming differences")
    
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
    
    # Update prices with enhanced matching
    print(f"\n3. Matching and updating rod prices with enhanced algorithms...")
    updated_rods, unmatched, match_details = update_rod_prices(current_rods, price_updates)
    
    # Write updated CSV
    print(f"\n4. Writing updated CSV...")
    write_updated_csv(updated_rods, output_file)
    
    print(f"\n=== Final Summary ===")
    print(f"Total rods in master list: {len(current_rods)}")
    print(f"Total price updates available: {len(price_updates)}")
    print(f"Price updates applied: {len(price_updates) - len(unmatched)}")
    print(f"Unmatched rod names: {len(unmatched)}")
    
    if len(unmatched) > 0:
        match_rate = ((len(price_updates) - len(unmatched))/len(price_updates)*100)
        print(f"Match rate: {match_rate:.1f}%")
        
        previous_match_rate = 43.1  # From original script
        improvement = match_rate - previous_match_rate
        print(f"Improvement over basic matching: +{improvement:.1f}%")

if __name__ == "__main__":
    main()