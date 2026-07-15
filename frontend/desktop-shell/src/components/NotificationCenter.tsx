import React, { useState } from 'react';
import { useAceStore } from '@ace/shared';

/**
 * Floating side panel that lists every notification. Triggered from the
 * topbar bell button when there are unread notifications. Apps can also
 * push entries that show up here via the shared store.
 */
export const NotificationCenter: React.FC = () => {
  const [open, setOpen] = useState(false);
  const notifications = useAceStore((s) => s.notifications);
  const read = useAceStore((s) => s.markRead);
  const isSubscribed = useAceStore(
    (s) => s.notifications.length > 0 && !!s.notifications.find((n) => !n.read),
  );

  React.useEffect(() => {
    if (isSubscribed) setOpen(true);
  }, [isSubscribed]);

  if (!open || notifications.length === 0) return null;

  return (
    <div className="absolute right-3 top-14 z-40 w-80 origin-top-right animate-fade-up">
      <div className="ace-card shadow-window">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Notifications</h3>
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
              className={`p-3 rounded-xl border border-white/10 ${
                n.read ? 'bg-white/[0.02]' : 'bg-ace-accent/10'
              }`}
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
