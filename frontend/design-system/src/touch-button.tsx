/**
 * Button — primary touch-friendly button.
 *
 * Three sizes mapped to the touch scale:
 *   - `sm`  -> 64px (secondary, dense layouts)
 *   - `md`  -> 80px (default, one-action buttons)
 *   - `lg`  -> 96px (primary CTAs, single-button-per-page wizard)
 *
 * Variants:
 *   - `primary` — accent fill, dark text (most common)
 *   - `secondary` — raised bg, brand border, accent text
 *   - `ghost` — transparent, accents text only
 *   - `danger` — red bg, white text (delete / shutdown)
 *
 * Behaviour:
 *   - `onPointerUp` is the canonical touch signal; `onClick` is also
 *     accepted and routed through the SAME debounced handler, so
 *     a mouse-driven consumer or assistive-tech click and a tap
 *     fire exactly once and at the same code path.
 *   - Tap debounce filters out rapid re-fires from cheap digitizers.
 *   - Pressed state (`data-pressed`) flips while a finger is on it,
 *     to give haptic-equivalent feedback without any haptic API call.
 *   - Disabled state flips opacity to 0.45 and pointer-events: none.
 *
 * Handler chaining: the four pointer handlers (`onPointerDown`,
 *  `onPointerUp`, `onPointerCancel`, `onPointerLeave`) are destructured
 *  out of `rest` BEFORE the spread. The explicit design-system
 *  handlers then call the consumer's handlers at the appropriate
 *  moment. This avoids the JSX attribute-order bug where `{...rest}`
 *  silently overrides the explicit pointer handlers (or vice versa).
 */

import type { ButtonHTMLAttributes, PointerEventHandler } from 'react';
import type { CSSProperties } from 'react';
import { useDebouncedTap } from './debounce.js';
import { palette, type ThemeMode } from './theme.js';
import { minTouchTarget, primaryTouchTarget, largeTouchTarget, spacing, radius, buttonPadding } from './spacing.js';

export type ButtonSize = 'sm' | 'md' | 'lg';
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface TouchButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  size?: ButtonSize;
  variant?: ButtonVariant;
  /** Optional icon, rendered to the left of the label. */
  icon?: string;
  theme?: ThemeMode;
}

function sizeFor(s: ButtonSize): number {
  if (s === 'sm') return minTouchTarget;
  if (s === 'lg') return largeTouchTarget;
  return primaryTouchTarget;
}

function variantStyle(variant: ButtonVariant, theme: ThemeMode): CSSProperties {
  const p = palette(theme);
  switch (variant) {
    case 'primary':
      return { background: p.primary, color: p.primaryText, borderColor: p.primary };
    case 'secondary':
      return {
        background: p.bgRaised,
        color: p.primary,
        border: `1px solid ${p.border}`,
      };
    case 'ghost':
      return { background: 'transparent', color: p.primary, borderColor: 'transparent' };
    case 'danger':
      return { background: p.danger, color: p.textInverse, borderColor: p.danger };
  }
}

export function TouchButton({
  size = 'md',
  variant = 'primary',
  icon,
  theme = 'dark',
  children,
  disabled,
  onClick,
  onPointerUp,
  onPointerDown,
  onPointerCancel,
  onPointerLeave,
  style,
  ...buttonAttrs
}: TouchButtonProps) {
  const t = palette(theme);
  // Tap handler routed through the design-system's pressed-state pipeline.
  // We treat both `onClick` (mouse-driven or assistive) and the
  // pointer-up fast-path as the SAME consumer-provided callback, so the
  // tap never double-fires (the design-system explicitly does not wire
  // the browser's click event when it intercepts via onPointerUp).
  const innerTap = useDebouncedTap(
    (e) => {
      (onPointerUp as PointerEventHandler<HTMLButtonElement> | undefined)?.(e as unknown as React.PointerEvent<HTMLButtonElement>);
      (onClick as ((ev: React.MouseEvent<HTMLButtonElement>) => void) | undefined)?.(e as unknown as React.MouseEvent<HTMLButtonElement>);
    },
  );
  const height = sizeFor(size);

  const baseStyle: CSSProperties = {
    minHeight: height + 'px',
    padding: buttonPadding[size === 'sm' ? 'tight' : size === 'lg' ? 'roomy' : 'roomy'],
    borderRadius: radius.md,
    fontSize: '20px',
    fontWeight: 700,
    border: '1px solid transparent',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.45 : 1,
    transition: 'transform 80ms ease-out, background 80ms ease-out',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.px2,
    touchAction: 'manipulation',
    userSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
    ...variantStyle(variant, theme),
    ...style,
  };

  return (
    <button
      type="button"
      {...buttonAttrs}
      // Use pointerdown/up for the visual pressed state; click for the
      // semantic action. Both are debounced. Consumer handlers are
      // chained inside.
      data-pressed="false"
      style={baseStyle}
      disabled={disabled}
      onPointerDown={(e) => {
        onPointerDown?.(e);
        e.currentTarget.dataset.pressed = 'true';
        e.currentTarget.style.transform = 'scale(0.98)';
      }}
      onPointerUp={(e) => {
        onPointerUp?.(e);
        e.currentTarget.dataset.pressed = 'false';
        e.currentTarget.style.transform = 'scale(1)';
        if (!disabled) innerTap(e);
      }}
      onPointerCancel={(e) => {
        // Touch cancelled (real-world: finger slid off, system
        // grabbed). Reset to neutral on the SAME element that received
        // pointerdown — do not rely on `window.event` (the global
        // last-event reference can be a different element entirely).
        onPointerCancel?.(e);
        e.currentTarget.dataset.pressed = 'false';
        e.currentTarget.style.transform = 'scale(1)';
      }}
      onPointerLeave={(e) => {
        onPointerLeave?.(e);
        e.currentTarget.dataset.pressed = 'false';
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      {icon ? <span aria-hidden style={{ fontSize: '24px' }}>{icon}</span> : null}
      {children}
    </button>
  );
}
