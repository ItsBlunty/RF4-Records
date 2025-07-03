#!/usr/bin/env python3
"""
Script to create preview versions of map images for faster loading.
Resizes images to 25% of original size and adds -preview suffix.
"""

import os
from PIL import Image

def create_preview(image_path, quality=25):
    """
    Create a preview version of an image at specified quality percentage.
    
    Args:
        image_path (str): Path to the original image
        quality (int): Percentage of original size (default 25%)
    """
    try:
        # Open the original image
        with Image.open(image_path) as img:
            # Calculate new dimensions
            original_width, original_height = img.size
            new_width = int(original_width * (quality / 100))
            new_height = int(original_height * (quality / 100))
            
            # Resize the image using high-quality resampling
            resized_img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
            
            # Generate preview filename
            file_dir = os.path.dirname(image_path)
            file_name = os.path.basename(image_path)
            name_parts = file_name.rsplit('.', 1)
            if len(name_parts) == 2:
                preview_name = f"{name_parts[0]}-preview.{name_parts[1]}"
            else:
                preview_name = f"{file_name}-preview"
            
            preview_path = os.path.join(file_dir, preview_name)
            
            # Save the preview image
            resized_img.save(preview_path, optimize=True, quality=85)
            
            print(f"✅ Created preview: {preview_name}")
            print(f"   Original: {original_width}x{original_height} ({os.path.getsize(image_path)} bytes)")
            print(f"   Preview:  {new_width}x{new_height} ({os.path.getsize(preview_path)} bytes)")
            print()
            
    except Exception as e:
        print(f"❌ Error processing {image_path}: {e}")

def main():
    # Path to the images directory
    images_dir = "RF4 Records/frontend/public/images"
    
    if not os.path.exists(images_dir):
        print(f"❌ Images directory not found: {images_dir}")
        return
    
    # Find all map images
    map_files = []
    for file in os.listdir(images_dir):
        if file.lower().endswith(('.png', '.jpg', '.jpeg')) and not file.endswith('-preview.png'):
            map_files.append(file)
    
    if not map_files:
        print("❌ No map images found in the images directory")
        return
    
    print(f"🔍 Found {len(map_files)} map images to process:")
    for file in map_files:
        print(f"   - {file}")
    print()
    
    # Create previews
    print("🚀 Creating preview images...")
    for file in map_files:
        image_path = os.path.join(images_dir, file)
        create_preview(image_path)
    
    print("✨ Preview creation complete!")

if __name__ == "__main__":
    main()