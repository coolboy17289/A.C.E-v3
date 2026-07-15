# Top-level Makefile for A.C.E OS.
#
# Wraps the per-module C daemon build trees so a developer can build
# and test the whole C-side stack with a single `make` invocation,
# without fighting the existing per-module Makefiles. Each sub-make
# keeps ownership of its own flags, sources, and test driver; this
# file only orchestrates them and surfaces a tiny, stable surface:
#
#   make           # default: build everything (daemon + focus)
#   make daemon    # build all os/daemon/* libraries + tests
#   make focus     # build os/lib/focus (state machine)
#   make test      # build + run every C-side test driver
#   make verify    # alias for test (mirrors `npm run verify` for C)
#   make clean     # remove artifacts in every sub-tree
#
# Front-end / Node.js testing lives in `npm run verify` — this
# Makefile intentionally only covers the C code paths.

# Use bash so $(...) arithmetic and globbing behave predictably.
SHELL := /usr/bin/env bash

# Per-module build directories. Keep this list in sync with the
# actual layout under os/. Each entry must have a Makefile that
# accepts the targets defined in this file (all, test, clean).
DAEMON_DIRS := \
	os/daemon/common

LIB_DIRS := \
	os/lib/focus

# Default target: build every C artifact, but don't run tests.
.PHONY: all
all: daemon focus

# `make daemon` — every daemon under os/daemon/.
.PHONY: daemon
daemon:
	@set -e; \
	for d in $(DAEMON_DIRS); do \
		echo ">> make -C $$d"; \
		$(MAKE) -C $$d; \
	done

# `make focus` — the timer state-machine library.
.PHONY: focus
focus:
	@set -e; \
	for d in $(LIB_DIRS); do \
		echo ">> make -C $$d"; \
		$(MAKE) -C $$d; \
	done

# `make test` — build, then run every C-side test driver.
.PHONY: test
test:
	@set -e; \
	for d in $(DAEMON_DIRS) $(LIB_DIRS); do \
		echo ">> make -C $$d test"; \
		$(MAKE) -C $$d test; \
	done

# `make verify` — alias for `test` so the C side and `npm run verify`
# have parallel shapes.
.PHONY: verify
verify: test

# `make clean` — remove build artifacts in every sub-tree.
.PHONY: clean
clean:
	@set -e; \
	for d in $(DAEMON_DIRS) $(LIB_DIRS); do \
		echo ">> make -C $$d clean"; \
		$(MAKE) -C $$d clean; \
	done
