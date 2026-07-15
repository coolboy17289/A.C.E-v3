import { useEffect, useState } from 'react';
import {
  TouchButton, TouchCard,
  ThemeProvider, palette, useResolvedTheme,
  type ThemeMode,
} from '@ace/design-system';
import { api, type UserProfile, type DeviceInfo } from '@ace/shared';

/**
 * Touch-first Settings app. Tabs are vertical scroll on 800×480; no
 * nav rail (the kiosk device is too narrow for one). Sections:
 *
 *   1. Account (display name).
 *   2. Theme (dark / light).
 *   3. Network (read-only device info; router would be configured by
 *      first-setup wizard).
 *   4. System (SHUTDOWN / RESTART — guarded server-side).
 *   5. Recovery (Reset Setup — re-runs the first-setup wizard).
 */
export interface SettingsAppProps {
  theme?: ThemeMode;
}

export function SettingsApp({ theme: themeProp }: SettingsAppProps) {
  return (
    <ThemeProvider initialTheme={themeProp}>
      <SettingsInner />
    </ThemeProvider>
  );
}

function SettingsInner() {
  const theme = useResolvedTheme();
  const p = palette(theme);
  const [me, setMe] = useState<UserProfile | null>(null);
  const [device, setDevice] = useState<DeviceInfo | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([
      api.getUser().then(setMe).catch((e) => setError(String(e))),
      api.getDevice().then(setDevice).catch(() => {}),
    ]);
  }, []);

  async function patchMe(patch: Partial<UserProfile>) {
    try {
      const updated = await api.updateUser(patch);
      setMe(updated);
      setSaved('Saved');
      setTimeout(() => setSaved(null), 1500);
    } catch (e) {
      setError(String(e));
    }
  }

  async function shutdown() {
    if (!confirm('Shut down? (backend flag ACE_ALLOW_POWER must be enabled)')) return;
    try { await api.triggerShutdown(); } catch (e) { setError(String(e)); }
  }
  async function restart() {
    if (!confirm('Restart? (backend flag ACE_ALLOW_POWER must be enabled)')) return;
    try { await api.triggerRestart(); } catch (e) { setError(String(e)); }
  }

  async function resetSetup() {
    if (!confirm('Reset setup wizard? You\'ll see the first-setup flow again.')) return;
    try {
      await fetch('/api/system/setup-reset', { method: 'POST' });
      window.location.reload();
    } catch (e) { setError(String(e)); }
  }

  return (
    <div style={{
      padding: 24, background: p.bg, color: p.text, minHeight: '100%',
      fontFamily: 'system-ui, sans-serif',
      display: 'flex', flexDirection: 'column', gap: 16,
      maxWidth: 800,
    }}>
      <div style={{ fontSize: 32, fontWeight: 800 }}>Settings</div>

      {error && <div style={{ color: p.danger, fontSize: 16 }}>⚠ {error}</div>}
      {saved && <div style={{ color: p.success ?? p.primary, fontSize: 16 }}>✓ {saved}</div>}

      <Section title="Account">
        <TouchCard theme={theme}>
          <Label text="Display name" />
          <DisplayInput
            initial={me?.name ?? ''}
            onSubmit={(v) => void patchMe({ name: v })}
          />
        </TouchCard>
      </Section>

      <Section title="Theme">
        <Row>
          <TouchButton
            theme={theme} size="md" variant={(me?.preferences.theme ?? 'dark') === 'dark' ? 'primary' : 'secondary'}
            onClick={() => void patchMe({
              // We cast to the UserProfile partial form because
              // `preferences` is a required sub-object but this is an
              // incremental update — the backend's PATCH merges over
              // server-side state and any missing fields default to
              // their prior values.
              preferences: { ...(me?.preferences ?? defaultPrefs()), theme: 'dark' },
            } as Partial<UserProfile>)}
          >Dark</TouchButton>
          <TouchButton
            theme={theme} size="md" variant={(me?.preferences.theme ?? 'dark') === 'light' ? 'primary' : 'secondary'}
            onClick={() => void patchMe({
              preferences: { ...(me?.preferences ?? defaultPrefs()), theme: 'light' },
            } as Partial<UserProfile>)}
          >Light</TouchButton>
        </Row>
      </Section>

      <Section title="Network">
        <TouchCard theme={theme}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <KV k="Hostname" v={device?.hostname ?? '—'} />
            <KV k="IP" v={device?.ip ?? '—'} />
            <KV k="Model" v={device?.model ?? '—'} />
            <KV k="Kernel" v={device?.kernel ?? '—'} />
          </div>
        </TouchCard>
      </Section>

      <Section title="System">
        <Row>
          <TouchButton theme={theme} size="lg" variant="danger" onClick={() => void shutdown()}>
            ⏻ Shutdown
          </TouchButton>
          <TouchButton theme={theme} size="lg" variant="secondary" onClick={() => void restart()}>
            ⟲ Restart
          </TouchButton>
        </Row>
      </Section>

      <Section title="Recovery">
        <TouchCard theme={theme}>
          <div style={{ fontSize: 18, color: p.textMuted }}>
            If the first-setup wizard got stuck or showed the wrong
            language, "Reset Setup" wipes <code>/var/lib/ace/setup.json</code>
            and reloads the app — you'll see Language → Network → Profile again.
          </div>
          <div style={{ marginTop: 12 }}>
            <TouchButton theme={theme} size="md" variant="danger" onClick={() => void resetSetup()}>
              Reset setup
            </TouchButton>
          </div>
        </TouchCard>
      </Section>
    </div>
  );
}

function defaultPrefs(): UserProfile['preferences'] {
  return {
    theme: 'dark', accentColor: '', fontScale: 1,
    notificationsEnabled: true, reduceMotion: false, username: 'student',
  };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>{children}</div>;
}

function Label({ text }: { text: string }) {
  return <div style={{ fontSize: 16, color: palette(useResolvedTheme()).textMuted, marginBottom: 8 }}>{text}</div>;
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div style={{ fontSize: 14, color: palette(useResolvedTheme()).textMuted }}>{k}</div>
      <div style={{ fontSize: 20, fontWeight: 600 }}>{v}</div>
    </div>
  );
}

function DisplayInput({ initial, onSubmit }: { initial: string; onSubmit: (v: string) => void }) {
  const [v, setV] = useState(initial);
  useEffect(() => { setV(initial); }, [initial]);
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <input
        type="text" value={v}
        onChange={(e) => setV(e.target.value)}
        style={{
          flex: 1, minHeight: 64, padding: '0 16px', fontSize: 22,
          background: palette(useResolvedTheme()).bgRaised,
          color: palette(useResolvedTheme()).text,
          border: `2px solid ${palette(useResolvedTheme()).border}`,
          borderRadius: 12, outline: 'none',
        }}
      />
      <TouchButton theme={useResolvedTheme()} size="md" variant="primary"
        disabled={v === initial}
        onClick={() => onSubmit(v)}>
        Save
      </TouchButton>
    </div>
  );
}

export { SettingsApp as default };
