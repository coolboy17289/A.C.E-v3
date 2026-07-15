import React, { useEffect, useState } from 'react';
import { useAceStore } from '@ace/shared';

/**
 * Top bar with the system clock, search entry-point and the user profile.
 * Designed to be small enough to fit a 7" 1024x600 screen while still
 * being touchable.
 */
export const TopBar: React.FC = () => {
  const username = useAceStore((s) => s.username);
  const avatar = useAceStore((s) => s.avatar);
  const unread = useAceStore((s) =>
    s.notifications.reduce((acc, n) => acc + (n.read ? 0 : 1), 0),
  );
  const openApp = useAceStore((s) => s.openApp);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(t);
  }, []);

  const date = now.toLocaleDateString([], {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <header className="absolute top-0 left-0 right-0 h-12 z-30 px-4 flex items-center justify-between text-sm bg-gradient-to-b from-black/50 to-transparent">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 font-semibold">
          <span
            className="inline-flex w-6 h-6 rounded-md items-center justify-center text-[10px] font-bold text-white"
            style={{ background: 'linear-gradient(135deg,#60a5fa,#a78bfa)' }}
          >
            ACE
          </span>
          A.C.E OS
        </div>
        <div className="hidden md:flex ace-pill">
          <span>{date}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          aria-label="Search"
          className="ace-btn"
          onClick={() => openApp('home')}
        >
          <span aria-hidden>🔍</span>
          <span className="hidden md:inline">Search</span>
        </button>
        <div className="ace-pill font-mono tabular-nums" data-testid="topbar-clock">
          {time}
        </div>
        <NotificationsButton count={unread} />
        <div className="flex items-center gap-2 ace-pill">
          <span className="text-base" aria-hidden>{avatar}</span>
          <span className="hidden md:inline">{username}</span>
        </div>
      </div>
    </header>
  );
};

const NotificationsButton: React.FC<{ count: number }> = ({ count }) => {
  const setLauncherOpen = useAceStore((s) => s.setLauncherOpen);
  return (
    <button
      aria-label={`Notifications (${count} unread)`}
      className="ace-btn relative"
      onClick={() => setLauncherOpen(true)}
    >
      <span aria-hidden>🔔</span>
      {count > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold bg-red-500 text-white flex items-center justify-center">
          {count}
        </span>
      )}
    </button>
  );
};
