import React from 'react';
import { APP_REGISTRY, useAceStore } from '@ace/shared';

/**
 * Drawer-style launcher. Slides up from the taskbar when the A.C.E button is
 * pressed; this is the user's primary launch surface. It also doubles as a
 * notification centre when called from the top bell button.
 */
export const Launcher: React.FC = () => {
  const close = () => useAceStore.getState().setLauncherOpen(false);
  const openApp = useAceStore((s) => s.openApp);
  const setUser = useAceStore((s) => s.setUser);
  const username = useAceStore((s) => s.username);
  const avatar = useAceStore((s) => s.avatar);
  const notifications = useAceStore((s) => s.notifications);
  const markRead = useAceStore((s) => s.markRead);
  const clearNotifications = useAceStore((s) => s.clearNotifications);

  return (
    <div className="absolute inset-0 z-40 animate-fade-up">
      <button
        aria-label="Close launcher"
        onClick={close}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div className="absolute left-0 right-0 bottom-0 max-h-[80%] rounded-t-3xl border-t border-white/10 bg-[#0d1330]/95 backdrop-blur shadow-window p-5 overflow-y-auto">
        <div className="mx-auto w-12 h-1.5 rounded-full bg-white/20 mb-4" />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <section>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-lg font-semibold">All Apps</h2>
              <span className="text-xs text-ace-muted">
                {APP_REGISTRY.length} installed
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {APP_REGISTRY.map((app) => (
                <button
                  key={app.id}
                  data-testid={`launcher-${app.id}`}
                  onClick={() => {
                    openApp(app.id);
                    close();
                  }}
                  className="ace-tile p-4 text-left"
                >
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-3"
                    style={{
                      background: `linear-gradient(135deg, ${app.accent}66, ${app.accent}22)`,
                      border: `1px solid ${app.accent}55`,
                    }}
                  >
                    {app.icon}
                  </div>
                  <div className="font-semibold">{app.name}</div>
                  <div className="text-xs text-ace-muted mt-1 line-clamp-2">
                    {app.description}
                  </div>
                </button>
              ))}
            </div>
          </section>

          <aside className="space-y-4">
            <div className="ace-card">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                  style={{ background: 'linear-gradient(135deg,#60a5fa,#a78bfa)' }}
                >
                  {avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <input
                    className="ace-input"
                    value={username}
                    onChange={(e) => setUser(e.target.value, avatar)}
                    aria-label="Display name"
                  />
                </div>
              </div>
            </div>

            <div className="ace-card">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-ace-muted">
                  Notifications
                </h3>
                <button
                  className="text-xs text-ace-muted hover:text-white"
                  onClick={clearNotifications}
                >
                  Clear all
                </button>
              </div>
              {notifications.length === 0 ? (
                <p className="text-sm text-ace-muted">All quiet here.</p>
              ) : (
                <ul className="space-y-2 max-h-72 overflow-auto">
                  {notifications.map((n) => (
                    <li
                      key={n.id}
                      onClick={() => markRead(n.id)}
                      className={`p-3 rounded-xl border border-white/10 cursor-pointer ${
                        n.read ? 'bg-white/[0.02]' : 'bg-white/[0.06]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-sm font-medium">{n.title}</div>
                        {!n.read && (
                          <span className="w-2 h-2 rounded-full bg-ace-accent mt-1" />
                        )}
                      </div>
                      <p className="text-xs text-ace-muted mt-1">{n.message}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
