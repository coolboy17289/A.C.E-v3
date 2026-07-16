#!/bin/bash
# ============================================================
# ACE Boot Screen Installer - x86 QEMU
# Installs GRUB theme + Plymouth splash into the VM disk
# Usage: sudo ./install-x86.sh [disk.qcow2]
# ============================================================

set -e

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
        sudo apt-get update -qq
        sudo apt-get install -y -qq libguestfs-tools
    fi
}

# Mount the qcow2 disk image
mount_disk() {
    echo -e "${GREEN}[*] Mounting disk image: $DISK${NC}"

    # Get the filesystem layout
    sudo virt-filesystems -a "$DISK" --all --long -l 2>/dev/null | head -20

    # Find the root partition (usually /dev/sda2 for Ubuntu)
    ROOT_PART=$(sudo virt-filesystems -a "$DISK" --all -l 2>/dev/null | grep "/$" | awk '{print $1}')
    if [ -z "$ROOT_PART" ]; then
        ROOT_PART="/dev/sda2"
    fi

    echo -e "${GREEN}[*] Using root partition: $ROOT_PART${NC}"

    sudo mkdir -p "$MOUNT_DIR"
    sudo guestmount -a "$DISK" -m "$ROOT_PART" "$MOUNT_DIR" 2>/dev/null || \
    sudo guestmount -a "$DISK" -m /dev/sda2 "$MOUNT_DIR" 2>/dev/null || {
        echo -e "${RED}[!] Failed to mount disk. Trying /dev/sda1...${NC}"
        sudo guestmount -a "$DISK" -m /dev/sda1 "$MOUNT_DIR"
    }

    echo -e "${GREEN}[+] Disk mounted at $MOUNT_DIR${NC}"
}

# Install GRUB theme
install_grub_theme() {
    echo -e "${GREEN}[*] Installing GRUB theme...${NC}"

    # Create theme directory
    sudo mkdir -p "$MOUNT_DIR/boot/grub/themes/ace"

    # Copy theme files
    sudo cp "$GRUB_THEME_SRC/theme.txt" "$MOUNT_DIR/boot/grub/themes/ace/"

    # Generate GRUB font
    if command -v grub-mkfont &>/dev/null; then
        sudo grub-mkfont -s 16 -o "$MOUNT_DIR/boot/grub/themes/ace/Unifont-Regular-16.pf2" \
            /usr/share/fonts/truetype/unifont/unifont.ttf 2>/dev/null || true
        sudo grub-mkfont -s 22 -o "$MOUNT_DIR/boot/grub/themes/ace/Unifont-Regular-22.pf2" \
            /usr/share/fonts/truetype/unifont/unifont.ttf 2>/dev/null || true
        sudo grub-mkfont -s 48 -o "$MOUNT_DIR/boot/grub/themes/ace/Unifont-Regular-48.pf2" \
            /usr/share/fonts/truetype/unifont/unifont.ttf 2>/dev/null || true
    fi

    # Update GRUB config to use our theme
    if [ -f "$MOUNT_DIR/etc/default/grub" ]; then
        # Backup original
        sudo cp "$MOUNT_DIR/etc/default/grub" "$MOUNT_DIR/etc/default/grub.bak"

        # Add/update GRUB_THEME
        if sudo grep -q "GRUB_THEME" "$MOUNT_DIR/etc/default/grub"; then
            sudo sed -i 's|GRUB_THEME=.*|GRUB_THEME="/boot/grub/themes/ace/theme.txt"|' \
                "$MOUNT_DIR/etc/default/grub"
        else
            echo 'GRUB_THEME="/boot/grub/themes/ace/theme.txt"' | sudo tee -a \
                "$MOUNT_DIR/etc/default/grub" > /dev/null
        fi

        # Set console mode for serial output
        if ! sudo grep -q "GRUB_TERMINAL" "$MOUNT_DIR/etc/default/grub"; then
            echo 'GRUB_TERMINAL="serial console"' | sudo tee -a \
                "$MOUNT_DIR/etc/default/grub" > /dev/null
            echo 'GRUB_SERIAL_COMMAND="serial --speed=115200 --unit=0 --word=8 --parity=no --stop=1"' | \
                sudo tee -a "$MOUNT_DIR/etc/default/grub" > /dev/null
        fi
    fi

    echo -e "${GREEN}[+] GRUB theme installed${NC}"
}

# Install Plymouth theme
install_plymouth_theme() {
    echo -e "${GREEN}[*] Installing Plymouth theme...${NC}"

    # Create Plymouth theme directory
    sudo mkdir -p "$MOUNT_DIR/usr/share/plymouth/themes/ace"

    # Copy theme files
    sudo cp "$PLYMOUTH_THEME_SRC/ace.plymouth" "$MOUNT_DIR/usr/share/plymouth/themes/ace/"
    sudo cp "$PLYMOUTH_THEME_SRC/ace.script" "$MOUNT_DIR/usr/share/plymouth/themes/ace/"

    # Copy splash images if they exist
    if [ -d "$SCRIPT_DIR/assets" ]; then
        sudo cp "$SCRIPT_DIR/assets/"*.png "$MOUNT_DIR/usr/share/plymouth/themes/ace/" 2>/dev/null || true
    fi

    # Register the theme
    sudo chroot "$MOUNT_DIR" update-alternatives --install \
        /usr/share/plymouth/themes/default.plymouth \
        default.plymouth \
        /usr/share/plymouth/themes/ace/ace.plymouth 100 2>/dev/null || true

    # Set as default
    sudo chroot "$MOUNT_DIR" update-alternatives --set \
        default.plymouth \
        /usr/share/plymouth/themes/ace/ace.plymouth 2>/dev/null || true

    echo -e "${GREEN}[+] Plymouth theme installed${NC}"
}

# Update GRUB and initramfs
update_system() {
    echo -e "${GREEN}[*] Updating GRUB configuration...${NC}"
    sudo chroot "$MOUNT_DIR" update-grub 2>/dev/null || \
    sudo chroot "$MOUNT_DIR" grub-mkconfig -o /boot/grub/grub.cfg 2>/dev/null || \
        echo -e "${YELLOW}[!] GRUB update skipped (may not be applicable)${NC}"

    echo -e "${GREEN}[*] Rebuilding initramfs with Plymouth...${NC}"
    sudo chroot "$MOUNT_DIR" update-initramfs -u 2>/dev/null || \
        echo -e "${YELLOW}[!] initramfs update skipped${NC}"

    echo -e "${GREEN}[+] System updated${NC}"
}

# Cleanup
cleanup() {
    echo -e "${GREEN}[*] Unmounting disk...${NC}"
    sudo guestunmount "$MOUNT_DIR" 2>/dev/null || true
    sudo rmdir "$MOUNT_DIR" 2>/dev/null || true
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
