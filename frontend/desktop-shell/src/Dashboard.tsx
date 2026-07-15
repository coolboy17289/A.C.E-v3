import { useEffect, useMemo, useState, Suspense, lazy, type ComponentType } from 'react';
import {
  TouchButton, TouchCard, palette,
  type ThemeMode, useResolvedTheme,
} from '@ace/design-system';
import {
  APP_REGISTRY, getApp, rankApps, recordLaunch,
  type ContextSignals,
} from '@ace/shared';
import { api } from '@ace/shared';

/**
 * Dashboard — the always-on kiosk view.
 *
 *   Header   — logo + focused app name
 *   Body     — the currently open app (one at a time, kiosk paradigm)
 *   Nav strip — ranked launcher tiles
 *
 * The launcher uses the smart launcher in `@ace/shared/launcher`:
 * frequency + recency + time-of-day scoring, with a small context boost
 * (e.g. Focus gets nudged when there are open tasks, Planner when an
 * event starts within the hour). `home` is always pinned to index 0.
 *
 * Apps are loaded via `React.lazy` with `Suspense` so each app's
 * Vite chunk only downloads when first opened.
 */
const APP_COMPONENTS: Record<string, ComponentType<{ theme?: ThemeMode }>> = {
  home:       lazy(() => import('@ace/app-home').then((m) => ({ default: m.HomeApp }))),
  tasks:      lazy(() => import('@ace/app-tasks').then((m) => ({ default: m.TasksApp }))),
  focus:      lazy(() => import('@ace/app-focus').then((m) => ({ default: m.FocusApp }))),
  subjects:   lazy(() => import('@ace/app-subjects').then((m) => ({ default: m.SubjectsApp }))),
  planner:    lazy(() => import('@ace/app-planner').then((m) => ({ default: m.PlannerApp }))),
  notes:      lazy(() => import('@ace/app-notes').then((m) => ({ default: m.NotesApp }))),
  statistics: lazy(() => import('@ace/app-statistics').then((m) => ({ default: m.StatisticsApp }))),
  settings:   lazy(() => import('@ace/app-settings').then((m) => ({ default: m.SettingsApp }))),
};

function emptyContext(): ContextSignals {
  return { openTaskCount: 0, nextEventSoon: false, recentlyOpened: false };
}

export function Dashboard() {
  const theme = useResolvedTheme();
  const p = palette(theme);
  const [active, setActive] = useState<string>('home');
  const [tick, setTick] = useState(0); // forces re-rank on minute boundaries
  const [context, setContext] = useState<ContextSignals>(emptyContext());

  // Re-rank every minute so the time-of-day component refreshes.
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  // Pull a tiny bit of live data to feed the context boost.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [tasksRes, calRes] = await Promise.allSettled([
          api.tasks.list(),
          api.calendar.list(),
        ]);
        if (cancelled) return;
        const openTaskCount =
          tasksRes.status === 'fulfilled'
            ? tasksRes.value.filter((t) => !t.completed).length
            : 0;
        const now = Date.now();
        const horizon = now + 60 * 60_000;
        const nextEventSoon =
          calRes.status === 'fulfilled'
            ? calRes.value.some((e) => {
                const s = Date.parse(e.start);
                return Number.isFinite(s) && s >= now && s <= horizon;
              })
            : false;
        setContext({ openTaskCount, nextEventSoon, recentlyOpened: true });
      } catch {
        if (!cancelled) setContext(emptyContext());
      }
    })();
    return () => { cancelled = true; };
  }, [tick]);

  const finalRanked = useMemo(
    () => rankApps(APP_REGISTRY, Date.now(), context),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick, context.openTaskCount, context.nextEventSoon, context.recentlyOpened],
  );

  const manifest = getApp(active);
  const AppComponent = APP_COMPONENTS[active];

  function open(id: string) {
    recordLaunch(id);
    setActive(id);
    setTick((x) => x + 1);
  }

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: p.bg, color: p.text,
      fontFamily: 'system-ui, sans-serif',
    }}>
      {/* Header — slim strip, contains app title + home button. */}
      <header style={{
        background: manifest?.accent ? `${manifest.accent}22` : p.bgRaised,
        borderBottom: `2px solid ${manifest?.accent ?? p.border}`,
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 16,
        minHeight: 64,
      }}>
        <TouchButton
          theme={theme} size="sm" variant="ghost" icon="⌂"
          onClick={() => open('home')}
          aria-label="Back to launcher"
        >
          A.C.E
        </TouchButton>
        <div style={{
          flex: 1, fontSize: 24, fontWeight: 700,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 28 }}>{manifest?.icon ?? '•'}</span>
          {manifest?.name ?? 'A.C.E'}
        </div>
      </header>

      {/* Body — the active app's content. */}
      <main style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'auto' }}>
        <Suspense fallback={
          <div style={{
            height: '100%', display: 'grid', placeItems: 'center',
            color: p.textMuted, fontSize: 24,
          }}>
            Loading {manifest?.name}…
          </div>
        }>
          {AppComponent ? <AppComponent theme={theme} /> : null}
        </Suspense>
      </main>

      {/* Smart launcher strip — ranked tiles, horizontal scroll if wide. */}
      <nav style={{
        background: p.bgRaised, borderTop: `1px solid ${p.border}`,
        padding: '8px 12px',
        display: 'flex', gap: 8,
        overflowX: 'auto',
        minHeight: 80,
      }}>
        {finalRanked.map((s) => (
          <TouchButton
            key={s.app.id}
            theme={theme}
            size="sm"
            variant={active === s.app.id ? 'primary' : 'ghost'}
            icon={s.app.icon}
            onClick={() => open(s.app.id)}
            aria-label={`Open ${s.app.name}`}
            aria-current={active === s.app.id ? 'page' : undefined}
            data-score={s.score.toFixed(2)}
          >
            <div style={{ fontSize: 14, marginTop: 2 }}>{s.app.name}</div>
          </TouchButton>
        ))}
      </nav>
    </div>
  );
}
