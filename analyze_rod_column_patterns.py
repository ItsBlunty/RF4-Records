#!/usr/bin/env python3
"""
Advanced analysis of column matching patterns between NewRodPrices.csv and RodList.csv
to find additional matches among unmatched rods using specification data.
"""

import csv
import re
from collections import defaultdict
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

def parse_length(length_str):
    """Parse length value"""
    if not length_str:
        return None
    try:
        return float(length_str)
    except ValueError:
        return None

def parse_load_capacity(load_str):
    """Parse load capacity"""
    if not load_str:
        return None
    try:
        return float(load_str)
    except ValueError:
        return None

def normalize_rod_name(name):
    """Normalize rod name for matching"""
    if not name:
        return ""
    return ' '.join(name.strip().split()).lower()

def extract_numeric_model(name):
    """Extract numeric model codes from rod names"""
    if not name:
        return []
    
    # Find all numeric patterns
    patterns = re.findall(r'\d+(?:\.\d+)?', name.lower())
    return [float(p) if '.' in p else int(p) for p in patterns]

def calculate_similarity(name1, name2):
    """Calculate string similarity between two names"""
    return SequenceMatcher(None, name1.lower(), name2.lower()).ratio()

def read_new_rod_prices():
    """Read NewRodPrices.csv and extract specifications"""
    rods = []
    with open('NewRodPrices.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = row.get('Name', '').strip()
            if not name or 'Rods' in name:
                continue
            
            # Parse specifications
            test_str = row.get('Test (g)', '').strip()
            lt, ht = parse_test_weight(test_str)
            
            rod_data = {
                'name': name,
                'normalized_name': normalize_rod_name(name),
                'level': row.get('Level Req', '').strip(),
                'test_low': lt,
                'test_high': ht,
                'length': parse_length(row.get('Length (m)', '').strip()),
                'load_capacity': parse_load_capacity(row.get('Load Capacity (kg)', '').strip()),
                'cost': clean_price(row.get('Cost (pushed up)', '').strip()),
                'numeric_codes': extract_numeric_model(name)
            }
            rods.append(rod_data)
    
    print(f"Loaded {len(rods)} rods from NewRodPrices.csv")
    return rods

def read_rod_list():
    """Read RodList.csv and extract specifications"""
    rods = []
    with open('RodList.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = row.get('Rod', '').strip()
            if not name:
                continue
            
            # Parse specifications
            lt = row.get('LT', '').strip()
            ht = row.get('HT', '').strip()
            
            rod_data = {
                'name': name,
                'normalized_name': normalize_rod_name(name),
                'type': row.get('Type', '').strip(),
                'level': row.get('Lvl', '').strip(),
                'test_low': float(lt) if lt and lt.replace('.', '').isdigit() else None,
                'test_high': float(ht) if ht and ht.replace('.', '').isdigit() else None,
                'length': parse_length(row.get('Length', '').strip()),
                'load_capacity': parse_load_capacity(row.get('Max Load', '').strip()),
                'cost': clean_price(row.get('Cost', '').strip()),
                'numeric_codes': extract_numeric_model(name)
            }
            rods.append(rod_data)
    
    print(f"Loaded {len(rods)} rods from RodList.csv")
    return rods

def get_enhanced_matches():
    """Get the matches that were made by the enhanced script"""
    matched_names = set()
    
    # Run the enhanced script and capture successful matches
    try:
        import subprocess
        result = subprocess.run(['python', 'update_rod_costs_enhanced.py'], 
                              capture_output=True, text=True)
        
        # Parse the output to find successful matches
        for line in result.stdout.split('\n'):
            if '✓ Updated' in line:
                # Extract the matched name from the line
                parts = line.split("'")
                if len(parts) >= 2:
                    matched_names.add(parts[1])
    except:
        print("Could not run enhanced script to get matches")
    
    return matched_names

def find_spec_matches(new_rods, existing_rods, tolerance=0.1):
    """Find matches based on specification similarity"""
    matches = []
    
    # Get already matched rods
    enhanced_matches = get_enhanced_matches()
    
    for new_rod in new_rods:
        new_name = new_rod['name']
        
        # Skip if this rod was already matched
        matched_to_existing = False
        for existing_rod in existing_rods:
            if existing_rod['name'] in enhanced_matches:
                # Check if this might be the match for new_rod
                name_sim = calculate_similarity(new_name, existing_rod['name'])
                if name_sim > 0.6:  # Rough threshold
                    matched_to_existing = True
                    break
        
        if matched_to_existing:
            continue
        
        best_matches = []
        
        for existing_rod in existing_rods:
            existing_name = existing_rod['name']
            
            # Skip if existing rod was already matched
            if existing_name in enhanced_matches:
                continue
            
            # Calculate specification similarity
            spec_score = 0
            total_specs = 0
            
            # Length comparison
            if new_rod['length'] is not None and existing_rod['length'] is not None:
                length_diff = abs(new_rod['length'] - existing_rod['length'])
                if length_diff <= tolerance:
                    spec_score += 3  # High weight for length match
                total_specs += 3
            
            # Test weight range comparison
            if (new_rod['test_low'] is not None and new_rod['test_high'] is not None and
                existing_rod['test_low'] is not None and existing_rod['test_high'] is not None):
                
                # Check for overlap or close ranges
                new_range = (new_rod['test_low'], new_rod['test_high'])
                existing_range = (existing_rod['test_low'], existing_rod['test_high'])
                
                # Calculate range overlap
                overlap_start = max(new_range[0], existing_range[0])
                overlap_end = min(new_range[1], existing_range[1])
                
                if overlap_end >= overlap_start:  # Ranges overlap
                    overlap_ratio = (overlap_end - overlap_start) / max(
                        new_range[1] - new_range[0], 
                        existing_range[1] - existing_range[0]
                    )
                    spec_score += overlap_ratio * 2  # Weight for test range overlap
                total_specs += 2
            
            # Load capacity comparison
            if new_rod['load_capacity'] is not None and existing_rod['load_capacity'] is not None:
                load_diff = abs(new_rod['load_capacity'] - existing_rod['load_capacity'])
                load_tolerance = max(new_rod['load_capacity'], existing_rod['load_capacity']) * 0.2  # 20% tolerance
                if load_diff <= load_tolerance:
                    spec_score += 1  # Weight for load capacity match
                total_specs += 1
            
            # Level comparison (if available)
            if new_rod['level'] and existing_rod['level']:
                try:
                    new_level = int(new_rod['level'])
                    existing_level = int(existing_rod['level'])
                    if new_level == existing_level:
                        spec_score += 1
                except ValueError:
                    pass
                total_specs += 1
            
            # Numeric model codes comparison
            if new_rod['numeric_codes'] and existing_rod['numeric_codes']:
                common_codes = set(new_rod['numeric_codes']) & set(existing_rod['numeric_codes'])
                if common_codes:
                    spec_score += len(common_codes) * 0.5
                total_specs += 1
            
            # Calculate final score
            if total_specs > 0:
                final_score = spec_score / total_specs
                
                # Also consider name similarity as a tie-breaker
                name_similarity = calculate_similarity(new_name, existing_name)
                combined_score = final_score * 0.8 + name_similarity * 0.2
                
                if final_score >= 0.7:  # High specification match threshold
                    best_matches.append({
                        'existing_name': existing_name,
                        'spec_score': final_score,
                        'name_similarity': name_similarity,
                        'combined_score': combined_score,
                        'matching_specs': {
                            'length': new_rod['length'] == existing_rod['length'] if new_rod['length'] and existing_rod['length'] else False,
                            'test_range_overlap': overlap_end >= overlap_start if 'overlap_end' in locals() else False,
                            'load_capacity_close': load_diff <= load_tolerance if 'load_diff' in locals() else False,
                            'common_numeric_codes': list(common_codes) if 'common_codes' in locals() else []
                        }
                    })
        
        # Sort by combined score and take the best match if it's good enough
        if best_matches:
            best_matches.sort(key=lambda x: x['combined_score'], reverse=True)
            best_match = best_matches[0]
            
            if best_match['combined_score'] >= 0.75:  # High confidence threshold
                matches.append({
                    'new_rod': new_name,
                    'existing_rod': best_match['existing_name'],
                    'confidence': best_match['combined_score'],
                    'spec_score': best_match['spec_score'],
                    'name_similarity': best_match['name_similarity'],
                    'matching_specs': best_match['matching_specs'],
                    'new_rod_data': new_rod,
                    'existing_rod_data': next(r for r in existing_rods if r['name'] == best_match['existing_name'])
                })
    
    return matches

def analyze_successful_matches(new_rods, existing_rods):
    """Analyze patterns in successfully matched rods"""
    print("\n=== ANALYZING SUCCESSFUL MATCHES ===")
    
    enhanced_matches = get_enhanced_matches()
    successful_pairs = []
    
    # Find pairs that were successfully matched
    for existing_rod in existing_rods:
        if existing_rod['name'] in enhanced_matches:
            # Find the corresponding new rod (this is approximate)
            for new_rod in new_rods:
                name_sim = calculate_similarity(new_rod['normalized_name'], existing_rod['normalized_name'])
                if name_sim > 0.4:  # Reasonable threshold for being the same rod
                    successful_pairs.append((new_rod, existing_rod))
                    break
    
    print(f"Found {len(successful_pairs)} successful matching pairs to analyze")
    
    # Analyze column alignment patterns
    length_matches = 0
    test_range_matches = 0
    load_capacity_matches = 0
    
    for new_rod, existing_rod in successful_pairs[:20]:  # Analyze first 20
        print(f"\nMatch: '{new_rod['name']}' -> '{existing_rod['name']}'")
        
        # Length comparison
        if new_rod['length'] and existing_rod['length']:
            length_diff = abs(new_rod['length'] - existing_rod['length'])
            print(f"  Length: {new_rod['length']}m vs {existing_rod['length']}m (diff: {length_diff:.2f})")
            if length_diff <= 0.1:
                length_matches += 1
        
        # Test weight comparison
        if (new_rod['test_low'] and new_rod['test_high'] and 
            existing_rod['test_low'] and existing_rod['test_high']):
            print(f"  Test range: {new_rod['test_low']}-{new_rod['test_high']}g vs {existing_rod['test_low']}-{existing_rod['test_high']}g")
            
            # Check for exact or close matches
            if (abs(new_rod['test_low'] - existing_rod['test_low']) <= 2 and
                abs(new_rod['test_high'] - existing_rod['test_high']) <= 5):
                test_range_matches += 1
        
        # Load capacity comparison
        if new_rod['load_capacity'] and existing_rod['load_capacity']:
            load_diff = abs(new_rod['load_capacity'] - existing_rod['load_capacity'])
            print(f"  Load capacity: {new_rod['load_capacity']}kg vs {existing_rod['load_capacity']}kg (diff: {load_diff:.2f})")
            if load_diff <= 1.0:  # Within 1kg
                load_capacity_matches += 1
        
        # Level comparison
        if new_rod['level'] and existing_rod['level']:
            print(f"  Level: {new_rod['level']} vs {existing_rod['level']}")
    
    print(f"\n=== COLUMN ALIGNMENT PATTERNS ===")
    print(f"Length exact matches: {length_matches}/20 ({length_matches/20*100:.1f}%)")
    print(f"Test range close matches: {test_range_matches}/20 ({test_range_matches/20*100:.1f}%)")
    print(f"Load capacity close matches: {load_capacity_matches}/20 ({load_capacity_matches/20*100:.1f}%)")
    
    return successful_pairs

def main():
    print("=== ROD COLUMN PATTERN ANALYSIS ===")
    
    # Load both datasets
    new_rods = read_new_rod_prices()
    existing_rods = read_rod_list()
    
    # Analyze successful matches first
    successful_pairs = analyze_successful_matches(new_rods, existing_rods)
    
    # Find new potential matches based on specifications
    print(f"\n=== FINDING NEW SPECIFICATION-BASED MATCHES ===")
    spec_matches = find_spec_matches(new_rods, existing_rods)
    
    print(f"\nFound {len(spec_matches)} new potential matches based on specifications:")
    
    for match in spec_matches:
        print(f"\n--- POTENTIAL MATCH ---")
        print(f"NewRodPrices: {match['new_rod']}")
        print(f"RodList: {match['existing_rod']}")
        print(f"Confidence: {match['confidence']:.3f}")
        print(f"Specification score: {match['spec_score']:.3f}")
        print(f"Name similarity: {match['name_similarity']:.3f}")
        
        # Show detailed specification comparison
        new_data = match['new_rod_data']
        existing_data = match['existing_rod_data']
        
        print(f"Specifications:")
        if new_data['length'] and existing_data['length']:
            print(f"  Length: {new_data['length']}m vs {existing_data['length']}m")
        if new_data['test_low'] and existing_data['test_low']:
            print(f"  Test range: {new_data['test_low']}-{new_data['test_high']}g vs {existing_data['test_low']}-{existing_data['test_high']}g")
        if new_data['load_capacity'] and existing_data['load_capacity']:
            print(f"  Load capacity: {new_data['load_capacity']}kg vs {existing_data['load_capacity']}kg")
        if new_data['level'] and existing_data['level']:
            print(f"  Level: {new_data['level']} vs {existing_data['level']}")
        
        print(f"Matching specs: {match['matching_specs']}")
    
    # Summary
    print(f"\n=== SUMMARY ===")
    enhanced_matches = get_enhanced_matches()
    print(f"Rods already matched by enhanced script: {len(enhanced_matches)}")
    print(f"Additional potential matches found: {len(spec_matches)}")
    print(f"Total potential matches: {len(enhanced_matches) + len(spec_matches)}")
    
    # Calculate potential improvement
    total_new_rods = len(new_rods)
    current_match_rate = len(enhanced_matches) / total_new_rods * 100
    potential_match_rate = (len(enhanced_matches) + len(spec_matches)) / total_new_rods * 100
    improvement = potential_match_rate - current_match_rate
    
    print(f"Current match rate: {current_match_rate:.1f}%")
    print(f"Potential match rate: {potential_match_rate:.1f}%")
    print(f"Potential improvement: +{improvement:.1f}%")
    
    # Generate recommendations
    print(f"\n=== RECOMMENDATIONS ===")
    high_confidence = [m for m in spec_matches if m['confidence'] >= 0.85]
    medium_confidence = [m for m in spec_matches if 0.75 <= m['confidence'] < 0.85]
    
    print(f"High confidence matches (≥85%): {len(high_confidence)}")
    print(f"Medium confidence matches (75-84%): {len(medium_confidence)}")
    
    if high_confidence:
        print(f"\nRecommended immediate updates (high confidence):")
        for match in high_confidence:
            print(f"  '{match['existing_rod']}' -> update cost from '{match['new_rod']}'")

if __name__ == "__main__":
    main()