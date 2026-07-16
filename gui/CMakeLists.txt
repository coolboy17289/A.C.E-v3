cmake_minimum_required(VERSION 3.20)
project(ace-gui VERSION 0.1.0 LANGUAGES C)

set(CMAKE_C_STANDARD 11)
set(CMAKE_C_STANDARD_REQUIRED ON)

# Find required packages
find_package(PkgConfig REQUIRED)
pkg_check_modules(GTK4 REQUIRED gtk4)
pkg_check_modules(GLIB REQUIRED glib-2.0)
pkg_check_modules(GIO REQUIRED gio-2.0)
pkg_check_modules(CAIRO REQUIRED cairo)

# Include directories
include_directories(
    ${CMAKE_SOURCE_DIR}/src
    ${GTK4_INCLUDE_DIRS}
    ${GLIB_INCLUDE_DIRS}
    ${GIO_INCLUDE_DIRS}
    ${CAIRO_INCLUDE_DIRS}
)

# Compile flags
add_compile_options(
    -Wall -Wextra -Wpedantic
    ${GTK4_CFLAGS_OTHER}
)

# Link directories
link_directories(
    ${GTK4_LIBRARY_DIRS}
    ${GLIB_LIBRARY_DIRS}
    ${GIO_LIBRARY_DIRS}
    ${CAIRO_LIBRARY_DIRS}
)

# Source files - Core Desktop Shell
set(SHELL_SOURCES
    src/shell/main.c
    src/shell/ace-app.c
    src/shell/ace-window.c
    src/shell/ace-topbar.c
    src/shell/ace-dock.c
    src/shell/ace-activities.c
    src/shell/ace-desktop.c
    src/shell/ace-theme.c
)

# Source files - Window Manager
set(WM_SOURCES
    src/wm/ace-wm.c
    src/wm/ace-window-manager.c
)

# Source files - Apps
set(APP_SOURCES
    src/apps/ace-files.c
    src/apps/ace-settings.c
    src/apps/ace-terminal.c
    src/apps/ace-calculator.c
    src/apps/ace-clock.c
    src/apps/ace-notes.c
)

# Source files - Utils
set(UTIL_SOURCES
    src/utils/ace-utils.c
)

# Combine all sources
set(ALL_SOURCES
    ${SHELL_SOURCES}
    ${WM_SOURCES}
    ${APP_SOURCES}
    ${UTIL_SOURCES}
)

# Build executable
add_executable(ace-gui ${ALL_SOURCES})

target_link_libraries(ace-gui
    ${GTK4_LIBRARIES}
    ${GLIB_LIBRARIES}
    ${GIO_LIBRARIES}
    ${CAIRO_LIBRARIES}
    m
)

# Install
install(TARGETS ace-gui DESTINATION bin)
