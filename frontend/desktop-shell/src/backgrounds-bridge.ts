import { useAceStore, type WallpaperPreset } from '@ace/shared';

/**
 * Auto-discover any image file dropped into `desktop-shell/public/backgrounds/`
 * and turn each one into a `WallpaperPreset` for the Settings wallpaper picker.
 *
 * How it works:
 *   - `import.meta.glob` with `{ eager: true, as: 'url' }` returns a
 *     `Record<path, url>` at module-load time. Vite ≥5 enumerates the folder
 *     during `vite dev` (HMR picks up new files) and at `vite build`. Older
 *     Vite versions use `query: '?url' + import: 'default'` instead.
 *   - Each entry is converted to a `WallpaperPreset` with a derived display
 *     name (filename minus extension, with `-`/`_` → space, first letter
 *     capitalised).
 *   - The list is pushed into `aceStore.bundledBackgrounds` via
 *     `setBundledBackgrounds`. The Settings app merges that list in front
 *     of the static CSS presets so freshly-dropped PNGs are at the top
 *     of the picker on next render.
 *
 * Effect order: this module is imported from `main.tsx` before `App`, so
 * the store is populated before any UI mounts. Adding PNGs at runtime
 * requires a full reload (Vite does NOT re-run the glob on HMR).
 */

// Case-insensitive extension filtering is intentionally implemented as a
// post-filter rather than a brace-expansion case-list so the glob pattern
// stays small and predictable across Vite versions.
//
// The `@backgrounds` token is the Vite alias declared in
// `desktop-shell/vite.config.ts` that resolves to
// `frontend/desktop-shell/public/backgrounds/`. Using the alias (rather
// than a hard-coded `../public/...`) means dev + build both resolve to
// the same path even if this file's location ever moves.
const URL_MODULES = import.meta.glob(
  '@backgrounds/*',
  { eager: true, as: 'url' },
) as Record<string, string>;

/** `background1.png` → `Background 1`, `my-scene.PNG` → `My scene`. */
/**
 * Alias-resolved glob keys come back as `@backgrounds/foo.png`. We normalise
 * to the runtime URL form `/backgrounds/foo.png` so any downstream consumer
 * that expects a leading-slash path works without surprise.
 */
function normaliseKey(filePath: string): string {
  return filePath.startsWith('@backgrounds/')
    ? `/${filePath.slice('@backgrounds/'.length)}`
    : filePath;
}

function deriveDisplayName(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, '');
  const spaced = base.replace(/[-_]+/g, ' ').trim();
  if (!spaced) return filename;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Fallback gradient applied while the image is loading or if it 404s. */
const FALLBACK_CSS =
  'radial-gradient(1200px 700px at 50% 0%, rgba(99,102,241,0.20), transparent 55%),\
linear-gradient(180deg,#0b1020 0%, #0d1330 100%)';

/** Stable id per file so re-discovery doesn't churn the React key. */
function deriveId(fileName: string): string {
  return `bg-${fileName.replace(/\.[^.]+$/, '')}`;
}

const SUPPORTED_EXT = /\.(png|jpg|jpeg|webp|gif|avif)$/i;

function buildBundledBackgrounds(): WallpaperPreset[] {
  return Object.entries(URL_MODULES)
    .map(([filePath, url]) => [normaliseKey(filePath), url] as const)
    .filter(([filePath]) => SUPPORTED_EXT.test(filePath))
    .sort(([aPath], [bPath]) => {
      // Case-insensitive alphabetical sort keeps BACKGROUND1.png and
      // background1.png together; ties broken by exact case.
      const a = aPath.toLowerCase();
      const b = bPath.toLowerCase();
      if (a < b) return -1;
      if (a > b) return 1;
      return aPath.localeCompare(bPath);
    })
    .map<WallpaperPreset>(([filePath, url]) => {
      const fileName = filePath.split('/').pop() ?? filePath;
      return {
        id: deriveId(fileName),
        name: deriveDisplayName(fileName),
        css: FALLBACK_CSS,
        imageUrl: url,
        bundled: true,
      };
    });
}

// Side-effect: populate the store on module-load. Settings + Wallpaper
// components pick up the change via React subscriptions downstream.
const bundled = buildBundledBackgrounds();
useAceStore.getState().setBundledBackgrounds(bundled);

// Single dev-only console line so dropping a PNG yields obvious feedback.
// Production builds suppress this entirely.
if (
  bundled.length > 0 &&
  (import.meta as { env?: { DEV?: boolean } }).env?.DEV !== false &&
  typeof console !== 'undefined'
) {
  // eslint-disable-next-line no-console
  console.info(
    `[ace] discovered ${bundled.length} bundled background${
      bundled.length === 1 ? '' : 's'
    } from public/backgrounds/`,
    bundled.map((b) => b.name),
  );
}
