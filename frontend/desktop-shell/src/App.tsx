import { useEffect, useState } from 'react';
import { useResolvedTheme, palette } from '@ace/design-system';
import { Dashboard } from './Dashboard';
import { SetupWizard } from './SetupWizard';

interface SetupState {
  completed: boolean;
  currentStep?: string;
  language?: string;
  wifi?: { ssid: string } | null;
  profile?: { name: string } | null;
  theme?: 'dark' | 'light';
}

type Mode = 'loading' | 'setup' | 'desktop';

/**
 * App — top-level router. Two modes:
 *
 *   1. **setup** — first-run detected (or ?setup=1 query param forces
 *      re-entry). Renderer the SetupWizard; no launch grid.
 *
 *   2. **desktop** — setup is complete. Render the Dashboard; user
 *      can tap any app tile.
 *
 * Reads setup state from `GET /api/system/setup-state`. If the endpoint
 * is unreachable (backend not yet up, or running with no DB), we default
 * to `desktop` — NOT `setup` — because a missing API is more likely
 * than a finished setup.json file. The kiosk's first-boot script seeds
 * setup.json with `{ completed: false }` to make this fail-closed.
 */
export function App() {
  const theme = useResolvedTheme();
  const p = palette(theme);
  const [mode, setMode] = useState<Mode>('loading');

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(window.location.search);
    const force = params.get('setup') === '1';
    if (force) { setMode('setup'); return; }

    (async () => {
      try {
        const res = await fetch('/api/system/setup-state');
        if (!res.ok) { if (!cancelled) setMode('desktop'); return; }
        const data = (await res.json()) as SetupState;
        if (!cancelled) setMode(data.completed ? 'desktop' : 'setup');
      } catch {
        // Backend not yet online, or network blip. Fail CLOSED on
        // desktop — the user sees the launcher rather than being
        // ambushed by a wizard on every refresh handoff.
        if (!cancelled) setMode('desktop');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (mode === 'loading') {
    return (
      <div style={{
        height: '100%', display: 'grid', placeItems: 'center',
        background: p.bg, color: p.textMuted, fontSize: 32,
      }}>
        A.C.E
      </div>
    );
  }

  return mode === 'setup' ? <SetupWizard onComplete={() => setMode('desktop')} /> : <Dashboard />;
}
