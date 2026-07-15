//! A.C.E OS · Rust + Iced (v0.13) front-end.
//!
//! MVP scope: open a window, fetch `GET /api/health` and
//! `GET /api/users/me` from the A.C.E backend, render the three
//! values (Backend, User, Last fetched), and allow a Refresh button
//! to re-fetch.
//!
//! Architecture is the canonical Iced 0.13 split:
//!   - `Message`       — every event the runtime can dispatch
//!   - `App::update`   — pure state transition, returns `Task<Message>`
//!   - `App::view`     — pure rendering of `&self`
//!   - `fetch`         — async side-effect wrapped by `Task::perform`
//!
//! Async work does **not** happen inside `update()` directly — it is
//! spawned via `Task::perform`, and the resolved future is funneled
//! back into `update()` as a `Message::Fetched` variant. This guarantees
//! the UI is always derived from a state value (no torn renders).
//!
//! Backend base URL resolution (matches the other shells):
//!   1. `ACE_BACKEND` env var (full URL, trailing slash stripped)
//!   2. `ACE_PORT`    env var (port only -> http://127.0.0.1:<port>)
//!   3. default:                          http://127.0.0.1:4318

use std::env;
use std::time::SystemTime;

use iced::widget::{button, column, container, row, text};
use iced::{Element, Fill, Task};
use serde::Deserialize;

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

#[derive(Debug, Clone, Deserialize)]
struct Health {
    ok: bool,
    service: String,
}

#[derive(Debug, Clone, Deserialize)]
struct UserMe {
    name: String,
}

#[derive(Debug, Clone)]
enum Message {
    Refresh,
    Fetched(Result<(Health, UserMe), String>),
}

struct App {
    backend_base: String,
    health: Option<Health>,
    user: Option<UserMe>,
    fetched_at: Option<SystemTime>,
    loading: bool,
    error: Option<String>,
    /// True once at least one HTTP call has produced a parsed
    /// payload. Used to gate the "Backend: offline" wording in the
    /// initial-failure path so we don't show "offline" after a
    /// successful first fetch that subsequently 500s.
    ever_succeeded: bool,
}

impl Default for App {
    fn default() -> Self {
        Self {
            backend_base: resolve_backend_base(),
            health: None,
            user: None,
            fetched_at: None,
            loading: false,
            error: None,
            ever_succeeded: false,
        }
    }
}

impl App {
    fn update(&mut self, msg: Message) -> Task<Message> {
        match msg {
            Message::Refresh => {
                self.loading = true;
                self.error = None;
                Task::perform(
                    fetch(self.backend_base.clone()),
                    Message::Fetched,
                )
            }
            Message::Fetched(Ok((h, u))) => {
                self.health = Some(h);
                self.user = Some(u);
                self.fetched_at = Some(SystemTime::now());
                self.loading = false;
                self.ever_succeeded = true;
                Task::none()
            }
            Message::Fetched(Err(e)) => {
                self.loading = false;
                self.error = Some(e);
                Task::none()
            }
        }
    }

    fn view(&self) -> Element<Message> {
        // Backend label: ok|down when we have data, offline when we've
        // never had a successful fetch, "—" before the first call.
        let backend = if let Some(h) = self.health.as_ref() {
            if h.ok {
                format!("{} (ok)", h.service)
            } else {
                format!("{} (down)", h.service)
            }
        } else if self.error.is_some() && !self.ever_succeeded {
            "offline".to_string()
        } else {
            "—".to_string()
        };

        let username = self
            .user
            .as_ref()
            .map(|u| u.name.clone())
            .unwrap_or_else(|| {
                if self.error.is_some() && !self.ever_succeeded {
                    "offline".to_string()
                } else {
                    "—".to_string()
                }
            });

        let fetched = match self.fetched_at {
            Some(t) => match t.duration_since(SystemTime::UNIX_EPOCH) {
                Ok(d) => format_last_fetched(d.as_secs()),
                Err(_) => "—".to_string(),
            },
            None => "never".to_string(),
        };

        let err_line = self
            .error
            .as_ref()
            .map(|e| text(format!("Error: {e}")).color(iced::Color::from_rgb(0.96, 0.55, 0.55)));

        let refresh_label = if self.loading { "Refreshing…" } else { "Refresh" };

        let body = column![
            text("A.C.E OS").size(32),
            text(format!("Rust + Iced shell · v0.13 · {}", self.backend_base)).size(11),
            row![kv("Backend", &backend)].spacing(8),
            row![kv("User", &username)].spacing(8),
            row![kv("Last fetched", &fetched)].spacing(8),
            button(text(refresh_label).center())
                .padding([10, 22])
                .on_press_maybe(if self.loading { None } else { Some(Message::Refresh) }),
        ]
        .spacing(14)
        .max_width(540);

        let card = container(body)
            .padding(24)
            .style(|_t| iced::widget::container::Style {
                background: Some(iced::Color::from_rgba(1.0, 1.0, 1.0, 0.04).into()),
                border: iced::Border {
                    color: iced::Color::from_rgba(1.0, 1.0, 1.0, 0.10),
                    width: 1.0,
                    radius: 16.0.into(),
                },
                ..Default::default()
            });

        let content: Element<Message> = if let Some(err) = err_line {
            column![card, err].spacing(8).into()
        } else {
            card.into()
        };

        container(content)
            .padding(32)
            .center_x(Fill)
            .center_y(Fill)
            .into()
    }
}

fn format_last_fetched(secs: u64) -> String {
    // Local HH:MM:SS without dragging in chrono — the MVP only needs
    // a wall-clock string. Seconds-since-epoch in UTC converted to
    // HH:MM:SS by simple modular arithmetic. Kiosk users see a
    // timestamp that is correct to within a few hours of their wall
    // clock; precise timezone handling is a follow-up.
    let h = (secs / 3600) % 24;
    let m = (secs / 60) % 60;
    let s = secs % 60;
    format!("{:02}:{:02}:{:02} UTC", h, m, s)
}

fn kv(label: &str, value: &str) -> Element<'static, Message> {
    row![
        text(label.to_string()).size(11).color(iced::Color::from_rgb(0.58, 0.65, 0.78)),
        text(value.to_string()).size(15),
    ]
    .spacing(10)
    .into()
}

async fn fetch(base: String) -> Result<(Health, UserMe), String> {
    let client = reqwest::Client::builder()
        .user_agent("ace-rust-iced/0.1.0")
        .build()
        .map_err(|e| e.to_string())?;

    let h: Health = client
        .get(format!("{base}/api/health"))
        .send()
        .await
        .map_err(|e| format!("GET /api/health: {e}"))?
        .json()
        .await
        .map_err(|e| format!("parse /api/health: {e}"))?;

    let u: UserMe = client
        .get(format!("{base}/api/users/me"))
        .send()
        .await
        .map_err(|e| format!("GET /api/users/me: {e}"))?
        .json()
        .await
        .map_err(|e| format!("parse /api/users/me: {e}"))?;

    Ok((h, u))
}

fn main() -> iced::Result {
    // Iced v0.13's `application` returns a `Boot` that we resolve by
    // giving it both the initial state and an initial Task — the
    // `Task::done(Message::Refresh)` triggers the first fetch without
    // requiring a UI button press.
    iced::application("A.C.E OS · Iced", App::update, App::view).run_with(|| {
        (App::default(), Task::done(Message::Refresh))
    })
}
