/**
 * Touch context — a single piece of global state shared across all
 * apps: which input (if any) currently has focus.
 *
 * Why a context and not prop drilling? The virtual keyboard must
 * appear under ANY text input across ANY app, including the first
 * setup wizard. We don't want each app to wire up its own keyboard;
 * we want the keyboard to "know" which input to anchor against.
 *
 * Usage:
 *   const { requestFocus, releaseFocus } = useTouchContext();
 *   <input onFocus={() => requestFocus('username-input')} ... />
 *   <VirtualKeyboard below={focusedInputId} ... />
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

interface TouchContextValue {
  /** ID of the input currently requesting the virtual keyboard. */
  focusedInputId: string | null;
  /** Hint to the keyboard about which layout to render. */
  scheme: 'qwerty' | 'numeric';
  /** Register focus for an input. */
  requestFocus: (id: string, scheme: 'qwerty' | 'numeric') => void;
  /** Release focus (e.g. blur on the input). */
  releaseFocus: (id: string) => void;
}

const TouchContext = createContext<TouchContextValue | null>(null);

export function TouchProvider({ children }: { children: ReactNode }) {
  const [focusedInputId, setFocusedInputId] = useState<string | null>(null);
  const [scheme, setScheme] = useState<'qwerty' | 'numeric'>('qwerty');

  const requestFocus = useCallback((id: string, s: 'qwerty' | 'numeric') => {
    setFocusedInputId(id);
    setScheme(s);
  }, []);

  const releaseFocus = useCallback((id: string) => {
    setFocusedInputId((prev) => (prev === id ? null : prev));
  }, []);

  // Dispatch a window event so the VirtualKeyboard can listen
  // independently of the context (in case we mount one outside
  // the React tree, e.g. a portal).
  useEffect(() => {
    if (!focusedInputId) return;
    window.dispatchEvent(
      new CustomEvent('ace:focus-change', {
        detail: { focusedInputId, scheme },
      }),
    );
  }, [focusedInputId, scheme]);

  const value = useMemo<TouchContextValue>(
    () => ({ focusedInputId, scheme, requestFocus, releaseFocus }),
    [focusedInputId, scheme, requestFocus, releaseFocus],
  );

  return <TouchContext.Provider value={value}>{children}</TouchContext.Provider>;
}

export function useTouchContext(): TouchContextValue {
  const ctx = useContext(TouchContext);
  if (!ctx) {
    // Outside a provider — return a no-op so utility functions like
    // fields don't have to know about provider presence. NOTE: in this
    // mode, `requestFocus` is a no-op and the VirtualKeyboard cannot
    // anchor under the input via context. The keyboard will still
    // honor focus changes that arrive via the `ace:focus-change`
    // window event, which is the legacy fallback used by the AI chat
    // textarea before the TouchProvider migration lands.
    return {
      focusedInputId: null,
      scheme: 'qwerty',
      requestFocus: () => {},
      releaseFocus: () => {},
    };
  }
  return ctx;
}
