# A.C.E OS - Academic Companion Engine OS

A lightweight Linux-based operating system for Raspberry Pi, designed
specifically for students. A.C.E OS combines a minimal Linux base with
a custom React + TypeScript desktop environment to deliver a complete
educational computing experience.

The narrative of the project lives in this file. The release-by-release
summary is in [CHANGELOG.md](CHANGELOG.md), and the raw dev log lives
in [DEVLOG.md](DEVLOG.md).

## Table of contents

- [Getting started](#getting-started)
- [Architecture](#architecture)
- [Project structure](#project-structure)
- [Native frontend ports](#native-frontend-ports)
- [Build & test](#build--test)
- [Applications](#applications)
- [Hardware services](#hardware-services)
- [Raspberry Pi deployment](#raspberry-pi-deployment)
- [Contributing](#contributing)
- [License](#license)

## Getting started

### Prerequisites

- Node.js >= 18
- npm >= 9
- For the native port shells: the toolchain for that stack
  (see each port's README in [Native frontend ports](#native-frontend-ports)).
- For C daemon work: a C11 compiler (default `cc`), `make`, and `ar`.
- For Pi deployment: Docker (image build) and a Unix-like host for
  `dd` (image flash).

### Install

```bash
npm install
```

### Run in development

```bash
# Terminal 1 — backend (Node.js + SQLite, default port 4318)
npm run dev:backend

# Terminal 2 — desktop shell (Vite + React)
npm run dev:shell
```

The desktop shell opens at `http://localhost:5173` in Chromium kiosk
mode. Override the backend port with `ACE_PORT=…` on both terminals
if 4318 is taken.

### Build for production

```bash
npm run build
```

## Architecture

A.C.E OS is built as a tiered system:

```
┌─────────────────────────────────────────────────┐
│         A.C.E React Desktop Environment         │
│  (Apps, UI, Productivity, AI Features)          │
├─────────────────────────────────────────────────┤
│      A.C.E Backend API (Node.js + SQLite)       │
│  (Tasks, Calendar, Settings, Hardware)         │
├─────────────────────────────────────────────────┤
│   A.C.E Hardware Services (Linux Daemons)       │
│  (Camera, GPIO, AI, Sync)                       │
├─────────────────────────────────────────────────┤
│   Linux Base (Raspberry Pi OS Lite ARM64)       │
│  (Drivers, Networking, Storage)                │
└─────────────────────────────────────────────────┘
```

## Project structure

```
ace-os/
├── frontend/        React + TypeScript desktop & apps
│   ├── desktop-shell/   Main A.C.E interface
│   ├── apps/            Individual applications
│   │   ├── home/        Dashboard
│   │   ├── planner/     Calendar & scheduling
│   │   ├── tasks/       Task management
│   │   ├── subjects/    Learning subjects
│   │   ├── focus/       Pomodoro & study sessions
│   │   ├── ai/          AI learning assistant
│   │   ├── statistics/  Learning analytics
│   │   └── settings/    System configuration
│   ├── design-system/   @ace/design-system
│   └── shared/          Shared types & utilities
├── backend/         Node.js + TypeScript API
│   ├── api/             REST endpoints
│   ├── database/        SQLite layer
│   └── services/        Business logic
├── os/              C / Linux-side daemons
│   ├── daemon/          Hardware, system, focus daemons
│   └── lib/             Reusable C libraries (focus state machine)
├── system/          Linux system configuration
│   ├── linux-config/    OS setup scripts
│   ├── services/        Systemd unit files
│   └── boot/            Boot splash + Plymouth theme
├── hardware/        Hardware service code
│   ├── camera/          Camera interface
│   ├── sensors/         Sensor interfaces
│   └── gpio/            GPIO control
├── raspberry-pi/    Pi-specific helpers and tests
└── scripts/         Cross-cutting developer scripts
    ├── dev-all.sh          # tmux dashboard of every shell
    ├── verify-shells.mjs   # backend smoke test
    ├── verify-shells-gated.mjs  # smoke test, gated on backend port
    └── install-hooks.sh    # idempotent pre-commit installer
```

## Native frontend ports

A.C.E OS exposes a JSON API from `backend/` on port `4318`
(overridable via `ACE_PORT`). Anything that can speak
`GET /api/health` and `GET /api/users/me` can be a front-end.
Beyond the React/Vite SPA that ships by default
(`frontend/desktop-shell/`), six alternative front-ends live in this
repo:

| Stack         | Path                          | Native on Pi?                  | Boot speed vs Chromium kiosk   |
|---------------|-------------------------------|--------------------------------|--------------------------------|
| Next.js       | `frontend/nextjs/`            | no (still Chromium)            | faster FCP, otherwise equivalent |
| Rust + Iced   | `frontend/rust-iced/`         | yes (`iced 0.13` over Wayland/X11) | **~80 ms** cold start          |
| Rust + Slint  | `frontend/rust-slint/`        | yes (Slint renderer)           | **~60 ms** cold start, smallest binary |
| C++ / Qt 6    | `frontend/cpp-qt/`            | yes (Qt Widgets)               | **~150 ms** cold start         |
| Java + JavaFX | `frontend/java-javafx/`       | yes (JDK 17 + OpenJFX)         | **~600 ms** cold start (JVM warmup) |
| C + GTK4      | `frontend/c-gtk4/`            | yes (Wayland native)           | **~50 ms** cold start          |

Per-port setup, prerequisites, and build/run recipes live in each
port's own `README.md`:

- [`frontend/nextjs/README.md`](frontend/nextjs/README.md)
- [`frontend/rust-iced/README.md`](frontend/rust-iced/README.md)
- [`frontend/rust-slint/README.md`](frontend/rust-slint/README.md)
- [`frontend/cpp-qt/README.md`](frontend/cpp-qt/README.md)
- [`frontend/java-javafx/README.md`](frontend/java-javafx/README.md)
- [`frontend/c-gtk4/README.md`](frontend/c-gtk4/README.md)

> **About the boot-speed numbers**: they are estimates measured on a
> Raspberry Pi 4B (4 GB) with a warm kernel, Wayfire already running,
> and a `--release` build for the native shells. Cold-boot times
> (Pi power-on → first window paint) are dominated by the kernel and
> Plymouth splash, not the shell, so the deltas between native
> shells on a fully warm system are the meaningful comparison.
> Re-run `time <shell> --no-fetch` on your hardware to get fresh
> numbers.

### MVP scope (intentionally narrow)

Every port's MVP is a single window with three label rows + a Refresh
button: `Backend:` (`/api/health`), `User:` (`/api/users/me`), plus a
timestamp. None of them reimplements the React dashboard; they exist
to validate end-to-end plumbing (HTTP → parsing → render → click).
To port full features, follow the per-stack READMEs as the entry point.

### Launching all shells side-by-side

```bash
npm run dev:backend            # terminal 1
./scripts/dev-all.sh           # terminal 2 (tmux dashboard)
```

Or pick and choose:

```bash
npm run shell:nextjs:dev
npm run shell:rust-iced:check
npm run shell:cpp-qt:build
npm run shell:java-javafx:run
npm run shell:c-gtk4:build && npm run shell:c-gtk4:run
```

`scripts/verify-shells.mjs` (`npm run shells:verify`) is a smoke test
that hits the two shared endpoints and asserts the JSON shape the
shells rely on — useful in CI before kicking off cross-compilation.

## Build & test

### Node.js / TypeScript

```bash
npm run typecheck   # tsc --noEmit across every workspace
npm run test        # vitest run across every workspace
npm run verify      # typecheck + test + (gated) shells:verify
npm run verify:full # typecheck + test + shells:verify (always)
```

`npm run verify` is the single CI entrypoint. The shells smoke test
is gated on the backend port: if nothing is listening on
`ACE_PORT` (default `4318`) the check is skipped with a warning so
the typecheck + unit-test pipeline still passes. To force the smoke
test even with no backend running, use `npm run verify:full`.

### C daemons

The top-level `Makefile` wraps the per-module build trees without
re-implementing them. Targets:

```bash
make            # default: build all C artifacts (daemon + focus)
make daemon     # build os/daemon/* libraries + test drivers
make focus      # build os/lib/focus (state machine library)
make test       # build + run every C-side test driver
make verify     # alias for test
make clean      # remove artifacts in every sub-tree
```

Individual test commands per module:

```bash
make -C os/daemon/common test   # HTTP + daemon env-helper round-trip
make -C os/lib/focus     test   # focus state-machine tests
```

### C cross-compile + image build

```bash
# Inside the Docker image (Stage 0 cross-compiles the kernel)
npm run os:image:build

# Standalone kernel recipe (debug, requires rpi-6.6.y toolchain)
npm run os:kernel:check
npm run os:kernel:build
```

### Flashing to a Pi

```bash
# Build the .img (output: ace-os-v2-beta.img + .sha256 sidecar)
ACE_BASE_IMAGE=/path/to/raspios-lite-arm64.img npm run os:image:build-img

# Flash to an SD card (verifies SHA-256, 10 s safety countdown, dd bs=4M)
sudo npm run os:image:flash -- /dev/sdX ace-os-v2-beta.img
```

See [`scripts/installer/README.md`](scripts/installer/README.md) for
the full pipeline, recovery procedure, and why the installer does not
resize partitions.

### Pi hardware sanity checks

```bash
npm run raspi:info     # print Pi model + SoC + firmware info
npm run raspi:blink    # toggle GPIO 17 to confirm libgpiod is wired
```

## Applications

1. **Home** — Dashboard with today's overview & quick actions
2. **Planner** — Calendar, assignments, exams, timetable
3. **Tasks** — Task management with priorities & categories
4. **Subjects** — Subject list, notes, revision tracking
5. **Focus** — Pomodoro timer & study sessions
6. **AI** — AI learning assistant (Ollama/llama.cpp)
7. **Statistics** — Learning analytics & trends
8. **Settings** — System, theme, hardware, network

## Hardware services

- **ace-core**: Main OS service & IPC
- **ace-hardware**: Camera, GPIO, sensors, LEDs
- **ace-ai**: Local AI processing
- **ace-sync**: Data backup & syncing

## Raspberry Pi deployment

See [`system/linux-config/INSTALL.md`](system/linux-config/INSTALL.md)
for full deployment instructions to Raspberry Pi hardware, and
[`raspberry-pi/README.md`](raspberry-pi/README.md) for the hardware
layer overview (camera, GPIO, sensors, system health).

### Boot splash + cross-compiled kernel

A.C.E OS layers a custom Plymouth boot splash over the Pi's
framebuffer so the first 25 s of boot shows an A.C.E wordmark rather
than the rainbow square + Linux console. The kernel itself is
**cross-compiled inside the Docker image build** (Stage 0 of
`later/os/build/Dockerfile`) against the `rpi-6.6.y` LTS branch with
an A.C.E kconfig overlay.

| Folder | Why it exists |
|--------|---------------|
| `system/boot/splash.svg`           | Canonical wordmark, rasterized at build time |
| `system/boot/config.txt`           | Suppress rainbow, enable KMS for Plymouth + Wayland |
| `system/boot/cmdline.txt`          | `quiet splash plymouth.ignore-serial-consoles …` |
| `system/boot/plymouth/theme/ace.*` | Plymouth `script`-plugin agent + theme metadata |
| `system/boot/install-plymouth.sh`  | Theme registration + `update-initramfs` rebuild |
| `system/linux-config/kernel/`      | Cross-compile driver + kconfig fragment |

Helpful npm scripts (see `package.json`):

```bash
npm run os:boot:render       # locally rasterize splash.svg → PNGs
npm run os:boot:install-local # install Plymouth theme on this host (debug)
npm run os:kernel:check      # sanity check fragment + script present
npm run os:kernel:build      # run build-kernel.sh standalone (debug)
npm run os:image:build       # full Docker image (kernel + rootfs + Plymouth)
```

Why Plymouth over `config.txt` splash: the Pi's KMS driver
(vc4-kms-v3d) replaces the framebuffer firmware splash half-way
through boot, so any `config.txt` "splash image" flickers. Plymouth
owns the DRM device for the entire
`initramfs → KMS → X/Wayland → desktop` window.

## Contributing

1. Fork and create a feature branch.
2. Install the pre-commit hook so typecheck and unit tests run on
   every commit:

   ```bash
   ./scripts/install-hooks.sh
   ```

   The script is idempotent — rerun it to refresh the hook from the
   current `scripts/install-hooks.sh`.

3. Make your change. Keep commits focused; reference the relevant
   app or daemon directory in the subject line.
4. Run the full verify pipeline locally before opening a PR:

   ```bash
   npm run verify
   ```

   If you touched the C side, also run:

   ```bash
   make test
   ```

5. Open a pull request. Include:
   - A short description of the change.
   - Any new or updated tests.
   - A note in [CHANGELOG.md](CHANGELOG.md) under "Unreleased"
     (the v2.0.0 section is filled in as v2 --beta progresses).
   - Screenshots for UI work, especially for `@ace/design-system`
     and the touch-first apps.

## License

MIT
