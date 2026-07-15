/**
 * Wallpaper presets and the default gradient.
 *
 * Lives in a non-JSX module so it can be imported from purely-JS sites
 * (the Zustand store, the seed loader, etc.) without dragging the icon
 * library or its React runtime into the boot graph.
 */

/**
 * A wallpaper is either a CSS gradient (the `css` field) or an image asset
 * (the optional `imageUrl`). When both are present the Settings app lets the
 * user pick the image; `css` is used as a one-frame fallback while the asset
 * is loading or in case it 404s.
 */
export interface WallpaperPreset {
  id: string;
  name: string;
  /** Gradient or any CSS background value. Always present as a fallback. */
  css: string;
  /** Absolute or root-relative URL of an image asset. */
  imageUrl?: string;
  /** True when the preset ships with the desktop-shell build. */
  bundled?: boolean;
}

/**
 * Resolve a preset into the single string the wallpaper store carries.
 * Image presets resolve to their URL; everything else resolves to its CSS.
 */
export function resolveWallpaper(preset: WallpaperPreset): string {
  return preset.imageUrl ?? preset.css;
}

/** True when a wallpaper value should be mounted as an `<img>` rather than a CSS background. */
export function isImageWallpaper(value: string): boolean {
  if (!value) return false;
  if (value.startsWith('data:image')) return true;
  if (value.startsWith('blob:')) return true;
  // Any http(s) URL or root-relative path ending in a known image extension.
  return /\.(png|jpe?g|webp|gif|avif)(\?.*)?$/i.test(value);
}

export const WALLPAPER_PRESETS: readonly WallpaperPreset[] = [
  {
    id: 'default',
    name: 'Aurora',
    css:
      'radial-gradient(1200px 600px at 20% 0%, rgba(96,165,250,0.22), transparent 60%),\
radial-gradient(1000px 500px at 90% 110%, rgba(167,139,250,0.22), transparent 60%),\
linear-gradient(180deg,#0b1020 0%, #0d1330 100%)',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    css:
      'radial-gradient(1100px 700px at 90% 10%, rgba(249,115,22,0.32), transparent 55%),\
radial-gradient(900px 500px at 10% 110%, rgba(244,114,182,0.30), transparent 55%),\
linear-gradient(180deg,#1f1530 0%, #0d1330 100%)',
  },
  {
    id: 'forest',
    name: 'Forest',
    css:
      'radial-gradient(900px 600px at 30% 20%, rgba(34,197,94,0.30), transparent 55%),\
radial-gradient(1100px 700px at 80% 110%, rgba(56,189,248,0.18), transparent 55%),\
linear-gradient(180deg,#0b1020 0%, #112030 100%)',
  },
  {
    id: 'grid',
    name: 'Gridlines',
    css: 'linear-gradient(180deg,#0b1020 0%, #0d1330 100%)',
  },
  // Note: image presets are now auto-discovered from
  // `desktop-shell/public/backgrounds/*.{png,jpg,...}` by
  // `desktop-shell/src/backgrounds-bridge.ts` (uses `import.meta.glob`
  // with `{ eager: true, as: 'url' }`). Drop a new PNG into that folder
  // and it shows up in the Settings → Wallpaper picker on next reload —
  // no code edits required. The bridge pushes its list into the
  // `bundledBackgrounds` field on the aceStore; the Settings app merges
  // it in front of `WALLPAPER_PRESETS`.
] as const;

export const DEFAULT_WALLPAPER_CSS: string = WALLPAPER_PRESETS[0].css;

/** Hard cap for uploaded wallpapers so localStorage + backend don't blow up. */
export const MAX_WALLPAPER_BYTES = 2 * 1024 * 1024; // 2 MB

/**
 * Single source of truth for the localStorage key where the active
 * wallpaper string is cached.
 *
 *   - The desktop-shell (`App.tsx`) writes here on first paint, after it
 *     pulls the canonical value from the backend's `GET /api/settings`.
 *   - The Settings picker writes here when the user clicks Apply.
 *   - Both sites read from here on next boot so the wallpaper appears
 *     instantly before the backend round-trip completes.
 *
 * Keep both call sites routed through this constant — drifting back to a
 * literal would silently break first-paint boot-time wallpaper pickup.
 */
export const WALLPAPER_STORAGE_KEY = 'ace:wallpaper';
