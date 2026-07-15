import React from 'react';
import { useAceStore } from '@ace/shared';
import { BootScreen } from './components/BootScreen';
import { TopBar } from './components/TopBar';
import { Taskbar } from './components/Taskbar';
import { Launcher } from './components/Launcher';
import { WindowManager } from './components/WindowManager';
import { NotificationCenter } from './components/NotificationCenter';
import { ToastStack } from './components/ToastStack';

export function App() {
  const booting = useAceStore((s) => s.booting);
  const launcherOpen = useAceStore((s) => s.launcherOpen);

  return (
    <div className="relative w-full h-full overflow-hidden bg-ace-bg text-ace-ink">
      {/* Layered desktop composition: background -> windows -> chrome */}
      <Wallpaper />
      <WindowManager />
      <NotificationCenter />
      <ToastStack />
      <TopBar />
      <Taskbar />
      {launcherOpen && <Launcher />}

      {/* Initial shroud shown until the user dismisses the boot animation. */}
      {booting && <BootScreen />}
    </div>
  );
}

/**
 * Animated wallpaper used as the desktop background. A radial gradient
 * gives the device some visual personality even with no open windows.
 * Kept lightweight to respect the Pi's GPU.
 */
const Wallpaper: React.FC = React.memo(() => (
  <div
    aria-hidden
    className="absolute inset-0 -z-10"
    style={{
      background:
        'radial-gradient(1200px 600px at 20% 0%, rgba(96,165,250,0.18), transparent 60%),' +
        'radial-gradient(1000px 500px at 90% 110%, rgba(167,139,250,0.18), transparent 60%),' +
        'linear-gradient(180deg,#0b1020 0%, #0d1330 100%)',
    }}
  >
    <div
      className="absolute inset-0 opacity-[0.035]"
      style={{
        backgroundImage:
          'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px),' +
          'linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
      }}
    />
  </div>
));
Wallpaper.displayName = 'Wallpaper';
