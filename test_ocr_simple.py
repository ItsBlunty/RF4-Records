#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'RF4 Records', 'backend'))

from image_scraper_api import FishImageScraper

def test_simple():
    scraper = FishImageScraper()
    
    # Test with copper1.png
    image_path = "copper1.png"
    
    if not os.path.exists(image_path):
        print(f"Error: {image_path} not found.")
        return
    
    print(f"Testing OCR with {image_path}")
    print("=" * 50)
    
    try:
        results = scraper.scrape_image(image_path)
        print(f"\nFound {len(results)} orders:")
        print("=" * 50)
        
        # Remove duplicates by fish name + quantity + mass
        unique_results = []
        seen = set()
        for fish in results:
            key = f"{fish.get('name', '')}-{fish.get('quantity', '')}-{fish.get('mass', '')}"
            if key not in seen:
                seen.add(key)
                unique_results.append(fish)
        
        print(f"After removing duplicates: {len(unique_results)} unique orders")
        print("=" * 50)
        
        for i, fish in enumerate(unique_results, 1):
            print(f"{i}. {fish.get('name', 'Unknown')} - {fish.get('location', 'Unknown')}")
            print(f"   Quantity: {fish.get('quantity', 'N/A')}")
            print(f"   Mass: {fish.get('mass', 'N/A')}")
            print(f"   Price: {fish.get('price', 'N/A')}")
            print()
            
        # Dynamic evaluation - report actual results
        location = unique_results[0].get('location', 'Unknown') if unique_results else 'Unknown'
        print(f"📊 Location: {location}")
        print(f"📋 Found: {len(unique_results)} orders")
        
        if len(unique_results) > 0:
            print("✅ OCR extraction successful!")
        else:
            print("❌ No orders extracted")
            
    except Exception as e:
        print(f"Error during OCR: {e}")

if __name__ == "__main__":
    test_simple()