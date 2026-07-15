import React, { useEffect, useState } from 'react';
import { TouchButton, TouchCard, palette, ThemeProvider, useResolvedTheme, type ThemeMode } from '@ace/design-system';
import { api, getApp, APP_REGISTRY, type UserProfile, type Task, type CalendarEvent } from '@ace/shared';

/**
 * Home dashboard app. Touch-first design (8px grid, 64px minimum targets,
 * 18px+ typography). Rendering is split into three rows:
 *
 *   1. Greeting + clock tile (large, single touch to dismiss).
 *   2. Today summary tiles: open tasks, next class, focus minutes.
 *   3. App launcher grid: every entry from the apps registry renders
 *      here as a touch tile so primary navigation is one tap away.
 *
 * Data sources (read-only on launch, refresh button rebinds):
 *   GET /api/users/me, /api/tasks, /api/calendar, /api/focus.
 */

// Local flex helper — TouchRow is a list-row widget, not a container.
function Flex({ gap = 0, wrap = false, children, style }: {
  gap?: number; wrap?: boolean; children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return <div style={{ display: "flex", gap, flexWrap: wrap ? "wrap" : "nowrap", ...style }}>{children}</div>;
}

export interface HomeAppProps {
  /** Optional callback when an app tile is tapped — desktop-shell
   *  opens the corresponding window. If absent, taps just log. */
  onOpenApp?: (appId: string) => void;
  /** Optional theme override. */
  theme?: ThemeMode;
}

export function HomeApp(props: HomeAppProps) {
  if (props.theme) {
    return <ThemeProvider initialTheme={props.theme}><HomeInner {...props} /></ThemeProvider>;
  }
  return <HomeInner {...props} />;
}

function HomeInner({ onOpenApp }: HomeAppProps) {
  const [me, setMe] = useState<UserProfile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [now, setNow] = useState(new Date());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [u, t, e] = await Promise.all([
          api.getUser().catch(() => null),
          api.listTasks().catch(() => []),
          api.listEvents().catch(() => []),
        ]);
        if (cancelled) return;
        setMe(u);
        setTasks(t);
        setEvents(e);
      } catch (err) {
        if (!cancelled) setError(String(err));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const theme = (me?.preferences.theme === 'light' ? 'light' : 'dark') as 'dark' | 'light';
  const p = palette(theme);

  const open = tasks.filter((t) => !t.completed);
  const nextEvent = events
    .filter((e) => new Date(e.start).getTime() > Date.now() - 60 * 60 * 1000)
    .sort((a, b) => +new Date(a.start) - +new Date(b.start))[0];

  const greeting = me?.name ? `Hi, ${me.name}` : 'Welcome';

  return (
    <div style={{
      padding: 24,
      background: p.bg,
      color: p.text,
      minHeight: '100%',
      fontFamily: 'system-ui, sans-serif',
    }}>
      {/* Row 1 — greeting & clock */}
      <Flex gap={16} wrap>
        <TouchCard theme={theme} style={{ flex: 2, minWidth: 360 }}>
          <div style={{ fontSize: 32, fontWeight: 800 }}>{greeting}</div>
          <div style={{ fontSize: 24, color: p.textMuted, marginTop: 8 }}>
            {now.toLocaleString(undefined, {
              weekday: 'long', month: 'long', day: 'numeric',
              hour: 'numeric', minute: '2-digit',
            })}
          </div>
          {error && (
            <div style={{ marginTop: 12, color: p.danger, fontSize: 16 }}>
              ⚠ {error}
            </div>
          )}
        </TouchCard>
        <TouchCard theme={theme} variant="accent" style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 18, color: p.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>
            Open tasks
          </div>
          <div style={{ fontSize: 72, fontWeight: 900, lineHeight: 1, marginTop: 8 }}>
            {open.length}
          </div>
          <div style={{ fontSize: 16, color: p.textMuted, marginTop: 4 }}>
            tap Tasks to plan
          </div>
        </TouchCard>
      </Flex>

      {/* Row 2 — quick actions */}
      <Flex gap={16} wrap style={{ marginTop: 16 }}>
        <TouchButton
          theme={theme}
          size="lg"
          variant="primary"
          icon="▶️"
          onClick={() => onOpenApp?.('focus')}
          style={{ flex: 1, minWidth: 240 }}
        >
          Start focus
        </TouchButton>
        <TouchButton
          theme={theme}
          size="lg"
          variant="secondary"
          icon="✅"
          onClick={() => onOpenApp?.('tasks')}
          style={{ flex: 1, minWidth: 240 }}
        >
          Add a task
        </TouchButton>
      </Flex>

      {/* Row 3 — launch grid */}
      <div style={{
        fontSize: 24, fontWeight: 700, marginTop: 32, marginBottom: 12,
      }}>
        Apps
      </div>
      <Flex gap={16} wrap>
        {APP_REGISTRY.map((app) => {
          const meta = getApp(app.id);
          return (
            <TouchButton
              key={app.id}
              theme={theme}
              size="lg"
              variant="ghost"
              icon={app.icon}
              onClick={() => onOpenApp?.(app.id)}
              style={{
                flex: '1 1 220px',
                minWidth: 220,
                background: meta?.accent ? `${meta.accent}22` : p.bgRaised,
                color: p.text,
                flexDirection: 'column',
                gap: 8,
                padding: '24px 16px',
              }}
            >
              <div style={{ fontSize: 28, fontWeight: 700 }}>
                {app.name}
              </div>
              <div style={{ fontSize: 16, color: p.textMuted, textAlign: 'center' }}>
                {app.description}
              </div>
            </TouchButton>
          );
        })}
      </Flex>

      {/* Row 4 — next class peek */}
      {nextEvent && (
        <TouchCard theme={theme} style={{ marginTop: 24 }}>
          <div style={{ fontSize: 18, color: p.textMuted }}>Coming up</div>
          <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>
            {nextEvent.title}
          </div>
          <div style={{ fontSize: 18, marginTop: 4 }}>
            {new Date(nextEvent.start).toLocaleString(undefined, {
              hour: 'numeric', minute: '2-digit',
            })}
            {nextEvent.location ? ` · ${nextEvent.location}` : ''}
          </div>
        </TouchCard>
      )}
    </div>
  );
}

// Re-export under the package-flavoured name so consumers can pick whichever
// matches their import style. (Helpful for the desktop-shell WindowManager.)
export { HomeApp as default };
