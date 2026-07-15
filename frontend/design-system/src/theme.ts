/**
 * A.C.E OS theme tokens.
 *
 * - Default `dark` — anti-glare on cheap TFT panels, color reproduction
 *   is the weakest on ARM SBC panels, and we want the splash wordmark
 *   gradient (`#3da8ff → #7c8eff → #8a5cff`) to land consistently.
 * - `light` is opt-in via Settings. Same scale, just inverted luma.
 * - `auto` defers to `window.matchMedia('(prefers-color-scheme: …)')`
 *   at boot — the kiosk's first frame is always dark to match the
 *   Plymouth splash handoff.
 *
 * Type ramps are absolute (not token-name remapped) because the kiosk
 * device is a single 800x480 / 1024x600 panel — no remap benefit, and
 * containment matters for visual consistency.
 */

export type ThemeMode = 'dark' | 'light' | 'auto';

export interface ThemePalette {
  bg: string;
  bgRaised: string;
  bgRecessed: string;
  border: string;
  text: string;
  textMuted: string;
  textInverse: string;
  primary: string;
  primaryPressed: string;
  primaryText: string;
  accent: string;
  warning: string;
  danger: string;
  success: string;
  focusRing: string;
}

const dark: ThemePalette = {
  bg: '#0b1020',
  bgRaised: '#172248',
  bgRecessed: '#0e1632',
  border: '#2b3a63',
  text: '#e6ebff',
  textMuted: '#9aa6c8',
  textInverse: '#0b1020',
  primary: '#3da8ff',
  primaryPressed: '#5cb6ff',
  primaryText: '#08111e',
  accent: '#a06cff',
  warning: '#ffd166',
  danger: '#ff5e6c',
  success: '#7fe0a8',
  focusRing: '#9bd6ff',
};

const light: ThemePalette = {
  bg: '#f4f6fb',
  bgRaised: '#ffffff',
  bgRecessed: '#eaeef6',
  border: '#cbd2e0',
  text: '#0d1428',
  textMuted: '#4d5878',
  textInverse: '#ffffff',
  primary: '#006ad6',
  primaryPressed: '#0080e6',
  primaryText: '#ffffff',
  accent: '#6936c8',
  warning: '#b88000',
  danger: '#c0384a',
  success: '#1c8a55',
  focusRing: '#006ad6',
};

export function palette(mode: ThemeMode): ThemePalette {
  if (mode === 'light') return light;
  // 'auto' is dark at boot; once Runtime supports dynamic mode we'll
  // re-evaluate against the OS theme prefetch.
  return dark;
}

/**
 * Typography ramp — minimums sized for arm's-length reading on a 7"
 * 800x480 DSI panel. The body size is the bigger floor; small-print
 * inline text is only acceptable in non-interactive contexts.
 */
export const type = {
  body: '18px',
  bodyLg: '20px',
  caption: '14px',
  h3: '24px',
  h2: '32px',
  h1: '48px',
  display: '64px',
  weightRegular: 400,
  weightMedium: 500,
  weightBold: 700,
  weightBlack: 900,
} as const;

/**
 * Touch debounce — a global minimum gap between the touchstart and
 * any consequential state change. Cheap digitizers (e.g. the official
 * Pi 7" DSI) report down-up-down-up sequences on a single contact;
 * we treat anything within `minTapGapMs` of the previous tap as a
 * bounce and ignore it. Tuned conservatively for a young user's
 * hand-arm distance.
 */
export const minTapGapMs = 100;
