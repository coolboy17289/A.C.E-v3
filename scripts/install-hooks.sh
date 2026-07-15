#!/usr/bin/env bash
# scripts/install-hooks.sh — install a pre-commit hook for A.C.E OS.
#
# The hook runs `npm run typecheck && npm run test` before each
# commit so broken code can't land in the working tree. The
# installation is idempotent: running the script repeatedly is safe
# and will replace a stale hook with the current one.
#
# Usage
#   ./scripts/install-hooks.sh           # install into .git/hooks/
#   GIT_DIR=/some/other/.git ./scripts/install-hooks.sh
#
# The hook is written to .git/hooks/pre-commit by default, or
# $GIT_DIR/hooks/pre-commit if GIT_DIR is set in the environment.

set -euo pipefail

# Resolve repo root regardless of where the script is invoked from.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Default to the repo's own .git, but respect $GIT_DIR.
GIT_DIR="${GIT_DIR:-$REPO_ROOT/.git}"

if [[ ! -d "$GIT_DIR" ]]; then
  echo "No .git directory at $GIT_DIR — is this a git repo?" >&2
  exit 1
fi

HOOK_PATH="$GIT_DIR/hooks/pre-commit"
HOOK_BODY='#!/usr/bin/env bash
# Installed by scripts/install-hooks.sh — runs the Node-side
# typecheck + unit tests before every commit. Safe to edit by
# hand; rerun scripts/install-hooks.sh to restore the default.

set -e

# Find the repo root from this hook file so the hook works from
# submodules and worktrees too.
HOOK_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$HOOK_DIR/../.." && pwd)"

cd "$REPO_ROOT"

# `npm run typecheck` and `npm run test` are wired in package.json
# to delegate to every workspace. Keeping them in series keeps the
# output readable on failure.
npm run typecheck
npm run test
'

# Always overwrite so the hook on disk matches the script in the
# repo. Marking it executable on every run keeps `git` happy even
# if a checkout dropped the +x bit.
printf '%s\n' "$HOOK_BODY" > "$HOOK_PATH"
chmod +x "$HOOK_PATH"

echo "Installed pre-commit hook at $HOOK_PATH"
echo "It runs: npm run typecheck && npm run test"
