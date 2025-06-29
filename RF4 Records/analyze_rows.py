import re

with open('/home/itsblunty/workspace/rf4recordssite/RF4-Records/reelsdrivesheetsave_files/sheet.htm', 'r', encoding='utf-8') as f:
    content = f.read()

tbody_match = re.search(r'<tbody>(.*?)</tbody>', content, re.DOTALL)
tbody_content = tbody_match.group(1)
rows = re.findall(r'<tr[^>]*>(.*?)</tr>', tbody_content, re.DOTALL)

print("Analyzing first cell of each row to find ALL potential reel entries:")
potential_reels = []

for i, row in enumerate(rows):
    cells = re.findall(r'<td[^>]*>(.*?)</td>', row, re.DOTALL)
    if cells:
        first_cell = re.sub(r'<[^>]+>', '', cells[0]).strip()
        first_cell = re.sub(r'&nbsp;', ' ', first_cell)
        
        if first_cell and len(first_cell) > 1:
            # Look for anything that might be a reel name (has letters and numbers)
            if re.search(r'[A-Za-z].*[0-9]|[0-9].*[A-Za-z]', first_cell):
                potential_reels.append((i, first_cell))
                print(f"Row {i}: '{first_cell}'")

print(f"\nFound {len(potential_reels)} potential reel entries")

# Look for specific patterns
print("\nLooking for numerical patterns that might be reel sizes:")
for i, (row_num, cell) in enumerate(potential_reels):
    if re.search(r'\b\d{4}\b', cell):  # 4-digit numbers
        print(f"Row {row_num}: '{cell}' (contains 4-digit number)")