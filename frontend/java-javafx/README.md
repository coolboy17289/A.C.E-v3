# frontend/java-javafx — A.C.E OS · Java + JavaFX port

Alternative A.C.E OS front-end using **Java 17 + JavaFX**.

This is one of six port shells:

| Stack     | Path                       |
|-----------|----------------------------|
| Next.js   | `frontend/nextjs/`         |
| Rust+Iced | `frontend/rust-iced/`      |
| Rust+Slint| `frontend/rust-slint/`     |
| C++ Qt    | `frontend/cpp-qt/`         |
| JavaFX    | `frontend/java-javafx/` 👈 |
| C GTK4    | `frontend/c-gtk4/`         |

## Why JavaFX

* `java.net.http.HttpClient` (built in since JDK 11) gives us async
  HTTP without any extra dependency.
* JavaFX has first-class CSS styling so we can match the look of the
  other shells with `-fx-*` styles.
* [BellSoft Liberica JDK 17] ships a Raspberry-Pi-tuned build that
  includes the modular OpenJFX runtime so we don't have to fight
  `java.library.path` on the Pi.

[BellSoft Liberica JDK 17]: https://bell-sw.com/pages/downloads

## Prerequisites

On Debian / Raspberry Pi OS:

```bash
sudo apt install -y openjdk-17-jdk maven
# JavaFX 21 itself is on Maven Central — no apt step needed.
```

On macOS:

```bash
brew install openjdk@17 maven
```

The A.C.E backend (`@ace/backend`) must be reachable. The default is
`http://127.0.0.1:4318`; override with `ACE_BACKEND` (e.g.
`ACE_BACKEND=http://192.0.2.10:4318`) or with `ACE_PORT` (just the
port, defaults to `127.0.0.1`). The constants in `HelloAce.java` are
now resolved at startup from those env vars first.

## Build & run

```bash
cd frontend/java-javafx
mvn -B clean javafx:run         # debug-style invocation
mvn -B package                 # produces target/*.jar
java -jar target/ace-java-javafx-0.1.0.jar  # if shaded
```

The `javafx:run` plugin handles the module path automatically. For a
fat-jar, add `maven-shade-plugin` later — out of scope for the MVP.

## What the MVP shows

A 640×360 window with:

* `Backend:`     — `service (ok|down)` from `GET /api/health`, or
  `Backend: offline` if the call has never succeeded
* `User:`        — `name` from `GET /api/users/me`, or `User: offline`
* `Last fetched:` timestamp updated only when **both** calls settle
* `Refresh` button — re-fires both calls

Errors from either endpoint land in a red line below the user label.

## Files

```
frontend/java-javafx/
├── pom.xml
└── src/main/java/com/ace/HelloAce.java   # ~170 lines
```

## Pitfalls / notes

* **JavaFX Application Thread rule**: only the thread that called
  `Application.launch` may touch `Node`s. `Platform.runLater(...)`
  is the canonical bridge from the `HttpClient` completion thread.
* **Headless Pi**: JavaFX needs *some* `DISPLAY` or `WAYLAND_DISPLAY`.
  On the Pi run under Wayfire. For truly headless kiosk setups add
  `-Dglass.platform=Monocle` to the JVM flags.
* **`module-info.java` is optional** with the `javafx-maven-plugin`
  (it generates one under the hood). Add it explicitly only if you
  split the project into multi-module Maven builds.
* **Timestamps in MVP** are intentionally local-clock only. If you
  need timezone-aware values for kiosk use, switch to
  `OffsetDateTime.now(ZoneId.systemDefault())`.
