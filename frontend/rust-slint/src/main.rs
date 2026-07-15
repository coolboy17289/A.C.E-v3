//! A.C.E OS · Rust + Slint 1.x front-end.
//!
//! MVP: open a window, fetch `GET /api/health` and `GET /api/users/me`
//! from the existing Express backend, render the three values
//! (`Backend:`, `User:`, `Last fetched:`), allow the button to
//! re-fetch.
//!
//! The key concurrency rule documented by Slint is: **only the main
//! thread may touch Slint properties**. We side-step this by spawning
//! every blocking HTTP request on a worker thread and pumping the
//! result back to the UI via `slint::upgrade_in_event_loop`, which is
//! the official cross-thread update primitive.
//!
//! Backend base URL resolution (matches the other shells):
//!   1. `ACE_BACKEND` env var (full URL, trailing slash stripped)
//!   2. `ACE_PORT`    env var (port only -> http://127.0.0.1:<port>)
//!   3. default:                          http://127.0.0.1:4318

use std::env;
use std::time::{SystemTime, UNIX_EPOCH};

slint::include_modules!();

fn resolve_backend_base() -> String {
    if let Ok(v) = env::var("ACE_BACKEND") {
        let t = v.trim().trim_end_matches('/').to_string();
        if !t.is_empty() {
            return t;
        }
    }
    if let Ok(p) = env::var("ACE_PORT") {
        let t = p.trim();
        if !t.is_empty() {
            return format!("http://127.0.0.1:{t}");
        }
    }
    "http://127.0.0.1:4318".to_string()
}

#[derive(serde::Deserialize)]
struct Health {
    ok: bool,
    service: String,
}

#[derive(serde::Deserialize)]
struct UserMe {
    name: String,
}

fn main() -> Result<(), slint::PlatformError> {
    let backend_base = resolve_backend_base();
    let ui = AppWindow::new()?;
    let ui_handle = ui.as_weak();

    // Set the initial placeholder values explicitly so the row labels
    // (`Backend:`, `User:`) line up with their value cells even before
    // the first fetch lands. The .slint file already has these
    // defaults, but writing them here makes the contract between
    // Rust + Slint obvious when reading the source.
    ui.set_backend_text("—".into());
    ui.set_user_text("—".into());
    ui.set_fetched_text("never".into());

    ui.on_refresh_clicked({
        let backend_base = backend_base.clone();
        move || {
            let h = ui_handle.clone();
            spawn_fetch(h, backend_base.clone());
        }
    });

    // Trigger an initial fetch so the window lands with live data.
    spawn_fetch(ui.as_weak(), backend_base);

    ui.run()
}

fn spawn_fetch(ui: slint::Weak<AppWindow>, backend_base: String) {
    let _ = ui.upgrade_in_event_loop(|w| {
        w.set_loading(true);
        w.set_error_text("".into());
    });

    std::thread::spawn(move || {
        let result = fetch_now(&backend_base);
        let now = format_last_fetched(SystemTime::now());

        let _ = ui.upgrade_in_event_loop(move |w| match result {
            Ok((h, u)) => {
                w.set_backend_text(
                    format!("{} ({})", h.service, if h.ok { "ok" } else { "down" }).into(),
                );
                w.set_user_text(u.name.into());
                w.set_fetched_text(now.into());
                w.set_error_text("".into());
                w.set_loading(false);
            }
            Err(e) => {
                w.set_error_text(format!("Error: {e}").into());
                w.set_loading(false);
            }
        });
    });
}

fn format_last_fetched(t: SystemTime) -> String {
    // Local HH:MM:SS without dragging in chrono — the MVP only needs
    // a wall-clock string. Seconds-since-epoch in UTC, modulo 24h.
    let secs = t.duration_since(UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0);
    let h = (secs / 3600) % 24;
    let m = (secs / 60) % 60;
    let s = secs % 60;
    format!("{:02}:{:02}:{:02} UTC", h, m, s)
}

fn fetch_now(base: &str) -> anyhow::Result<(Health, UserMe)> {
    use anyhow::Context;

    let client = reqwest::blocking::Client::builder()
        .user_agent("ace-rust-slint/0.1.0")
        .build()
        .context("client build")?;

    let h: Health = client
        .get(format!("{base}/api/health"))
        .send()
        .context("GET /api/health")?
        .json()
        .context("parse /api/health")?;

    let u: UserMe = client
        .get(format!("{base}/api/users/me"))
        .send()
        .context("GET /api/users/me")?
        .json()
        .context("parse /api/users/me")?;

    Ok((h, u))
}
