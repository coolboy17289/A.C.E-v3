import React from 'react';
import { APP_REGISTRY, AppTile, Icon, useAceStore, type AppId } from '@ace/shared';

/**
 * The bottom taskbar. Doubles as the always-visible dock for pinned apps
 * and as the launchpad. Each pinned app is rendered with the AppTile
 * component so the iconography matches the launcher.
 */
export const Taskbar: React.FC = () => {
  const windows = useAceStore((s) => s.windows);
  const openApp = useAceStore((s) => s.openApp);
  const minimizeWindow = useAceStore((s) => s.minimizeWindow);
  const setLauncherOpen = useAceStore((s) => s.setLauncherOpen);

  // Only apps currently in the registry show up as pinned tiles.
  // We pass `pinned = []` here so the dock is intentionally minimal —
  // open the launcher for the full (currently-shipping) app list.
  const pinned: AppId[] = [];
  const openByApp = new Map(windows.map((w) => [w.appId, w.id]));

  return (
    <footer className="absolute left-0 right-0 bottom-0 h-16 z-30 flex items-center justify-between px-3 bg-gradient-to-t from-black/70 via-black/40 to-transparent">
      <div className="flex items-center gap-2">
        <button
          aria-label="Open launcher"
          data-testid="launcher-button"
          className="w-12 h-12 rounded-2xl flex items-center justify-center active:scale-95 transition hover:brightness-110"
          style={{
            background: 'linear-gradient(135deg, var(--ace-accent), color-mix(in srgb, var(--ace-accent) 60%, #a78bfa))',
            boxShadow: '0 6px 14px color-mix(in srgb, var(--ace-accent) 40%, transparent)',
          }}
          onClick={() => setLauncherOpen(true)}
        >
          <Icon name="palette" size={22} style={{ color: 'white', stroke: 'white' }} />
        </button>
        {pinned.map((id) => {
          const meta = APP_REGISTRY.find((a) => a.id === id)!;
          const winId = openByApp.get(id);
          const isOpen = openByApp.has(id);
          return (
            <button
              key={id}
              aria-label={`Open ${meta.name}`}
              data-testid={`dock-${id}`}
              className="relative w-12 h-12 rounded-2xl active:scale-95 transition flex items-center justify-center"
              onClick={() => { if (winId) minimizeWindow(winId); openApp(id); }}
              style={isOpen
                ? { background: 'var(--ace-accent-soft)', boxShadow: 'inset 0 0 0 1px var(--ace-accent-strong)' }
                : { background: 'rgba(255,255,255,0.06)', border: '1px solid var(--ace-border)' }}
              title={meta.name}
            >
              <AppTile appId={meta.id} accent={meta.accent} size={36} />
              {isOpen && (
                <span
                  aria-hidden
                  className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
                  style={{ background: 'var(--ace-accent-strong)' }}
                />
              )}
            </button>
          );
        })}
      </div>

      <SystemStatus />
    </footer>
  );
};

const SystemStatus: React.FC = () => (
  <div className="flex items-center gap-2 text-xs">
    <span className="ace-pill">
      <span
        className="w-1.5 h-1.5 rounded-full animate-pulse-soft"
        style={{ background: 'var(--ace-accent)' }}
      />
      Synced
    </span>
    <span className="ace-pill text-ace-muted">
      <Icon name="wifi" size={12} />
      Wi-Fi
    </span>
    <span className="ace-pill text-ace-muted">
      <Icon name="battery" size={12} />
      92%
    </span>
  </div>
);
