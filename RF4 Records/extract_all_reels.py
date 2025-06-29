import re
import csv

def clean_cell(cell):
    """Clean HTML cell data"""
    # Remove HTML tags
    cell = re.sub(r'<[^>]+>', '', cell)
    # Replace HTML entities
    cell = re.sub(r'&nbsp;', ' ', cell)
    cell = re.sub(r'&amp;', '&', cell)
    # Clean up whitespace
    cell = re.sub(r'\s+', ' ', cell)
    cell = cell.strip()
    return cell

# Read the HTML file
with open('/home/itsblunty/workspace/rf4recordssite/RF4-Records/reelsdrivesheetsave_files/sheet.htm', 'r', encoding='utf-8') as f:
    content = f.read()

# Find all table rows
rows = re.findall(r'<tr[^>]*>(.*?)</tr>', content, re.DOTALL)

reels = []
reel_brands = ['Furia', 'Turion', 'Goliaf', 'Venga', 'Azimut', 'Tagara']

print("Analyzing rows...")

for i, row in enumerate(rows):
    # Extract cells from this row
    cells = re.findall(r'<td[^>]*>(.*?)</td>', row, re.DOTALL)
    
    if len(cells) >= 10:  # Make sure we have enough columns
        cleaned_cells = [clean_cell(cell) for cell in cells]
        
        # Check if first cell contains a reel name
        first_cell = cleaned_cells[0] if cleaned_cells else ""
        
        if any(brand in first_cell for brand in reel_brands):
            # This looks like a reel row
            reels.append(cleaned_cells)
            print(f"Found: {first_cell}")

print(f"\nTotal reels found: {len(reels)}")

# Create CSV with proper headers
if reels:
    # Define headers based on the columns we see
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
        
        # Write headers
        writer.writerow(headers)
        
        # Write reel data
        for reel in reels:
            # Pad row to match header length
            row_data = reel + [''] * (len(headers) - len(reel))
            row_data = row_data[:len(headers)]  # Trim if too long
            writer.writerow(row_data)
    
    print(f"CSV created with {len(reels)} reels")
    
    # Show sample of what we extracted
    print("\nSample reel data:")
    for i, reel in enumerate(reels[:3]):
        print(f"\nReel {i+1}: {reel[0]}")
        print(f"  Test Weight: {reel[1] if len(reel) > 1 else 'N/A'}")
        print(f"  Gear Ratio: {reel[5] if len(reel) > 5 else 'N/A'}")
        print(f"  Line Capacity: {reel[8] if len(reel) > 8 else 'N/A'}")
        print(f"  Price: {reel[21] if len(reel) > 21 else 'N/A'}")
else:
    print("No reels found!")