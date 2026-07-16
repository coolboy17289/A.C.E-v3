#!/bin/bash
# ============================================================
# ACE Boot Screen Preview
# Previews the boot screen in QEMU without modifying disk
# Usage: ./preview-boot.sh
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SESSION="ace-boot-preview"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
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

echo -e "${GREEN}[*] Starting QEMU preview with ACE boot screen...${NC}"
echo -e "${GREEN}[*] Press Ctrl+A then X to exit QEMU${NC}"
echo ""

# Kill existing session if any
tmux kill-session -t "$SESSION" 2>/dev/null || true

# Start QEMU with the boot screen preview
# Using the kernel and initrd directly for a quick preview
cd "$SCRIPT_DIR/../kernel-vm"

tmux new-session -d -s "$SESSION" \
    "qemu-system-x86_64 \
    -m 2G -smp 2 -cpu host -enable-kvm \
    -kernel vmlinuz \
    -initrd initrd.img \
    -append 'console=ttyS0 splash quiet' \
    -nographic -serial mon:stdio \
    -net nic,model=virtio \
    -net user,hostfwd=tcp::2222-:22 \
    -vga virtio \
    -display gtk,zoom-to-fit=on 2>/dev/null || \
    qemu-system-x86_64 \
    -m 2G -smp 2 -cpu host -enable-kvm \
    -kernel vmlinuz \
    -initrd initrd.img \
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
