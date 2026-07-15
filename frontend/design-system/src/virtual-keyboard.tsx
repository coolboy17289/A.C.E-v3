/**
 * Virtual keyboard — inline, anchored underneath the focused input.
 *
 * QWERTY layout:
 *   q w e r t y u i o p
 *   a s d f g h j k l
 *   z x c v b n m
 *   {space} {backspace} {enter}
 *
 * Numeric layout (PIN):
 *   1 2 3
 *   4 5 6
 *   7 8 9
 *   . 0 ⌫
 *
 * Anchoring model: the keyboard listens to the touch context (when
 * available) AND a `ace:focus-change` window event. Apps can either:
 *   - wrap their tree in `<TouchProvider>` (preferred — used by apps,
 *     setup wizard); or
 *   - dispatch `ace:focus-change` events imperatively (used by the
 *     legacy AI chat textarea).
 */

import type { CSSProperties } from 'react';
import { palette, type ThemeMode } from './theme.js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { spacing, radius } from './spacing.js';
import { useTouchContext } from './touch-context.js';
import { minTapGapMs } from './theme.js';
import { useDebouncedTap } from './debounce.js';

export interface VirtualKeyboardProps {
  theme?: ThemeMode;
  /** What to call when the user types. `value` is the proposed new input value. */
  onChange: (value: string) => void;
  /** Current input value (so backspace has something to delete). */
  value: string;
  /** Default scheme if nothing else has been set. */
  scheme?: 'qwerty' | 'numeric';
  /** Optional override; if not set, the keyboard disappears when no input is focused. */
  force?: boolean;
}

const QWERTY: string[][] = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
];
const NUMERIC: string[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', '⌫'],
];

export function VirtualKeyboard({
  theme = 'dark',
  onChange,
  value,
  scheme: schemeProp,
  force,
}: VirtualKeyboardProps) {
  const ctx = useTouchContext();
  const t = palette(theme);

  // Listen for cross-tree focus events so we stay in sync even when
  // the keyboard is mounted outside an app's provider.
  const [externalFocus, setExternalFocus] = useState<string | null>(ctx.focusedInputId);
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ focusedInputId: string }>).detail;
      setExternalFocus(detail.focusedInputId);
    };
    window.addEventListener('ace:focus-change', handler);
    return () => window.removeEventListener('ace:focus-change', handler);
  }, []);

  const effectiveFocus = ctx.focusedInputId ?? externalFocus;
  const scheme = schemeProp ?? ctx.scheme ?? 'qwerty';

  if (!force && !effectiveFocus) return null;

  // String-typed debounce. We don't use `useDebouncedTap` here because
  // that hook is typed for SyntheticEvent handlers — a keyboard key
  // callback receives a string. We share the same `minTapGapMs`
  // threshold so multi-fire timing matches the buttons.
  const lastCharPressRef = useRef<number>(0);
  const handleChar = useCallback((char_: string) => {
    const now = Date.now();
    if (now - lastCharPressRef.current < minTapGapMs) return;
    lastCharPressRef.current = now;
    if (char_ === '⌫') {
      onChange(value.slice(0, -1));
      return;
    }
    if (char_ === '↵') {
      // enter is the responsibility of the host input's onKeyDown
      // (or a separate Done button the host page provides).
      return;
    }
    onChange(value + char_);
  }, [value, onChange]);

  const layout = scheme === 'numeric' ? NUMERIC : QWERTY;

  return (
    <div
      role="toolbar"
      aria-label="Virtual keyboard"
      style={{
        background: t.bgRecessed,
        border: `1px solid ${t.border}`,
        borderTop: `2px solid ${t.primary}`,
        borderRadius: radius.md,
        padding: spacing.px2,
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.px,
        touchAction: 'manipulation',
      }}
    >
      {layout.map((row, rowIdx) => (
        <div
          key={rowIdx}
          style={{
            display: 'flex',
            gap: spacing.px,
            justifyContent: 'center',
            flexWrap: 'nowrap',
          }}
        >
          {row.map((char_) => (
            <KeyButton key={char_} char_={char_} scheme={scheme} onTap={handleChar} theme={theme} />
          ))}
        </div>
      ))}
      {/* Modifier row only on QWERTY scheme — a numeric PIN pad doesn't
          make sense to have a spacebar or enter button, and the row
          eats ~40% of vertical real estate on a 7" 800×480 panel. The
          numeric layout already includes a single ⌫ inline last row. */}
      {scheme === 'qwerty' && (
        <div
          style={{
            display: 'flex',
            gap: spacing.px,
            justifyContent: 'center',
            marginTop: spacing.px,
          }}
        >
          <KeyButton char_="␣" scheme={scheme} onTap={handleChar} theme={theme} wide />
          <KeyButton char_="⌫" scheme={scheme} onTap={handleChar} theme={theme} accent />
          <KeyButton char_="↵" scheme={scheme} onTap={handleChar} theme={theme} wide />
        </div>
      )}
    </div>
  );
}

interface KeyButtonProps {
  char_: string;
  scheme: 'qwerty' | 'numeric';
  onTap: (char_: string) => void;
  theme: ThemeMode;
  wide?: boolean;
  accent?: boolean;
}

function KeyButton({ char_, scheme, onTap, theme, wide, accent }: KeyButtonProps) {
  const t = palette(theme);
  const innerTap = useDebouncedTap(() => onTap(char_));

  const style: CSSProperties = {
    minWidth: scheme === 'numeric' ? '88px' : wide ? '160px' : '64px',
    minHeight: scheme === 'numeric' ? '72px' : '72px',
    background: accent ? t.primary : t.bgRaised,
    color: accent ? t.primaryText : t.text,
    borderRadius: radius.sm,
    border: `1px solid ${t.border}`,
    fontSize: scheme === 'numeric' ? '28px' : '22px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    touchAction: 'manipulation',
    userSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
    transition: 'transform 80ms ease-out',
  };

  return (
    <button
      type="button"
      style={style}
      onPointerDown={(e) => {
        e.currentTarget.style.transform = 'scale(0.95)';
      }}
      onPointerUp={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        innerTap(e);
      }}
      onPointerLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      {char_ === '␣' ? 'space' : char_ === '⌫' ? '⌫' : char_ === '↵' ? 'enter' : char_}
    </button>
  );
}
