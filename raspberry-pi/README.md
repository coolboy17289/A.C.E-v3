# A.C.E OS — Raspberry Pi Hardware Layer

The hardware layer is what makes A.C.E OS more than a fancy web app.
It binds the React UI to the physical device:

```
+---------------------------------------------------+
|              React Desktop (Chromium)             |
|                 ↓ HTTP /api/hardware/*            |
|        ace-backend (Node.js, SQLite, REST)        |
|                 ↓ in-process calls                |
|  ace-hardware (Node.js, Pi-native via libgpiod)   |
|     ├── gpio      (LEDs, buttons, sensors)        |
|     ├── camera    (Pi Camera Module 3)            |
|     ├── sensors   (temp, light, accelerometer)    |
|     └── system    (uptime, cpu temp, watchdog)    |
+---------------------------------------------------+
|       Linux kernel · ARM64 · libgpiod · V4L2      |
+---------------------------------------------------+
|                  Raspberry Pi 5 / 4B              |
+---------------------------------------------------+
```

## Components

### `gpio/` — General Purpose IO
* Library: `pigpio` for PWM precision, fallback to `onoff` for digital I/O.
* Bootstrap with `npm install onoff` inside `raspberry-pi/gpio/`.
* Exposes:
  - `pinMode(pinNumber, 'in'|'out')`
  - `digitalWrite(pinNumber, value)`
  - `digitalRead(pinNumber)`
  - `pwmWrite(pinNumber, dutyCycle)`

### `camera/` — Camera Module 3 + libcamera
* Drivers: `libcamera-apps`, `libcamera-dev`.
* Modes: `still`, `video`, `vision` (frames pushed to the AI service).
* Tests: `raspberry-pi/camera/capture.sh`.

### `sensors/` — Environmental & motion
* STEMMA QT / I2C sensors via `i2c-tools`.
* Built-in: BME280 (temp/humidity/pressure), VL53L0X (ToF distance).
* Reads cached every 30 s by the backend; the React UI polls.

### `system/` — Power & health
* CPU temperature via `/sys/class/thermal/thermal_zone0/temp`
* Memory via `/proc/meminfo`
* Watchdog: if backend is unhealthy for > 5 min, reboot.

## Inter-Process Communication

The backend exposes three families of routes:

| Route | Purpose |
| - | - |
| `GET /api/hardware/device` | Static snapshot, polled every 5 s. |
| `POST /api/hardware/led` | Edge-triggered GPIO write. |
| `POST /api/system/shutdown` | Graceful `systemctl` poweroff. |

Native `gpio` and `camera` modules are loaded eagerly inside
`ace-hardware` on the Pi, and as **stubs** in dev. The dev stubs return
deterministic JSON so the React UI behaves identically on a laptop.

## Why Pi 5-first?

The Pi 5 ships the BCM2712 SoC with the VideoCore VII GPU, which Chromium
uses for hardware video decode. With 8 GB RAM it can comfortably host
Ollama running a 3B parameter model. The Pi 4 still works, but we
recommend sticking to the 1.5B-parameter models there.

## Local development

```bash
# Pin a virtual LED to GPIO 17 and toggle it
ACE_HARDWARE=real npm install rpi-gpio
node -e "(async()=>{const {setLed}=await import('./backend/dist/services/gpio.js');console.log(await setLed(17,true));})()"
```

> On macOS / Windows / non-Pi Linux the GPIO service responds with
> `{ ok: true, mode: 'stub' }` and logs the intent — the desktop shell
> stays fully functional.
