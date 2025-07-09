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
    
    def preprocess_image(self, image_path):
        """Preprocess image for better OCR results"""
        # Load image
        img = cv2.imread(image_path)
        
        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Apply multiple preprocessing techniques for better OCR
        # 1. Simple threshold
        _, thresh1 = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        # 2. Adaptive threshold (better for varying lighting)
        thresh2 = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
        
        # 3. Morphological operations to clean up the image
        kernel = np.ones((1,1), np.uint8)
        cleaned = cv2.morphologyEx(thresh1, cv2.MORPH_CLOSE, kernel)
        cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_OPEN, kernel)
        
        # 4. Denoise
        denoised = cv2.medianBlur(cleaned, 3)
        
        return denoised
    
    def extract_text_from_image(self, image_path):
        """Extract all text from image using OCR with multiple attempts"""
        if not TESSERACT_AVAILABLE:
            return "OCR not available"
            
        try:
            # Try multiple OCR configurations for better results
            configs = [
                r'--oem 3 --psm 6',  # Default
                r'--oem 3 --psm 4',  # Single column of text
                r'--oem 3 --psm 3',  # Fully automatic page segmentation
                r'--oem 3 --psm 11', # Sparse text
                r'--oem 3 --psm 13'  # Raw line (treat image as single text line)
            ]
            
            all_text = []
            
            for config in configs:
                try:
                    # Preprocess image
                    processed_img = self.preprocess_image(image_path)
                    
                    # Use pytesseract to extract text
                    text = pytesseract.image_to_string(processed_img, config=config)
                    if text.strip():
                        all_text.append(text)
                except Exception as e:
                    print(f"OCR config {config} failed: {e}")
                    continue
            
            # Combine all extracted text
            combined_text = "\n".join(all_text)
            return combined_text if combined_text.strip() else "No text extracted"
            
        except Exception as e:
            print(f"OCR failed: {e}")
            return "OCR failed"
    
    def find_fish_name_in_line(self, line):
        """Find fish name in a line by matching against trophy database"""
        line_lower = line.lower()
        
        # Try exact matches first
        for fish_name in TROPHY_WEIGHTS.keys():
            if fish_name.lower() in line_lower:
                return fish_name
        
        # Try partial matches
        for fish_name in TROPHY_WEIGHTS.keys():
            fish_words = fish_name.lower().split()
            line_words = line_lower.split()
            
            if len(fish_words) > 1:
                # Multi-word fish names - check if most words match
                matches = sum(1 for word in fish_words if word in line_words)
                if matches >= len(fish_words) * 0.7:  # 70% of words match
                    return fish_name
            else:
                # Single word fish names
                if fish_words[0] in line_words:
                    return fish_name
        
        return None
    
    def parse_fish_data(self, text):
        """Parse extracted text to identify fish data with improved pattern matching"""
        lines = text.strip().split('\n')
        
        # Filter out empty lines and very short lines
        lines = [line.strip() for line in lines if line.strip() and len(line.strip()) > 2]
        
        print("Extracted text lines:")
        for i, line in enumerate(lines):
            print(f"{i}: {line}")
        
        fish_data = []
        
        # Look for structured data patterns that might indicate fish records
        # Pattern 1: Try to find fish names and then look for associated data
        for i, line in enumerate(lines):
            potential_fish_name = self.find_fish_name_in_line(line)
            if potential_fish_name:
                fish_entry = {'name': potential_fish_name}
                
                # Look for location in surrounding lines
                fish_entry['location'] = "Unknown"
                search_range = max(0, i-3), min(len(lines), i+6)  # Expanded search range
                for j in range(search_range[0], search_range[1]):
                    if any(loc in lines[j].lower() for loc in ['sea', 'ocean', 'lake', 'river', 'pond', 'bay']):
                        fish_entry['location'] = lines[j].strip()
                        break
                
                # Look for quantity pattern (digit + pcs)
                for j in range(search_range[0], search_range[1]):
                    quantity_match = re.search(r'(\d+)\s*pcs', lines[j].lower())
                    if quantity_match:
                        fish_entry['quantity'] = f"{quantity_match.group(1)} pcs"
                        break
                
                # Look for mass pattern (number + g or kg)
                for j in range(search_range[0], search_range[1]):
                    mass_match = re.search(r'(\d+(?:\.\d+)?)\s*(g|kg)', lines[j].lower())
                    if mass_match:
                        fish_entry['mass'] = f"{mass_match.group(1)} {mass_match.group(2)}"
                        break
                
                # Look for price pattern (decimal number)
                for j in range(search_range[0], search_range[1]):
                    price_match = re.search(r'(\d+\.\d+)', lines[j])
                    if price_match:
                        fish_entry['price'] = price_match.group(1)
                        break
                
                fish_data.append(fish_entry)
        
        # Pattern 2: If we didn't find much, try a different approach - look for lines with numbers
        if len(fish_data) < 3:  # If we found fewer than 3 records, try alternate parsing
            print("Trying alternate parsing approach...")
            
            # Look for lines that contain both text and numbers (potential fish records)
            for i, line in enumerate(lines):
                # Look for lines that might contain multiple pieces of information
                if re.search(r'\d', line) and len(line) > 10:  # Contains numbers and is substantial
                    # Try to extract fish name, quantity, mass, price from the same line or adjacent lines
                    fish_words = line.split()
                    
                    # Look for potential fish names in this line
                    for word_combo in self.get_word_combinations(fish_words):
                        potential_fish = self.find_fish_name_in_line(word_combo)
                        if potential_fish:
                            fish_entry = {'name': potential_fish}
                            
                            # Extract other data from this line and nearby lines
                            combined_text = line
                            if i > 0:
                                combined_text = lines[i-1] + " " + combined_text
                            if i < len(lines) - 1:
                                combined_text = combined_text + " " + lines[i+1]
                            
                            # Extract patterns
                            quantity_match = re.search(r'(\d+)\s*pcs', combined_text.lower())
                            if quantity_match:
                                fish_entry['quantity'] = f"{quantity_match.group(1)} pcs"
                            
                            mass_match = re.search(r'(\d+(?:\.\d+)?)\s*(g|kg)', combined_text.lower())
                            if mass_match:
                                fish_entry['mass'] = f"{mass_match.group(1)} {mass_match.group(2)}"
                            
                            # Look for location
                            fish_entry['location'] = "Unknown"
                            for j in range(max(0, i-2), min(len(lines), i+3)):
                                if any(loc in lines[j].lower() for loc in ['sea', 'ocean', 'lake', 'river', 'pond', 'bay']):
                                    fish_entry['location'] = lines[j].strip()
                                    break
                            
                            # Look for price (decimal number)
                            price_match = re.search(r'(\d+\.\d+)', combined_text)
                            if price_match:
                                fish_entry['price'] = price_match.group(1)
                            
                            # Only add if we have some useful data
                            if 'quantity' in fish_entry or 'mass' in fish_entry or 'price' in fish_entry:
                                fish_data.append(fish_entry)
                            break
        
        # Remove duplicates based on fish name
        seen_fish = set()
        unique_fish_data = []
        for fish in fish_data:
            fish_key = fish['name'].lower()
            if fish_key not in seen_fish:
                seen_fish.add(fish_key)
                unique_fish_data.append(fish)
        
        return unique_fish_data
    
    def get_word_combinations(self, words):
        """Generate word combinations for fish name matching"""
        combinations = []
        for i in range(len(words)):
            for j in range(i+1, min(i+4, len(words)+1)):  # Up to 3-word combinations
                combo = " ".join(words[i:j])
                combinations.append(combo)
        return combinations
    
    def scrape_image(self, image_path):
        """Main method to scrape fish data from image"""
        print(f"Processing image: {image_path}")
        
        # Extract text using OCR
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