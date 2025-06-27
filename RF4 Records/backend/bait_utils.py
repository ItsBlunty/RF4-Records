#!/usr/bin/env python3
"""
Bait utility functions for normalizing bait combinations.
Ensures consistent alphabetical ordering for bait combinations.
"""

def normalize_bait_display(bait1, bait2=None, legacy_bait=None):
    """
    Normalize bait display to ensure consistent alphabetical ordering.
    
    Args:
        bait1: Primary bait string
        bait2: Secondary bait string (optional)
        legacy_bait: Legacy bait field for backward compatibility
        
    Returns:
        String: Normalized bait display with alphabetical ordering
        
    Examples:
        normalize_bait_display("Mayfly Larva", "Leech") -> "Leech; Mayfly Larva"
        normalize_bait_display("Apple", "Zebra") -> "Apple; Zebra" 
        normalize_bait_display("Solo Bait") -> "Solo Bait"
    """
    # Handle case with two baits
    if bait2 and bait2.strip():
        # Clean and normalize bait names
        clean_bait1 = bait1.strip() if bait1 else ""
        clean_bait2 = bait2.strip()
        
        # If both baits exist, sort them alphabetically
        if clean_bait1:
            baits = sorted([clean_bait1, clean_bait2], key=str.lower)
            return f"{baits[0]}; {baits[1]}"
        else:
            # Only bait2 exists
            return clean_bait2
    
    # Handle case with single bait
    if bait1 and bait1.strip():
        return bait1.strip()
    
    # Fallback to legacy bait field
    if legacy_bait and legacy_bait.strip():
        return legacy_bait.strip()
    
    # No bait information available
    return ""

def get_normalized_bait_for_filtering(bait_input):
    """
    Normalize a bait search input for consistent filtering.
    Handles cases where user searches for "Bait1; Bait2" or "Bait2; Bait1"
    
    Args:
        bait_input: User's bait search string
        
    Returns:
        String: Normalized bait string for consistent searching
    """
    if not bait_input or not bait_input.strip():
        return ""
    
    # Check if input contains semicolon (bait combination)
    if ';' in bait_input:
        parts = [part.strip() for part in bait_input.split(';')]
        if len(parts) == 2 and all(parts):
            # Sort alphabetically for consistent ordering
            sorted_parts = sorted(parts, key=str.lower)
            return f"{sorted_parts[0]}; {sorted_parts[1]}"
    
    # Single bait or malformed input - return as-is
    return bait_input.strip()