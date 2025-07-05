#!/usr/bin/env python3

import csv
import re

def extract_type_and_size_from_header(header):
    """Extract reel type and size from Russian section headers"""
    if not header:
        return None, None
    
    # Spinning reels: БЕЗЫНЕРЦИОННЫЕ [size] Емкость при толщине лески
    if "БЕЗЫНЕРЦИОННЫЕ" in header:
        size_match = re.search(r'(\d+)\s*000', header)
        size = size_match.group(1) + "000" if size_match else None
        return "Spinning", size
    
    # Classic Baitcasting: БАЙТКАСТИНГОВЫЕ КЛАССИЧЕСКИЕ
    elif "БАЙТКАСТИНГОВЫЕ КЛАССИЧЕСКИЕ" in header:
        return "Classic Baitcasting", None
    
    # Low-Profile Baitcasting: БАЙТКАСТИНГОВЫЕ НИЗКОПРОФИЛЬНЫЕ LP
    elif "БАЙТКАСТИНГОВЫЕ НИЗКОПРОФИЛЬНЫЕ" in header:
        return "Low-Profile Baitcasting", None
    
    # Conventional (силовые): СИЛОВЫЕ МУЛЬТИПЛИКАТОРЫ
    elif "СИЛОВЫЕ МУЛЬТИПЛИКАТОРЫ" in header:
        return "Conventional", None
    
    return None, None

def process_csv(input_file, output_file):
    """Process the CSV file and add Type and Size columns"""
    
    current_type = None
    current_size = None
    
    with open(input_file, 'r', encoding='utf-8') as infile:
        with open(output_file, 'w', encoding='utf-8', newline='') as outfile:
            reader = csv.reader(infile)
            writer = csv.writer(outfile)
            
            for row_num, row in enumerate(reader, 1):
                if len(row) == 0:
                    writer.writerow(row)
                    continue
                
                # Check if this is a section header row
                if len(row) > 1 and row[1]:
                    reel_type, size = extract_type_and_size_from_header(row[1])
                    if reel_type:
                        current_type = reel_type
                        current_size = size
                        print(f"Row {row_num}: Found section - Type: {current_type}, Size: {current_size}")
                
                # Handle the header row - add new columns
                if row_num == 3 and len(row) > 1 and row[1] == "Reel":
                    # Insert Type and Size columns after Reel name
                    new_row = row[:2] + ["Type", "Size"] + row[2:]
                    writer.writerow(new_row)
                    continue
                
                # Skip header rows, empty rows, and section headers
                if (row_num <= 4 or 
                    len(row) < 5 or 
                    not row[1] or 
                    any(keyword in str(row[1]) for keyword in [
                        'ОБНОВЛЕНИЕ', 'НАЗВАНИЕ', 'Reel', 'БЕЗЫНЕРЦИОННЫЕ', 
                        'БАЙТКАСТИНГОВЫЕ', 'СИЛОВЫЕ', 'НГ IMPERIAL'
                    ])):
                    # For non-data rows, just add empty columns
                    if len(row) > 1:
                        new_row = row[:2] + ["", ""] + row[2:]
                        writer.writerow(new_row)
                    else:
                        writer.writerow(row)
                    continue
                
                # This is a reel data row - add type and size
                reel_name = row[1] if len(row) > 1 else ""
                
                # For reels with no explicit size in headers, try to extract from name
                size_for_reel = current_size
                if not size_for_reel and reel_name:
                    # Extract size from reel name (e.g., "Furia 30000" -> "30000")
                    size_match = re.search(r'(\d+000|\d+0s?|\d+S?)$', reel_name.replace(' ', ''))
                    if size_match:
                        size_for_reel = size_match.group(1)
                    # Special handling for some naming patterns
                    elif re.search(r'\b(10|20|30|40|50|60|70|80|88)\b(?!\.)', reel_name):
                        size_match = re.search(r'\b(\d+)\b(?!\.)', reel_name)
                        if size_match:
                            size_for_reel = size_match.group(1)
                
                # Insert Type and Size columns after reel name
                new_row = row[:2] + [current_type or "", size_for_reel or ""] + row[2:]
                writer.writerow(new_row)
                
                if current_type and row[1]:  # Only print for actual reel entries
                    print(f"Row {row_num}: {reel_name} -> Type: {current_type}, Size: {size_for_reel}")

if __name__ == "__main__":
    input_file = "/home/itsblunty/workspace/rf4recordssite/RF4-Records/RF4 Records/frontend/public/data/reels.csv"
    output_file = "/home/itsblunty/workspace/rf4recordssite/RF4-Records/RF4 Records/frontend/public/data/reels_with_types.csv"
    
    print("Processing CSV file to add Type and Size columns...")
    process_csv(input_file, output_file)
    print(f"\nCompleted! Output saved to: {output_file}")