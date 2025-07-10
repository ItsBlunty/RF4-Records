# RF4 Cafe OCR Model

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
- 37 annotated images
- Locations: Norwegian Sea, Sura River, The Amber Lake, Volkhov River, etc.
- Fish species and cafe order formats

## Notes:
- Optimized for RF4 cafe order screenshots
- Handles multi-column layouts
- Recognizes fish names, quantities, masses, and prices
