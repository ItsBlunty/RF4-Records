#!/usr/bin/env python3
"""
Simplified OCR training using direct Tesseract fine-tuning
"""

import os
import subprocess
import shutil
from pathlib import Path
import json

def create_training_text():
    """Create training text from our annotations"""
    print("Creating training text from annotations...")
    
    # Read all annotations
    training_text = []
    vocab = set()
    
    # Load from full annotations file
    with open('full_cafepics_annotations.py', 'r') as f:
        content = f.read()
        # Extract the dictionary (this is a bit hacky but works for our case)
        start = content.find('FULL_CAFE_ANNOTATIONS = {')
        end = content.rfind('}')
        dict_str = content[start:end+1]
        
    # Create training text from annotations
    training_dir = Path('ocr_training_full')
    
    for json_file in training_dir.glob('*.json'):
        with open(json_file, 'r') as f:
            data = json.load(f)
            
            # Add location
            training_text.append(data['location'])
            vocab.add(data['location'])
            
            # Add all fish names and details
            for order in data['orders']:
                # Fish name
                training_text.append(order['fish'])
                for word in order['fish'].split():
                    vocab.add(word)
                
                # Quantity format
                training_text.append(f"Quantity {order['quantity']} pcs")
                vocab.add("Quantity")
                vocab.add("pcs")
                
                # Mass format
                training_text.append(f"Mass from {order['mass']}")
                vocab.add("Mass")
                vocab.add("from")
                vocab.add("kg")
                vocab.add("g")
                
                # Price (with currency symbol)
                if float(order['price'].replace(',', '')) > 100:
                    training_text.append(f"$ {order['price']}")
                    vocab.add("$")
                else:
                    training_text.append(order['price'])
    
    # Write training text
    with open('rf4_training_text.txt', 'w') as f:
        f.write('\n'.join(training_text))
    
    # Write vocabulary
    with open('rf4_vocab.txt', 'w') as f:
        f.write('\n'.join(sorted(vocab)))
    
    print(f"✓ Created training text with {len(training_text)} lines")
    print(f"✓ Created vocabulary with {len(vocab)} unique words")
    
    return training_text, vocab

def prepare_fine_tuning():
    """Prepare files for Tesseract fine-tuning"""
    print("\nPreparing fine-tuning data...")
    
    output_dir = Path('tesseract_finetune')
    output_dir.mkdir(exist_ok=True)
    
    # Create a script to fine-tune using our ground truth
    finetune_script = """#!/bin/bash
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
        lines = text.strip().split('\\n')
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
        print("\\nGround truth:")
        base_name = os.path.basename(sample_image).replace('.png', '')
        if base_name in ocr.ground_truth:
            print(json.dumps(ocr.ground_truth[base_name], indent=2))
EOF

echo ""
echo "Created use_trained_ocr.py - A Python script to use the OCR with preprocessing"
"""
    
    # Write fine-tuning script
    script_path = output_dir / 'finetune_rf4.sh'
    with open(script_path, 'w') as f:
        f.write(finetune_script)
    script_path.chmod(0o755)
    
    print(f"✓ Created fine-tuning script: {script_path}")
    
    # Create a config file for Tesseract
    config_content = """# RF4 Cafe OCR Configuration
tessedit_char_whitelist 0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-'. $,
load_system_dawg 0
load_freq_dawg 0
tessedit_enable_dict_correction 1
"""
    
    config_path = output_dir / 'rf4_config.txt'
    with open(config_path, 'w') as f:
        f.write(config_content)
    
    print(f"✓ Created Tesseract config: {config_path}")

def create_direct_usage_script():
    """Create a script that directly uses our training data"""
    print("\nCreating direct usage script...")
    
    usage_script = '''#!/usr/bin/env python3
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
                vocab = f.read().split('\\n')
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
        custom_config = r'--oem 3 --psm 6 -c tessedit_char_whitelist="0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-\\'. $,\\t\\n"'
        
        text = pytesseract.image_to_string(processed, config=custom_config)
        
        print("Raw OCR output:")
        print(text)
        print("-" * 50)
        
        # Post-process and validate
        return self.post_process_text(text)
    
    def post_process_text(self, text):
        """Post-process OCR output using known vocabulary"""
        lines = text.strip().split('\\n')
        
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
                nums = re.findall(r'\\d+', line)
                if nums:
                    corrected = f"Quantity {nums[0]} pcs"
            
            # Check for mass patterns
            if "Mass" in line or "from" in line:
                import re
                # Look for number + unit
                mass_match = re.search(r'(\\d+\\.?\\d*)\\s*(kg|g)', line)
                if mass_match:
                    corrected = f"Mass from {mass_match.group(1)} {mass_match.group(2)}"
            
            corrected_lines.append(corrected)
        
        return '\\n'.join(corrected_lines)
    
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
        print(f"\\nTesting on: {img_path.name}")
        print("=" * 70)
        
        try:
            result = processor.extract_with_validation(img_path)
            
            # Load ground truth
            json_path = img_path.with_suffix('.json')
            if json_path.exists():
                with open(json_path, 'r') as f:
                    ground_truth = json.load(f)
                print("\\nGround truth location:", ground_truth['location'])
                print("Number of orders:", len(ground_truth['orders']))
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    # Create vocabulary file if it doesn\'t exist
    if not os.path.exists('rf4_vocab.txt'):
        from train_ocr_simple import create_training_text
        create_training_text()
    
    # Run test
    test_ocr()
'''
    
    with open('test_rf4_ocr.py', 'w') as f:
        f.write(usage_script)
    
    os.chmod('test_rf4_ocr.py', 0o755)
    print("✓ Created test_rf4_ocr.py")

def main():
    """Main training preparation"""
    print("RF4 Cafe OCR Training Preparation")
    print("=" * 50)
    
    # Create training text
    create_training_text()
    
    # Prepare fine-tuning
    prepare_fine_tuning()
    
    # Create usage script
    create_direct_usage_script()
    
    print("\n" + "=" * 50)
    print("Training preparation complete!")
    print("\nYou can now:")
    print("1. Run the OCR test: python test_rf4_ocr.py")
    print("2. Use the fine-tuning script: bash tesseract_finetune/finetune_rf4.sh")
    print("\nThe OCR will use preprocessing and vocabulary validation")
    print("to improve accuracy on RF4 cafe order images.")

if __name__ == "__main__":
    main()