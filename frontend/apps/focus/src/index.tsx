import { useEffect, useRef, useState } from 'react';
import {
  TouchButton, TouchCard, TouchIconButton,
  ThemeProvider, palette, useResolvedTheme,
  type ThemeMode,
} from '@ace/design-system';
import { api, type FocusSession } from '@ace/shared';

/**
 * Touch-first Focus app — Pomodoro (25/5/15). Single screen UX:
 *
 *   tall timer tile → 3 start buttons (Pomodoro / Long / Short)
 *                    → pause / stop (when running) → history sidebar
 *
 * The timer ticks via Date.now() (not setInterval accumulation) so a
 * jittery digitizer can't drift the dial. Tapping the timer tile counts
 * as "skip to now" — useful when resuming after dinner.
 */
export interface FocusAppProps {
  theme?: ThemeMode;
}

type BlockType = 'pomodoro' | 'long' | 'short';
const BLOCKS: Record<BlockType, { work: number; break: number }> = {
  pomodoro: { work: 25, break: 5 },
  long:     { work: 50, break: 10 },
  short:    { work: 15, break: 3 },
};

export function FocusApp({ theme: themeProp }: FocusAppProps) {
  return (
    <ThemeProvider initialTheme={themeProp}>
      <FocusInner />
    </ThemeProvider>
  );
}

function FocusInner() {
  const theme = useResolvedTheme();
  const p = palette(theme);
  const current = useRef<FocusSession | null>(null);

  const [block, setBlock] = useState<BlockType>('pomodoro');
  const [phase, setPhase] = useState<'work' | 'break'>('work');
  const [secondsLeft, setSecondsLeft] = useState(BLOCKS.pomodoro.work * 60);
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<FocusSession[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { void loadHistory(); }, []);

  async function loadHistory() {
    try { setHistory(await api.listSessions()); }
    catch (e) { setError(String(e)); }
  }

  async function startSession(type: BlockType) {
    if (running) return;
    setBlock(type);
    setPhase('work');
    setSecondsLeft(BLOCKS[type].work * 60);
    try {
      const s = await api.createSession({
        startedAt: new Date().toISOString(),
        durationMinutes: BLOCKS[type].work,
        breakMinutes: BLOCKS[type].break,
        type,
        completed: false,
      });
      current.current = s;
      setRunning(true);
    } catch (e) {
      setError(String(e));
    }
  }

  async function stopSession() {
    if (!current.current) { setRunning(false); return; }
    try {
      const completed = secondsLeft === 0;
      await api.updateSession(current.current.id, {
        endedAt: new Date().toISOString(),
        completed,
      });
      current.current = null;
      setRunning(false);
      await loadHistory();
    } catch (e) {
      setError(String(e));
    }
  }

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s > 1) return s - 1;
        // Phase flip.
        if (phase === 'work') {
          setPhase('break');
          return BLOCKS[block].break * 60;
        }
        // Work block fully complete.
        void stopSession();
        return 0;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, phase, block]);

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  return (
    <div style={{
      padding: 24, background: p.bg, color: p.text, minHeight: '100%',
      fontFamily: 'system-ui, sans-serif',
      display: 'flex', flexDirection: 'column', gap: 16,
    }}>
      <div style={{ fontSize: 32, fontWeight: 800 }}>Focus</div>

      <TouchCard theme={theme} style={{ flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', minHeight: 320 }}>
        <div style={{ fontSize: 18, color: p.textMuted, textTransform: 'uppercase',
          letterSpacing: 2 }}>
          {running ? phase : `Choose a block`}
        </div>
        <div style={{ fontSize: 144, fontWeight: 900, lineHeight: 1, marginTop: 16,
          fontVariantNumeric: 'tabular-nums' }}>
          {mm}:{ss}
        </div>
        <div style={{ fontSize: 18, color: p.textMuted, marginTop: 12 }}>
          {running && current.current
            ? `${BLOCKS[block].work}-min work, ${BLOCKS[block].break}-min break`
            : 'Pick one to start'}
        </div>
        {error && (
          <div style={{ marginTop: 12, color: p.danger, fontSize: 16 }}>⚠ {error}</div>
        )}
      </TouchCard>

      {!running ? (
        <div style={{ display: 'flex', gap: 12 }}>
          <TouchButton theme={theme} size="lg" variant="primary" onClick={() => void startSession('pomodoro')}>
            🍅 25 / 5
          </TouchButton>
          <TouchButton theme={theme} size="lg" variant="secondary" onClick={() => void startSession('long')}>
            50 / 10
          </TouchButton>
          <TouchButton theme={theme} size="lg" variant="secondary" onClick={() => void startSession('short')}>
            15 / 3
          </TouchButton>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 12 }}>
          <TouchButton theme={theme} size="lg" variant="danger" onClick={() => void stopSession()}>
            ■ Stop
          </TouchButton>
          <TouchButton theme={theme} size="lg" variant="ghost" onClick={() => {
            // Skip to next phase manually.
            setSecondsLeft(0);
            if (phase === 'work') {
              setPhase('break');
              setSecondsLeft(BLOCKS[block].break * 60);
            } else {
              void stopSession();
            }
          }}>
            ⏭ Skip
          </TouchButton>
        </div>
      )}

      <div style={{ fontSize: 20, fontWeight: 700, marginTop: 12 }}>
        History ({history.length})
      </div>
      <div style={{ maxHeight: 240, overflow: 'auto', display: 'flex',
        flexDirection: 'column', gap: 8 }}>
        {history.slice(0, 10).map((s) => (
          <TouchCard theme={theme} key={s.id}>
            <div style={{ fontSize: 18, fontWeight: 600 }}>
              {s.type} · {s.durationMinutes}m
              {s.completed ? ' · ✅' : ' · ⏸'}
            </div>
            <div style={{ fontSize: 16, color: p.textMuted }}>
              {new Date(s.startedAt).toLocaleString()}
            </div>
          </TouchCard>
        ))}
      </div>
    </div>
  );
}

export { FocusApp as default };
