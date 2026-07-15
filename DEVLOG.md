# A.C.E OS — Developer Log

This is the raw, chronological development log. It is intentionally
informal: timestamps, debugging notes, and the version timeline live
here so the README can stay a clean, navigable reference.

> The narrative of the project is in [README.md](README.md). The
> release-by-release summary is in [CHANGELOG.md](CHANGELOG.md).

---

## Version timeline

- **v1** — initial commit. JSON files as the main data layer.
- **v1.0.1 --beta** — debug release; reverted due to a stale code file.
- **v1.0.1.1 --beta** — added Raspberry Pi support files (GPIO, camera,
  sensors). Not pushed due to bugs.
- **v1.2.0 --beta** — GUI mostly working, fourth push of the project.
  Five errors outstanding.
- **v1.2.1 --beta** — known-broken release, do not use.
- **v1.2.2 --beta** — fix release. AI Tutor is broken in this build.
- **v1.2.3 --beta** — backend fixes. Errors remain and are tracked
  separately. Next: fix outstanding errors, add more apps, finish
  light/dark mode, build the first ISO.
- **v1.2.4 --beta** — newest v1 release. Same open work as above.
- **v2 --beta** — full re-code for performance and stronger
  TypeScript posture. Front-end apps (Home, Tasks, Focus, Settings) +
  first-setup wizard + flashable image installer.

## Raw entries (15 July 2026)

- v1 pushed at 15:42. Initial commit is still v1 with JSON files
  being the main change.
- v1.0.1 --beta: debug release, reverted because of an old code file.
- v1.0.1.1 --beta: added files for the Raspberry Pi to control GPIO,
  camera, sensors, etc. Not being pushed due to bugs.
- Errors noted in `frontend/apps/ai/tsconfig.json` (TypeScript
  `baseUrl` deprecation warning). Investigation continues.
- Root cause of the AI import failure not located by 16:18.
- 16:22 — confirmed the AI app folder has an API error; not blocking
  other work, deferred to later.
- 16:23 — added the Settings app; finished coding the GUI. Running
  with `npm run dev`.
- 16:29 — second error reported, unrelated to the A.C.E codebase;
  source unclear.
- 17:17 — added a `background` folder for additional backgrounds.
- 17:23 — four errors observed, screenshot in `image.png`.
- Began using Claude for debugging assistance.
- 17:33 — v1.2.0 --beta pushed with a mostly working GUI. Claude Code
  surfaced errors but the attempted fixes made things worse.
- 18:10 — another push, no version bump; Claude Code fixes applied.
- 18:29 — v1.2.1 --beta pushed; later marked as broken, do not use.
- v1.2.2 --beta pushed as a fix. AI Tutor is broken in this build.
- v1.2.3 --beta pushed: backend fixes. Errors remain and are tracked
  separately. Next: fix outstanding errors, add more apps, finish
  light/dark mode, build the first ISO.
- v1.2.4 --beta pushed: newest v1 release. Same open work as above.
- 19:50 — v2 --beta work begins. Full re-code of the codebase for
  better performance and stronger TypeScript posture. Next few
  pushes stay on v2 until the main GUI works.
