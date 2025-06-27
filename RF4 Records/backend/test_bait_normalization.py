#!/usr/bin/env python3
"""
Test script to verify bait normalization functionality.
This simulates how bait combinations will be grouped together.
"""

from bait_utils import normalize_bait_display, get_normalized_bait_for_filtering

def test_bait_grouping():
    """Test that different orders of the same bait combination are grouped together"""
    
    # Simulate records with different bait orders (how they might appear in game)
    mock_records = [
        {"player": "Player1", "fish": "Pike", "bait1": "Mayfly Larva", "bait2": "Leech", "weight": 1000},
        {"player": "Player2", "fish": "Pike", "bait1": "Leech", "bait2": "Mayfly Larva", "weight": 1200},
        {"player": "Player3", "fish": "Pike", "bait1": "Worm", "bait2": "Apple", "weight": 1100},
        {"player": "Player4", "fish": "Pike", "bait1": "Apple", "bait2": "Worm", "weight": 1300},
        {"player": "Player5", "fish": "Pike", "bait1": "Solo Bait", "bait2": None, "weight": 900},
    ]
    
    # Process records and group by normalized bait
    bait_groups = {}
    
    for record in mock_records:
        bait_display = normalize_bait_display(record["bait1"], record["bait2"])
        
        if bait_display not in bait_groups:
            bait_groups[bait_display] = []
        
        bait_groups[bait_display].append({
            "player": record["player"],
            "weight": record["weight"],
            "original_bait1": record["bait1"],
            "original_bait2": record["bait2"]
        })
    
    print("=== Bait Grouping Test Results ===")
    print("Records that should be grouped together:")
    
    for bait_combo, records in bait_groups.items():
        print(f"\nBait Combination: '{bait_combo}'")
        print(f"Records in this group: {len(records)}")
        
        for record in records:
            original = f"{record['original_bait1']}" + (f"; {record['original_bait2']}" if record['original_bait2'] else "")
            print(f"  - {record['player']}: {record['weight']}g (original: {original})")
    
    # Test search functionality
    print("\n=== Search Test Results ===")
    search_terms = [
        "Mayfly Larva; Leech",
        "Leech; Mayfly Larva", 
        "Apple; Worm",
        "Worm; Apple"
    ]
    
    for search in search_terms:
        normalized_search = get_normalized_bait_for_filtering(search)
        matches = []
        
        for bait_combo in bait_groups.keys():
            if normalized_search.lower() in bait_combo.lower():
                matches.append(bait_combo)
        
        print(f"Search: '{search}' -> Normalized: '{normalized_search}' -> Matches: {matches}")

if __name__ == "__main__":
    test_bait_grouping()