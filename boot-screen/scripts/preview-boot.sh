#!/bin/bash
# ============================================================
# ACE Boot Screen Preview
# Previews the boot screen in QEMU without modifying disk
# Usage: ./preview-boot.sh [kernel_path] [initrd_path]
#        If no args, uses host system kernel or kernel-vm/ files
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SESSION="ace-boot-preview"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ACE Boot Screen Preview${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if assets exist
if [ ! -f "$SCRIPT_DIR/assets/background.png" ]; then
    echo -e "${RED}[!] Assets not found. Run generate-assets.sh first.${NC}"
    exit 1
fi

# Find kernel and initrd (argument > kernel-vm/ > host /boot)
KERNEL="${1:-}"
INITRD="${2:-}"

if [ -z "$KERNEL" ]; then
    if [ -f "$SCRIPT_DIR/../kernel-vmlinuz" ]; then
        KERNEL="$SCRIPT_DIR/../kernel-vmlinuz"
        INITRD="$SCRIPT_DIR/../kernel-initrd.img"
        echo -e "${GREEN}[*] Using project root kernel files${NC}"
    elif [ -f "$SCRIPT_DIR/../kernel-vm/vmlinuz" ]; then
        KERNEL="$SCRIPT_DIR/../kernel-vm/vmlinuz"
        INITRD="$SCRIPT_DIR/../kernel-vm/initrd.img"
        echo -e "${GREEN}[*] Using kernel-vm files${NC}"
    elif [ -f /boot/vmlinuz ]; then
        KERNEL="/boot/vmlinuz"
        INITRD="/boot/initrd.img"
        echo -e "${YELLOW}[*] kernel-vm/ not found, using host kernel: $KERNEL${NC}"
        echo -e "${YELLOW}    Note: GRUB theme won't show (booting directly, bypassing GRUB)${NC}"
        echo -e "${YELLOW}    Plymouth splash will still display after kernel loads${NC}"
    else
        echo -e "${RED}[!] No kernel found. Provide path: ./preview-boot.sh /path/to/vmlinuz /path/to/initrd.img${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}[*] Kernel: $KERNEL${NC}"
echo -e "${GREEN}[*] Initrd: $INITRD${NC}"
echo -e "${GREEN}[*] Starting QEMU preview with ACE boot screen...${NC}"
echo -e "${GREEN}[*] Press Ctrl+A then X to exit QEMU${NC}"
echo ""

# Kill existing session if any
tmux kill-session -t "$SESSION" 2>/dev/null || true

# Start QEMU with the boot screen preview
tmux new-session -d -s "$SESSION" \
    "qemu-system-x86_64 \
    -m 2G -smp 2 -cpu host -enable-kvm \
    -kernel $KERNEL \
    -initrd $INITRD \
    -append 'console=ttyS0 splash quiet' \
    -nographic -serial mon:stdio \
    -net nic,model=virtio \
    -net user,hostfwd=tcp::2222-:22 \
    -vga virtio \
    -display gtk,zoom-to-fit=on 2>/dev/null || \
    qemu-system-x86_64 \
    -m 2G -smp 2 -cpu host -enable-kvm \
    -kernel $KERNEL \
    -initrd $INITRD \
    -append 'console=ttyS0 splash quiet' \
    -nographic -serial mon:stdio \
    -net nic,model=virtio \
    -net user,hostfwd=tcp::2222-:22"

echo -e "${GREEN}[+] Preview started in tmux session: $SESSION${NC}"
echo -e "${GREEN}    Attach with: tmux attach -t $SESSION${NC}"
echo -e "${GREEN}    Or view logs: tmux capture-pane -t $SESSION -p${NC}"
echo ""
echo -e "${GREEN}[*] The boot screen will show the ACE logo during boot${NC}"
echo -e "${GREEN}[*] Once booted, the Plymouth splash will display${NC}"
echo -e "${YELLOW}[*] Note: When booting with -kernel directly, GRUB is bypassed.${NC}"
echo -e "${YELLOW}    To test the GRUB theme, boot from the VM disk image instead.${NC}"
