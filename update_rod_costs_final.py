#!/usr/bin/env python3
"""
Final enhanced script to update rod costs from NewRodPrices.csv to RodList.csv
Includes specification-based matching for maximum accuracy
"""

import csv
import re
from difflib import SequenceMatcher

def clean_price(price_str):
    """Clean price string by removing commas and quotes"""
    if not price_str:
        return None
    cleaned = str(price_str).replace('"', '').replace(',', '').strip()
    try:
        return float(cleaned)
    except ValueError:
        return None

def parse_test_weight(test_str):
    """Parse test weight range like '5-35' or '10-30'"""
    if not test_str:
        return None, None
    try:
        if '-' in test_str:
            parts = test_str.split('-')
            return float(parts[0]), float(parts[1])
        else:
            return float(test_str), float(test_str)
    except ValueError:
        return None, None

def parse_numeric_value(value_str):
    """Parse numeric value safely"""
    if not value_str:
        return None
    try:
        return float(value_str)
    except ValueError:
        return None

def normalize_rod_name(name):
    """Normalize rod name for matching"""
    if not name:
        return ""
    return ' '.join(name.strip().split()).lower()

def enhance_rod_name_for_matching(name):
    """Apply enhanced normalization patterns for better matching"""
    if not name:
        return ""
    
    enhanced = normalize_rod_name(name)
    
    # Pattern 1: Normalize hyphen spacing
    enhanced = re.sub(r'\s*-\s*(\d+)\s*-\s*', r'-\1-', enhanced)
    
    # Pattern 2: Remove brand prefixes
    brand_prefixes = [
        'blade ', 'kingfisher ', 'westhill ', 'kama ', 'onega ', 'syberia ',
        'segun ', 'zeiman ', 'heaven creek ', 'express fishing ', 'silver fish ',
        'wta/', 'ocean queen - ', 'poseidon jig & pilker '
    ]
    for prefix in brand_prefixes:
        if enhanced.startswith(prefix):
            enhanced = enhanced[len(prefix):]
    
    # Pattern 3: Handle model code variations
    enhanced = re.sub(r'(cst)([fmp])(\d+)', r'\1x\2\3', enhanced)
    enhanced = re.sub(r'(cst)(x{2,})([fmp])(\d+)', r'\1x\3\4', enhanced)
    
    # Pattern 4: Handle common spelling variations
    spelling_fixes = {
        'inregra': 'integra',
        'premuim': 'premium',
        'trister': 'tristar',
        'sybera': 'syberia',
        'inventer': 'inverter',
        'duel': 'dual'
    }
    for wrong, correct in spelling_fixes.items():
        enhanced = enhanced.replace(wrong, correct)
    
    # Pattern 5: Normalize CST formatting
    enhanced = re.sub(r'cst-([fmp])', r'cst \1', enhanced)
    
    return enhanced

def calculate_spec_similarity(new_rod, existing_rod, tolerance=0.1):
    """Calculate specification similarity score"""
    spec_score = 0
    total_specs = 0
    
    # Parse specifications for new rod
    new_test_str = new_rod.get('Test (g)', '').strip()
    new_lt, new_ht = parse_test_weight(new_test_str)
    new_length = parse_numeric_value(new_rod.get('Length (m)', '').strip())
    new_load = parse_numeric_value(new_rod.get('Load Capacity (kg)', '').strip())
    new_level = new_rod.get('Level Req', '').strip()
    
    # Parse specifications for existing rod
    existing_lt = parse_numeric_value(existing_rod.get('LT', '').strip())
    existing_ht = parse_numeric_value(existing_rod.get('HT', '').strip())
    existing_length = parse_numeric_value(existing_rod.get('Length', '').strip())
    existing_load = parse_numeric_value(existing_rod.get('Max Load', '').strip())
    existing_level = existing_rod.get('Lvl', '').strip()
    
    # Length comparison (high weight)
    if new_length is not None and existing_length is not None:
        length_diff = abs(new_length - existing_length)
        if length_diff <= tolerance:
            spec_score += 3
        total_specs += 3
    
    # Test weight range comparison (high weight)
    if (new_lt is not None and new_ht is not None and
        existing_lt is not None and existing_ht is not None):
        
        # Calculate range overlap
        overlap_start = max(new_lt, existing_lt)
        overlap_end = min(new_ht, existing_ht)
        
        if overlap_end >= overlap_start:  # Ranges overlap
            new_range_size = new_ht - new_lt
            existing_range_size = existing_ht - existing_lt
            overlap_size = overlap_end - overlap_start
            
            if new_range_size > 0 and existing_range_size > 0:
                overlap_ratio = overlap_size / max(new_range_size, existing_range_size)
                spec_score += overlap_ratio * 2
        total_specs += 2
    
    # Load capacity comparison (medium weight)
    if new_load is not None and existing_load is not None:
        load_diff = abs(new_load - existing_load)
        load_tolerance = max(new_load, existing_load) * 0.2  # 20% tolerance
        if load_diff <= load_tolerance:
            spec_score += 1
        total_specs += 1
    
    # Level comparison (low weight)
    if new_level and existing_level:
        try:
            if int(new_level) == int(existing_level):
                spec_score += 0.5
        except ValueError:
            pass
        total_specs += 0.5
    
    return spec_score / total_specs if total_specs > 0 else 0

def read_new_prices(csv_file):
    """Read the new rod prices from NewRodPrices.csv"""
    price_updates = {}
    rod_data = {}
    try:
        with open(csv_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                name = row.get('Name', '').strip()
                cost = row.get('Cost (pushed up)', '').strip()
                
                if not name or not cost or 'Rods' in name:
                    continue
                
                cleaned_cost = clean_price(cost)
                if cleaned_cost is not None:
                    price_updates[name] = cleaned_cost
                    rod_data[name] = row
                    
        print(f"Read {len(price_updates)} price updates from {csv_file}")
        return price_updates, rod_data
    except Exception as e:
        print(f"Error reading {csv_file}: {e}")
        return {}, {}

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

def find_best_match(target_name, available_names, rod_lookup, new_rod_data, price_updates_data):
    """Find the best matching rod name using enhanced and specification matching"""
    target_norm = normalize_rod_name(target_name)
    target_enhanced = enhance_rod_name_for_matching(target_name)
    
    # First try exact match on original name
    if target_name in rod_lookup:
        return target_name, "exact"
    
    # Try exact match on normalized name
    for name in available_names:
        if normalize_rod_name(name) == target_norm:
            return name, "normalized"
    
    # Try enhanced matching
    for name in available_names:
        name_enhanced = enhance_rod_name_for_matching(name)
        if name_enhanced == target_enhanced:
            return name, "enhanced"
    
    # Try specification-based matching for unmatched rods
    target_data = price_updates_data.get(target_name, {})
    best_match = None
    best_score = 0
    best_type = "specification"
    
    for name in available_names:
        existing_rod = rod_lookup[name]
        
        # Calculate specification similarity
        spec_score = calculate_spec_similarity(target_data, existing_rod)
        
        # Calculate name similarity
        name_similarity = SequenceMatcher(None, target_norm, normalize_rod_name(name)).ratio()
        
        # Combined score: 80% specification, 20% name similarity
        combined_score = spec_score * 0.8 + name_similarity * 0.2
        
        if combined_score > best_score and combined_score >= 0.75:  # High threshold
            best_match = name
            best_score = combined_score
    
    # Also try partial word matching with enhanced names (existing logic)
    if not best_match:
        target_words = target_enhanced.split()
        for name in available_names:
            name_enhanced = enhance_rod_name_for_matching(name)
            name_words = name_enhanced.split()
            
            matching_words = sum(1 for word in target_words if word in name_words)
            score = matching_words / len(target_words) if target_words else 0
            
            if score > best_score and score >= 0.8:
                best_match = name
                best_score = score
                best_type = "enhanced"
    
    return best_match, best_type if best_match else None

def update_rod_prices(rods, price_updates, price_updates_data):
    """Update rod prices with new data using enhanced and specification matching"""
    updated_count = 0
    unmatched_prices = []
    match_details = []
    
    # Create a mapping of rod names for easier lookup
    rod_lookup = {rod['Rod']: rod for rod in rods}
    rod_names = list(rod_lookup.keys())
    
    for new_rod_name, new_price in price_updates.items():
        # Try to find best match
        match_result = find_best_match(new_rod_name, rod_names, rod_lookup, new_rod_name, price_updates_data)
        
        if match_result[0]:  # If we found a match
            best_match, match_type = match_result
            old_price = rod_lookup[best_match]['Cost']
            rod_lookup[best_match]['Cost'] = str(new_price)
            
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
        for rod in unmatched_prices[:20]:
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
    output_file = "RodList_updated_final.csv"
    
    print("=== Final Enhanced Rod Cost Update Script ===")
    print("Features: Enhanced matching + Specification-based matching")
    
    # Read new prices
    print(f"\n1. Reading new prices from {price_file}...")
    price_updates, price_updates_data = read_new_prices(price_file)
    
    if not price_updates:
        print("No price updates found. Exiting.")
        return
    
    # Read current rod list
    print(f"\n2. Reading current rod list from {rod_file}...")
    current_rods = read_current_rod_list(rod_file)
    
    if not current_rods:
        print("Failed to read current rod list. Exiting.")
        return
    
    # Update prices with enhanced + specification matching
    print(f"\n3. Matching and updating rod prices with final algorithms...")
    updated_rods, unmatched, match_details = update_rod_prices(current_rods, price_updates, price_updates_data)
    
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
        print(f"Final match rate: {match_rate:.1f}%")
        
        enhanced_match_rate = 85.7  # From enhanced script
        improvement = match_rate - enhanced_match_rate
        print(f"Improvement over enhanced matching: +{improvement:.1f}%")

if __name__ == "__main__":
    main()