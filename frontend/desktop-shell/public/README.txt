# desktop-shell public assets

Drop any wallpaper image files into `frontend/desktop-shell/public/backgrounds/`
and they show up in **Settings → Wallpaper** automatically — no code edits
required.

## Supported extensions

`.png` · `.jpg` · `.jpeg` · `.webp` · `.gif` · `.avif`
(Case is ignored on lookup but lower-case is convention.)

## How it works

`desktop-shell/src/backgrounds-bridge.ts` uses Vite's `import.meta.glob` to
enumerate the folder at build/dev time. Each file becomes a wallpaper preset
with the filename as the display name (e.g. `my-scene.png` → "My scene").

In Settings, dynamic presets are listed in front of the static CSS gradients
(Aurora / Sunset / Forest / Gridlines) — so dropping `background1.png` puts
"Background 1" at the top of the picker.

The folder is reachable in code as the Vite alias `@backgrounds`
(declared in `vite.config.ts` and mirrored in `tsconfig.json` `paths`):

    @backgrounds/my-art.png  →  frontend/desktop-shell/public/backgrounds/my-art.png

The alias mirrors the existing `@ace/shared` / `@ace/app-ai` /
`@ace/app-settings` workspace package aliases — same resolution mechanism,
different target.

## Recommended sizes

- 1024 × 600 (exact fit for the 7-inch display)
- 1920 × 1080 (A.C.E scales to fit; ~1 MB compressed is ideal)
- < 2 MB total file size to stay within `MAX_WALLPAPER_BYTES`

## Filename tips

- `background1.png` → "Background 1" in the picker
- `study-time.jpg` → "Study time"
- `-` and `_` become spaces; first letter capitalised
- Files sort case-insensitive alphabetically

## Adding PNGs at dev time

`import.meta.glob` enumerates the folder at module-load. New PNGs dropped
into `public/backgrounds/` while `vite dev` is running will **not** appear
in the picker until you do a full reload (HMR doesn't re-run the glob).
This is fine for production builds (a rebuild re-runs the enumeration)
but surprises newcomers — if you don't see a freshly-dropped file,
hit Ctrl-Shift-R / Cmd-Shift-R to do a full reload.
</content>
</invoke>
</content>
</invoke>