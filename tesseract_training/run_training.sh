#!/bin/bash
cd tesseract_training

# Check if tesstrain is available
if ! command -v tesstrain &> /dev/null; then
    echo "tesstrain not found. Installing required tools..."
    
    # Clone tesstrain repository
    git clone https://github.com/tesseract-ocr/tesstrain.git
    cd tesstrain
    
    # Run make training with our data
    make training MODEL_NAME=rf4_cafe START_MODEL=eng TESSDATA=/usr/share/tesseract-ocr/4.00/tessdata GROUND_TRUTH_DIR=../ground-truth OUTPUT_DIR=../output LANG_CODE=rf4
else
    # Run tesstrain directly
    tesstrain --fonts_dir /usr/share/fonts --lang rf4 --linedata_only --noextract_font_properties --langdata_dir ./langdata --tessdata_dir /usr/share/tesseract-ocr/4.00/tessdata --output_dir ./output --fontlist "Liberation Sans" "DejaVu Sans" --training_text ./train.txt --eval_listfile ./eval.txt
fi
