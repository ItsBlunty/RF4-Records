#!/usr/bin/env python3
"""
Script to extract rod price data from rodsheet.htm and update the master RodList.csv
"""

import csv
import re
import json
from bs4 import BeautifulSoup
import os

def extract_data_from_html(html_file):
    """Extract data from the Google Sheets HTML file"""
    try:
        with open(html_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Look for JSON data in script tags
        soup = BeautifulSoup(content, 'html.parser')
        
        # Try to find data in script tags
        script_tags = soup.find_all('script', {'nonce': True})
        
        for script in script_tags:
            if script.string and 'window.WIZ_global_data' in script.string:
                # Extract the JSON data
                match = re.search(r'window\.WIZ_global_data\s*=\s*({.*?});', script.string, re.DOTALL)
                if match:
                    try:
                        # This is complex nested data - let's look for simpler patterns
                        print("Found WIZ_global_data but it's complex nested format")
                        # Let's try a different approach
                        break
                    except:
                        continue
        
        # Alternative: Look for any table-like data or CSV patterns
        # Check if there are any table elements
        tables = soup.find_all('table')
        if tables:
            print(f"Found {len(tables)} table elements")
            for i, table in enumerate(tables):
                print(f"Table {i}: {table.get_text()[:200]}...")
        
        return None
        
    except Exception as e:
        print(f"Error reading {html_file}: {e}")
        return None

def manually_create_price_mapping():
    """
    Since the HTML extraction is complex, let's create a manual mapping
    of updated prices based on what we can observe
    """
    # This would need to be populated with actual data from the sheet
    # For now, returning empty dict to show the structure
    price_updates = {
        # "Rod Name": new_price,
        # Example:
        # "Sensiv Bolognese II SB13": 65.50,
        # Add more mappings here...
    }
    
    print("Manual price mapping created (currently empty - needs data)")
    return price_updates

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

def update_rod_prices(rods, price_updates):
    """Update rod prices with new data"""
    updated_count = 0
    unmatched_prices = []
    
    # Create a mapping of rod names for easier lookup
    rod_lookup = {rod['Rod']: rod for rod in rods}
    
    for new_rod_name, new_price in price_updates.items():
        if new_rod_name in rod_lookup:
            old_price = rod_lookup[new_rod_name]['Cost']
            rod_lookup[new_rod_name]['Cost'] = str(new_price)
            print(f"Updated '{new_rod_name}': {old_price} -> {new_price}")
            updated_count += 1
        else:
            unmatched_prices.append(new_rod_name)
    
    print(f"\nUpdated {updated_count} rod prices")
    
    if unmatched_prices:
        print(f"\nUnmatched rods from price sheet ({len(unmatched_prices)}):")
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
    html_file = "rodsheet.htm"
    csv_file = "RodList.csv"
    output_file = "RodList_updated.csv"
    
    print("=== Rod Price Update Script ===")
    
    # Try to extract data from HTML
    print(f"\n1. Attempting to extract data from {html_file}...")
    extracted_data = extract_data_from_html(html_file)
    
    # For now, use manual mapping (to be populated with actual data)
    print(f"\n2. Using manual price mapping...")
    price_updates = manually_create_price_mapping()
    
    # Read current rod list
    print(f"\n3. Reading current rod list from {csv_file}...")
    current_rods = read_current_rod_list(csv_file)
    
    if not current_rods:
        print("Failed to read current rod list. Exiting.")
        return
    
    # Update prices
    print(f"\n4. Updating rod prices...")
    updated_rods, unmatched = update_rod_prices(current_rods, price_updates)
    
    # Write updated CSV
    print(f"\n5. Writing updated CSV...")
    write_updated_csv(updated_rods, output_file)
    
    print(f"\n=== Summary ===")
    print(f"Total rods in master list: {len(current_rods)}")
    print(f"Price updates applied: {len(price_updates) - len(unmatched)}")
    print(f"Unmatched rod names: {len(unmatched)}")
    
    if unmatched:
        print(f"\nTo get the actual price data, you'll need to:")
        print(f"1. Open the Google Sheet manually")
        print(f"2. Copy the rod names and prices")
        print(f"3. Update the price_updates dictionary in this script")
        print(f"4. Re-run the script")

if __name__ == "__main__":
    main()