/**
 * Touch debounce — ignores rapid re-fires of a single tap.
 *
 * Cheap digitizers (the Pi 7" DSI panel in particular) report
 * down-up-down-up sequences on a single contact. Without debouncing,
 * these produce double fires and a student on a touch-first device
 * can accidentally advance through two screens.
 *
 * Usage:
 *   const onTap = useDebouncedTap(() => doSomething());
 *
 * The hook returns a tap-handler suitable for `onPointerUp` /
 * `onClick`. It uses `lastFireRef` to track the last fire time on
 * a per-component basis.
 */

import { useCallback, useLayoutEffect, useRef } from 'react';
import { minTapGapMs } from './theme.js';

export type TapHandler = (event: React.SyntheticEvent) => void;

/**
 * Wrap a tap handler with debounce. The wrapped handler ignores calls
 * within `minTapGapMs` of the previous successful call.
 *
 * The clock resets after `minTapGapMs`, so legitimate subsequent
 * taps land normally. We deliberately do NOT use a long debounce
 * window — students retry quickly on a touch device.
 *
 * Stability: the wrapped handler's identity is constant across renders
 * regardless of how the consumer passes `handler` (inline closure or
 * stable ref). The latest handler is held in a ref so the debounce
 * machinery keeps firing through the freshest closure. This matters
 * because consumers put `[onTap]` in their own `useEffect` deps, and
 * an unstable wrapped function would re-fire those effects every
 * render.
 */
export function useDebouncedTap(handler: TapHandler): TapHandler {
  const lastFireRef = useRef<number>(0);
  const handlerRef = useRef<TapHandler>(handler);
  // useLayoutEffect (not useEffect) so handlerRef.current is updated
  // synchronously after DOM mutations but BEFORE paint. This closes
  // the theoretical race where a tap fires from one render commit
  // before the next render's effect has flushed the latest handler.
  useLayoutEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  return useCallback<TapHandler>(
    (event) => {
      const now = Date.now();
      if (now - lastFireRef.current < minTapGapMs) return;
      lastFireRef.current = now;
      handlerRef.current(event);
    },
    [],
  );
}
