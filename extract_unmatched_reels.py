#!/usr/bin/env python3
"""
Script to extract reel names that have empty or missing Reel_Type values from reels.csv
"""

import csv
import os

def extract_unmatched_reels():
    """
    Read the reels.csv file and extract reel names with empty Reel_Type values
    """
    # Input file path
    csv_file_path = "/home/itsblunty/workspace/rf4recordssite/RF4-Records/RF4 Records/frontend/public/data/reels.csv"
    
    # Output file path
    output_file_path = "/home/itsblunty/workspace/rf4recordssite/RF4-Records/unmatched_reels.txt"
    
    unmatched_reels = []
    
    try:
        with open(csv_file_path, 'r', encoding='utf-8') as file:
            csv_reader = csv.reader(file)
            
            for row_num, row in enumerate(csv_reader, 1):
                # Skip empty rows
                if not row:
                    continue
                
                # Get reel name and type, handling cases with insufficient columns
                # Column 0 = row number, Column 1 = reel name, Column 2 = reel type
                reel_name = row[1].strip() if len(row) > 1 and row[1] else ""
                reel_type = row[2].strip() if len(row) > 2 and row[2] else ""
                
                # Optional: Show progress every 100 rows
                if row_num % 100 == 0:
                    print(f"Processed {row_num} rows...")
                
                # Skip header rows and category separators
                if (reel_name.startswith("БЕЗЫНЕРЦИОННЫЕ") or 
                    reel_name.startswith("БАЙТКАСТИНГОВЫЕ") or
                    reel_name.startswith("СИЛОВЫЕ") or
                    reel_name == "Reel" or
                    reel_name.startswith("ОБНОВЛЕНИЕ") or
                    reel_name.isdigit() or
                    not reel_name or
                    "Емкость при толщине лески" in reel_name or
                    "НГ IMPERIAL" in reel_name):
                    continue
                
                # Check if reel_type is empty or missing
                if not reel_type:
                    unmatched_reels.append(reel_name)
    
    except FileNotFoundError:
        print(f"Error: Could not find file {csv_file_path}")
        return
    except Exception as e:
        print(f"Error reading CSV file: {e}")
        return
    
    # Write unmatched reels to output file
    try:
        with open(output_file_path, 'w', encoding='utf-8') as output_file:
            for reel in unmatched_reels:
                output_file.write(f"{reel}\n")
        
        print(f"\nExtracted {len(unmatched_reels)} unmatched reels to {output_file_path}")
        
        # Also print a summary
        if unmatched_reels:
            print("\nUnmatched reels:")
            for reel in unmatched_reels:
                print(f"  - {reel}")
        else:
            print("No unmatched reels found!")
            
    except Exception as e:
        print(f"Error writing output file: {e}")

if __name__ == "__main__":
    extract_unmatched_reels()