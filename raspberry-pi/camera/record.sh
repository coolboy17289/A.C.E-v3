#!/usr/bin/env bash
# Record a short H.264 clip from the Pi Camera Module.
set -euo pipefail

DUR=${1:-10}
OUT=/opt/ace/media/clip-$(date +%s).h264

mkdir -p "$(dirname "$OUT")"
if ! command -v libcamera-vid >/dev/null; then
  echo "[ace-camera] libcamera-vid not installed; running stub"
  echo "would record ${DUR}s to $OUT"
  exit 0
fi

libcamera-vid -t "${DUR}000" -o "$OUT" --width 1280 --height 720
echo "[ace-camera] recorded ${DUR}s → $OUT"
