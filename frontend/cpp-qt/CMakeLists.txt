cmake_minimum_required(VERSION 3.21)
project(ace-cpp-qt LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_AUTOMOC ON)
set(CMAKE_INCLUDE_CURRENT_DIR ON)

# Find Qt 6 — Widgets branch (not QML) keeps the MVP dependency tree
# small. If we want QML later, add Qt6::Quick + Qt6::Qml here.
find_package(Qt6 6.5 REQUIRED COMPONENTS Core Gui Widgets Network)

qt_standard_project_setup()

qt_add_executable(ace-cpp-qt
    src/main.cpp
)

target_link_libraries(ace-cpp-qt PRIVATE
    Qt6::Core
    Qt6::Gui
    Qt6::Widgets
    Qt6::Network
)

# Install layout matches the convention from other Qt6 apps so the
# binary can be packaged into the A.C.E ISO image later.
install(TARGETS ace-cpp-qt
    RUNTIME DESTINATION bin
)
