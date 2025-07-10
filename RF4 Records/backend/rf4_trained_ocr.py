#!/usr/bin/env python3
"""
RF4 Trained OCR Module
Uses our training data to improve OCR accuracy
"""

import pytesseract
from PIL import Image
import cv2
import numpy as np
import json
import os
from pathlib import Path
from typing import Dict, List, Tuple
import re
from difflib import SequenceMatcher

class RF4TrainedOCR:
    def __init__(self, training_dir="ocr_training_full"):
        self.training_dir = Path(training_dir)
        self.vocabulary = self._load_vocabulary()
        self.known_fish = self._load_fish_names()
        self.known_locations = [
            "Norwegian Sea", "Sura River", "The Amber Lake", 
            "Volkhov River", "Mosquito Lake", "Winding Rivulet",
            "Old Burg Lake", "Akhtuba River", "Tri Lake", "Copper Lake"
        ]
        
    def _load_vocabulary(self) -> set:
        """Load vocabulary from training data"""
        vocab = set()
        if os.path.exists('rf4_vocab.txt'):
            with open('rf4_vocab.txt', 'r') as f:
                vocab = set(line.strip() for line in f if line.strip())
        return vocab
    
    def _load_fish_names(self) -> set:
        """Extract fish names from training data"""
        fish_names = set()
        
        # Load from all JSON files in training directory
        for json_file in self.training_dir.glob('*.json'):
            with open(json_file, 'r') as f:
                data = json.load(f)
                for order in data.get('orders', []):
                    fish_names.add(order['fish'])
        
        return fish_names
    
    def preprocess_image(self, image_path: str) -> np.ndarray:
        """Advanced preprocessing specifically for RF4 cafe orders"""
        # Read image
        img = cv2.imread(str(image_path))
        if img is None:
            raise ValueError(f"Could not read image: {image_path}")
        
        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Apply CLAHE for better contrast
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
        enhanced = clahe.apply(gray)
        
        # Binary threshold
        _, binary = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        # Check if we need to invert (white text on dark background)
        if np.mean(binary) < 127:
            binary = cv2.bitwise_not(binary)
        
        # Denoise
        denoised = cv2.medianBlur(binary, 3)
        
        # Scale up for better OCR (2x scale)
        scaled = cv2.resize(denoised, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
        
        return scaled
    
    def extract_text(self, image_path: str) -> str:
        """Extract text using Tesseract with RF4-specific config"""
        # Preprocess the image
        processed = self.preprocess_image(image_path)
        
        # Tesseract config optimized for RF4 cafe orders
        custom_config = r'--oem 3 --psm 6 -c tessedit_char_whitelist="0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-\'. $,\t\n"'
        
        # Extract text
        text = pytesseract.image_to_string(processed, config=custom_config)
        
        return text
    
    def fuzzy_match(self, text: str, candidates: List[str], threshold: float = 0.7) -> str:
        """Find best match from candidates using fuzzy matching"""
        best_match = None
        best_score = 0
        
        for candidate in candidates:
            score = SequenceMatcher(None, text.lower(), candidate.lower()).ratio()
            if score > best_score and score >= threshold:
                best_score = score
                best_match = candidate
        
        return best_match
    
    def parse_cafe_orders(self, raw_text: str) -> Dict:
        """Parse OCR text into structured cafe order data"""
        lines = [line.strip() for line in raw_text.split('\n') if line.strip()]
        
        result = {
            'location': None,
            'orders': []
        }
        
        # Find location
        for line in lines:
            location_match = self.fuzzy_match(line, self.known_locations)
            if location_match:
                result['location'] = location_match
                break
        
        # Parse orders
        current_order = {}
        
        for i, line in enumerate(lines):
            # Check if line contains a fish name
            fish_match = self.fuzzy_match(line, list(self.known_fish), threshold=0.6)
            if fish_match:
                # Save previous order if exists
                if current_order:
                    result['orders'].append(current_order)
                
                current_order = {'fish': fish_match}
                continue
            
            # Check for quantity pattern
            quantity_match = re.search(r'Quantity\s*(\d+)\s*pcs', line, re.IGNORECASE)
            if not quantity_match:
                quantity_match = re.search(r'(\d+)\s*pcs', line)
            if quantity_match and current_order:
                current_order['quantity'] = quantity_match.group(1)
                continue
            
            # Check for mass pattern
            mass_match = re.search(r'Mass\s*from\s*([\d.,]+)\s*(kg|g)', line, re.IGNORECASE)
            if not mass_match:
                mass_match = re.search(r'([\d.,]+)\s*(kg|g)', line)
            if mass_match and current_order:
                current_order['mass'] = f"{mass_match.group(1)} {mass_match.group(2)}"
                continue
            
            # Check for price pattern
            price_match = re.search(r'\$?\s*([\d,]+\.?\d*)', line)
            if price_match and current_order and 'quantity' in current_order and 'mass' in current_order:
                current_order['price'] = price_match.group(1)
        
        # Add last order
        if current_order and 'fish' in current_order:
            result['orders'].append(current_order)
        
        return result
    
    def extract_cafe_orders(self, image_path: str) -> Dict:
        """Main method to extract cafe orders from an image"""
        # Extract raw text
        raw_text = self.extract_text(image_path)
        
        # Parse into structured data
        parsed_data = self.parse_cafe_orders(raw_text)
        
        # Post-process and validate
        return self.validate_and_correct(parsed_data)
    
    def validate_and_correct(self, data: Dict) -> Dict:
        """Validate and correct parsed data"""
        # Ensure all orders have required fields
        valid_orders = []
        for order in data.get('orders', []):
            if all(key in order for key in ['fish', 'quantity', 'mass', 'price']):
                # Clean up price format
                order['price'] = order['price'].replace('$', '').strip()
                valid_orders.append(order)
        
        data['orders'] = valid_orders
        
        # If no location found, try to infer from fish types
        if not data['location'] and data['orders']:
            # Norwegian Sea fish
            norwegian_fish = {'Pollock', 'Saithe', 'Haddock', 'Atlantic mackerel', 'Blue whiting', 
                            'Cusk', 'Atlantic wolffish', 'Small redfish', 'Beaked redfish'}
            
            fish_in_order = {order['fish'] for order in data['orders']}
            if fish_in_order & norwegian_fish:
                data['location'] = 'Norwegian Sea'
        
        return data

# Integration function for the backend
def process_cafe_image(image_path: str) -> Dict:
    """Process a cafe order image and return structured data"""
    ocr = RF4TrainedOCR()
    
    try:
        result = ocr.extract_cafe_orders(image_path)
        result['success'] = True
        result['method'] = 'trained_ocr'
        return result
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'location': None,
            'orders': []
        }

if __name__ == "__main__":
    # Test the OCR
    test_image = "ocr_training_full/Screenshot 2025-07-10 082415.png"
    if os.path.exists(test_image):
        print(f"Testing on: {test_image}")
        result = process_cafe_image(test_image)
        print(json.dumps(result, indent=2))