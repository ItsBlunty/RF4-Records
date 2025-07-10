#!/usr/bin/env python3
"""
Direct usage of RF4 Cafe OCR with training data validation
"""

import pytesseract
from PIL import Image
import cv2
import numpy as np
import json
import os
from pathlib import Path

class RF4CafeOCRProcessor:
    def __init__(self):
        self.known_fish = self.load_fish_vocabulary()
        self.known_locations = [
            "Norwegian Sea", "Sura River", "The Amber Lake", 
            "Volkhov River", "Mosquito Lake", "Winding Rivulet",
            "Old Burg Lake", "Akhtuba River", "Tri Lake", "Copper Lake"
        ]
        
    def load_fish_vocabulary(self):
        """Load known fish names from our annotations"""
        fish_names = set()
        
        # Parse from our training data
        if os.path.exists('rf4_vocab.txt'):
            with open('rf4_vocab.txt', 'r') as f:
                vocab = f.read().split('\n')
                # Filter multi-word fish names
                for word in vocab:
                    if word and not word in ['Quantity', 'Mass', 'from', 'pcs', 'kg', 'g', '$']:
                        fish_names.add(word)
        
        return fish_names
    
    def preprocess_for_ocr(self, image_path):
        """Advanced preprocessing for cafe order images"""
        # Read image
        img = cv2.imread(str(image_path))
        
        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Apply adaptive threshold
        thresh = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
            cv2.THRESH_BINARY, 11, 2
        )
        
        # Invert if needed (white text on dark background)
        if np.mean(thresh) < 127:
            thresh = cv2.bitwise_not(thresh)
        
        # Remove noise
        kernel = np.ones((1, 1), np.uint8)
        opening = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel)
        closing = cv2.morphologyEx(opening, cv2.MORPH_CLOSE, kernel)
        
        # Scale image
        scale_factor = 2.0
        width = int(closing.shape[1] * scale_factor)
        height = int(closing.shape[0] * scale_factor)
        scaled = cv2.resize(closing, (width, height), interpolation=cv2.INTER_CUBIC)
        
        return scaled
    
    def extract_with_validation(self, image_path):
        """Extract text and validate against known vocabulary"""
        # Preprocess image
        processed = self.preprocess_for_ocr(image_path)
        
        # Save preprocessed for debugging
        debug_path = Path('debug_preprocessed.png')
        cv2.imwrite(str(debug_path), processed)
        
        # OCR with custom config
        custom_config = r'--oem 3 --psm 6 -c tessedit_char_whitelist="0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-\'. $,\t\n"'
        
        text = pytesseract.image_to_string(processed, config=custom_config)
        
        print("Raw OCR output:")
        print(text)
        print("-" * 50)
        
        # Post-process and validate
        return self.post_process_text(text)
    
    def post_process_text(self, text):
        """Post-process OCR output using known vocabulary"""
        lines = text.strip().split('\n')
        
        # Correct common OCR errors using our vocabulary
        corrected_lines = []
        for line in lines:
            corrected = line
            
            # Check for location names
            for location in self.known_locations:
                if self.fuzzy_match(line, location):
                    corrected = location
                    break
            
            # Check for quantity patterns
            if "Quantity" in line or "pcs" in line:
                # Extract number
                import re
                nums = re.findall(r'\d+', line)
                if nums:
                    corrected = f"Quantity {nums[0]} pcs"
            
            # Check for mass patterns
            if "Mass" in line or "from" in line:
                import re
                # Look for number + unit
                mass_match = re.search(r'(\d+\.?\d*)\s*(kg|g)', line)
                if mass_match:
                    corrected = f"Mass from {mass_match.group(1)} {mass_match.group(2)}"
            
            corrected_lines.append(corrected)
        
        return '\n'.join(corrected_lines)
    
    def fuzzy_match(self, text, target, threshold=0.7):
        """Simple fuzzy matching"""
        text = text.lower().replace(' ', '')
        target = target.lower().replace(' ', '')
        
        # Calculate similarity
        matches = sum(1 for a, b in zip(text, target) if a == b)
        similarity = matches / max(len(text), len(target))
        
        return similarity >= threshold

def test_ocr():
    """Test the OCR on our training images"""
    processor = RF4CafeOCRProcessor()
    
    # Test on first available image
    training_dir = Path('ocr_training_full')
    test_images = list(training_dir.glob('*.png'))[:3]
    
    for img_path in test_images:
        print(f"\nTesting on: {img_path.name}")
        print("=" * 70)
        
        try:
            result = processor.extract_with_validation(img_path)
            
            # Load ground truth
            json_path = img_path.with_suffix('.json')
            if json_path.exists():
                with open(json_path, 'r') as f:
                    ground_truth = json.load(f)
                print("\nGround truth location:", ground_truth['location'])
                print("Number of orders:", len(ground_truth['orders']))
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    # Create vocabulary file if it doesn't exist
    if not os.path.exists('rf4_vocab.txt'):
        from train_ocr_simple import create_training_text
        create_training_text()
    
    # Run test
    test_ocr()
