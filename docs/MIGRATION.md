# A.C.E OS · TypeScript → native migration plan

**Owner status:** documentation only. This file is the source of truth
for the phased plan to phase out `@ace/desktop-shell` (the React/Vite
shell) and replace it with a fully native, non-Chromium kiosk.

## Why we are doing this

The React/Vite shell works in development but has two properties that
are wrong for the kiosk product:

* **It is a Chromium kiosk, not a native binary.** Every boot pays the
  full Chromium startup tax (~600–800 ms cold start on a Pi 4B with
  Wayfire) plus the JS bundle download. The Raspberry Pi 7" DSI panel
  spends the first frame painting Plymouth, the next rendering
  Chromium's loading spinner, and only then the React tree.
* **It is in TypeScript.** Pinned Node ≥ 18 toolchain, npm workspaces,
  Vite build step, and a non-trivial type/config surface that the
  other five shells do not share. The alternatives in `frontend/`
  (`rust-slint/`, `rust-iced/`, `cpp-qt/`, `java-javafx/`, `c-gtk4/`)
  all produce single static binaries with no JS runtime required.

The remaining shell choice (Rust + Slint) keeps every other backend
contract intact: the JSON API on port `4318`, all `/api/*` routes, the
shared types in `@ace/shared/*`, and the SetupWizard semantics.

## Target selection

The five native-shell candidates are evaluated against the existing
`{#frontend/<shell>}` MVPs:

| Criteria                              | Rust + Slint | Rust + Iced | C + GTK4 | C++ + Qt 6 | Java + JavaFX |
|---------------------------------------|:------------:|:-----------:|:--------:|:----------:|:-------------:|
| Cold start (warm kernel)              |   ~60 ms     |   ~80 ms    | ~50 ms   |  ~150 ms   |   ~600 ms     |
| Bootstrap effort vs MVP               |   small      |   small     | medium   |   medium   |    medium     |
| Binary size (release, strip+LTO)      |   smallest   |   small     | medium   |    large   |   large (JVM) |
| Touch-target ergonomics (80 px+ tiles) |   ✓          |    ✓        |   ✓      |     ✓      |     ✓         |
| MVP already exists in repo            |   ✓          |    ✓        |   ✓      |     ✓      |     ✓         |
| Layout primitive that approximates `flex: 1, minHeight: 0` |   ✓ (`*` w/ `VerticalLayout`) |   ✓          |  ✓ (GtkBox expand) |  ✓ (QSplitter) |  ✓ (VBox grow) |

**Recommendation: Rust + Slint** (`frontend/rust-slint/`). Smallest
binary on the Pi, smallest runtime dependency surface
(`libwayland-dev`, `libxkbcommon-dev`, `libfontconfig1-dev`), and the
existing MVP already wires the blocking-reqwest + `upgrade_in_event_loop`
pattern that is idiomatic for Slint. The build graph is one
`Cargo.toml` + one `build.rs` + one `.slint` file.

## Phasing

The migration runs in six explicit phases. Each phase is independently
runnable; no phase break is allowed to land unless the new shell is at
feature parity for the slice it owns.

### Phase 0 — Touch launcher shell (this PR)

Extend `frontend/rust-slint/` from its MVP three-label + Refresh layout
into a touch-launcher shell with:

- A `.slint` file that mirrors the React `Dashboard.tsx` three-region
  layout: header strip (user name), body (active app placeholder), and
  bottom launcher row with one tile per `APP_REGISTRY` entry.
- A `main.rs` that wires tile-click callbacks to a `selected-app-id`
  + `selected-app-accent` property pair, so the accent strip under the
  header switches colour as the user taps each tile.
- A local registry const that mirrors `@ace/shared/apps-registry.ts`.
  The two are guaranteed identical by the test in
  `frontend/shared/tests/registry-parity.test.ts` (added in a later
  phase — see Phase 2).

The React/TS shell is **not touched** in this phase. Both shells
remain runnable.

### Phase 1 — Switch the default

The `npm run dev:shell` script gets a `--native` flag (env variable
`ACE_SHELL=native`):

- `ACE_SHELL=native npm run dev:shell` boots the Rust + Slint binary.
- `npm run dev:shell` (default) keeps React, so the existing test rig
  and `npm run verify` pipeline do not regress.

The kiosk `/etc/kiosk.conf` is updated at the same time to launch the
Rust binary by default.

### Phase 2 — Design-system parity

Build a Slint counterpart for `@ace/design-system`. Files:

- `frontend/rust-slint/design/colors.slint` — the dark + light palette
  consts, currently sourced from `frontend/design-system/src/theme.ts`.
- `frontend/rust-slint/design/components/*.slint` — `AceButton`,
  `AceCard`, `AceIconButton`, `AceRow`, plus the debounce + focus
  styling primitives from `a11y.css`.
- `frontend/shared/tests/registry-parity.test.ts` — npm-run vitest
  test that diffs `apps-registry.ts` against the registry baked into
  the Slint runtime.

### Phase 3 — App port

Each React app gets a Slint counterpart:

- `frontend/rust-slint/apps/home.slint`     — mirror of `@ace/app-home`
- `frontend/rust-slint/apps/tasks.slint`    — mirror of `@ace/app-tasks`
- `frontend/rust-slint/apps/settings.slint` — mirror of `@ace/app-settings`
- `frontend/rust-slint/apps/focus.slint`    — mirror of `@ace/app-focus`

A "Coming soon" placeholder covering `@ace/app-ai` + the parked apps
in `later/apps/` (planner, subjects, statistics) stays until the
spec for those settles.

### Phase 4 — Archive the React shell

**Only after Phase 3 ships at feature parity for every shipped app**,
move `frontend/desktop-shell/`, `frontend/design-system/`, every
`frontend/apps/`, and the React-distinct files in `frontend/shared/`
into `later/port_shell_v2/`. The active shell becomes Rust.

The TS source files stay in `later/` so historical context is
recoverable — we do **not** delete them outright.

### Phase 5 — TypeScript in backend? (deferred)

The user has not asked. The backend is Node + Express + SQLite and is
a separate scope. A future conversation can phase that out to Rust
(`backend-rust/` in `later/`) following the same playbook.

## What we are NOT deleting yet

* `frontend/desktop-shell/`
* `frontend/design-system/`
* `frontend/shared/`
* `frontend/apps/{home,tasks,settings,focus}/`
* `frontend/nextjs/`

All of these continue to ship and be tested throughout Phases 0–3.
Deleting them is gated on Phase 4, which itself gates on Phase 3
landing at feature parity in a ship-blocker-free release.

## Verification

> **Prerequisites on a stock Pi OS Lite image.** Four packages are
> *not* preinstalled and must be installed BEFORE `cargo check` and
> `cargo run`:
>
> ```bash
> sudo apt install -y \
>   libwayland-dev libxkbcommon-dev libfontconfig1-dev \
>   fonts-noto-color-emoji
> ```
>
> `libwayland-dev` / `libxkbcommon-dev` / `libfontconfig1-dev` are
> slint-winit's runtime deps; without them the linker fails before
> `slint::include_modules!()` even runs. `fonts-noto-color-emoji`
> is what makes the launcher tile icons (`🏠 ✅ ⚙️ ⏱️`) render as
> glyphs instead of tofu boxes — without it `cargo run` opens a
> window with empty-looking tiles on first flash.

The bar for "Phase 0 ships" is the three checks below. Each is part
of the PR conversation; a reviewer should be able to reproduce all
three on a Pi 4B / Pi 5 once the apt line above is in place.

1. **Type-check**

   ```bash
   cargo check --manifest-path frontend/rust-slint/Cargo.toml
   ```

   Exits 0. Build-time native libraries required:

   ```bash
   sudo apt install -y libwayland-dev libxkbcommon-dev libfontconfig1-dev
   ```

2. **Smoke run with the backend up**

   ```bash
   npm run dev:backend &        # express + sqlite on :4318
   cargo run --release --manifest-path frontend/rust-slint/Cargo.toml
   ```

   The window opens at 800×480, the header shows the user name from
   `GET /api/users/me`, each launcher tile toggles the accent strip
   colour on tap, and `Backend: ace-backend (ok)` lands in the body.

3. **No regression to the existing stack**

   ```bash
   npm run typecheck   # unchanged
   npm test --workspace=@ace/backend   # still 50/50
   ```

   The React shell and the four existing test workspaces must
   continue to pass. Phase 0 must not touch the TypeScript surface.

## `registry:parity` script

A noop script is added at the root `package.json` so CI surfaces the
gap between `@ace/shared/src/apps-registry.ts` and
`frontend/rust-slint/ui/app.slint`'s `apps:` literal:

```jsonc
"registry:parity": "echo 'TODO(Phase 2): diff apps-registry.ts against rust-slint ui/app.slint apps literal'"
```

It prints a single reminder line on every `npm run` invocation until
Phase 2 swaps it for a vitest parity check that fails CI on mismatch.

## Reference

* Mermaid sequence for the boot path post-Phase 1:

  ```text
  Plymouth (DRM)
     │
     ▼
  /usr/local/bin/ace-slint  (rust-slint release binary)
     │  HTTP on ACE_BACKEND
     ▼
  @ace/backend  (4318, unchanged)
     │
     ▼
  SQLite (unchanged)
  ```
