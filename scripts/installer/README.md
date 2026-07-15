# A.C.E OS image installer

Two-step flow: **build** → **flash**.

## Build an .img

```bash
# Download a base Raspbian Lite arm64 image first. Save it as
# ~/Downloads/raspios-lite-arm64.img.xz and unzip:
xz -d ~/Downloads/raspios-lite-arm64.img.xz

# Then overlay the A.C.E layers:
ACE_BASE_IMAGE=~/Downloads/raspios-lite-arm64.img \
  npm run os:image:build-img
```

`scripts/installer/build-image.sh` does:

1. Copy the base image to `ace-os-v2-beta.img`.
2. Loop-mount partition 2 (= rootfs).
3. Rsync our four payload layers:
   - `system/` → `/opt/ace/system/`
   - `later/os/linux-config/{first-boot,kiosk,debloat}.sh` → `/usr/lib/ace/`
   - `later/os/build/scripts/` → `/usr/lib/ace/build/`
   - `backend/dist/` → `/opt/ace/backend/`
   - `frontend/desktop-shell/dist/` → `/opt/ace/app/`
   - `system/boot/plymouth/` → `/usr/share/plymouth/themes/ace/`
4. Drop a `setup.json` seed at `/var/lib/ace/setup.json` so the
   wizard runs on first boot.
5. Install `ace-core.service` + `ace-frontend.service` into systemd
   (multi-user.target).
6. Compute SHA256 of the output, sidecar to `.sha256`.

The base image's partition layout is preserved — no resize.

## Flash

```bash
lsblk                     # pick the SD reader, usually /dev/sda
sudo bash scripts/installer/flash.sh /dev/sdX ace-os-v2-beta.img
```

The flash script verifies the SHA256 sidecar (if present), gives a
10-second countdown, then `dd if=… of=… bs=4M conv=fsync,noerror`.

CAUTION: this overwrites the target device.

## Recovery / alternative front-ends

Re-burn the original Raspbian Lite image on the SD card to drop back
to plain Linux. The A.C.E partition table is the standard Pi layout,
so you can stick the SD into any Pi and boot the unmodified
Raspbian installation.
