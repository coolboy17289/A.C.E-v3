import React from 'react';
import { useAceStore, DEFAULT_WALLPAPER_CSS, isImageWallpaper } from '@ace/shared';

/**
 * Desktop wallpaper. Three render modes:
 *   - `data:image/...` or `blob:...` → mounted as an `<img>` covering the screen.
 *   - any URL/path ending in a known image extension → mounted as an `<img>`
 *     with object-cover. This is how bundled backgrounds (e.g.
 *     `/background1.png` from `desktop-shell/public/`) light up.
 *   - everything else → mounted as a CSS `background:` stack.
 *
 * If the bundled image 404s we fall back to `DEFAULT_WALLPAPER_CSS` so the
 * desktop never flashes a broken-image glyph.
 *
 * Reads from the global store so the Settings app can update the
 * wallpaper at runtime. The component is intentionally cheap to render
 * (no state, no remount, GPU-friendly animations).
 */
export const Wallpaper: React.FC = React.memo(() => {
  const wallpaper = useAceStore((s) => s.wallpaper);
  const [errored, setErrored] = React.useState(false);

  // Reset the error flag whenever the preset changes so the next image gets
  // a fresh chance to load.
  React.useEffect(() => {
    setErrored(false);
  }, [wallpaper]);

  const looksLikeImage = isImageWallpaper(wallpaper);
  const showImage = looksLikeImage && !errored;
  // Used only on the CSS fallback branch.
  const fallbackCss = !wallpaper || (looksLikeImage && errored)
    ? DEFAULT_WALLPAPER_CSS
    : wallpaper;

  return (
    <div aria-hidden data-testid="desktop-wallpaper" className="absolute inset-0 -z-10 overflow-hidden">
      {showImage ? (
        <>
          <img
            src={wallpaper}
            alt=""
            className="absolute inset-0 w-full h-full object-cover animate-fade-in"
            onError={() => setErrored(true)}
          />
          <div className="absolute inset-0 ace-wallpaper-stripes opacity-[0.55] pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40 pointer-events-none" />
        </>
      ) : (
        <>
          <div className="absolute inset-0" style={{ background: fallbackCss }} />
          <div className="absolute inset-0 ace-wallpaper-stripes opacity-[0.55] pointer-events-none" />
        </>
      )}
    </div>
  );
});
Wallpaper.displayName = 'Wallpaper';
