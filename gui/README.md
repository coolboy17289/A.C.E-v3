# A.C.E GUI - Native Desktop Environment

A.C.E (Academic Companion Engine) native desktop environment built with **GTK4 + C** for Raspberry Pi 4.

## Architecture

```
gui/
├── CMakeLists.txt              # Build system
├── README.md                   # This file
├── css/
│   └── ace.css                 # GTK4 CSS theme (green dark theme)
├── src/
│   ├── shell/                  # Desktop shell components
│   │   ├── main.c              # Entry point
│   │   ├── ace-app.c/h         # GTK Application lifecycle
│   │   ├── ace-window.c/h      # Root desktop window
│   │   ├── ace-topbar.c/h      # Top bar (clock, system tray, activities)
│   │   ├── ace-dock.c/h        # Bottom application dock
│   │   ├── ace-activities.c/h  # Activities overlay (app launcher)
│   │   ├── ace-desktop.c/h     # Desktop area / wallpaper
│   │   └── ace-theme.c/h       # CSS theme manager
│   ├── wm/                     # Window manager
│   │   ├── ace-wm.c/h          # Core window manager
│   │   └── ace-window-manager.c/h  # High-level API
│   ├── apps/                   # Built-in applications
│   │   ├── ace-files.c         # File manager
│   │   ├── ace-settings.c      # System settings
│   │   ├── ace-terminal.c      # Terminal emulator
│   │   ├── ace-calculator.c    # Calculator
│   │   ├── ace-clock.c         # Clock & timer
│   │   └── ace-notes.c         # Text editor / notes
│   ├── utils/
│   │   └── ace-utils.c/h       # Common utilities
│   ├── icons/                  # App icons
│   └── css/                    # Additional CSS (loaded at runtime)
```

## Tech Stack

| Component    | Language      | Notes              |
|-------------|---------------|-------------------|
| Shell       | C + GTK4      | Desktop environment |
| Window Mgr  | C + GTK4      | Floating windows   |
| Apps        | C + GTK4      | Built-in apps      |
| Theme       | GTK4 CSS      | Green dark theme   |
| Build       | CMake         | Cross-compilation  |

## Building

### Prerequisites

```bash
# Ubuntu/Debian
sudo apt install build-essential cmake pkg-config libgtk-4-dev

# Raspberry Pi OS
sudo apt install build-essential cmake pkg-config libgtk-4-dev
```

### Build

```bash
cd gui/
mkdir build && cd build
cmake ..
make -j$(nproc)
```

### Run

```bash
./ace-gui
```

## Features

### Desktop Shell
- **Top Bar**: Activities button, clock, system indicators
- **Dock**: Quick-launch app icons at the bottom
- **Activities**: Full-screen app launcher with search
- **Desktop**: Gradient wallpaper surface

### Built-in Apps
- **ACE Files**: File manager with grid/list views
- **ACE Settings**: System configuration (display, network, theme)
- **ACE Terminal**: Terminal emulator with monospace font
- **ACE Calculator**: Basic calculator
- **ACE Clock**: Real-time clock display
- **ACE Notes**: Simple text editor

### Theme
- Green dark theme (#00ff88 accent)
- Glass-style panels with backdrop blur
- Smooth hover animations
- Custom CSS for all widgets

## Target Platform

- **Primary**: Raspberry Pi 4 (ARM64)
- **Secondary**: x86_64 Linux desktops
- **Display**: 1280x720 landscape (720x1280 portrait rotated)
