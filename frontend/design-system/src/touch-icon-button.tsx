/**
 * Icon-button — square touch target. Used for Back / Close / Help /
 * Settings-cog type actions that need a compact 72px square hit area.
 *
 * Handler chaining: same pattern as TouchButton — pointer handlers
 * are destructured out of `rest` BEFORE the spread so the design-
 * system's pressed-state logic and the consumer's chain both fire
 * (instead of one silently overriding the other).
 */

import type { ButtonHTMLAttributes, PointerEventHandler } from 'react';
import type { CSSProperties } from 'react';
import { useDebouncedTap } from './debounce.js';
import { palette, type ThemeMode } from './theme.js';
import { spacing, radius } from './spacing.js';

export interface TouchIconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'type'> {
  icon: string;
  size?: number;
  theme?: ThemeMode;
  ariaLabel: string;
}

export function TouchIconButton({
  icon,
  size = 72,
  theme = 'dark',
  ariaLabel,
  disabled,
  onPointerUp,
  onPointerDown,
  onPointerCancel,
  onPointerLeave,
  style,
  ...buttonAttrs
}: TouchIconButtonProps) {
  const t = palette(theme);
  const innerTap = useDebouncedTap(
    (e) => (onPointerUp as PointerEventHandler<HTMLButtonElement> | undefined)?.(e as unknown as React.PointerEvent<HTMLButtonElement>),
  );

  const baseStyle: CSSProperties = {
    width: size + 'px',
    height: size + 'px',
    background: t.bgRaised,
    color: t.text,
    borderRadius: radius.md,
    border: `1px solid ${t.border}`,
    fontSize: Math.floor(size * 0.42) + 'px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.45 : 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 80ms ease-out',
    touchAction: 'manipulation',
    userSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
    ...style,
  };

  return (
    <button
      type="button"
      {...buttonAttrs}
      aria-label={ariaLabel}
      disabled={disabled}
      style={baseStyle}
      onPointerDown={(e) => {
        onPointerDown?.(e);
        e.currentTarget.style.transform = 'scale(0.97)';
      }}
      onPointerUp={(e) => {
        onPointerUp?.(e);
        e.currentTarget.style.transform = 'scale(1)';
        if (!disabled) innerTap(e);
      }}
      onPointerCancel={(e) => {
        onPointerCancel?.(e);
        e.currentTarget.style.transform = 'scale(1)';
      }}
      onPointerLeave={(e) => {
        onPointerLeave?.(e);
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      {icon}
    </button>
  );
}
