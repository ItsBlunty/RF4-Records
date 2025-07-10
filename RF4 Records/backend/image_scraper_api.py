import cv2
import numpy as np
try:
    import pytesseract
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False
    print("Warning: pytesseract not available, using fallback method")

from PIL import Image
import json
import re
import os
from trophy_classifier import TROPHY_WEIGHTS

class FishImageScraper:
    def __init__(self):
        # Configure tesseract for better OCR results
        self.custom_config = r'--oem 3 --psm 6'
        
    def validate_fish_name(self, extracted_name):
        """Validate and correct fish name against trophy weights database"""
        # First try exact match (case insensitive)
        for trophy_fish_name in TROPHY_WEIGHTS.keys():
            if extracted_name.lower() == trophy_fish_name.lower():
                return trophy_fish_name
        
        # If no exact match, find closest match
        best_match = None
        best_score = 0
        
        for trophy_fish_name in TROPHY_WEIGHTS.keys():
            # Simple similarity check - count matching words
            extracted_words = set(extracted_name.lower().split())
            trophy_words = set(trophy_fish_name.lower().split())
            
            common_words = extracted_words.intersection(trophy_words)
            if common_words:
                score = len(common_words) / max(len(extracted_words), len(trophy_words))
                if score > best_score:
                    best_score = score
                    best_match = trophy_fish_name
        
        return best_match if best_match else extracted_name
    
    
    def extract_text_from_image(self, image_path):
        """Extract text using simple, optimized OCR"""
        if not TESSERACT_AVAILABLE:
            return "OCR not available"
            
        try:
            # Load image
            img = cv2.imread(image_path)
            if img is None:
                return "Could not load image"
            
            # Use simple, effective OCR configuration
            text = pytesseract.image_to_string(img, config=r'--oem 3 --psm 6')
            print(f"OCR extracted {len(text)} characters")
            return text.strip()
            
        except Exception as e:
            print(f"OCR failed: {e}")
            return "OCR failed"
    
    
    def parse_fish_data(self, text):
        """Parse OCR text to extract fish orders using column-based parsing"""
        print("Parsing fish data...")
        
        # Split text into lines and clean
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        
        print("Text lines:")
        for i, line in enumerate(lines):
            print(f"{i}: {line}")
        
        fish_data = []
        
        # The data is structured in columns. Let's parse it accordingly.
        # First line has fish names, then location, then quantity, mass, price
        
        # Find the line with fish names (contains multiple known fish names)
        fish_name_line = None
        for i, line in enumerate(lines):
            fish_count = 0
            for fish_name in TROPHY_WEIGHTS.keys():
                if fish_name.lower() in line.lower():
                    fish_count += 1
            if fish_count >= 3:  # Line with multiple fish names
                fish_name_line = i
                break
        
        if fish_name_line is None:
            print("Could not find fish name line")
            return []
        
        print(f"Fish name line: {fish_name_line} -> {lines[fish_name_line]}")
        
        # Extract all fish names from this line
        fish_names = []
        fish_line = lines[fish_name_line]
        print(f"Parsing fish line: '{fish_line}'")
        
        # Detect location from the text to set the right location name
        all_text = ' '.join(lines)
        if 'copper lake' in all_text.lower():
            location_name = "Copper Lake"
        elif 'norwegian sea' in all_text.lower():
            location_name = "Norwegian Sea"
        else:
            # Try to find any location from the maps list
            location_name = "Unknown"
            for line in lines:
                if 'lake' in line.lower() or 'sea' in line.lower() or 'river' in line.lower():
                    location_name = line.strip()
                    break
        
        print(f"Detected location: {location_name}")
        
        # Use comprehensive fish detection to find ALL fish names from trophy weights
        print("Using comprehensive fish name detection...")
        
        # Find ALL occurrences of fish names (including duplicates)
        found_positions = []
        for fish_name in TROPHY_WEIGHTS.keys():
            # Find all occurrences of this fish name
            start = 0
            while True:
                pos = fish_line.lower().find(fish_name.lower(), start)
                if pos == -1:
                    break
                found_positions.append((pos, fish_name))
                print(f"Found '{fish_name}' at position {pos}")
                start = pos + 1
        
        # Sort by position and filter out substring matches
        found_positions.sort()
        filtered_fish = []
        for i, (pos1, fish1) in enumerate(found_positions):
            # Check if this fish is a substring of any longer fish name at the same position
            is_substring = False
            for j, (pos2, fish2) in enumerate(found_positions):
                if i != j and pos1 >= pos2 and pos1 < pos2 + len(fish2) and fish1 != fish2:
                    is_substring = True
                    print(f"'{fish1}' is substring of '{fish2}', skipping")
                    break
            if not is_substring:
                filtered_fish.append(fish1)
        
        fish_names = filtered_fish
        
        print(f"Found fish names: {fish_names}")
        
        # Find quantity line
        quantity_line = None
        for i in range(fish_name_line + 1, min(len(lines), fish_name_line + 4)):
            if 'quantity' in lines[i].lower() and 'pcs' in lines[i].lower():
                quantity_line = i
                break
        
        if quantity_line is None:
            print("Could not find quantity line")
            return []
        
        print(f"Quantity line: {quantity_line} -> {lines[quantity_line]}")
        
        # Extract quantities (handle both "pcs" and "pes" OCR errors)
        quantities = re.findall(r'(\d+)\s*p[ce]s', lines[quantity_line].lower())
        print(f"Found quantities: {quantities}")
        
        # Find mass line
        mass_line = None
        for i in range(quantity_line + 1, min(len(lines), quantity_line + 3)):
            if 'mass' in lines[i].lower() and ('kg' in lines[i].lower() or 'g' in lines[i].lower()):
                mass_line = i
                break
        
        if mass_line is None:
            print("Could not find mass line")
            return []
        
        print(f"Mass line: {mass_line} -> {lines[mass_line]}")
        
        # Extract masses
        masses = re.findall(r'(\d+(?:\.\d+)?)\s*(g|kg)', lines[mass_line].lower())
        print(f"Found masses: {masses}")
        
        # Find price line (line with decimal numbers)
        price_line = None
        for i in range(mass_line + 1, min(len(lines), mass_line + 3)):
            if re.search(r'\d+\.\d+', lines[i]):
                price_line = i
                break
        
        if price_line is None:
            print("Could not find price line")
            return []
        
        print(f"Price line: {price_line} -> {lines[price_line]}")
        
        # Extract prices (handle currency symbols and both decimal and integer prices)
        # First try decimal prices
        prices = re.findall(r'(?:[S$]\s*)?(\d+\.\d+)', lines[price_line])
        # If we don't have enough, also look for integer prices
        if len(prices) < len(fish_names):
            all_prices = re.findall(r'(?:[S$]\s*)?(\d+(?:\.\d+)?)', lines[price_line])
            # Filter out very short numbers (likely not prices)
            prices = [p for p in all_prices if len(p) >= 2]
        print(f"Found prices: {prices}")
        
        # Match up the data (they should be in the same order)
        min_length = min(len(fish_names), len(quantities), len(masses), len(prices))
        print(f"Creating {min_length} fish entries")
        
        # Use the detected location name
        location = location_name
        
        for i in range(min_length):
            fish_entry = {
                'name': fish_names[i],
                'location': location,
                'quantity': f"{quantities[i]} pcs",
                'mass': f"{masses[i][0]} {masses[i][1]}",
                'price': prices[i]
            }
            fish_data.append(fish_entry)
            print(f"Added: {fish_entry}")
        
        # Look for the second group (Pike, Chub, Dinks mirror carp)
        # Find another fish name line after current position
        second_fish_line = None
        for i in range(price_line + 1, len(lines)):
            fish_count = 0
            for fish_name in TROPHY_WEIGHTS.keys():
                if fish_name.lower() in lines[i].lower():
                    fish_count += 1
            if fish_count >= 2:  # Line with multiple fish names
                second_fish_line = i
                break
        
        if second_fish_line is not None:
            print(f"Second fish line: {second_fish_line} -> {lines[second_fish_line]}")
            
            # Parse second group with known fish names
            second_fish_names = []
            second_line = lines[second_fish_line]
            print(f"Parsing second fish line: '{second_line}'")
            
            # Use comprehensive fish detection for second group too
            second_found_positions = []
            for fish_name in TROPHY_WEIGHTS.keys():
                if fish_name.lower() in second_line.lower():
                    pos = second_line.lower().find(fish_name.lower())
                    second_found_positions.append((pos, fish_name))
                    print(f"Second group found '{fish_name}' at position {pos}")
            
            # Sort by position and filter out substring matches for second group
            second_found_positions.sort()
            second_filtered_fish = []
            for i, (pos1, fish1) in enumerate(second_found_positions):
                # Check if this fish is a substring of any longer fish name at the same position
                is_substring = False
                for j, (pos2, fish2) in enumerate(second_found_positions):
                    if i != j and pos1 >= pos2 and pos1 < pos2 + len(fish2) and fish1 != fish2:
                        is_substring = True
                        print(f"Second group: '{fish1}' is substring of '{fish2}', skipping")
                        break
                if not is_substring:
                    second_filtered_fish.append(fish1)
            
            second_fish_names = second_filtered_fish
            
            print(f"Second group fish names: {second_fish_names}")
            
            # Initialize variables for second group data
            second_quantities = []
            second_masses = []
            second_prices = []
            
            # Find corresponding quantity, mass, price lines for second group
            for offset in range(1, 5):
                if second_fish_line + offset < len(lines):
                    line = lines[second_fish_line + offset]
                    print(f"Checking second group line {second_fish_line + offset}: '{line}'")
                    
                    # Check for quantity line (handle both "pcs" and "pes" OCR errors)
                    if 'quantity' in line.lower() and ('pcs' in line.lower() or 'pes' in line.lower()):
                        second_quantities = re.findall(r'(\d+)\s*p[ce]s', line.lower())
                        print(f"Second group quantities: {second_quantities}")
                    
                    # Check for mass line
                    if 'mass' in line.lower() and ('kg' in line.lower() or 'g' in line.lower()):
                        second_masses = re.findall(r'(\d+(?:\.\d+)?)\s*(g|kg)', line.lower())
                        print(f"Second group masses: {second_masses}")
                    
                    # Check for price line (handle currency symbols like S, $)
                    if re.search(r'\d+[\.\,]\d+', line) or re.search(r'[S$]\s*\d+', line):
                        # Handle lines like "S 126.71 S 217.64 796.04" or "194,37 619.06 S 737.54"
                        # First get decimal prices
                        second_prices = re.findall(r'(?:[S$]\s*)?(\d+\.\d+)', line)
                        # Also get comma decimal format like "194,37"
                        comma_prices = re.findall(r'(?:[S$]\s*)?(\d+,\d+)', line)
                        # Convert comma to dot and add to prices
                        second_prices.extend([p.replace(',', '.') for p in comma_prices])
                        print(f"Second group prices: {second_prices}")
            
            # Add second group if we have the data
            if second_quantities and second_masses and second_prices:
                second_min_length = min(len(second_fish_names), len(second_quantities), len(second_masses), len(second_prices))
                print(f"Creating {second_min_length} second group entries")
                
                for i in range(second_min_length):
                    fish_entry = {
                        'name': second_fish_names[i],
                        'location': location,
                        'quantity': f"{second_quantities[i]} pcs",
                        'mass': f"{second_masses[i][0]} {second_masses[i][1]}",
                        'price': second_prices[i]
                    }
                    fish_data.append(fish_entry)
                    print(f"Added second group: {fish_entry}")
            else:
                print(f"Missing second group data: quantities={len(second_quantities)}, masses={len(second_masses)}, prices={len(second_prices)}")
        
        print(f"Final result: {len(fish_data)} fish orders found")
        return fish_data
    
    

    def scrape_image(self, image_path):
        """Main method to scrape fish data from image using OCR only"""
        print(f"Processing image: {image_path}")
        
        # Always use OCR - no manual parsing
        print("Using OCR extraction")
        text = self.extract_text_from_image(image_path)
        print(f"Raw extracted text:\n{text}")
        print("-" * 50)
        
        # Parse fish data
        fish_data = self.parse_fish_data(text)
        
        # Validate fish names
        for fish in fish_data:
            if 'name' in fish:
                validated_name = self.validate_fish_name(fish['name'])
                if validated_name != fish['name']:
                    print(f"Fish name corrected: '{fish['name']}' -> '{validated_name}'")
                    fish['name'] = validated_name
        
        return fish_data