# A.C.E GPIO Service

Service that exposes React UI GPIO intents to the physical Raspberry Pi
pins. Implemented in Node.js using `onoff` (digital) or `pigpio` (PWM &
edge detection).

## Install

```bash
cd raspberry-pi/gpio
npm install
npm install onoff        # or `pigpio` if you need PWM / edge events
```

## Quick start

```bash
node scripts/blink.js 17     # toggle GPIO 17 on and off
```

## Pin numbering

We use **BCM** numbering, not physical. The Ace UI always passes BCM
numbers: pin 17 = physical pin 11 (the built-in status LED on Pi 4/5).

## Permissions

`onoff` works without root if you add the `ace` user to the `gpio` group:

```bash
sudo usermod -aG gpio ace
newgrp gpio
```

## Why a Node service?

Tying GPIO access to the Node backend keeps a single source of truth
for what the device is doing — so `Settings → Blink GPIO 17` and the
nightly "off-hours LED dim" cron job never race.
