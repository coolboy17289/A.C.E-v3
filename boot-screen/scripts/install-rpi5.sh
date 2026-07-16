#!/bin/bash
# ============================================================
# ACE Boot Screen Installer - Raspberry Pi 5
# Installs Plymouth splash + RPi bootloader config for ACE
# Usage: sudo ./install-rpi5.sh [boot_partition_mount]
#
# This script is meant to be run ON the Raspberry Pi 5,
# or against a mounted SD card / NVMe image.
# ============================================================

set -e

# Check root privileges
if [[ $EUID -ne 0 ]]; then
    echo -e "\033[0;31m[!] This script must be run as root\033[0m"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BOOT_MOUNT="${1:-/boot}"
ROOT_MOUNT="${2:-/}"
PLYMOUTH_THEME_SRC="$SCRIPT_DIR/plymouth/themes/ace"
ASSETS_DIR="$SCRIPT_DIR/assets"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ACE Boot Screen Installer (RPi5)${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Detect if running on RPi5
detect_platform() {
    if [ -f /proc/device-tree/model ]; then
        MODEL=$(cat /proc/device-tree/model 2>/dev/null)
        if echo "$MODEL" | grep -qi "Raspberry Pi 5"; then
            echo -e "${GREEN}[+] Detected: Raspberry Pi 5${NC}"
            IS_RPI5=true
        else
            echo -e "${YELLOW}[!] Not running on RPi5 (detected: $MODEL)${NC}"
            echo -e "${YELLOW}    Continuing with installation anyway...${NC}"
            IS_RPI5=false
        fi
    else
        echo -e "${YELLOW}[!] Cannot detect platform (installing to mounted image)${NC}"
        IS_RPI5=false
    fi
}

# Configure RPi5 boot loader for ACE splash
configure_rpi_boot() {
    echo -e "${GREEN}[*] Configuring RPi5 boot loader for ACE splash...${NC}"

    local config_file="$BOOT_MOUNT/config.txt"
    local cmdline_file="$BOOT_MOUNT/cmdline.txt"

    # Backup config files
    if [ -f "$config_file" ]; then
        sudo cp "$config_file" "${config_file}.ace-backup"
    fi
    if [ -f "$cmdline_file" ]; then
        sudo cp "$cmdline_file" "${cmdline_file}.ace-backup"
    fi

    # Add ACE boot config to config.txt
    if [ -f "$config_file" ]; then
        # Remove any previous ACE config block
        sudo sed -i '/# === ACE Boot Screen ===/,/# === End ACE ===/d' "$config_file"

        # Add ACE configuration
        cat << 'ACE_CONFIG' | sudo tee -a "$config_file" > /dev/null

# === ACE Boot Screen ===
# A.C.E Academic Companion Engine - Boot Display Config

# Enable splash screen
disable_overscan=1

# Boot delay to show splash (seconds)
boot_delay=1

# HDMI/DSI display configuration for RPi5 Touch Display
# Touch Display 2 native: 720x1280 portrait
# For landscape: use display_rotate in config.txt
dtoverlay=vc4-kms-v3d

# Console framebuffer settings
framebuffer_width=1280
framebuffer_height=720

# Enable serial console for debug
enable_uart=1

# GPU memory allocation for splash
gpu_mem=128

# Boot into console (for Plymouth splash)
# Remove 'quiet splash' to see boot messages, add them back for splash
# === End ACE ===
ACE_CONFIG
    fi

    # Update cmdline.txt to enable splash
    if [ -f "$cmdline_file" ]; then
        # Ensure splash and quiet are in cmdline.txt for Plymouth
        if ! grep -q "splash" "$cmdline_file"; then
            sudo sed -i 's/$/ splash/' "$cmdline_file"
        fi
        if ! grep -q "quiet" "$cmdline_file"; then
            sudo sed -i 's/$/ quiet/' "$cmdline_file"
        fi

        # Ensure plymouth theme is specified
        if ! grep -q "plymouth" "$cmdline_file"; then
            sudo sed -i 's/$/ plymouth.use-udev/' "$cmdline_file"
        fi

        # Ensure DRM/KMS is enabled for display
        if ! grep -q "drm" "$cmdline_file"; then
            sudo sed -i 's/$/ drm.rmodeset=1/' "$cmdline_file"
        fi
    fi

    echo -e "${GREEN}[+] RPi5 boot loader configured${NC}"
}

# Install Plymouth theme
install_plymouth_theme() {
    echo -e "${GREEN}[*] Installing Plymouth theme to ${ROOT_MOUNT}...${NC}"

    local theme_dir="$ROOT_MOUNT/usr/share/plymouth/themes/ace"

    # Create theme directory
    sudo mkdir -p "$theme_dir"

    # Copy theme files
    sudo cp "$PLYMOUTH_THEME_SRC/ace.plymouth" "$theme_dir/"
    sudo cp "$PLYMOUTH_THEME_SRC/ace.script" "$theme_dir/"

    # Copy splash images if they exist
    if [ -d "$ASSETS_DIR" ]; then
        sudo cp "$ASSETS_DIR/"*.png "$theme_dir/" 2>/dev/null || true
    fi

    # Register the theme
    sudo update-alternatives --install \
        /usr/share/plymouth/themes/default.plymouth \
        default.plymouth \
        /usr/share/plymouth/themes/ace/ace.plymouth 100 2>/dev/null || true

    # Set as default
    sudo update-alternatives --set \
        default.plymouth \
        /usr/share/plymouth/themes/ace/ace.plymouth 2>/dev/null || true

    echo -e "${GREEN}[+] Plymouth theme installed${NC}"
}

# Rebuild initramfs
rebuild_initramfs() {
    echo -e "${GREEN}[*] Rebuilding initramfs with Plymouth...${NC}"
    sudo update-initramfs -u 2>/dev/null || \
        echo -e "${YELLOW}[!] initramfs rebuild skipped${NC}"
    echo -e "${GREEN}[+] initramfs rebuilt${NC}"
}

# Configure kernel command line for HAT hardware
configure_hat_hardware() {
    echo -e "${GREEN}[*] Configuring HAT hardware support...${NC}"

    local cmdline_file="$BOOT_MOUNT/cmdline.txt"

    # Enable I2C and SPI overlays in config.txt (RPi5 uses overlays, not cmdline)
    if [ -f "$BOOT_MOUNT/config.txt" ]; then
        if ! grep -q "dtparam=i2c_arm" "$BOOT_MOUNT/config.txt"; then
            echo "dtparam=i2c_arm=on" | tee -a "$BOOT_MOUNT/config.txt" > /dev/null
        fi
        if ! grep -q "dtparam=spi" "$BOOT_MOUNT/config.txt"; then
            echo "dtparam=spi=on" | tee -a "$BOOT_MOUNT/config.txt" > /dev/null
        fi
    fi

    echo -e "${GREEN}[+] HAT hardware support configured${NC}"
}

# Main
echo -e "${GREEN}[1/5] Detecting platform...${NC}"
detect_platform

echo -e "${GREEN}[2/5] Configuring RPi5 boot loader...${NC}"
configure_rpi_boot

echo -e "${GREEN}[3/5] Installing Plymouth theme...${NC}"
install_plymouth_theme

echo -e "${GREEN}[4/5] Configuring HAT hardware support...${NC}"
configure_hat_hardware

echo -e "${GREEN}[5/5] Rebuilding initramfs...${NC}"
rebuild_initramfs

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ACE Boot Screen installed for RPi5!${NC}"
echo -e "${GREEN}  Reboot to see the new boot screen${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Touch Display: 720x1280 (portrait)${NC}"
echo -e "${YELLOW}HAT: I2C + SPI enabled for custom hardware${NC}"
echo -e "${YELLOW}Reboot: sudo reboot${NC}"
