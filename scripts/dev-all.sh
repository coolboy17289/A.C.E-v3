#!/usr/bin/env bash
# scripts/dev-all.sh — boot every A.C.E front-end at once for review.
#
# Launches six panes in a tmux session (one per port shell) plus a
# backend pane. Each shell is best-effort — if a toolchain isn't
# installed (e.g. no `cmake` on the dev box) the pane just shows the
# missing dependency so you can `Ctrl-B → arrow` to the next pane.
#
# Pre-conditions
#   * tmux 2.9+ installed (apt install tmux / brew install tmux)
#   * The `.NET` port shells each need their own toolchain. See each
#     README for the prerequisites; the panes will fail with a clear
#     error if the toolchain isn't there, which is fine for review.
#
# Usage
#   ./scripts/dev-all.sh
#   # Stop: Ctrl-B then :  → detach, or kill the session from another
#   # tmux kill-session -t ace-shells

set -uo pipefail

SESSION="ace-shells"
WORKDIR="$(cd "$(dirname "$0")/.." && pwd)"

# Bail gracefully if tmux isn't present.
if ! command -v tmux >/dev/null 2>&1; then
  echo "tmux is required (apt install tmux / brew install tmux)" >&2
  exit 1
fi

# Kill any stale session so the script is idempotent.
tmux kill-session -t "$SESSION" 2>/dev/null || true

# Pane 0: backend. Boot it first so /api/* is live when clients start.
tmux new-session -d -s "$SESSION" -n backend -c "$WORKDIR"
tmux send-keys -t "$SESSION:0.0" "clear; echo '== BACKEND (port 4318) =='; npm run dev:backend" C-m

# Pane 1: Next.js (left/right split from backend).
tmux split-window -h -t "$SESSION:0.0" -c "$WORKDIR"
tmux send-keys -t "$SESSION:0.1" "clear; echo '== Next.js (port 3000) =='; cd $WORKDIR/frontend/nextjs && npm install --no-audit --no-fund && npm run dev" C-m

# Pane 2: Rust + Iced.
tmux split-window -v -t "$SESSION:0.1" -c "$WORKDIR"
tmux send-keys -t "$SESSION:0.2" "clear; echo '== Rust + Iced =='; cd $WORKDIR/frontend/rust-iced && cargo run --release" C-m

# Pane 3: Rust + Slint.
tmux split-window -v -t "$SESSION:0.2" -c "$WORKDIR"
tmux send-keys -t "$SESSION:0.3" "clear; echo '== Rust + Slint =='; cd $WORKDIR/frontend/rust-slint && cargo run --release" C-m

# Pane 4: C + GTK4.
tmux split-window -h -t "$SESSION:0.2" -c "$WORKDIR"
tmux send-keys -t "$SESSION:0.4" "clear; echo '== C + GTK4 =='; cd $WORKDIR/frontend/c-gtk4 && make run" C-m

# Pane 5: C++ + Qt.
tmux split-window -v -t "$SESSION:0.4" -c "$WORKDIR"
tmux send-keys -t "$SESSION:0.5" "clear; echo '== C++ + Qt 6 =='; cd $WORKDIR/frontend/cpp-qt && cmake -S . -B build && cmake --build build && ./build/ace-cpp-qt" C-m

# Pane 6: Java + JavaFX.
tmux split-window -v -t "$SESSION:0.1" -c "$WORKDIR"
tmux send-keys -t "$SESSION:0.6" "clear; echo '== Java + JavaFX =='; cd $WORKDIR/frontend/java-javafx && mvn -B javafx:run" C-m

# Layout: even-horizontal for the top row; backend on top-left.
tmux select-layout -t "$SESSION:0" tiled

cat <<'USAGE'
A.C.E shell launch dashboard is starting.

  - Ctrl-B then arrow keys → switch panes
  - Ctrl-B then d          → detach (the panes keep running)
  - tmux kill-session -t ace-shells   → tear everything down

Look for the `Backend: ace-backend (ok)` line in each pane. If a
pane shows a toolchain error (missing `cmake`, no JavaFX, no Rust)
see the corresponding frontend/<stack>/README.md for setup.
USAGE

tmux attach -t "$SESSION"
