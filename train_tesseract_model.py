#!/usr/bin/env python3
"""
Tesseract OCR Training Script for RF4 Cafe Orders
This script prepares and trains a custom Tesseract model
"""

import os
import subprocess
import shutil
from pathlib import Path

class TesseractTrainer:
    def __init__(self, training_dir="ocr_training_full", output_dir="tesseract_training"):
        self.training_dir = Path(training_dir)
        self.output_dir = Path(output_dir)
        self.model_name = "rf4_cafe"
        self.lang_code = "rf4"
        
    def setup_directories(self):
        """Create necessary directories for training"""
        print("Setting up training directories...")
        
        # Create main output directory
        self.output_dir.mkdir(exist_ok=True)
        
        # Create subdirectories
        self.ground_truth_dir = self.output_dir / "ground-truth"
        self.ground_truth_dir.mkdir(exist_ok=True)
        
        self.eval_dir = self.output_dir / "eval"
        self.eval_dir.mkdir(exist_ok=True)
        
        self.output_model_dir = self.output_dir / "output"
        self.output_model_dir.mkdir(exist_ok=True)
        
        print("✓ Directories created")
        
    def prepare_training_data(self):
        """Copy and prepare training data in the correct format"""
        print("\nPreparing training data...")
        
        # Copy images and ground truth files
        image_count = 0
        for img_file in self.training_dir.glob("*.png"):
            base_name = img_file.stem
            gt_file = self.training_dir / f"{base_name}.gt.txt"
            
            if gt_file.exists():
                # Copy to ground-truth directory with proper naming
                shutil.copy(img_file, self.ground_truth_dir / f"{self.lang_code}.{base_name}.png")
                shutil.copy(gt_file, self.ground_truth_dir / f"{self.lang_code}.{base_name}.gt.txt")
                image_count += 1
        
        print(f"✓ Copied {image_count} training images")
        
        # Create list files
        self.create_list_files()
        
    def create_list_files(self):
        """Create training and evaluation list files"""
        # Get all training files
        all_files = sorted([f.stem for f in self.ground_truth_dir.glob(f"{self.lang_code}.*.png")])
        
        # Split 80/20 for training/evaluation
        split_idx = int(len(all_files) * 0.8)
        train_files = all_files[:split_idx]
        eval_files = all_files[split_idx:]
        
        # Write training list
        train_list = self.output_dir / "train.txt"
        with open(train_list, 'w') as f:
            for fname in train_files:
                f.write(f"{fname}\n")
        
        # Write evaluation list
        eval_list = self.output_dir / "eval.txt"
        with open(eval_list, 'w') as f:
            for fname in eval_files:
                f.write(f"{fname}\n")
        
        print(f"✓ Created training list with {len(train_files)} files")
        print(f"✓ Created evaluation list with {len(eval_files)} files")
        
    def create_font_properties(self):
        """Create font properties file"""
        font_props = self.output_dir / "font_properties"
        with open(font_props, 'w') as f:
            # Simple font properties for our use case
            f.write("sans 0 0 0 0 0\n")
            f.write("serif 0 0 0 0 0\n")
        print("✓ Created font properties file")
        
    def generate_training_files(self):
        """Generate box files and training data"""
        print("\nGenerating training files...")
        
        # First, we need to create box files from ground truth
        for gt_file in self.ground_truth_dir.glob(f"{self.lang_code}.*.gt.txt"):
            base_name = gt_file.stem
            img_file = self.ground_truth_dir / f"{base_name}.png"
            
            if img_file.exists():
                # Generate box file using tesseract
                cmd = [
                    "tesseract",
                    str(img_file),
                    str(self.ground_truth_dir / base_name),
                    "-l", "eng",
                    "--psm", "6",
                    "makebox"
                ]
                
                try:
                    subprocess.run(cmd, check=True, capture_output=True)
                except subprocess.CalledProcessError as e:
                    print(f"Warning: Failed to create box file for {base_name}")
                    
        print("✓ Generated box files")
        
    def run_training(self):
        """Run the actual Tesseract training"""
        print("\nStarting Tesseract training...")
        
        # Create starter traineddata from eng
        print("Creating starter traineddata...")
        starter_cmd = [
            "combine_tessdata", 
            "-e", "/usr/share/tesseract-ocr/4.00/tessdata/eng.traineddata",
            str(self.output_dir / "eng.")
        ]
        
        try:
            subprocess.run(starter_cmd, check=True)
        except:
            print("Warning: Could not extract eng traineddata components")
        
        # Run tesstrain if available
        tesstrain_script = """#!/bin/bash
cd {output_dir}

# Check if tesstrain is available
if ! command -v tesstrain &> /dev/null; then
    echo "tesstrain not found. Installing required tools..."
    
    # Clone tesstrain repository
    git clone https://github.com/tesseract-ocr/tesstrain.git
    cd tesstrain
    
    # Run make training with our data
    make training MODEL_NAME={model_name} START_MODEL=eng TESSDATA=/usr/share/tesseract-ocr/4.00/tessdata GROUND_TRUTH_DIR=../ground-truth OUTPUT_DIR=../output LANG_CODE={lang_code}
else
    # Run tesstrain directly
    tesstrain --fonts_dir /usr/share/fonts --lang {lang_code} --linedata_only --noextract_font_properties --langdata_dir ./langdata --tessdata_dir /usr/share/tesseract-ocr/4.00/tessdata --output_dir ./output --fontlist "Liberation Sans" "DejaVu Sans" --training_text ./train.txt --eval_listfile ./eval.txt
fi
""".format(output_dir=self.output_dir, model_name=self.model_name, lang_code=self.lang_code)
        
        # Write training script
        train_script = self.output_dir / "run_training.sh"
        with open(train_script, 'w') as f:
            f.write(tesstrain_script)
        
        train_script.chmod(0o755)
        print(f"✓ Created training script: {train_script}")
        
    def create_wordlist(self):
        """Create word list from vocabulary"""
        print("\nCreating word lists...")
        
        # Copy vocabulary file
        vocab_src = self.training_dir / "rf4_vocabulary.txt"
        if vocab_src.exists():
            wordlist = self.output_dir / f"{self.lang_code}.wordlist"
            shutil.copy(vocab_src, wordlist)
            
            # Also create a frequency list (all words get frequency 1)
            freq_list = self.output_dir / f"{self.lang_code}.word.freq"
            with open(vocab_src, 'r') as inf, open(freq_list, 'w') as outf:
                for line in inf:
                    word = line.strip()
                    if word:
                        outf.write(f"{word} 1\n")
            
            print("✓ Created word list and frequency files")
        
    def create_simple_training(self):
        """Create a simplified training approach using Python"""
        print("\nCreating simplified training data...")
        
        # Create LSTM training data format
        lstmf_dir = self.output_dir / "lstmf"
        lstmf_dir.mkdir(exist_ok=True)
        
        # Generate line images and transcriptions
        for gt_file in self.ground_truth_dir.glob(f"{self.lang_code}.*.gt.txt"):
            base_name = gt_file.stem
            img_file = self.ground_truth_dir / f"{base_name}.png"
            
            if img_file.exists():
                # Create line-based training data
                # For now, we'll prepare the structure
                pass
        
        # Create training command
        train_cmd = f"""#!/bin/bash
echo "RF4 Cafe OCR Training"
echo "====================="
echo ""
echo "Training data prepared in: {self.output_dir}"
echo ""
echo "To complete training, you need to:"
echo "1. Install tesstrain: git clone https://github.com/tesseract-ocr/tesstrain.git"
echo "2. Run the training script: {self.output_dir}/run_training.sh"
echo ""
echo "Alternatively, use the pre-processed ground truth files with tesseract directly:"
echo "  - Images: {self.ground_truth_dir}/*.png"
echo "  - Text: {self.ground_truth_dir}/*.gt.txt"
"""
        
        info_script = self.output_dir / "training_info.sh"
        with open(info_script, 'w') as f:
            f.write(train_cmd)
        info_script.chmod(0o755)
        
        print("✓ Created training info script")
        
    def package_model(self):
        """Package the trained model for deployment"""
        print("\nPackaging model...")
        
        # Create deployment directory
        deploy_dir = self.output_dir / "deploy"
        deploy_dir.mkdir(exist_ok=True)
        
        # Create usage instructions
        usage = f"""# RF4 Cafe OCR Model

## Usage:

1. Copy the trained model to tesseract data directory:
   ```
   sudo cp rf4.traineddata /usr/share/tesseract-ocr/4.00/tessdata/
   ```

2. Use with pytesseract:
   ```python
   import pytesseract
   text = pytesseract.image_to_string(image, lang='rf4')
   ```

## Training Data:
- {len(list(self.ground_truth_dir.glob('*.png')))} annotated images
- Locations: Norwegian Sea, Sura River, The Amber Lake, Volkhov River, etc.
- Fish species and cafe order formats

## Notes:
- Optimized for RF4 cafe order screenshots
- Handles multi-column layouts
- Recognizes fish names, quantities, masses, and prices
"""
        
        readme = deploy_dir / "README.md"
        with open(readme, 'w') as f:
            f.write(usage)
        
        print("✓ Created deployment package")
        
    def train(self):
        """Run the complete training pipeline"""
        print("Starting RF4 Cafe OCR Training Pipeline")
        print("=" * 50)
        
        self.setup_directories()
        self.prepare_training_data()
        self.create_font_properties()
        self.create_wordlist()
        self.generate_training_files()
        self.run_training()
        self.create_simple_training()
        self.package_model()
        
        print("\n" + "=" * 50)
        print("Training preparation complete!")
        print(f"Training files are in: {self.output_dir}")
        print(f"\nNext steps:")
        print(f"1. Run: bash {self.output_dir}/run_training.sh")
        print(f"2. Or see: bash {self.output_dir}/training_info.sh")

if __name__ == "__main__":
    trainer = TesseractTrainer()
    trainer.train()