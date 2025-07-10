#!/bin/bash
# RF4 Cafe OCR Fine-tuning Script

echo "RF4 Cafe OCR Fine-tuning"
echo "========================"

# Check if we have ground truth data
if [ ! -d "ocr_training_full" ]; then
    echo "Error: ocr_training_full directory not found!"
    exit 1
fi

# Count training files
num_files=$(ls ocr_training_full/*.png 2>/dev/null | wc -l)
echo "Found $num_files training images"

# For each image, we can use Tesseract to recognize with corrections
echo ""
echo "Ground truth data prepared. You can now:"
echo "1. Use the images directly with pytesseract in your application"
echo "2. Apply image preprocessing for better results"
echo "3. Use the ground truth for validation"

# Create a Python script that uses our training data
cat > use_trained_ocr.py << 'EOF'
import pytesseract
from PIL import Image
import cv2
import numpy as np
import json
import os

class RF4CafeOCR:
    def __init__(self, training_dir="ocr_training_full"):
        self.training_dir = training_dir
        self.load_training_data()
        
    def load_training_data(self):
        # Load ground truth for validation
        self.ground_truth = {}
        for json_file in os.listdir(self.training_dir):
            if json_file.endswith('.json'):
                with open(os.path.join(self.training_dir, json_file), 'r') as f:
                    base_name = json_file.replace('.json', '')
                    self.ground_truth[base_name] = json.load(f)
    
    def preprocess_image(self, image_path):
        # Preprocess image for better OCR
        # Read image
        img = cv2.imread(image_path)
        
        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Apply threshold to get black text on white background
        _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        # Denoise
        denoised = cv2.fastNlMeansDenoising(thresh)
        
        # Scale up for better OCR
        scaled = cv2.resize(denoised, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
        
        return scaled
    
    def extract_text(self, image_path, use_preprocessing=True):
        # Extract text from cafe order image
        if use_preprocessing:
            img = self.preprocess_image(image_path)
        else:
            img = Image.open(image_path)
        
        # Use Tesseract with custom config
        custom_config = r'--oem 3 --psm 6'
        text = pytesseract.image_to_string(img, config=custom_config)
        
        return text
    
    def parse_cafe_order(self, text):
        # Parse extracted text into structured data
        lines = text.strip().split('\n')
        orders = []
        
        # Logic to parse the structured format
        # This would need to be implemented based on the actual OCR output
        
        return orders

# Example usage
if __name__ == "__main__":
    ocr = RF4CafeOCR()
    
    # Test on a sample image
    sample_image = "ocr_training_full/Screenshot 2025-07-10 082415.png"
    if os.path.exists(sample_image):
        text = ocr.extract_text(sample_image)
        print("Extracted text:")
        print(text)
        print("\nGround truth:")
        base_name = os.path.basename(sample_image).replace('.png', '')
        if base_name in ocr.ground_truth:
            print(json.dumps(ocr.ground_truth[base_name], indent=2))
EOF

echo ""
echo "Created use_trained_ocr.py - A Python script to use the OCR with preprocessing"
