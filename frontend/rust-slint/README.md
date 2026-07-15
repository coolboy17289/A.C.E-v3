# frontend/rust-slint — A.C.E OS · Rust + Slint port

Alternative A.C.E OS front-end written in **Rust + [Slint] 1.x** with a
declarative `.slint` UI. Renders a single window that fetches
`/api/health` and `/api/users/me` from the existing Express backend.

This is one of six port shells:

| Stack     | Path                       |
|-----------|----------------------------|
| Next.js   | `frontend/nextjs/`         |
| Rust+Iced | `frontend/rust-iced/`      |
| Rust+Slint| `frontend/rust-slint/` 👈  |
| C++ Qt    | `frontend/cpp-qt/`         |
| JavaFX    | `frontend/java-javafx/`    |
| C GTK4    | `frontend/c-gtk4/`         |

[Slint]: https://slint.dev/

## Why Slint

* Pure-Rust, declarative UI — smaller binary than Iced for a card this
  size, and the `.slint` file is a single source of truth for the
  layout.
* Slint's reactive property bindings mean we never re-render the
  whole tree on a state change — only the bound `Text { text: ... }`
  element gets re-laid out.
* The blocking reqwest pattern is idiomatic for Slint: a `std::thread`
  does the I/O and the result is pumped back via
  `upgrade_in_event_loop`, which is the official cross-thread
  property-setter primitive.

## Prerequisites

* Rust toolchain (`rustc` + `cargo`) ≥ 1.74. Install with [rustup].
* On the Pi 5, install the native deps Slint's winit backend needs:
  ```bash
  sudo apt install -y libwayland-dev libxkbcommon-dev libfontconfig1-dev
  ```
* The A.C.E backend must be reachable. The default is
  `http://127.0.0.1:4318`; override with `ACE_BACKEND` (full URL) or
  `ACE_PORT` (port only). The `resolve_backend_base()` helper at the
  top of `src/main.rs` reads them in that order.

[rustup]: https://rustup.rs/

## Run

```bash
cd frontend/rust-slint
cargo run                              # debug build, opens a window
cargo run --release                    # much smaller + faster
```

## What the MVP shows

A 640 × 400 window with:

* `Backend:`     — `service (ok|down)` from `GET /api/health`
* `User:`        — `name` from `GET /api/users/me`
* `Last fetched:` — UTC timestamp updated on every successful refresh
* `Refresh`  button to re-fire both calls

If a call fails, the error lands in a red `Error: …` line at the
bottom of the window instead of crashing.

## Files

```
frontend/rust-slint/
├── Cargo.toml
├── build.rs                # compiles ui/app.slint via slint-build
├── src/main.rs             # ~120 lines · fetch thread + UI glue
├── ui/app.slint            # ~70 lines · declarative layout
└── README.md
```

## Pitfalls / notes

* `slint` requires EITHER an X server (`DISPLAY=:0`) or a Wayland
  compositor. On Wayfire (the Pi default) it works out of the box.
* We use `rustls-tls` rather than the default `native-tls` so the Pi
  does not need `libssl-dev` at runtime.
* The blocking reqwest + `std::thread::spawn` pattern is the
  idiomatic Slint recipe. Don't try to call the async reqwest from
  inside an async runtime in this crate — the UI thread is reserved
  for property writes and there is no event loop to schedule on.
* `build.rs` is mandatory: it invokes `slint_build::compile("ui/app.slint")`
  and embeds the generated types into `main.rs` via
  `slint::include_modules!()`.
