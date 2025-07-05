#!/usr/bin/env python3
"""
Improved Reel Matcher with Advanced Name Normalization
Handles variations like hyphens, spaces, and punctuation in reel names
"""

import csv
import re
from collections import defaultdict
from difflib import SequenceMatcher
import unicodedata

def normalize_name(name):
    """
    Advanced normalization function that handles multiple variations
    """
    if not name:
        return ""
    
    # Convert to string and strip whitespace
    name = str(name).strip()
    
    # Convert to lowercase
    name = name.lower()
    
    # Normalize unicode characters
    name = unicodedata.normalize('NFKD', name)
    
    # Remove version indicators and special editions (but be less aggressive)
    version_patterns = [
        r'\s*\b\d+-?(anniversary|years?|y)\b.*$',
        r'\s*\b(anniversary|years?|edition|version|v\d+)\b.*$',
        r'\s*\b(ltd|limited|special|se|le)\b.*$',
        r'\s*\b(pearl|yellow|blue|orange|purple|red|green|black|white|gold|silver)\b.*$',
        r'\s*\b(lctr|lc|tr|mc|ng|ngt|cs|sr|sg|pg|ld|shs|hs|gs|bs|rs|es|el\.|mag\.)\b.*$',
        r'\s*\b(desert\s+sand|dragon\s+edit\.|emerald|celestia|raven)\b.*$'
    ]
    
    for pattern in version_patterns:
        name = re.sub(pattern, '', name, flags=re.IGNORECASE)
    
    # Normalize hyphens and spaces
    # Replace multiple hyphens/spaces with single space
    name = re.sub(r'[-\s]+', ' ', name)
    
    # Remove all punctuation except numbers, letters, and hyphens
    name = re.sub(r'[^\w\s-]', '', name)
    
    # Remove extra spaces
    name = re.sub(r'\s+', ' ', name).strip()
    
    return name

def create_variations(name):
    """
    Create multiple variations of a name for matching
    """
    variations = set()
    
    # Original normalized name
    base_name = normalize_name(name)
    variations.add(base_name)
    
    if not base_name:
        return variations
    
    # Remove all spaces
    variations.add(base_name.replace(' ', ''))
    
    # Replace spaces with hyphens
    variations.add(base_name.replace(' ', '-'))
    
    # Add hyphens between letters and numbers
    # E.g., "z60" -> "z-60", "zm3" -> "zm-3"
    hyphenated = re.sub(r'([a-z])(\d)', r'\1-\2', base_name)
    variations.add(hyphenated)
    variations.add(hyphenated.replace(' ', ''))
    
    # Remove hyphens entirely
    no_hyphens = base_name.replace('-', '')
    variations.add(no_hyphens)
    variations.add(no_hyphens.replace(' ', ''))
    
    # Try with different spacing around numbers
    # E.g., "z 60" -> "z60", "z-60" -> "z 60"
    spaced_numbers = re.sub(r'([a-z])\s*-?\s*(\d)', r'\1 \2', base_name)
    variations.add(spaced_numbers)
    variations.add(spaced_numbers.replace(' ', ''))
    
    return variations

def similarity_score(s1, s2):
    """
    Calculate similarity score between two strings
    """
    return SequenceMatcher(None, s1, s2).ratio()

def find_matches(current_reels, source_reels):
    """
    Find matches using multiple strategies
    """
    matches = []
    unmatched_current = []
    unmatched_source = []
    
    # Create lookup dictionaries for source reels
    source_by_exact = {}
    source_by_variations = defaultdict(list)
    
    print("Building source reel lookup tables...")
    for source_reel in source_reels:
        source_name = source_reel.get('Reel', '').strip()
        if not source_name:
            continue
            
        # Exact match lookup
        normalized_source = normalize_name(source_name)
        source_by_exact[normalized_source] = source_reel
        
        # Variations lookup
        variations = create_variations(source_name)
        for variation in variations:
            if variation:  # Only add non-empty variations
                source_by_variations[variation].append((source_reel, source_name))
    
    print(f"Created {len(source_by_exact)} exact entries and {len(source_by_variations)} variation entries")
    
    # Track which source reels have been matched
    matched_source_names = set()
    
    # Process current reels
    processed_count = 0
    for current_reel in current_reels:
        current_name = current_reel.get('Reel', '').strip()
        if not current_name:
            continue
            
        # Get test value for debugging but don't skip based on it
        test_value = current_reel.get('Test', '').strip()
        
        processed_count += 1
        if processed_count <= 5:  # Debug first 5 processed reels
            print(f"Processing '{current_name}' (test: '{test_value}')")
            
        match_found = False
        best_match = None
        best_score = 0
        match_type = ""
        
        # Strategy 1: Exact match after normalization
        normalized_current = normalize_name(current_name)
        if normalized_current in source_by_exact:
            source_reel = source_by_exact[normalized_current]
            source_name = source_reel.get('Reel', '')
            if source_name not in matched_source_names:
                best_match = source_reel
                best_score = 1.0
                match_type = "exact"
                match_found = True
        
        # Strategy 2: Variation matching
        if not match_found:
            current_variations = create_variations(current_name)
            for variation in current_variations:
                if variation in source_by_variations:
                    for source_reel, source_name in source_by_variations[variation]:
                        if source_name not in matched_source_names:
                            score = similarity_score(normalized_current, normalize_name(source_name))
                            if score > best_score:
                                best_match = source_reel
                                best_score = score
                                match_type = "variation"
                                match_found = True
        
        # Strategy 3: Fuzzy matching for high similarity
        if not match_found or best_score < 0.8:
            for source_name, source_reel in source_by_exact.items():
                if source_reel.get('Reel', '') not in matched_source_names:
                    score = similarity_score(normalized_current, source_name)
                    if score > max(0.8, best_score):
                        best_match = source_reel
                        best_score = score
                        match_type = "fuzzy"
                        match_found = True
        
        if match_found and best_match:
            # Mark source as matched
            matched_source_names.add(best_match.get('Reel', ''))
            
            matches.append({
                'current': current_reel,
                'source': best_match,
                'score': best_score,
                'type': match_type,
                'current_name': current_name,
                'source_name': best_match.get('Reel', '')
            })
        else:
            unmatched_current.append(current_reel)
    
    print(f"Processed {processed_count} current reels for matching")
    
    # Find unmatched source reels
    for source_reel in source_reels:
        source_name = source_reel.get('Reel', '').strip()
        if source_name and source_name not in matched_source_names:
            unmatched_source.append(source_reel)
    
    return matches, unmatched_current, unmatched_source

def update_reel_data(current_reel, source_reel):
    """
    Update current reel with data from source reel
    """
    # Fields to copy from source to current - just demonstrate the match for now
    # Don't actually update the data yet until we verify matches are correct
    updates = []
    
    # Check what fields are available
    source_fields = list(source_reel.keys())
    current_fields = list(current_reel.keys())
    
    # Show what we could potentially update
    if source_reel.get('Drag', '').strip():
        updates.append(f"Test: {source_reel.get('Drag', '').strip()}")
    if source_reel.get('Saltwater', '').strip():
        updates.append(f"Saltwater: {source_reel.get('Saltwater', '').strip()}")
    if source_reel.get('Gear Ratio', '').strip():
        updates.append(f"Gear Ratio: {source_reel.get('Gear Ratio', '').strip()}")
    if source_reel.get('Cost', '').strip():
        updates.append(f"Cost: {source_reel.get('Cost', '').strip()}")
    
    if updates:
        print(f"    Would update with: {'; '.join(updates)}")
    
    # Don't actually update the data yet
    return

def main():
    # File paths
    current_file = '/home/itsblunty/workspace/rf4recordssite/RF4-Records/RF4 Records/frontend/public/data/reels.csv'
    source_file = '/home/itsblunty/workspace/rf4recordssite/RF4-Records/ReelListbluntysource.csv'
    
    # Debug: Test specific examples first
    print("Testing normalization examples:")
    test_names = ["ZM-3 Z-60", "ZM-3 Z60", "ZM-3 Spear SG70", "Imperial R600", "Minister 2000"]
    for name in test_names:
        normalized = normalize_name(name)
        variations = create_variations(name)
        print(f"  '{name}' -> '{normalized}' -> {len(variations)} variations: {list(variations)[:3]}...")
    print()
    
    # Read current reels
    print("Reading current reels...")
    current_reels = []
    with open(current_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
        # Find the header row (should contain "Reel,Test,Saltwater Resistance,...")
        header_row = None
        data_start_row = None
        for i, line in enumerate(lines):
            if 'Reel,Test,Saltwater Resistance' in line:
                header_row = i
                data_start_row = i + 1
                break
        
        if header_row is None:
            print("Could not find header row!")
            return
            
        print(f"Found header at row {header_row}")
        headers = lines[header_row].strip().split(',')  # No need to skip first column anymore
        print(f"Headers: {headers[:5]}...")  # Show first 5 headers
        
        # Process data rows
        for row_num in range(data_start_row, len(lines)):
            line = lines[row_num].strip()
            if not line:
                continue
                
            values = line.split(',')  # No need to skip first column anymore
            if len(values) < len(headers):
                # Pad with empty strings if row is shorter
                values.extend([''] * (len(headers) - len(values)))
            
            # Create dictionary from headers and values
            row = {}
            for i, header in enumerate(headers):
                if i < len(values):
                    row[header] = values[i]
                else:
                    row[header] = ''
            
            reel_name = row.get('Reel', '').strip()
            if row_num - data_start_row < 5:  # Debug first few data rows
                print(f"Data row {row_num - data_start_row}: '{reel_name}'")
                
            if reel_name and not reel_name.startswith('БЕЗЫНЕРЦИОННЫЕ') and not reel_name.startswith('БАЙТКАСТИНГОВЫЕ') and not reel_name.startswith('СИЛОВЫЕ') and reel_name != '':
                current_reels.append(row)
    
    print(f"Found {len(current_reels)} current reels")
    
    # Read source reels
    print("Reading source reels...")
    source_reels = []
    with open(source_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row.get('Reel'):  # Skip empty rows
                source_reels.append(row)
    
    print(f"Found {len(source_reels)} source reels")
    
    # Debug: Show sample reel names from both datasets
    print("\nSample current reel names:")
    for i, reel in enumerate(current_reels[:10]):
        name = reel.get('Reel', '')
        print(f"  {i+1}. '{name}' -> normalized: '{normalize_name(name)}'")
    
    print("\nSample source reel names:")
    for i, reel in enumerate(source_reels[:10]):
        name = reel.get('Reel', '')
        print(f"  {i+1}. '{name}' -> normalized: '{normalize_name(name)}'")
    
    # Check if there are any obvious potential matches
    print("\nChecking for potential matches in first 50 reels:")
    current_names = [normalize_name(reel.get('Reel', '')) for reel in current_reels[:50]]
    source_names = [normalize_name(reel.get('Reel', '')) for reel in source_reels[:50]]
    
    potential_matches = []
    for i, curr_name in enumerate(current_names):
        for j, src_name in enumerate(source_names):
            if curr_name and src_name and curr_name == src_name:
                potential_matches.append((current_reels[i].get('Reel', ''), source_reels[j].get('Reel', '')))
    
    print(f"Found {len(potential_matches)} potential exact matches in first 50 reels:")
    for curr, src in potential_matches[:5]:
        print(f"  '{curr}' <-> '{src}'")
    
    # Find matches
    print("\nFinding matches...")
    matches, unmatched_current, unmatched_source = find_matches(current_reels, source_reels)
    
    print(f"\nResults:")
    print(f"Total matches found: {len(matches)}")
    print(f"Unmatched current reels: {len(unmatched_current)}")
    print(f"Unmatched source reels: {len(unmatched_source)}")
    
    # Show matches by type
    match_types = defaultdict(int)
    for match in matches:
        match_types[match['type']] += 1
    
    print(f"\nMatches by type:")
    for match_type, count in match_types.items():
        print(f"  {match_type}: {count}")
    
    # Show some example matches
    print(f"\nExample matches:")
    for i, match in enumerate(matches[:10]):
        print(f"  {i+1}. '{match['current_name']}' -> '{match['source_name']}' (score: {match['score']:.3f}, type: {match['type']})")
    
    # Update current reels with matched data
    print(f"\nUpdating current reels with matched data...")
    updates_made = 0
    for match in matches:
        update_reel_data(match['current'], match['source'])
        updates_made += 1
    
    print(f"Updated {updates_made} reels")
    
    # Don't write updated reels back to CSV yet - just show what we would do
    print(f"Skipping CSV write for now to avoid overwriting data")
    
    # Write unmatched reels to file
    unmatched_file = '/home/itsblunty/workspace/rf4recordssite/RF4-Records/unmatched_reels.txt'
    print(f"Writing unmatched reels to {unmatched_file}...")
    with open(unmatched_file, 'w', encoding='utf-8') as f:
        f.write("UNMATCHED CURRENT REELS:\n")
        f.write("=" * 50 + "\n\n")
        for reel in unmatched_current:
            f.write(f"'{reel.get('Reel', '')}'\n")
        
        f.write(f"\n\nUNMATCHED SOURCE REELS:\n")
        f.write("=" * 50 + "\n\n")
        for reel in unmatched_source:
            f.write(f"'{reel.get('Reel', '')}'\n")
    
    print(f"Done! Check {unmatched_file} for remaining unmatched reels.")

if __name__ == "__main__":
    main()