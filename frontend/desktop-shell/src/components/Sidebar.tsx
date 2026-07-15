import React from 'react';
import { APP_REGISTRY, Icon, classNames, useAceStore, type ActiveView, type IconName } from '@ace/shared';

interface NavItem {
  id: ActiveView;
  label: string;
  icon: IconName;
  description: string;
}

/**
 * Left rail navigation for the website-style shell.
 *
 * Layout options:
 *   - Expanded (default on >=768px viewports): 64-wide icon column +
 *     176-wide label column, brand block on top, user footer on bottom.
 *   - Collapsed (toggleable, default on mobile): 72-wide icon-only rail
 *     with inline chevron control to expand again.
 *
 * The rail renders the SAME nav items regardless of width; only the
 * label sub-line is hidden. That keeps the click target large enough
 * to remain touch-friendly on the 7-inch display.
 *
 * The bell at the bottom opens the notification popover anchored to
 * itself; the popover is rendered by `NotificationCenter` and reads the
 * same `notifCenterOpen` flag from the store.
 */
export const Sidebar: React.FC = () => {
  const active = useAceStore((s) => s.activeView);
  const setActive = useAceStore((s) => s.setActiveView);
  const collapsed = useAceStore((s) => s.sidebarCollapsed);
  const setCollapsed = useAceStore((s) => s.setSidebarCollapsed);
  const avatar = useAceStore((s) => s.avatar);
  const username = useAceStore((s) => s.username);
  const unread = useAceStore((s) =>
    s.notifications.reduce((acc, n) => acc + (n.read ? 0 : 1), 0),
  );
  const toggleNotif = useAceStore((s) => s.toggleNotifCenter);

  // Build the nav from the app registry so newly-added apps show up
  // automatically. `dashboard` is always pinned at the top.
  const navItems: NavItem[] = React.useMemo(() => {
    const fromRegistry: NavItem[] = APP_REGISTRY
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((app) => ({
        id: app.id as ActiveView,
        label: app.name,
        icon: app.id as IconName,
        description: app.description,
      }));
    return [{ id: 'dashboard', label: 'Dashboard', icon: 'home', description: 'Overview and quick actions' }, ...fromRegistry];
  }, []);

  return (
    <aside
      aria-label="Primary navigation"
      className={classNames(
        'relative z-20 flex flex-col h-full border-r backdrop-blur-md transition-[width] duration-200 ease-out',
        collapsed ? 'w-[72px]' : 'w-64',
      )}
      style={{
        borderColor: 'var(--ace-border)',
        background: 'color-mix(in srgb, var(--ace-bg-deep) 86%, transparent)',
      }}
    >
      {/* ---------- Brand header ---------- */}
      <div
        className={classNames(
          'flex items-center gap-3 px-4 py-4 border-b',
          collapsed && 'justify-center px-2',
        )}
        style={{ borderColor: 'var(--ace-border)', minHeight: 72 }}
      >
        <BrandMark />
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm leading-tight">A.C.E OS</div>
            <div className="text-[10px] text-ace-muted tracking-wider uppercase mt-0.5">Study workspace</div>
          </div>
        )}
        {!collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="w-7 h-7 rounded-md flex items-center justify-center text-ace-muted hover:bg-white/10 hover:text-white transition"
            aria-label="Collapse sidebar"
          >
            <Icon name="chevron-left" size={16} />
          </button>
        )}
      </div>

      {/* ---------- Expand toggle (only when collapsed) ---------- */}
      {collapsed && (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="mx-auto mt-3 w-8 h-8 rounded-md flex items-center justify-center text-ace-muted hover:bg-white/10 hover:text-white transition"
          aria-label="Expand sidebar"
        >
          <Icon name="chevron-right" size={16} />
        </button>
      )}

      {/* ---------- Primary nav ---------- */}
      <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto" aria-label="Apps">
        {navItems.map((item) => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActive(item.id)}
              aria-current={isActive ? 'page' : undefined}
              aria-label={collapsed ? item.label : undefined}
              title={collapsed ? item.label : undefined}
              className={classNames(
                'w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition group',
                collapsed && 'justify-center px-0',
              )}
              style={
                isActive
                  ? {
                      background: 'var(--ace-accent-soft)',
                      color: 'var(--ace-accent)',
                      border: '1px solid color-mix(in srgb, var(--ace-accent) 50%, transparent)',
                    }
                  : {
                      color: 'var(--ace-ink)',
                      background: 'transparent',
                      border: '1px solid transparent',
                    }
              }
              data-testid={`nav-${item.id}`}
            >
              <span
                className="flex items-center justify-center w-6 h-6 shrink-0"
                style={{ color: isActive ? 'var(--ace-accent)' : undefined }}
              >
                <Icon name={item.icon} size={20} />
              </span>
              {!collapsed && (
                <div className="flex-1 min-w-0 text-left">
                  <div className="leading-tight truncate">{item.label}</div>
                  <div className="text-[10px] text-ace-muted truncate group-hover:text-white/60 transition-colors">
                    {item.description}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* ---------- Footer: notifications + user ---------- */}
      <div className="px-2 py-3 border-t space-y-1" style={{ borderColor: 'var(--ace-border)' }}>
        <button
          type="button"
          onClick={toggleNotif}
          aria-haspopup="dialog"
          aria-label={`Notifications (${unread} unread)`}
          className={classNames(
            'relative w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
            collapsed && 'justify-center px-0',
          )}
          style={{ color: 'var(--ace-ink)' }}
          data-testid="bell-button"
        >
          <span className="flex items-center justify-center w-6 h-6 shrink-0">
            <Icon name="bell" size={20} style={{ color: 'var(--ace-accent)' }} />
          </span>
          {!collapsed && <span className="flex-1 text-left">Notifications</span>}
          {unread > 0 && (
            <span
              className="min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
              style={{ background: 'var(--ace-accent)' }}
              data-testid="bell-badge"
            >
              {Math.min(unread, 99)}
            </span>
          )}
        </button>

        <div
          className={classNames(
            'flex items-center gap-3 rounded-xl px-3 py-2.5',
            collapsed && 'justify-center px-0',
          )}
          title={collapsed ? `${avatar} ${username}` : undefined}
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0"
            style={{ background: 'var(--ace-accent-soft)', border: '1px solid var(--ace-border)' }}
            aria-hidden
          >
            <span aria-hidden>{avatar || '👤'}</span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{username}</div>
              <div className="text-[10px] text-ace-muted truncate">Local user</div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

/**
 * Brand mark used at the top of the sidebar — a tiny conic-gradient
 * rounded square with a centred "A" indicator. Same colour story as
 * the boot logo so the brand is consistent across boot → site shell.
 */
const BrandMark: React.FC = () => (
  <div
    className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-glow shrink-0"
    style={{
      background:
        'conic-gradient(from 0deg, #60a5fa, #a78bfa, #34d399, #60a5fa)',
    }}
    aria-hidden
  >
    <div
      className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold tracking-wider"
      style={{ background: 'var(--ace-bg-deep)' }}
    >
      A
    </div>
  </div>
);
