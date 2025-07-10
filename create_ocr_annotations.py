#!/usr/bin/env python3
"""
OCR Training Data Annotation Creator
Uses Claude's image reading to generate ground truth annotations for tesseract training
"""

import os
import json
import sys

# Ground truth annotations for cafe order images
# Format: image_filename -> complete text content as it should be OCR'd

CAFE_ORDER_ANNOTATIONS = {
    "copper1.png": {
        "location": "Copper Lake",
        "orders": [
            # First row
            {"fish": "Common Roach", "quantity": "6", "mass": "50 g", "price": "15.86"},
            {"fish": "Ide", "quantity": "1", "mass": "650 g", "price": "16.36"},
            {"fish": "Bleak", "quantity": "4", "mass": "20 g", "price": "17.04"},
            {"fish": "Mirror Carp", "quantity": "1", "mass": "4 kg", "price": "30.39"},
            {"fish": "Common Roach", "quantity": "7", "mass": "300 g", "price": "30.80"},
            {"fish": "Bleak", "quantity": "5", "mass": "72 g", "price": "55.16"},
            {"fish": "Kvolsdorfsky tench", "quantity": "1", "mass": "750 g", "price": "90.41"},
            # Second row
            {"fish": "Pike", "quantity": "2", "mass": "2 kg", "price": "126.71"},
            {"fish": "Chub", "quantity": "1", "mass": "5 kg", "price": "217.64"},
            {"fish": "Dinks mirror carp", "quantity": "1", "mass": "35 kg", "price": "796.04"}
        ],
        "raw_text": """Common Roach	Ide	Bleak	Mirror Carp	Common Roach	Bleak	Kvolsdorfsky tench
Copper lake	Copper lake	Copper lake	Copper lake	Copper lake	Copper lake	Copper lake
Quantity 6 pcs	Quantity 1 pcs	Quantity 4 pcs	Quantity 1 pcs	Quantity 7 pcs	Quantity 5 pcs	Quantity 1 pcs
Mass from 50 g	Mass from 650 g	Mass from 20 g	Mass from 4 kg	Mass from 300 g	Mass from 72 g	Mass from 750 g
15.86	16.36	17.04	30.39	30.80	55.16	90.41
Pike	Chub	Dinks mirror carp
Copper lake	Copper lake	Copper lake
Quantity 2 pcs	Quantity 1 pcs	Quantity 1 pcs
Mass from 2 kg	Mass from 5 kg	Mass from 35 kg
$ 126.71	$ 217.64	796.04"""
    },
    "norway1.png": {
        "location": "Norwegian Sea",
        "orders": [
            # First row
            {"fish": "Blue whiting", "quantity": "1", "mass": "900 g", "price": "63.77"},
            {"fish": "American plaice", "quantity": "1", "mass": "700 g", "price": "95.72"},
            {"fish": "Cusk", "quantity": "2", "mass": "2.5 kg", "price": "104.98"},
            {"fish": "Atlantic herring", "quantity": "1", "mass": "489 g", "price": "144.56"},
            {"fish": "Edible crab", "quantity": "1", "mass": "500 g", "price": "186.34"},
            # Second row
            {"fish": "Blue whiting", "quantity": "6", "mass": "549 g", "price": "220.13"},
            {"fish": "Small redfish", "quantity": "5", "mass": "1.799 kg", "price": "349.82"},
            {"fish": "Turbot", "quantity": "1", "mass": "14 kg", "price": "967.54"}
        ],
        "raw_text": """Blue whiting	American plaice	Cusk	Atlantic herring	Edible crab
Norwegian Sea	Norwegian Sea	Norwegian Sea	Norwegian Sea	Norwegian Sea
Quantity 1 pcs	Quantity 1 pcs	Quantity 2 pcs	Quantity 1 pcs	Quantity 1 pcs
Mass from 900 g	Mass from 700 g	Mass from 2.5 kg	Mass from 489 g	Mass from 500 g
63.77	95.72	104.98	144.56	$ 186.34
Blue whiting	Small redfish	Turbot
Norwegian Sea	Norwegian Sea	Norwegian Sea
Quantity 6 pcs	Quantity 5 pcs	Quantity 1 pcs
Mass from 549 g	Mass from 1.799 kg	Mass from 14 kg
$ 220.13	$ 349.82	$ 967.54"""
    },
    "norway2.png": {
        "location": "Norwegian Sea",
        "orders": [
            # First row
            {"fish": "European hake", "quantity": "1", "mass": "1.5 kg", "price": "66.51"},
            {"fish": "Cusk", "quantity": "2", "mass": "2.5 kg", "price": "77.38"},
            {"fish": "Atlantic wolffish", "quantity": "1", "mass": "2 kg", "price": "97.43"},
            {"fish": "Saithe", "quantity": "4", "mass": "3 kg", "price": "148.93"},
            {"fish": "Blue whiting", "quantity": "6", "mass": "549 g", "price": "164.11"},
            # Second row
            {"fish": "Mussel", "quantity": "1", "mass": "84 g", "price": "194.37"},
            {"fish": "Cusk", "quantity": "1", "mass": "20.999 kg", "price": "619.06"},
            {"fish": "Pollock", "quantity": "1", "mass": "12.499 kg", "price": "737.54"}
        ],
        "raw_text": """European hake	Cusk	Atlantic wolffish	Saithe	Blue whiting
Norwegian Sea	Norwegian Sea	Norwegian Sea	Norwegian Sea	Norwegian Sea
Quantity 1 pcs	Quantity 2 pcs	Quantity 1 pcs	Quantity 4 pcs	Quantity 6 pcs
Mass from 1.5 kg	Mass from 2.5 kg	Mass from 2 kg	Mass from 3 kg	Mass from 549 g
$ 66.51	$ 77.38	$ 97.43	$ 148.93	$ 164.11
Mussel	Cusk	Pollock
Norwegian Sea	Norwegian Sea	Norwegian Sea
Quantity 1 pcs	Quantity 1 pcs	Quantity 1 pcs
Mass from 84 g	Mass from 20.999 kg	Mass from 12.499 kg
$ 194.37	$ 619.06	$ 737.54"""
    }
}

def create_box_file(image_path, output_dir):
    """
    Create tesseract .box file for character-level training
    Box format: <character> <left> <bottom> <right> <top> <page>
    """
    # This would require pixel-level character positions
    # For now, we'll focus on text-based ground truth
    pass

def create_ground_truth_text(image_path, output_dir):
    """
    Create ground truth text file for tesseract training
    """
    image_name = os.path.basename(image_path)
    if image_name not in CAFE_ORDER_ANNOTATIONS:
        print(f"No annotations found for {image_name}")
        return
    
    annotation = CAFE_ORDER_ANNOTATIONS[image_name]
    
    # Create text file with same base name as image
    base_name = os.path.splitext(image_name)[0]
    text_file = os.path.join(output_dir, f"{base_name}.gt.txt")
    
    # Write raw text ground truth
    with open(text_file, 'w', encoding='utf-8') as f:
        f.write(annotation['raw_text'])
    
    print(f"Created ground truth: {text_file}")
    
    # Also create structured JSON for reference
    json_file = os.path.join(output_dir, f"{base_name}.json")
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(annotation, f, indent=2, ensure_ascii=False)
    
    print(f"Created structured data: {json_file}")

def create_training_manifest(output_dir):
    """
    Create manifest file listing all training images
    """
    manifest_file = os.path.join(output_dir, "training_manifest.txt")
    
    with open(manifest_file, 'w') as f:
        for image_name in CAFE_ORDER_ANNOTATIONS.keys():
            base_name = os.path.splitext(image_name)[0]
            f.write(f"{base_name}\n")
    
    print(f"Created manifest: {manifest_file}")

def read_and_annotate_image(image_path):
    """
    This function would be called by Claude to read an image and generate annotations
    Claude can see the image and create accurate ground truth data
    """
    print(f"Reading image: {image_path}")
    # Claude reads the image here and generates annotations
    # For now, we use the hardcoded annotations above
    return CAFE_ORDER_ANNOTATIONS.get(os.path.basename(image_path))

def main():
    # Create output directory for training data
    output_dir = "ocr_training_data"
    os.makedirs(output_dir, exist_ok=True)
    
    # Process each annotated image
    for image_name in CAFE_ORDER_ANNOTATIONS.keys():
        image_path = image_name  # Assuming images are in current directory
        if os.path.exists(image_path):
            create_ground_truth_text(image_path, output_dir)
        else:
            print(f"Warning: Image {image_path} not found")
    
    # Create training manifest
    create_training_manifest(output_dir)
    
    print(f"\nTraining data created in '{output_dir}' directory")
    print("\nNext steps for tesseract training:")
    print("1. Install tesstrain: git clone https://github.com/tesseract-ocr/tesstrain")
    print("2. Prepare font files if doing synthetic training")
    print("3. Run make training with the ground truth data")
    print("4. Generate .traineddata file for deployment")

if __name__ == "__main__":
    main()