import React from 'react';
import { APP_REGISTRY, useAceStore, type AppId } from '@ace/shared';

/**
 * The bottom taskbar. Doubles as the always-visible dock for pinned apps
 * and as the launchpad. It is intentionally slim so a 7" screen still has
 * plenty of vertical room for open windows.
 */
export const Taskbar: React.FC = () => {
  const windows = useAceStore((s) => s.windows);
  const openApp = useAceStore((s) => s.openApp);
  const minimizeWindow = useAceStore((s) => s.minimizeWindow);
  const setLauncherOpen = useAceStore((s) => s.setLauncherOpen);

  const pinned: AppId[] = ['home', 'tasks', 'focus', 'planner', 'ai', 'statistics', 'subjects'];
  const openByApp = new Map(windows.map((w) => [w.appId, w.id]));

  return (
    <footer className="absolute left-0 right-0 bottom-0 h-16 z-30 flex items-center justify-between px-3 bg-gradient-to-t from-black/70 via-black/40 to-transparent">
      <div className="flex items-center gap-2">
        <button
          aria-label="Open launcher"
          data-testid="launcher-button"
          className="w-12 h-12 rounded-2xl border border-white/15 bg-white/10 flex items-center justify-center text-xl active:scale-95 transition"
          onClick={() => setLauncherOpen(true)}
          style={{ background: 'linear-gradient(135deg,#60a5fa,#a78bfa)' }}
        >
          <span aria-hidden>🟦</span>
        </button>
        {pinned.map((id) => {
          const meta = APP_REGISTRY.find((a) => a.id === id)!;
          const winId = openByApp.get(id);
          return (
            <button
              key={id}
              aria-label={`Open ${meta.name}`}
              data-testid={`dock-${id}`}
              className="relative w-12 h-12 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center text-xl active:scale-95 transition hover:bg-white/10"
              onClick={() => {
                if (winId) minimizeWindow(winId);
                openApp(id);
              }}
              style={{
                background: openByApp.has(id)
                  ? `linear-gradient(135deg, ${meta.accent}88, ${meta.accent}33)`
                  : undefined,
              }}
            >
              <span aria-hidden>{meta.icon}</span>
              {openByApp.has(id) && (
                <span
                  aria-hidden
                  className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
                  style={{ background: meta.accent }}
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
  <div className="flex items-center gap-3 text-xs text-ace-muted">
    <span className="ace-pill">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-soft" />
      Synced
    </span>
    <span className="ace-pill">📡 Wi-Fi</span>
    <span className="ace-pill">🔋 92%</span>
  </div>
);
