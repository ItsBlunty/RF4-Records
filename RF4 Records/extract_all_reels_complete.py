import re
import csv

def clean_cell(cell):
    """Clean HTML cell data"""
    cell = re.sub(r'<[^>]+>', '', cell)
    cell = re.sub(r'&nbsp;', ' ', cell)
    cell = re.sub(r'&amp;', '&', cell)
    cell = re.sub(r'\s+', ' ', cell)
    cell = cell.strip()
    return cell

# Read the HTML file
with open('/home/itsblunty/workspace/rf4recordssite/RF4-Records/reelsdrivesheetsave_files/sheet.htm', 'r', encoding='utf-8') as f:
    content = f.read()

# Extract tbody
tbody_match = re.search(r'<tbody>(.*?)</tbody>', content, re.DOTALL)
tbody_content = tbody_match.group(1)
rows = re.findall(r'<tr[^>]*>(.*?)</tr>', tbody_content, re.DOTALL)

print(f"Found {len(rows)} total rows in tbody")

reels = []

for i, row in enumerate(rows):
    cells = re.findall(r'<td[^>]*>(.*?)</td>', row, re.DOTALL)
    
    if len(cells) >= 10:  # Need enough columns for reel data
        cleaned_cells = [clean_cell(cell) for cell in cells]
        first_cell = cleaned_cells[0] if cleaned_cells else ""
        
        # Check if this looks like a reel name (has letters and numbers)
        if first_cell and re.search(r'[A-Za-z].*[0-9]|[0-9].*[A-Za-z]', first_cell):
            # Additional filter: skip obvious header rows or non-reel entries
            skip_patterns = [
                r'^БЕЗЫНЕРЦИОННЫЕ', r'^НАЗВАНИЕ', r'^ТЕСТ', r'^ЦЕНА', 
                r'^ФРИКЦИОН', r'^ОБНОВЛЕНИЕ', r'^[0-9]+$', r'^~[0-9]+$',
                r'^\s*$', r'^-$', r'^💧$'
            ]
            
            if not any(re.match(pattern, first_cell, re.IGNORECASE) for pattern in skip_patterns):
                reels.append(cleaned_cells)
                print(f"Row {i}: {first_cell}")

print(f"\nTotal reels found: {len(reels)}")

# Create CSV
if reels:
    headers = [
        'Name', 'Test_Weight', 'Water_Resistant', 'Test_Col1', 'Test_Col2', 
        'Gear_Ratio', 'Gear_Col1', 'Gear_Col2', 'Line_Capacity_m', 'Cap_Col1', 'Cap_Col2',
        'Retrieve_Speed', 'Speed_Col1', 'Speed_Col2', 'Speed_Col3', 'Drag_Real_KG', 
        'Drag_Claimed_KG', 'Moving_KG', 'Weight_KG', 'Mech_Col1', 'Mech_Col2', 
        'Price', 'Price_New'
    ]
    
    # Write to CSV
    with open('/home/itsblunty/workspace/rf4recordssite/RF4-Records/RF4 Records/frontend/public/data/reels_complete.csv', 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(headers)
        
        for reel in reels:
            row_data = reel + [''] * (len(headers) - len(reel))
            row_data = row_data[:len(headers)]
            writer.writerow(row_data)
    
    print(f"CSV created with {len(reels)} reels")
    
    # Show sample
    print("\nSample of reels found:")
    for reel in reels[:10]:
        print(f"  {reel[0]}")
else:
    print("No reels found!")