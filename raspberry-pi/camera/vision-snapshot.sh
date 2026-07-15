#!/usr/bin/env bash
# Vision snapshot: take a still image and stream it (base64 inline) to
# the A.C.E AI backend. Intended for "describe what's on the page"
# style workflows.
set -euo pipefail

OUT=/tmp/ace-vision-$(date +%s).jpg
ACE_URL=${ACE_URL:-http://localhost:4317}
PROMPT=${ACE_VISION_PROMPT:-"Describe what is in this image."}

bash "$(dirname "$0")/capture.sh" "$OUT"

B64=$(base64 -w 0 "$OUT")

curl -sf -X POST "$ACE_URL/api/ai/vision" \
  -H 'content-type: application/json' \
  --data "{\"prompt\":\"$PROMPT\",\"image\":\"$B64\"}" \
  | jq -r '.content'

rm -f "$OUT"
