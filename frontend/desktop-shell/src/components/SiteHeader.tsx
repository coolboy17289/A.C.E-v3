import React, { useEffect, useState } from 'react';
import { useAceStore, type ActiveView } from '@ace/shared';

interface ViewMeta {
  title: string;
  subtitle: string;
}

const VIEW_META: Record<ActiveView, ViewMeta> = {
  dashboard: {
    title: 'Dashboard',
    subtitle: 'Today\u2019s overview and quick actions.',
  },
  ai: {
    title: 'AI Tutor',
    subtitle: 'Ask anything about your study topics. Answers are study-aware.',
  },
  settings: {
    title: 'Settings',
    subtitle: 'Theme, wallpaper, profile and system preferences.',
  },
};

/**
 * Slim header that sits above the active view. Replaces the OS-style
 * TopBar \u2014 no window controls, no app launcher button (those belong to
 * the Sidebar now). Shows the active view's title + a clock pill so the
 * site still feels like a real-time product even though we removed the
 * kiosk-mode timers.
 */
export const SiteHeader: React.FC = () => {
  const active = useAceStore((s) => s.activeView);
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    // Refresh every 30s \u2014 the seconds never matter for the header label
    // so a 30-second cadence avoids waking the component on every tick.
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const meta = VIEW_META[active] ?? VIEW_META.dashboard;
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const date = now.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <header
      className="flex items-center justify-between gap-4 px-5 sm:px-8 py-4 border-b backdrop-blur-sm flex-none"
      style={{
        borderColor: 'var(--ace-border)',
        background: 'color-mix(in srgb, var(--ace-bg-deep) 60%, transparent)',
      }}
    >
      <div className="min-w-0">
        <h1 className="text-lg sm:text-xl font-semibold tracking-tight truncate">
          {meta.title}
        </h1>
        <p className="text-xs text-ace-muted truncate">{meta.subtitle}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div
          className="ace-pill font-mono tabular-nums hidden sm:flex items-center gap-2"
          data-testid="site-clock"
          title="Local time"
        >
          <span>{time}</span>
          <span className="text-ace-muted/70">\u00b7</span>
          <span className="text-ace-muted">{date}</span>
        </div>
      </div>
    </header>
  );
};
