#!/usr/bin/env python3

"""
Mock test to simulate OCR working with tesseract available.
This demonstrates what the output would look like when deployed to Railway.
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'RF4 Records', 'backend'))

def test_mock_ocr():
    """Test parsing logic with mock OCR data that represents what tesseract would extract"""
    
    # Import the parsing function
    from image_scraper_api import FishImageScraper
    
    scraper = FishImageScraper()
    
    # Mock OCR text that tesseract might extract from copper1.png
    # This simulates the raw text output that would come from the image
    mock_ocr_text = """
    Common Roach 6 pcs 50 g 15.86
    Copper Lake
    Ide 1 pcs 650 g 16.36
    Bleak 4 pcs 20 g 17.04
    Mirror Carp 1 pcs 4 kg 30.39
    Common Roach 7 pcs 300 g 30.80
    Bleak 5 pcs 72 g 55.16
    Kvolsdorfsky tench 1 pcs 750 g 90.41
    Pike 2 pcs 2 kg 126.71
    Chub 1 pcs 5 kg 217.64
    Dinks mirror carp 1 pcs 35 kg 796.04
    """
    
    print("Mock OCR Test - Simulating tesseract extraction from copper1.png")
    print("=" * 60)
    print("Simulated OCR text:")
    print(mock_ocr_text)
    print("=" * 60)
    
    # Test the parsing logic
    results = scraper.parse_fish_data(mock_ocr_text)
    
    print(f"\nParsing Results: Found {len(results)} orders")
    print("=" * 60)
    
    for i, fish in enumerate(results, 1):
        print(f"{i}. {fish.get('name', 'Unknown')} - {fish.get('location', 'Unknown')}")
        print(f"   Quantity: {fish.get('quantity', 'N/A')}")
        print(f"   Mass: {fish.get('mass', 'N/A')}")
        print(f"   Price: {fish.get('price', 'N/A')}")
        print()
    
    # Expected result: Should find 10 orders (same as copper1.png manual data)
    expected_count = 10
    if len(results) >= expected_count:
        print(f"✅ SUCCESS: Found {len(results)} orders (expected at least {expected_count})")
    else:
        print(f"❌ ISSUE: Found only {len(results)} orders (expected at least {expected_count})")
        
    # Test with more realistic OCR text (with OCR errors and noise)
    print("\n" + "=" * 60)
    print("Testing with OCR errors and noise (more realistic)")
    print("=" * 60)
    
    realistic_ocr_text = """
    Cornmen Roech 6 pes 50g 15.86
    Cepper Lake
    Ide 1pcs 650g 16.36
    B1eak 4pcs 20g 17.04  
    Mirrer Carp 1 pes 4kg 30.39
    Commin Reach 7pcs 300g 30.80
    Bl3ak 5 pcs 72g 55.16
    Kvolsdorfsky tenth 1pes 750g 90.41
    Plke 2pcs 2kg 126.71
    Chvb 1pes 5kg 217.64
    Dinks mirrorcarp 1pcs 35kg 796.04
    """
    
    print("Realistic OCR text with errors:")
    print(realistic_ocr_text)
    print("-" * 40)
    
    realistic_results = scraper.parse_fish_data(realistic_ocr_text)
    
    print(f"\nRealistic Results: Found {len(realistic_results)} orders")
    print("-" * 40)
    
    for i, fish in enumerate(realistic_results, 1):
        print(f"{i}. {fish.get('name', 'Unknown')} - {fish.get('location', 'Unknown')}")
        print(f"   Quantity: {fish.get('quantity', 'N/A')}")
        print(f"   Mass: {fish.get('mass', 'N/A')}")
        print(f"   Price: {fish.get('price', 'N/A')}")
        print()
    
    if len(realistic_results) >= 5:
        print(f"✅ SUCCESS: Found {len(realistic_results)} orders even with OCR errors")
    else:
        print(f"❌ ISSUE: Found only {len(realistic_results)} orders with OCR errors")

if __name__ == "__main__":
    test_mock_ocr()