import re
import csv

# Read the HTML file
with open('/home/itsblunty/workspace/rf4recordssite/RF4-Records/reelsdrivesheetsave_files/sheet.htm', 'r', encoding='utf-8') as f:
    content = f.read()

# Extract table rows with reel data
rows = re.findall(r'<tr[^>]*>.*?</tr>', content, re.DOTALL)

reels = []

for row in rows:
    # Look for rows that contain reel names (not headers or empty rows)
    if any(brand in row for brand in ['Furia', 'Turion', 'Goliaf', 'Venga', 'Azimut', 'Tagara']):
        # Extract all cell data
        cells = re.findall(r'<td[^>]*>(.*?)</td>', row, re.DOTALL)
        if len(cells) >= 5:  # Ensure we have enough columns
            # Clean cell data
            clean_cells = []
            for cell in cells:
                # Remove HTML tags and clean up
                cell = re.sub(r'<[^>]+>', '', cell)
                cell = re.sub(r'&nbsp;', ' ', cell)
                cell = re.sub(r'\s+', ' ', cell)
                cell = cell.strip()
                clean_cells.append(cell)
            
            # Extract the reel name (first column)
            name = clean_cells[0] if clean_cells else ""
            if any(brand in name for brand in ['Furia', 'Turion', 'Goliaf', 'Venga', 'Azimut', 'Tagara']):
                reels.append(clean_cells)

# Print found reels for verification
print(f"Found {len(reels)} reels:")
for i, reel in enumerate(reels[:10]):  # Show first 10
    print(f"{i+1}. {reel[0] if reel else 'Empty'} - {len(reel)} columns")
    
print(f"\nTotal reels extracted: {len(reels)}")

# Show sample data structure
if reels:
    print(f"\nSample reel data (first reel):")
    for i, cell in enumerate(reels[0][:15]):  # Show first 15 columns
        print(f"  Column {i}: '{cell}'")