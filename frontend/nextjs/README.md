# frontend/nextjs — A.C.E OS Next.js (App Router) port

Alternative A.C.E OS front-end written in **Next.js 15 (App Router) +
React 18**. It serves a single page that connects to the existing
Express backend (`@ace/backend`) over HTTP.

This is one of six port shells. The others are:

| Stack     | Path                    |
|-----------|-------------------------|
| Next.js   | `frontend/nextjs/` 👈   |
| Rust+Iced | `frontend/rust-iced/`   |
| Rust+Slint| `frontend/rust-slint/`  |
| C++ Qt    | `frontend/cpp-qt/`      |
| JavaFX    | `frontend/java-javafx/` |
| C GTK4    | `frontend/c-gtk4/`      |

## Why Next.js

* Same TypeScript + React knowledge as the existing `@ace/desktop-shell`.
* App Router lets server components pre-render the first paint, which
  speeds up the Pi kiosk experience without changing the backend.
* Same `/api/*` rewrite trick works in dev and production.

## Prerequisites

* Node.js 18+ (whichever version the project's other npm workspaces
  target; the root has `>=18.0.0`).
* The A.C.E backend must be reachable. The default is
  `http://127.0.0.1:4318` — override with `ACE_BACKEND` (consumed by
  `next.config.mjs`) or `NEXT_PUBLIC_ACE_BACKEND` (consumed by the
  client component, so it bakes the upstream into the JS bundle).

## Run

```bash
cd frontend/nextjs
npm install
npm run dev          # opens http://localhost:3000
```

Production:

```bash
npm run build
npm run start        # serves on :3000
```

## What the MVP shows

A single card with three pieces of state:

* `Backend:` populated from `GET /api/health`, or `offline` if the
  backend is unreachable
* `User:` populated from `GET /api/users/me`, or `offline`
* `Last fetched:` timestamp updated on every successful Refresh

A Refresh button re-fires both calls. If the backend is offline the
`Backend:` row switches to `offline` and a red `Backend: offline — …`
hint appears under the card.

## Files of interest

```
frontend/nextjs/
├── package.json           # Next 15 + React 18
├── next.config.mjs        # /api/* → backend :4318 rewrite (ACE_BACKEND)
├── tsconfig.json          # strict mode, bundler resolution
├── app/
│   ├── layout.tsx         # root <html>/<body>
│   └── page.tsx           # the dashboard (Client Component)
└── README.md
```

## Notes / pitfalls

* The `/api/*` rewrite works with POSTs and JSON bodies too — the AI
  Tutor's `POST /api/ai/messages` body is forwarded transparently.
* If you change the backend port, set `ACE_BACKEND` in the environment
  (or `NEXT_PUBLIC_ACE_BACKEND` if you want the bundle hard-coded to a
  specific origin).
* `next-env.d.ts` is auto-generated on first `next dev` — don't edit
  it (the comment inside the file says so).
* Two port-mapping precedence rules worth knowing:
  * `ACE_BACKEND` is read at *Next* boot time (server-side rewrite).
    Changing it after `next dev` is up requires a restart.
  * `NEXT_PUBLIC_ACE_BACKEND` is inlined into the client JS at *build*
    time. A running dev server picks it up on the next hot reload,
    but production builds need a fresh `next build` to see the new
    value.
