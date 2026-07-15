# frontend/c-gtk4 — A.C.E OS · C + GTK4 port

Alternative A.C.E OS front-end written in **C + GTK4 + libsoup3 +
json-glib**.

This is one of six port shells:

| Stack     | Path                    |
|-----------|-------------------------|
| Next.js   | `frontend/nextjs/`      |
| Rust+Iced | `frontend/rust-iced/`   |
| Rust+Slint| `frontend/rust-slint/`  |
| C++ Qt    | `frontend/cpp-qt/`      |
| JavaFX    | `frontend/java-javafx/` |
| C GTK4    | `frontend/c-gtk4/` 👈   |

## Why this stack

* `libsoup3` integrates directly with GLib's `GMainContext`. We
  fire-and-forget HTTP calls from the UI thread and Soup pumps the
  callbacks into the same loop that pumps GTK events — no manual
  worker-thread handling, no data races on the labels.
* `json-glib` is the GLib-native JSON parser; it pairs cleanly with
  `GBytes` (what `SoupMessage`'s response body is exposed as) and
  avoids the manual `malloc` dance of `cJSON`.
* GTK4 is Wayland-native on the Pi 5, so no `Xwayland` is needed and
  rendering quality is sharp.

## Prerequisites

On Debian / Raspberry Pi OS:

```bash
sudo apt install -y \
  build-essential pkg-config \
  libgtk-4-dev libsoup-3.0-dev libjson-glib-dev
```

If you're on Wayfire (the Pi default) no extra config is needed.
Under X11 set `GDK_BACKEND=x11` (default).

The A.C.E backend must be reachable. The default is
`http://127.0.0.1:4318`. Override with `ACE_BACKEND` (full URL) or
`ACE_PORT` (port only). The `resolve_backend_base()` helper at the
top of `src/main.c` reads them in that order; the resolved value is
interned with `g_intern_string` so the resulting `const char *` is
stable for the rest of the program's lifetime.

## Build & run

```bash
cd frontend/c-gtk4
make            # produces ./ace-c-gtk4
make run        # runs it
```

Cross-compile to the Pi 5 with a `aarch64-linux-gnu-gcc` toolchain
and the matching `libgtk-4-dev` from `apt:arm64`.

## What the MVP shows

A 640 × 360 window with:

* `Backend:`      — formatted `service` + `ok` from `/api/health`, or
  `Backend: offline` if the call has never succeeded
* `User:`         — `name` from `/api/users/me`, or `User: offline`
* `Last fetched:` — UTC timestamp updated on every successful refresh
* `Refresh`       button → re-fires both calls

Errors land in a red CSS-styled row below the labels. An initial
fetch is fired automatically via `g_idle_add_once` so the first
paint already has fresh data.

## Files

```
frontend/c-gtk4/
├── Makefile                      # pkg-config-driven build
├── src/main.c                    # ~270 lines
└── README.md
```

## Pitfalls / notes

* **Thread safety**: `on_message_done` runs on Soup's worker thread.
  The only thing it may do safely is enqueue a `g_idle_add` payload.
  Never `gtk_label_set_text()` directly from the callback.
* **`g_idle_add_once` vs `g_idle_add`**: use the `_once` form so we
  don't leak idle sources across refreshes.
* **`SoupMessage` refcount**: every body that fetches creates a
  SoupMessage; we `g_object_unref(msg)` after the body read finishes
  so successive Refresh clicks don't accumulate them.
* **CSS**: the stylesheet is loaded inside `activate()`. If you
  spawn multiple windows, the `add_provider_for_display` call will
  fail silently on subsequent windows — the MVP only has one.
* **`-pthread` is intentionally not in the link line.** libsoup3
  uses GLib's thread pool internally and the C code never calls
  `pthread_*` directly — the program is single-threaded from the
  caller's perspective. If you add a worker thread in a follow-up,
  add `-pthread` to `LDFLAGS` (not `LDLIBS`) and the same Makefile
  will keep working on Debian, Fedora, and Arch.
