# A.C.E OS · C / GTK4 + libsoup3 front-end MVP.
#
# Built against the modern GNOME stack (gtk4 + libsoup3 + json-glib).
# Use pkg-config to discover paths so the same Makefile works on
# Debian, Fedora, Arch, and the Pi OS builds.
#
# Usage:
#   make            # builds ./ace-c-gtk4
#   make run        # builds + executes (requires backend on :4318)
#   make clean

PKG_CONFIG ?= pkg-config

PKGS = gtk4 libsoup-3.0 json-glib-1.0

CFLAGS  ?= -O2 -g
CFLAGS  += $(shell $(PKG_CONFIG) --cflags $(PKGS))
CFLAGS  += -Wall -Wextra -Wno-unused-parameter

LDFLAGS ?=
LDLIBS  += $(shell $(PKG_CONFIG) --libs $(PKGS))

SRC = src/main.c
OBJ = $(SRC:.c=.o)
BIN = ace-c-gtk4

.PHONY: all run clean

all: $(BIN)

$(BIN): $(OBJ)
	$(CC) $(CFLAGS) $(OBJ) $(LDFLAGS) $(LDLIBS) -o $@

%.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@

run: $(BIN)
	./$(BIN)

clean:
	rm -f $(OBJ) $(BIN)
