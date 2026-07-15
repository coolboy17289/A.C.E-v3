#!/usr/bin/env bash
# Sensor monitor: periodically reads CPU temperature and (when wired)
# I²C sensors, and pushes them to the A.C.E backend.
set -euo pipefail

ACE_URL=${ACE_URL:-http://localhost:4317}
INTERVAL=${ACE_SENSOR_INTERVAL:-30}

read_cpu_temp() {
  cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null \
    | awk '{ printf "%.1f", $1/1000 }' || echo 0
}

read_i2c_bme280() {
  # BME280 is at the standard 0x76 address; skip silently if absent.
  if ! command -v i2cget >/dev/null; then return; fi
  i2cdetect -y 1 2>/dev/null | grep -q ' 76 ' || return
  # Probe temperature registers (0xfa = msb, 0xfb = lsb, 0xfc = xlsb)
  local high low
  high=$(i2cget -y 1 0x76 0xFA b 2>/dev/null || echo 0)
  low=$(i2cget -y 1 0x76 0xFB b 2>/dev/null || echo 0)
  awk -v h="$high" -v l="$low" 'BEGIN { if (h==0) { print "null"; exit } printf "%.1f", ((h<<8)|l) / 512.0 }'
}

read_vl53l0x_distance() {
  if ! command -v i2cget >/dev/null; then return; fi
  i2cdetect -y 1 2>/dev/null | grep -q ' 29 ' || return
  local word
  word=$(i2cget -y 1 0x29 0x1E w 2>/dev/null || true)
  [[ -z "$word" ]] && return
  printf '%s' "$word"
}

echo "[ace-sensors] starting monitor → $ACE_URL every ${INTERVAL}s"
while true; do
  payload=$(cat <<EOF
{
  "ts": "$(date -u +%FT%TZ)",
  "cpuTempC": $(read_cpu_temp),
  "bme280TempC": $(read_i2c_bme280 || echo null),
  "vl53l0x_mm": $(read_vl53l0x_distance || echo null)
}
EOF
)
  curl -sf -X POST "$ACE_URL/api/hardware/sensors" \
    -H 'content-type: application/json' \
    --data "$payload" >/dev/null 2>&1 || true
  sleep "$INTERVAL"
done
