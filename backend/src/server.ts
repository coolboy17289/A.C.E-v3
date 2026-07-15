import express, { type Application, type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Db } from './db.js';

import { registerUserRoutes } from './routes/users.js';
import { registerTaskRoutes } from './routes/tasks.js';
import { registerCalendarRoutes } from './routes/calendar.js';
import { registerSubjectRoutes } from './routes/subjects.js';
import { registerNoteRoutes } from './routes/notes.js';
import { registerFocusRoutes } from './routes/focus.js';
import { registerAiRoutes } from './routes/ai.js';
import { registerNotificationRoutes } from './routes/notifications.js';
import { registerSettingsRoutes } from './routes/settings.js';
import { registerHardwareRoutes } from './routes/hardware.js';
import { registerSystemRoutes } from './routes/system.js';

/**
 * Creates a fresh Express app with every A.C.E route mounted.
 *
 * Middleware ordering is deliberate (top to bottom):
 *   1. CORS + JSON body parsing - globally.
 *   2. /api/health + every /api/* route registrar.
 *   3. /api/* 404 JSON responder (must run BEFORE the SPA fallback so an
 *      unmatched /api path returns JSON instead of HTML).
 *   4. Static SPA fallback - only mounts when frontend/desktop-shell/dist
 *      exists. The catch-all predicate (path-startsWith-check middle-
 *      ware) skips any /api/* so it's belt-and-braces against handler
 *      reordering.
 *   5. Final error handler.
 *
 * The earlier version registered the SPA catch-all ahead of the /api 404,
 * so unknown /api paths were silently shadowed by an HTML index page when
 * the production dist was in place. This ordering fixes that.
 */
export function createApp({ db }: { db: Db }): Application {
  const app = express();

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '512kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'ace-backend', ts: new Date().toISOString() });
  });

  registerUserRoutes(app, db);
  registerTaskRoutes(app, db);
  registerCalendarRoutes(app, db);
  registerSubjectRoutes(app, db);
  registerNoteRoutes(app, db);
  registerFocusRoutes(app, db);
  registerNotificationRoutes(app, db);
  registerSettingsRoutes(app, db);
  registerHardwareRoutes(app, db);
  registerSystemRoutes(app, db);
  registerAiRoutes(app, db);

  // 404 for unknown /api routes. Registered BEFORE the SPA catch-all so
  // an unmatched /api path returns a JSON 404 instead of falling through
  // to the static handler.
  app.use('/api/*', (_req, res) => {
    res.status(404).json({ error: 'not_found' });
  });

  // Production-only: backend also serves the React shell. Vite's build
  // output lives under frontend/desktop-shell/dist. Try several candidate
  // paths so the same artifact works whether the backend is launched from
  // its own folder, the project root, or as a packaged binary.
  const candidates = [
    path.resolve(process.cwd(), 'frontend/desktop-shell/dist'),
    path.resolve(process.cwd(), '../frontend/desktop-shell/dist'),
    path.resolve(fileURLToPath(import.meta.url), '../../frontend/desktop-shell/dist'),
  ];

  for (const dir of candidates) {
    if (!fs.existsSync(path.join(dir, 'index.html'))) continue;
    app.use(express.static(dir));

    // SPA route fallback. Implemented as a predicate middleware that
    // returns the React shell's index.html for any non-/api request that
    // didn't match a static asset. We use app.use + a path-not-startswith
    // check rather than a regex literal: avoids the TS regex lexer edge
    // cases and is just as readable.
    app.use((req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      res.sendFile(path.join(dir, 'index.html'));
    });
    break;
  }

  // Final error handler
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    // eslint-disable-next-line no-console
    console.error('[ace-backend] unhandled error', err);
    res.status(500).json({ error: 'internal_error', details: err.message });
  });

  return app;
}
