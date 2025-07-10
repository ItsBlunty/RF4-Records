#!/bin/bash

# Tesseract OCR Training Script for RF4 Cafe Orders
# This script sets up and trains a custom tesseract model for cafe order images

echo "RF4 Cafe Orders OCR Training Setup"
echo "=================================="

# 1. Create training data annotations
echo "Step 1: Creating training data annotations..."
python3 create_ocr_annotations.py

# 2. Check for tesseract and training tools
echo -e "\nStep 2: Checking tesseract installation..."
if ! command -v tesseract &> /dev/null; then
    echo "ERROR: tesseract not found. Please install tesseract-ocr"
    exit 1
fi

echo "Tesseract version:"
tesseract --version

# 3. Create training directory structure
echo -e "\nStep 3: Setting up training directories..."
mkdir -p tesseract_training/{ground_truth,images,output}

# 4. Copy images and ground truth
echo "Copying training images..."
cp copper1.png norway1.png norway2.png tesseract_training/images/

# 5. Convert ground truth to tesseract format
echo -e "\nStep 4: Converting annotations to tesseract format..."
cd tesseract_training

# For each image, create corresponding .box and .txt files
for img in images/*.png; do
    base=$(basename "$img" .png)
    
    # Copy ground truth text
    if [ -f "../ocr_training_data/${base}.gt.txt" ]; then
        cp "../ocr_training_data/${base}.gt.txt" "ground_truth/${base}.txt"
        
        # Create tif version (tesseract prefers tif)
        convert "$img" "ground_truth/${base}.tif" 2>/dev/null || echo "Warning: Could not convert to TIF"
    fi
done

echo -e "\nStep 5: Instructions for manual training..."
echo "To complete training, you need tesstrain:"
echo ""
echo "1. Clone tesstrain:"
echo "   git clone https://github.com/tesseract-ocr/tesstrain.git"
echo ""
echo "2. Install required tools:"
echo "   sudo apt-get install tesseract-ocr-eng tesseract-ocr libtesseract-dev"
echo "   sudo apt-get install libtesseract-dev libleptonica-dev"
echo ""
echo "3. Create line images and transcriptions:"
echo "   - For each image, create line-by-line segmentation"
echo "   - Match each line image with its text transcription"
echo ""
echo "4. Run training:"
echo "   make training MODEL_NAME=rf4_cafe START_MODEL=eng"
echo ""
echo "5. Deploy the trained model:"
echo "   - Copy the .traineddata file to tesseract's tessdata directory"
echo "   - Update image_scraper_api.py to use: config='--oem 3 --psm 6 -l rf4_cafe'"

echo -e "\nAlternative: Use existing model with custom word list..."
# Create custom word list for tesseract
cat > output/rf4_words.txt << EOF
# Fish names
Common Roach
Ide
Bleak
Mirror Carp
Kvolsdorfsky tench
Pike
Chub
Dinks mirror carp
Blue whiting
American plaice
Cusk
Atlantic herring
Edible crab
Small redfish
Turbot
European hake
Atlantic wolffish
Saithe
Mussel
Pollock

# Locations
Copper lake
Norwegian Sea

# Keywords
Quantity
Mass from
pcs
kg
g

# Common OCR corrections
pes -> pcs
EOF

echo "Created custom word list at: tesseract_training/output/rf4_words.txt"
echo "You can use this with: --user-words tesseract_training/output/rf4_words.txt"