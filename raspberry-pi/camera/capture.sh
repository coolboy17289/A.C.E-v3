#!/usr/bin/env bash
# One-shot still capture from a connected Pi Camera Module.
# Used in tests and during "describe the board" workflows.
set -euo pipefail

OUT=${1:-/tmp/ace-capture.jpg}
SIZE=${ACE_CAMERA_SIZE:-3280x2464}

if ! command -v libcamera-still >/dev/null; then
  echo "[ace-camera] libcamera-still not installed; running stub"
  echo "would capture ${SIZE} to $OUT"
  # Create a 1x1 white PNG so downstream readers always have a valid file.
  # (ASCII base64 - no shell-escape hazards across distros.)
  echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNgAAIAAAUAAeImBZsAAAAASUVORK5CYII=" \
    | base64 -d > "$OUT"
  exit 0
fi

libcamera-still -n -t 1 -o "$OUT" --width "${SIZE%x*}" --height "${SIZE#*x}"
echo "[ace-camera] saved to $OUT ($(stat -c %s "$OUT") bytes)"
