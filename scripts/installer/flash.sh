#!/usr/bin/env bash
# A.C.E OS image flasher — dd the built image onto an SD card with
# safety prompts.
#
# Usage:
#   scripts/installer/flash.sh /dev/sdX [IMAGE]
#
# Defaults IMAGE to ace-os-v2-beta.img in the cwd. Prints the SHA256
# sidecar (must match the build's output) before flashing so a flipped
# bit elsewhere doesn't brick the SD.
#
# The dd uses bs=4M + conv=fsync + status=progress, which is the
# canonical "fast enough + sync guaranteed" incantation. If you're
# targeting a USB3 SD reader with a UHS-II card, bs=8M is faster
# but offers worse error recovery on partial writes. Stick with 4M
# unless you have a reason.
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "usage: $0 /dev/sdX [IMAGE]"
  echo "  IMAGE defaults to ./ace-os-v2-beta.img"
  echo ""
  echo "CAUTION: this WILL overwrite /dev/sdX. Triple-check the device."
  exit 1
fi

DEVICE="$1"
IMAGE="${2:-ace-os-v2-beta.img}"

if [[ ! -b "$DEVICE" ]]; then
  echo "[ace-flash] $DEVICE is not a block device — refusing"
  exit 2
fi
if [[ ! -f "$IMAGE" ]]; then
  echo "[ace-flash] $IMAGE not found — refusing"
  exit 2
fi
if [[ -f "${IMAGE}.sha256" ]]; then
  echo "[ace-flash] verifying SHA256…"
  sha256sum -c "${IMAGE}.sha256"
else
  echo "[ace-flash] WARNING no ${IMAGE}.sha256 sidecar — proceeding without integrity check"
fi

echo ""
echo "About to write $IMAGE -> $DEVICE"
echo "Device size: $(lsblk -b -n -o SIZE "$DEVICE" | head -1) bytes"
echo "Image size:  $(stat -c %s "$IMAGE") bytes"
echo ""
echo "Last chance — Ctrl-C within 10 seconds to abort."
sleep 10

sudo dd if="$IMAGE" of="$DEVICE" bs=4M conv=fsync,noerror status=progress
sync
echo "[ace-flash] DONE"
echo "[ace-flash] sync ejected; you can pull the card when the activity LED stops."
