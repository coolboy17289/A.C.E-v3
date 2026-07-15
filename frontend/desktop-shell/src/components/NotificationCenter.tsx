import React, { useState } from 'react';
import { Icon, useAceStore } from '@ace/shared';

/**
 * Floating side panel that lists every notification. Triggered from the
 * topbar bell button when there are unread notifications.
 */
export const NotificationCenter: React.FC = () => {
  const [open, setOpen] = useState(false);
  const notifications = useAceStore((s) => s.notifications);
  const read = useAceStore((s) => s.markRead);
  const hasUnread = useAceStore(
    (s) => s.notifications.length > 0 && !!s.notifications.find((n) => !n.read),
  );

  React.useEffect(() => {
    if (hasUnread) setOpen(true);
  }, [hasUnread]);

  if (!open || notifications.length === 0) return null;

  return (
    <div className="absolute right-3 top-14 z-40 w-80 origin-top-right animate-fade-up">
      <div className="ace-card" style={{ boxShadow: 'var(--ace-shadow)' }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2" style={{ color: 'var(--ace-accent)' }}>
            <Icon name="bell" size={16} />
            <h3 className="font-semibold text-ace-ink">Notifications</h3>
          </div>
          <button
            className="text-xs text-ace-muted hover:text-white"
            onClick={() => setOpen(false)}
          >
            Hide
          </button>
        </div>
        <ul className="space-y-2 max-h-96 overflow-auto">
          {notifications.map((n) => (
            <li
              key={n.id}
              className="p-3 rounded-xl border cursor-pointer"
              style={{
                background: n.read ? 'rgba(255,255,255,0.02)' : 'var(--ace-accent-soft)',
                borderColor: n.read ? 'var(--ace-border)' : 'color-mix(in srgb, var(--ace-accent) 35%, transparent)',
              }}
              onClick={() => read(n.id)}
            >
              <div className="font-medium text-sm">{n.title}</div>
              <p className="text-xs text-ace-muted mt-1">{n.message}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
