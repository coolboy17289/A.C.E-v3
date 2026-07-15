# frontend/cpp-qt — A.C.E OS · C++ / Qt 6 port

Alternative A.C.E OS front-end using **C++ + Qt 6 (Widgets)**.

This is one of six port shells:

| Stack     | Path                    |
|-----------|-------------------------|
| Next.js   | `frontend/nextjs/`      |
| Rust+Iced | `frontend/rust-iced/`   |
| Rust+Slint| `frontend/rust-slint/`  |
| C++ Qt    | `frontend/cpp-qt/` 👈   |
| JavaFX    | `frontend/java-javafx/` |
| C GTK4    | `frontend/c-gtk4/`      |

## Why Qt Widgets (and not QML)

* Smaller dependency surface — Qt6::Core + Gui + Widgets + Network.
* The MVP card has three labels and a button; declarative QML adds
  machinery (qmllint, qmltyperegistrar) that we'd then have to support
  forever for no UX upside.
* If we adopt QML later for a tablet-style view, the `CMakeLists.txt`
  has comments showing exactly where to add `Quick` + `Qml`.

## Prerequisites

On a Debian/Raspberry Pi OS box, install Qt 6 + the build tools:

```bash
sudo apt install -y \
  build-essential cmake ninja-build pkg-config \
  qt6-base-dev qt6-tools-dev
```

Or via the [official Qt installer].

On macOS / Windows use the [Qt online installer].

The A.C.E backend (`@ace/backend`) must be running on
`http://localhost:4318`. If you move it, edit the `kBackendBase`
constant in `src/main.cpp`.

[official Qt installer]: https://www.qt.io/download-qt-installer
[Qt online installer]: https://www.qt.io/download-qt-installer

## Build & run

```bash
cd frontend/cpp-qt
cmake -S . -B build -G Ninja
cmake --build build
./build/ace-cpp-qt
```

Cross-compile to the Pi 5 with [`qt-cmake`] and the matching
`aarch64-linux-gnu` sysroot.

[qt-cmake]: https://doc.qt.io/qt-6/qt-cmake.html

## What the MVP shows

A single 640 × 360 window with:

* `Backend:` — last value of `GET /api/health`'s `service` + `ok`
* `User:`    — last value of `GET /api/users/me`'s `name`
* `Refresh`  button to re-fire both calls

If the network fails, the error message lands in a red label below the
values instead of crashing.

## Files

```
frontend/cpp-qt/
├── CMakeLists.txt
├── src/main.cpp          # ~140 lines · AceWindow + slots
└── README.md
```

## Pitfalls / notes

* `QPushButton::setStyleSheet` overrides Qt's default `:hover` /
  `:pressed` states; we accept that tradeoff for the gradient look.
* The `QMetaObject::invokeMethod(this, ..., QueuedConnection)`
  pattern guarantees `refresh()` runs *after* `show()`, so the
  QNetworkAccessManager's first events have an event loop attached.
* `find_package(Qt6 6.5 REQUIRED ...)` will fail loudly if your distro
  only ships Qt 5. Don't try to downgrade silently — the API broke in
  Qt 6.
