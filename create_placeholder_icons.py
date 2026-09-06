#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Placeholder Icon Generator for Spolecne Nalezy
Creates simple colored placeholder icons in all required sizes
Run: python create_placeholder_icons.py
"""

from PIL import Image, ImageDraw, ImageFont
import os

# Configuration
COLOR_BG = (11, 14, 20)  # #0B0E14 - Dark gray from theme
COLOR_FG = (255, 255, 255)  # White
FONT_SIZE_RATIO = 0.4

# Icon sizes required
ICON_SIZES = {
    'public/icon-192.png': 192,
    'public/icon-512.png': 512,
    'public/icon-maskable-512.png': 512,
    'android/ic_launcher.png': 512,
    'android/ic_launcher_round.png': 512,
}

# Circle mask for maskable icon
def create_circle_mask(size):
    """Create a circular mask"""
    mask = Image.new('L', (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, size, size), fill=255)
    return mask

# Letter icon (simple "N" for Nalezy)
def create_letter_icon(size, letter="N"):
    """Create icon with a letter"""
    img = Image.new('RGBA', (size, size), COLOR_BG)
    draw = ImageDraw.Draw(img)
    
    # Calculate font size
    font_size = int(size * FONT_SIZE_RATIO)
    
    try:
        # Try to use a nice font
        font = ImageFont.truetype("arial.ttf", font_size)
    except:
        try:
            font = ImageFont.truetype("Arial", font_size)
        except:
            font = ImageFont.load_default()
    
    # Calculate text position (centered)
    # For Pillow 10+, use textbbox instead of deprecated textsize
    try:
        bbox = draw.textbbox((0, 0), letter, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
    except AttributeError:
        # Fallback for older Pillow versions
        text_width, text_height = draw.textsize(letter, font=font)
    
    x = (size - text_width) / 2
    y = (size - text_height) / 2
    
    # Draw letter
    draw.text((x, y), letter, fill=COLOR_FG, font=font)
    
    return img

# Camera icon (simple representation)
def create_camera_icon(size):
    """Create a simple camera icon"""
    img = Image.new('RGBA', (size, size), COLOR_BG)
    draw = ImageDraw.Draw(img)
    
    # Camera body (rectangle)
    pad = size * 0.2
    camera_width = size - pad * 2
    camera_height = size * 0.6
    camera_y = pad
    
    draw.rectangle([pad, camera_y, size - pad, camera_y + camera_height], fill=COLOR_FG)
    
    # Camera lens (circle)
    lens_size = size * 0.3
    lens_x = (size - lens_size) / 2
    lens_y = camera_y + camera_height + size * 0.1
    
    draw.ellipse([lens_x, lens_y, lens_x + lens_size, lens_y + lens_size], fill=COLOR_FG)
    
    # Inner circle (shutter)
    inner_size = lens_size * 0.6
    inner_x = (size - inner_size) / 2
    inner_y = lens_y + (lens_size - inner_size) / 2
    
    draw.ellipse([inner_x, inner_y, inner_x + inner_size, inner_y + inner_size], fill=COLOR_BG)
    
    return img

# Search/magnifying glass icon
def create_search_icon(size):
    """Create a simple search/magnifying glass icon"""
    img = Image.new('RGBA', (size, size), COLOR_BG)
    draw = ImageDraw.Draw(img)
    
    center = size / 2
    radius = size * 0.35
    
    # Circle (glass)
    draw.ellipse([center - radius, center - radius, center + radius, center + radius], 
                fill=COLOR_FG, outline=COLOR_FG, width=5)
    
    # Handle
    handle_length = size * 0.25
    handle_width = size * 0.08
    handle_x = center + radius + handle_width
    handle_y = center + handle_width
    
    draw.rectangle([center + radius, center, handle_x + handle_length, center + handle_width],
                  fill=COLOR_FG)
    
    return img

def main():
    print("=" * 70)
    print("Generating Placeholder Icons for Spolecne Nalezy")
    print("=" * 70)
    print()
    
    # Create directories if they don't exist
    os.makedirs('public', exist_ok=True)
    os.makedirs('android', exist_ok=True)
    
    # Generate icons
    for path, size in ICON_SIZES.items():
        print(f"Creating: {path} ({size}x{size})...")
        
        # Choose icon type based on filename
        if 'maskable' in path:
            # Create circular icon
            img = create_camera_icon(size)
            # Apply circular mask
            mask = create_circle_mask(size)
            img.putalpha(mask)
        elif 'launcher' in path:
            # Create camera icon for launcher
            img = create_camera_icon(size)
        else:
            # Create letter icon
            img = create_letter_icon(size, "N")
        
        # Save as PNG
        img.save(path, 'PNG')
        print(f"  [OK] Saved: {path}")
    
    print()
    print("=" * 70)
    print("Placeholder icons created successfully!")
    print("=" * 70)
    print()
    print("Files created:")
    for path in ICON_SIZES.keys():
        if os.path.exists(path):
            size = os.path.getsize(path)
            print(f"  [OK] {path} ({size:,} bytes)")
    print()
    print("Next steps:")
    print("  1. Replace these with your actual icons")
    print("  2. Run: bubblewrap init --manifest=twa-manifest.json")
    print("  3. Run: bubblewrap build")
    print()

if __name__ == '__main__':
    try:
        from PIL import Image
    except ImportError:
        print("Error: PIL/Pillow library is required!")
        print("Install it with: pip install Pillow")
        print("\nAlternatively, you can:")
        print("1. Install Pillow: pip install Pillow")
        print("2. Manually create the required icon files:")
        print("   - public/icon-192.png (192x192)")
        print("   - public/icon-512.png (512x512)")
        print("   - public/icon-maskable-512.png (512x512, circular)")
        exit(1)
    
    main()
