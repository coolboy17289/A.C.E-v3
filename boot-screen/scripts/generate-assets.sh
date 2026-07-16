#!/bin/bash
# ============================================================
# ACE Boot Screen Asset Generator
# Creates PNG images for GRUB theme and Plymouth splash
# Uses ImageMagick to generate assets programmatically
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ASSETS_DIR="$SCRIPT_DIR/assets"
GRUB_THEME_DIR="$SCRIPT_DIR/grub/theme"
PLYMOUTH_THEME_DIR="$SCRIPT_DIR/plymouth/themes/ace"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ACE Boot Screen Asset Generator${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check for ImageMagick
if ! command -v convert &>/dev/null; then
    echo -e "${RED}[!] ImageMagick not found. Installing...${NC}"
    sudo apt-get update -qq
    sudo apt-get install -y -qq imagemagick fonts-dejavu
fi

# Create output directories
mkdir -p "$ASSETS_DIR"
mkdir -p "$GRUB_THEME_DIR"

echo -e "${GREEN}[1/6] Generating background image (1920x1080)...${NC}"

# Create dark background with gradient
convert -size 1920x1080 \
    xc:"#0a0a1a" \
    -fill "#0d0d2b" -draw "rectangle 0,0 1920,540" \
    -fill "#060612" -draw "rectangle 0,540 1920,1080" \
    "$ASSETS_DIR/background.png"

echo -e "${GREEN}[2/6] Generating ACE logo (ASCII art)...${NC}"

# Create ACE ASCII art logo
convert -size 600x120 xc:"#0a0a1a" \
    -font "DejaVu-Sans-Mono-Bold" -pointsize 60 \
    -fill "#00ff88" -stroke "#00cc6a" -strokewidth 2 \
    -gravity Center \
    -annotate +0+0 "A.C.E" \
    "$ASSETS_DIR/ace-logo.png"

echo -e "${GREEN}[3/6] Generating title image...${NC}"

# Create title text
convert -size 800x60 xc:"#0a0a1a" \
    -font "DejaVu-Sans-Bold" -pointsize 32 \
    -fill "#00ff88" \
    -gravity Center \
    -annotate +0+0 "ACADEMIC COMPANION ENGINE" \
    "$ASSETS_DIR/ace-title.png"

echo -e "${GREEN}[4/6] Generating subtitle image...${NC}"

# Create subtitle
convert -size 600x40 xc:"#0a0a1a" \
    -font "DejaVu-Sans" -pointsize 18 \
    -fill "#00cc6a" \
    -gravity Center \
    -annotate +0+0 "Academic Companion Engine" \
    "$ASSETS_DIR/ace-subtitle.png"

echo -e "${GREEN}[5/6] Generating version image...${NC}"

# Create version text
convert -size 200x30 xc:"#0a0a1a" \
    -font "DejaVu-Sans" -pointsize 14 \
    -fill "#666666" \
    -gravity Center \
    -annotate +0+0 "v1.2 --beta" \
    "$ASSETS_DIR/ace-version.png"

echo -e "${GREEN}[6/6] Generating loading animation frames...${NC}"

# Create loading dots animation (3 frames)
for i in 1 2 3; do
    dots=""
    for j in 1 2 3; do
        if [ $j -le $i ]; then
            dots="${dots}●"
        else
            dots="${dots}○"
        fi
    done

    convert -size 200x40 xc:"#0a0a1a" \
        -font "DejaVu-Sans" -pointsize 24 \
        -fill "#00ff88" \
        -gravity Center \
        -annotate +0+0 "$dots" \
        "$ASSETS_DIR/ace-loading-${i}.png"
done

# Copy assets to GRUB theme directory
echo ""
echo -e "${GREEN}[*] Copying assets to GRUB theme directory...${NC}"
cp "$ASSETS_DIR/background.png" "$GRUB_THEME_DIR/"

# Copy assets to Plymouth theme directory
echo -e "${GREEN}[*] Copying assets to Plymouth theme directory...${NC}"
mkdir -p "$PLYMOUTH_THEME_DIR"
cp "$ASSETS_DIR/"*.png "$PLYMOUTH_THEME_DIR/"

# Also create a combined GRUB background with the logo
echo -e "${GREEN}[*] Creating combined GRUB background...${NC}"
convert "$ASSETS_DIR/background.png" \
    "$ASSETS_DIR/ace-logo.png" -gravity Center -composite \
    "$ASSETS_DIR/grub-bg-combined.png"

cp "$ASSETS_DIR/grub-bg-combined.png" "$GRUB_THEME_DIR/background.png"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Assets generated successfully!${NC}"
echo -e "${GREEN}  Location: $ASSETS_DIR${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
ls -la "$ASSETS_DIR/"
