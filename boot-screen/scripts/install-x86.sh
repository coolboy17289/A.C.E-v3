#!/bin/bash
# ============================================================
# ACE Boot Screen Installer - x86 QEMU
# Installs GRUB theme + Plymouth splash into the VM disk
# Usage: ./install-x86.sh [disk.qcow2]
# ============================================================

set -e

# Check root privileges
if [[ $EUID -ne 0 ]]; then
    echo -e "\033[0;31m[!] This script must be run as root\033[0m"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DISK="${1:-$SCRIPT_DIR/../kernel-vm/vm-disk.qcow2}"
MOUNT_DIR="/tmp/ace-boot-install"
GRUB_THEME_SRC="$SCRIPT_DIR/grub/theme"
PLYMOUTH_THEME_SRC="$SCRIPT_DIR/plymouth/themes/ace"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ACE Boot Screen Installer (x86)${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check dependencies
check_deps() {
    local missing=()
    for cmd in qemu-img guestmount guestunmount; do
        if ! command -v "$cmd" &>/dev/null; then
            missing+=("$cmd")
        fi
    done

    if [ ${#missing[@]} -gt 0 ]; then
        echo -e "${YELLOW}Missing dependencies: ${missing[*]}${NC}"
        echo "Installing libguestfs-tools..."
        apt-get update -qq
        apt-get install -y -qq libguestfs-tools
    fi
}

# Mount the qcow2 disk image
mount_disk() {
    echo -e "${GREEN}[*] Mounting disk image: $DISK${NC}"

    # Get the filesystem layout
    virt-filesystems -a "$DISK" --all --long -l 2>/dev/null | head -20

    # Find the root partition (usually /dev/sda2 for Ubuntu)
    ROOT_PART=$(sudo virt-filesystems -a "$DISK" --all -l 2>/dev/null | grep "/$" | awk '{print $1}')
    if [ -z "$ROOT_PART" ]; then
        ROOT_PART="/dev/sda2"
    fi

    echo -e "${GREEN}[*] Using root partition: $ROOT_PART${NC}"

    mkdir -p "$MOUNT_DIR"
    guestmount -a "$DISK" -m "$ROOT_PART" "$MOUNT_DIR" 2>/dev/null || \
    guestmount -a "$DISK" -m /dev/sda2 "$MOUNT_DIR" 2>/dev/null || {
        echo -e "${RED}[!] Failed to mount disk. Trying /dev/sda1...${NC}"
        guestmount -a "$DISK" -m /dev/sda1 "$MOUNT_DIR"
    }

    echo -e "${GREEN}[+] Disk mounted at $MOUNT_DIR${NC}"
}

# Install GRUB theme
install_grub_theme() {
    echo -e "${GREEN}[*] Installing GRUB theme...${NC}"

    # Create theme directory
    mkdir -p "$MOUNT_DIR/boot/grub/themes/ace"

    # Copy theme files
    cp "$GRUB_THEME_SRC/theme.txt" "$MOUNT_DIR/boot/grub/themes/ace/"

    # Generate GRUB font from DejaVu Sans Mono (matching theme.txt font references)
    local FONT_SRC="/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
    if command -v grub-mkfont &>/dev/null && [ -f "$FONT_SRC" ]; then
        grub-mkfont -s 12 -o "$MOUNT_DIR/boot/grub/themes/ace/DejaVu-Sans-Mono-12.pf2" "$FONT_SRC" 2>/dev/null || true
        grub-mkfont -s 14 -o "$MOUNT_DIR/boot/grub/themes/ace/DejaVu-Sans-Mono-14.pf2" "$FONT_SRC" 2>/dev/null || true
        grub-mkfont -s 16 -o "$MOUNT_DIR/boot/grub/themes/ace/DejaVu-Sans-Mono-16.pf2" "$FONT_SRC" 2>/dev/null || true
        grub-mkfont -s 18 -o "$MOUNT_DIR/boot/grub/themes/ace/DejaVu-Sans-Mono-18.pf2" "$FONT_SRC" 2>/dev/null || true
        grub-mkfont -s 22 -o "$MOUNT_DIR/boot/grub/themes/ace/DejaVu-Sans-Mono-22.pf2" "$FONT_SRC" 2>/dev/null || true
        grub-mkfont -s 48 -o "$MOUNT_DIR/boot/grub/themes/ace/DejaVu-Sans-Mono-48.pf2" "$FONT_SRC" 2>/dev/null || true
    fi

    # Update GRUB config to use our theme
    if [ -f "$MOUNT_DIR/etc/default/grub" ]; then
        # Backup original
        cp "$MOUNT_DIR/etc/default/grub" "$MOUNT_DIR/etc/default/grub.bak"

        # Add/update GRUB_THEME
        if grep -q "GRUB_THEME" "$MOUNT_DIR/etc/default/grub"; then
            sed -i 's|GRUB_THEME=.*|GRUB_THEME="/boot/grub/themes/ace/theme.txt"|' \
                "$MOUNT_DIR/etc/default/grub"
        else
            echo 'GRUB_THEME="/boot/grub/themes/ace/theme.txt"' | tee -a \
                "$MOUNT_DIR/etc/default/grub" > /dev/null
        fi

        # Set console mode for serial output
        if ! grep -q "GRUB_TERMINAL" "$MOUNT_DIR/etc/default/grub"; then
            echo 'GRUB_TERMINAL="serial console"' | tee -a \
                "$MOUNT_DIR/etc/default/grub" > /dev/null
            echo 'GRUB_SERIAL_COMMAND="serial --speed=115200 --unit=0 --word=8 --parity=no --stop=1"' | \
                tee -a "$MOUNT_DIR/etc/default/grub" > /dev/null
        fi
    fi

    echo -e "${GREEN}[+] GRUB theme installed${NC}"
}

# Install Plymouth theme
install_plymouth_theme() {
    echo -e "${GREEN}[*] Installing Plymouth theme...${NC}"

    # Create Plymouth theme directory
    mkdir -p "$MOUNT_DIR/usr/share/plymouth/themes/ace"

    # Copy theme files
    cp "$PLYMOUTH_THEME_SRC/ace.plymouth" "$MOUNT_DIR/usr/share/plymouth/themes/ace/"
    cp "$PLYMOUTH_THEME_SRC/ace.script" "$MOUNT_DIR/usr/share/plymouth/themes/ace/"

    # Copy splash images if they exist
    if [ -d "$SCRIPT_DIR/assets" ]; then
        cp "$SCRIPT_DIR/assets/"*.png "$MOUNT_DIR/usr/share/plymouth/themes/ace/" 2>/dev/null || true
    fi

    # Register the theme
    chroot "$MOUNT_DIR" update-alternatives --install \
        /usr/share/plymouth/themes/default.plymouth \
        default.plymouth \
        /usr/share/plymouth/themes/ace/ace.plymouth 100 2>/dev/null || true

    # Set as default
    chroot "$MOUNT_DIR" update-alternatives --set \
        default.plymouth \
        /usr/share/plymouth/themes/ace/ace.plymouth 2>/dev/null || true

    echo -e "${GREEN}[+] Plymouth theme installed${NC}"
}

# Update GRUB and initramfs
update_system() {
    echo -e "${GREEN}[*] Updating GRUB configuration...${NC}"
    chroot "$MOUNT_DIR" update-grub 2>/dev/null || \
    chroot "$MOUNT_DIR" grub-mkconfig -o /boot/grub/grub.cfg 2>/dev/null || \
        echo -e "${YELLOW}[!] GRUB update skipped (may not be applicable)${NC}"

    echo -e "${GREEN}[*] Rebuilding initramfs with Plymouth...${NC}"
    chroot "$MOUNT_DIR" update-initramfs -u 2>/dev/null || \
        echo -e "${YELLOW}[!] initramfs update skipped${NC}"

    echo -e "${GREEN}[+] System updated${NC}"
}

# Cleanup
cleanup() {
    echo -e "${GREEN}[*] Unmounting disk...${NC}"
    guestunmount "$MOUNT_DIR" 2>/dev/null || true
    rmdir "$MOUNT_DIR" 2>/dev/null || true
    echo -e "${GREEN}[+] Cleanup complete${NC}"
}

# Main
trap cleanup EXIT

echo -e "${GREEN}[1/5] Checking dependencies...${NC}"
check_deps

echo -e "${GREEN}[2/5] Mounting disk image...${NC}"
mount_disk

echo -e "${GREEN}[3/5] Installing GRUB theme...${NC}"
install_grub_theme

echo -e "${GREEN}[4/5] Installing Plymouth theme...${NC}"
install_plymouth_theme

echo -e "${GREEN}[5/5] Updating system configuration...${NC}"
update_system

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ACE Boot Screen installed!${NC}"
echo -e "${GREEN}  Boot the VM to see the new screen${NC}"
echo -e "${GREEN}========================================${NC}"
