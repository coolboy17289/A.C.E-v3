/**
 * Row — a 80px-tall list row with optional leading icon, label, and
 * trailing value. Used by Settings, WiFi picker, etc.
 *
 * Trailing value can be a string ("Connected"), a control element
 * (toggle, chevron), or an icon (the settings cog).
 */

import type { CSSProperties, ReactNode } from 'react';
import { useDebouncedTap } from './debounce.js';
import { palette, type ThemeMode } from './theme.js';
import { spacing, radius } from './spacing.js';
import { primaryTouchTarget } from './spacing.js';

export interface TouchRowProps {
  theme?: ThemeMode;
  /** Whole row clickable; onPointerUp fires. */
  onPointerUp?: (e: React.PointerEvent<HTMLDivElement>) => void;
  /** Optional leading icon (emoji or SVG element). */
  leading?: ReactNode;
  /** Main label. */
  label: string;
  /** Optional secondary caption underneath the label. */
  caption?: string;
  /** Right-aligned element — value text, badge, etc. */
  trailing?: ReactNode;
  /** Highlight the row (used for focused WiFi network, etc). */
  highlighted?: boolean;
  ariaLabel?: string;
  style?: CSSProperties;
}

export function TouchRow({
  theme = 'dark',
  onPointerUp,
  leading,
  label,
  caption,
  trailing,
  highlighted,
  ariaLabel,
  style,
}: TouchRowProps) {
  const t = palette(theme);
  const innerTap = useDebouncedTap((e) => onPointerUp?.(e as unknown as React.PointerEvent<HTMLDivElement>));

  const rowStyle: CSSProperties = {
    minHeight: primaryTouchTarget + 'px',
    padding: `${spacing.px2} ${spacing.px4}`,
    background: highlighted ? t.bgRecessed : t.bgRaised,
    border: `1px solid ${highlighted ? t.primary : t.border}`,
    borderRadius: radius.md,
    display: 'flex',
    alignItems: 'center',
    gap: spacing.px3,
    cursor: onPointerUp ? 'pointer' : 'default',
    transition: 'transform 80ms ease-out, background 80ms ease-out',
    touchAction: 'manipulation',
    userSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
    ...style,
  };

  const inner = (
    <>
      {leading ? (
        <span aria-hidden style={{ fontSize: '24px', minWidth: '32px', textAlign: 'center' }}>
          {leading}
        </span>
      ) : null}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            color: t.text,
            fontSize: '20px',
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </div>
        {caption ? (
          <div style={{ color: t.textMuted, fontSize: '14px', marginTop: '2px' }}>
            {caption}
          </div>
        ) : null}
      </div>
      {trailing ? <div style={{ color: t.textMuted }}>{trailing}</div> : null}
    </>
  );

  if (!onPointerUp) {
    return (
      <div style={rowStyle} aria-label={ariaLabel}>
        {inner}
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      style={rowStyle}
      onPointerDown={(e) => {
        e.currentTarget.style.transform = 'scale(0.985)';
      }}
      onPointerUp={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        innerTap(e);
      }}
      onPointerCancel={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
      onPointerLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          innerTap(e as unknown as React.SyntheticEvent);
        }
      }}
    >
      {inner}
    </div>
  );
}
