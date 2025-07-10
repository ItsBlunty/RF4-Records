#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'RF4 Records', 'backend'))

from image_scraper_api import FishImageScraper

def test_ocr():
    scraper = FishImageScraper()
    
    # Test with copper1.png
    image_path = "copper1.png"
    
    if not os.path.exists(image_path):
        print(f"Error: {image_path} not found. Please provide the image file.")
        return
    
    print(f"Testing OCR with {image_path}")
    print("=" * 50)
    
    try:
        results = scraper.scrape_image(image_path)
        print(f"\nFound {len(results)} orders:")
        print("=" * 50)
        
        for i, fish in enumerate(results, 1):
            print(f"{i}. {fish.get('name', 'Unknown')} - {fish.get('location', 'Unknown')}")
            print(f"   Quantity: {fish.get('quantity', 'N/A')}")
            print(f"   Mass: {fish.get('mass', 'N/A')}")
            print(f"   Price: {fish.get('price', 'N/A')}")
            print()
            
    except Exception as e:
        print(f"Error during OCR: {e}")

if __name__ == "__main__":
    test_ocr()