import { useEffect, useState } from 'react';
import {
  TouchButton, TouchCard, palette, useResolvedTheme,
} from '@ace/design-system';
import { api } from '@ace/shared';

/**
 * First-setup wizard. Five steps:
 *   1. Language (en, es, fr, de — display only; kinds can be added)
 *   2. Connectivity — informational only here; Wi-Fi is pre-configured
 *      from the Pi image (Pi 7" DSI panels are kiosk-tethered).
 *   3. Profile (display name)
 *   4. Theme (dark / light)
 *   5. Done — POSTs setup state to /api/system/setup-write and the
 *      caller (App.tsx) flips to Dashboard mode.
 *
 * Persisted server-side via /api/system/setup-state so the kiosk can
 * re-detect completion across reboots. WSOD recovery: there's a
 * /api/system/setup-reset endpoint the Settings app surfaces.
 */
type Lang = 'en' | 'es' | 'fr' | 'de';
const LANGS: { code: Lang; label: string; greeting: string }[] = [
  { code: 'en', label: 'English',  greeting: 'Welcome' },
  { code: 'es', label: 'Español',  greeting: 'Bienvenido' },
  { code: 'fr', label: 'Français', greeting: 'Bienvenue' },
  { code: 'de', label: 'Deutsch',  greeting: 'Willkommen' },
];

interface SetupState {
  language: Lang;
  name: string;
  theme: 'dark' | 'light';
}

const blank: SetupState = { language: 'en', name: '', theme: 'dark' };

export function SetupWizard({ onComplete }: { onComplete: () => void }) {
  const theme = useResolvedTheme();
  const p = palette(theme);
  const [step, setStep] = useState(0);
  const [state, setState] = useState<SetupState>(blank);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function set<K extends keyof SetupState>(k: K, v: SetupState[K]) {
    setState((s) => ({ ...s, [k]: v }));
  }

  async function persist() {
    setBusy(true);
    setErr(null);
    try {
      // Persist setup.json so the kiosk can recognise completion on
      // the next launch. We do this FIRST so a network blip doesn't
      // strand the SQLite user record without a setup marker.
      const res = await fetch('/api/system/setup-state', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          completed: true,
          language: state.language,
          theme: state.theme,
          profile: { name: state.name },
        }),
      });
      if (!res.ok) throw new Error(`setup-write failed: ${res.status}`);

      // Now mirror the wizard's name + theme into the SQLite user
      // record so /api/users/me reflects the captured state. Without
      // this, the home dashboard and Settings app continue to show
      // the SQLite seed profile (Student, dark) despite the wizard
      // having captured the student's actual name + theme choice.
      try {
        await api.updateUser({
          name: state.name || undefined,
          preferences: {
            ...(await api.getUser()).preferences,
            theme: state.theme,
          },
        });
      } catch (userErr) {
        // Non-fatal: the kiosk still works; only the Settings UI
        // shows a stale theme until the next /api/users/me PATCH.
        // Surface the discrepancy via console so operators
        // debugging "why is my theme not dark after I set it"
        // have a trail.
        // eslint-disable-next-line no-console
        console.warn('[ace-setup] setup.json persisted but /api/users/me update failed; user record out of sync until next PATCH', userErr);
      }

      onComplete();
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  }

  const lang = LANGS.find((l) => l.code === state.language) ?? LANGS[0];

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: p.bg, color: p.text,
      fontFamily: 'system-ui, sans-serif',
    }}>
      {/* Progress strip — non-interactive, just orientation. */}
      <ProgressStrip theme={theme} step={step} total={5} />

      <main style={{
        flex: 1, padding: 24, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <TouchCard theme={theme} style={{ maxWidth: 720, width: '100%' }}>
          {step === 0 && (
            <Step
              title={lang.greeting}
              subtitle="Choose a language"
              theme={theme}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {LANGS.map((l) => (
                  <TouchButton
                    key={l.code}
                    theme={theme}
                    size="lg"
                    variant={state.language === l.code ? 'primary' : 'secondary'}
                    onClick={() => { set('language', l.code); setStep(1); }}
                  >
                    {l.label}
                  </TouchButton>
                ))}
              </div>
            </Step>
          )}

          {step === 1 && (
            <Step
              title="Internet"
              subtitle="Confirm connectivity"
              theme={theme}
            >
              <p style={{ fontSize: 20, lineHeight: 1.5 }}>
                A.C.E OS uses the connection your school set up. If this
                device can't reach the A.C.E cloud, classroom materials
                still work offline — lessons, tasks, and Focus mode do
                not require the network.
              </p>
              <p style={{ fontSize: 20, marginTop: 16, color: p.textMuted }}>
                Tap Continue. To set up Wi-Fi instead, ask your teacher.
              </p>
            </Step>
          )}

          {step === 2 && (
            <Step
              title="What's your name?"
              subtitle="This shows on the home screen."
              theme={theme}
            >
              <input
                type="text"
                value={state.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="First name"
                autoFocus
                style={{
                  width: '100%', minHeight: 96,
                  padding: '0 16px', fontSize: 32,
                  background: p.bgRaised, color: p.text,
                  border: `3px solid ${p.primary}`,
                  borderRadius: 16, outline: 'none',
                  marginBottom: 16,
                }}
              />
            </Step>
          )}

          {step === 3 && (
            <Step
              title="Theme"
              subtitle="Pick a look. You can change this later."
              theme={theme}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <TouchButton
                  theme={theme} size="lg"
                  variant={state.theme === 'dark' ? 'primary' : 'secondary'}
                  onClick={() => set('theme', 'dark')}
                  style={{ padding: '32px 16px' }}
                >
                  🌙 Dark
                </TouchButton>
                <TouchButton
                  theme={theme} size="lg"
                  variant={state.theme === 'light' ? 'primary' : 'secondary'}
                  onClick={() => set('theme', 'light')}
                  style={{ padding: '32px 16px' }}
                >
                  ☀ Light
                </TouchButton>
              </div>
            </Step>
          )}

          {step === 4 && (
            <Step
              title={`You're all set${state.name ? `, ${state.name}` : ''}.`}
              subtitle="Tap Finish to launch A.C.E."
              theme={theme}
            >
              {err && (
                <div style={{ color: p.danger, fontSize: 18, marginBottom: 16 }}>
                  ⚠ {err}
                </div>
              )}
              <TouchButton
                theme={theme} size="lg" variant="primary"
                disabled={busy}
                onClick={() => void persist()}
              >
                {busy ? 'Saving…' : 'Finish'}
              </TouchButton>
            </Step>
          )}
        </TouchCard>
      </main>

      {/* Bottom nav: BACK (left) / NEXT (right). Strict 80px tap targets. */}
      <footer style={{
        background: p.bgRaised, borderTop: `1px solid ${p.border}`,
        padding: 16, display: 'flex', justifyContent: 'space-between',
        minHeight: 96,
      }}>
        <TouchButton
          theme={theme} size="md" variant="ghost"
          disabled={step === 0 || busy}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          ← Back
        </TouchButton>
        {step < 4 && (
          <TouchButton
            theme={theme} size="md" variant="primary"
            disabled={(step === 2 && !state.name.trim()) || busy}
            onClick={() => setStep((s) => Math.min(4, s + 1))}
          >
            Next →
          </TouchButton>
        )}
      </footer>
    </div>
  );
}

function Step({ title, subtitle, children, theme }: {
  title: string; subtitle: string; children: React.ReactNode; theme: ThemeMode;
}) {
  const p = palette(theme);
  return (
    <div>
      <div style={{ fontSize: 40, fontWeight: 900, color: p.text }}>{title}</div>
      <div style={{ fontSize: 22, color: p.textMuted, marginTop: 4, marginBottom: 24 }}>
        {subtitle}
      </div>
      {children}
    </div>
  );
}

function ProgressStrip({ theme, step, total }: { theme: ThemeMode; step: number; total: number }) {
  const p = palette(theme);
  return (
    <div style={{
      display: 'flex', gap: 4, padding: '12px 16px',
      background: p.bgRaised, borderBottom: `1px solid ${p.border}`,
    }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          flex: 1, height: 8, borderRadius: 4,
          background: i <= step ? p.primary : p.border,
          transition: 'background 200ms ease-out',
        }} />
      ))}
    </div>
  );
}
