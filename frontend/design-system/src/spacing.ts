/**
 * Spacing scale — 8px base grid.
 *
 * The kiosk device is 800x480 / 1024x600. Touch targets must NOT be
 * adjacent (no < 16px gap between buttons) because the thumb covers a
 * roughly 18-22mm radius at arm's length. We therefore bias toward
 * generous defaults.
 *
 * Use `compact` for dense list rows where the row itself is the touch
 * target. Use `comfortable` for cards on a dashboard. Use `generous`
 * for primary action placement on a wizard page.
 */
export const spacing = {
  // 8px grid
  px: '8px',
  px2: '16px',
  px3: '24px',
  px4: '32px',
  px5: '40px',
  px6: '48px',
  px8: '64px',
  px10: '80px',
  px12: '96px',
  px16: '128px',
} as const;

/**
 * Minimum touch target — 64px is a hard floor for any interactive
 * element. Primary actions should bias to 80–96px.
 */
export const minTouchTarget = 64;
export const primaryTouchTarget = 80;
export const largeTouchTarget = 96;

/**
 * Border-radius tokens — soft squircle, no sharp corners. Corner radius
 * scales linearly with the element's height so it reads consistently
 * against the dark background.
 */
export const radius = {
  sm: '6px',
  md: '12px',
  lg: '20px',
  pill: '999px',
} as const;

/**
 * Theme-aware padding presets — `tight` is for tap-only chips / pills,
 * `roomy` is for primary buttons the user needs to find quickly.
 */
export const buttonPadding = {
  tight: `${spacing.px} ${spacing.px3}`,
  roomy: `${spacing.px3} ${spacing.px6}`,
  hero: `${spacing.px5} ${spacing.px10}`,
} as const;
