/**
 * Card — large tap-friendly card surface. The whole card is a tap target.
 *
 * Variants:
 *   - `flat`    — bg-only, no border
 *   - `raised`  — raised bg with hairline border (default)
 *   - `accent`  — brand-accent border (used by Home dashboard tiles)
 *
 * No hover state — touch devices don't fire hover, and tap-state
 * visual feedback is delivered via `data-pressed`.
 */

import type { CSSProperties, ReactNode } from 'react';
import { useDebouncedTap } from './debounce.js';
import { palette, type ThemeMode } from './theme.js';
import { spacing, radius } from './spacing.js';

export type CardVariant = 'flat' | 'raised' | 'accent';

export interface TouchCardProps {
  variant?: CardVariant;
  theme?: ThemeMode;
  fullWidth?: boolean;
  /** Whole card is clickable. */
  onPointerUp?: (e: React.PointerEvent<HTMLDivElement>) => void;
  /** Disable the click behavior (read-only card). */
  readOnly?: boolean;
  children: ReactNode;
  /** Optional accent color override (defaults to theme accent). */
  accentOverride?: string;
  /** Optional aria label for accessibility. */
  ariaLabel?: string;
  /** Optional additional CSS passed to inner div. */
  style?: CSSProperties;
}

export function TouchCard({
  variant = 'raised',
  theme = 'dark',
  fullWidth,
  onPointerUp,
  readOnly,
  children,
  accentOverride,
  ariaLabel,
  style,
}: TouchCardProps) {
  const t = palette(theme);
  const innerTap = useDebouncedTap((e) => onPointerUp?.(e as unknown as React.PointerEvent<HTMLDivElement>));

  let bg = t.bgRaised;
  let borderColor = t.border;
  if (variant === 'flat') {
    bg = 'transparent';
    borderColor = 'transparent';
  } else if (variant === 'accent') {
    borderColor = accentOverride ?? t.primary;
  }

  const baseStyle: CSSProperties = {
    background: bg,
    border: `1px solid ${borderColor}`,
    borderRadius: radius.lg,
    padding: spacing.px4,
    cursor: readOnly ? 'default' : (onPointerUp ? 'pointer' : 'default'),
    transition: 'transform 80ms ease-out, background 80ms ease-out',
    width: fullWidth ? '100%' : undefined,
    touchAction: 'manipulation',
    userSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
    ...style,
  };

  if (readOnly || !onPointerUp) {
    return (
      <div style={baseStyle} aria-label={ariaLabel}>
        {children}
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      style={baseStyle}
      onPointerDown={(e) => {
        e.currentTarget.style.transform = 'scale(0.985)';
        e.currentTarget.style.background = t.bgRecessed;
      }}
      onPointerUp={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.background = bg;
        innerTap(e);
      }}
      onPointerCancel={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.background = bg;
      }}
      onPointerLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.background = bg;
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          innerTap(e as unknown as React.SyntheticEvent);
        }
      }}
    >
      {children}
    </div>
  );
}
