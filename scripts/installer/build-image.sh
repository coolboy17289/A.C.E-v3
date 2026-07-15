#!/usr/bin/env bash
# A.C.E OS image build — produce a flashable .img from a base Raspbian
# image plus our layered overlay.
#
# Usage:
#   scripts/installer/build-image.sh [BASE_IMAGE]
#
# Where BASE_IMAGE is a path to a previously-downloaded Raspbian Lite
# arm64 image (no need for full desktop — Plymouth owns the boot
# splash, the desktop is a Chromium tab). Defaults to the standard
# release image pulled by npm run os:image:setup.
#
# The image produced is ace-os-v2-beta.img (or ACE_OUTPUT if set) plus
# a sibling ace-os-v2-beta.sha256 for verification.
#
# Approach:
#   1. Copy the base .img to the output path.
#   2. Loop-mount the second partition (rootfs) into a temp dir.
#   3. Rsync our layered artifacts (system/, backend/, frontend/dist,
#      first-boot.sh, kiosk.sh, setup.json, plymouth theme) into place.
#   4. Unmount, free the loop device.
#   5. Compute SHA256 over the final .img.
#
# Why not parted/losetup + resize? The Pi image is a 2-partition layout
# (boot FAT32 + rootfs ext4). We do not change partition sizing — only
# file content — so this script does not need a partition-table parser.
# If a future build adds a third partition, swap to sfdisk or parted.
set -euo pipefail

BASE_IMAGE="${1:-${ACE_BASE_IMAGE:?set ACE_BASE_IMAGE or pass path}}"
OUT="${ACE_OUTPUT:-ace-os-v2-beta.img}"
WORK="$(mktemp -d -t ace-img-XXXXXX)"
trap 'sudo umount "$WORK/root" 2>/dev/null || true; sudo losetup -d "$LOOP" 2>/dev/null || true; rm -rf "$WORK"' EXIT

echo "[ace-image] base: $BASE_IMAGE"
echo "[ace-image] out:  $OUT"
echo "[ace-image] work: $WORK"

cp -- "$BASE_IMAGE" "$OUT"
LOOP="$(sudo losetup -Pf --show --find "$OUT")"
echo "[ace-image] mounted at $LOOP"

# Partition 1 is FAT (boot), 2 is ext4 (root) on standard Raspbian.
mkdir -p "$WORK/root"
sudo mount "${LOOP}p2" "$WORK/root"

echo "[ace-image] overlaying files…"
sudo rsync -aAX --info=progress2 \
  --exclude='/proc/*' --exclude='/sys/*' --exclude='/dev/*' \
  --exclude='/run/*' --exclude='/tmp/*' \
  "system/"        "$WORK/root/opt/ace/system/"
sudo rsync -aAX --info=progress2 \
  "later/os/linux-config/first-boot.sh"     "$WORK/root/usr/lib/ace/first-boot.sh"
sudo rsync -aAX --info=progress2 \
  "later/os/linux-config/kiosk.sh"          "$WORK/root/usr/lib/ace/kiosk.sh"
sudo rsync -aAX --info=progress2 \
  "later/os/linux-config/debloat.sh"        "$WORK/root/usr/lib/ace/debloat.sh"
sudo rsync -aAX --info=progress2 \
  "later/os/linux-config/install-ollama.sh" "$WORK/root/usr/lib/ace/install-ollama.sh" || true
sudo rsync -aAX --info=progress2 \
  "later/os/build/scripts/"                 "$WORK/root/usr/lib/ace/build/"

# Plymouth splash assets (theme + PNGs).
if [[ -d system/boot/plymouth ]]; then
  sudo rsync -aAX --info=progress2 \
    "system/boot/plymouth/" "$WORK/root/usr/share/plymouth/themes/ace/"
fi

# Backend + frontend artifacts (built ahead of time).
sudo rsync -aAX --info=progress2 \
  "backend/dist/"    "$WORK/root/opt/ace/backend/"
sudo rsync -aAX --info=progress2 \
  "frontend/desktop-shell/dist/" "$WORK/root/opt/ace/app/"

# First-boot data dir + setup.json seed (forces the wizard on next boot).
sudo mkdir -p "$WORK/root/var/lib/ace"
echo '{"completed":false,"currentStep":"language"}' \
  | sudo tee "$WORK/root/var/lib/ace/setup.json" >/dev/null

# Enable the systemd units that ship A.C.E into kiosk mode.
sudo install -d "$WORK/root/etc/systemd/system"
cat <<'EOF' | sudo tee "$WORK/root/etc/systemd/system/ace-core.service" >/dev/null
[Unit]
Description=A.C.E OS backend
After=network-online.target
Wants=network-online.target
[Service]
Type=simple
User=ace
WorkingDirectory=/opt/ace
ExecStart=/usr/bin/node /opt/ace/backend/index.js
Environment=ACE_DB_PATH=/opt/ace/data/ace.db
Environment=ACE_HARDWARE=real
Restart=always
[Install]
WantedBy=multi-user.target
EOF

cat <<'EOF' | sudo tee "$WORK/root/etc/systemd/system/ace-frontend.service" >/dev/null
[Unit]
Description=A.C.E OS Chromium kiosk
After=ace-core.service
[Service]
Type=simple
User=ace
Environment=ACE_URL=http://localhost:4317
ExecStart=/usr/bin/sudo -u ace /usr/lib/ace/kiosk.sh
Restart=always
[Install]
WantedBy=multi-user.target
EOF

sudo umount "$WORK/root"
sudo losetup -d "$LOOP"

echo "[ace-image] computing SHA256…"
sha256sum "$OUT" | tee "${OUT}.sha256"
echo "[ace-image] DONE: $OUT"
