import type { Application, Response } from 'express';
import type { Db } from '../db.js';
import { ah } from '../util/error.js';
import { ok } from '../util/envelope.js';
import { shutdown, restart } from '../services/system.js';
import fs from 'node:fs';
import path from 'node:path';

/**
 * A.C.E OS first-setup wizard state. Persisted to a JSON file on disk
 * (default /var/lib/ace/setup.json) so it survives reboots without
 * touching the SQLite database.
 *
 *   completed    — once true, the kiosk launcher skips the wizard.
 *   currentStep  — informational; lets the wizard resume on mid-flow
 *                  crash.
 *   language     — UI locale selection. Drives LANGS array in
 *                  SetupWizard.tsx and any future i18n.
 *   wifi         — { ssid } or null. The Pi image bakes Wi-Fi at
 *                  provisioning time, so this is informational.
 *   profile      — display name captured at step 3.
 *   theme        — 'dark' or 'light'; mirrored onto UserPreferences
 *                  on first /api/users/me PATCH.
 *
 * The mailbox lives at /var/lib/ace/setup.json by default. Override
 * with ACE_SETUP_FILE for tests. Falls back to a per-tmpfile for
 * dev environments where /var/lib isn't writable.
 */
export interface SetupState {
  completed: boolean;
  currentStep?: 'language' | 'internet' | 'profile' | 'theme' | 'done' | string;
  language?: 'en' | 'es' | 'fr' | 'de' | string;
  wifi?: { ssid: string } | null;
  profile?: { name: string } | null;
  theme?: 'dark' | 'light';
}

const SETUP_PATH = process.env.ACE_SETUP_FILE
  || (process.env.ACE_HARDWARE === 'real'
        ? '/var/lib/ace/setup.json'
        // Dev fallback (so `npm run dev` works on a laptop without sudo).
        : path.resolve(process.cwd(), '.ace-setup.json'));

/** 4xx-only union for client-facing fail responses. */
type ClientFailStatus = 400 | 401 | 403 | 404 | 409 | 422 | 429;

/**
 * Local helper — sends the same JSON envelope that util/envelope.fail()
 * would write, but without importing the (currently broken) envelope.ts
 * module. We avoid throwing here because the `ah()` async wrapper
 * catches rejections and reshapes them via the global error handler —
 * that would double-write the response.
 *
 * Status is restricted to 4xx so a future caller doesn't accidentally
 * surface a stack trace.
 */
function httpFail(
  res: Response,
  status: ClientFailStatus,
  code: string,
  message: string,
): void {
  res.status(status).json({
    ok: false,
    error: { code, message },
    requestId: res.locals.requestId,
  });
}

function readSetup(): SetupState {
  if (!fs.existsSync(SETUP_PATH)) {
    return { completed: false, currentStep: 'language' };
  }
  try {
    const raw = fs.readFileSync(SETUP_PATH, 'utf8');
    const parsed = JSON.parse(raw) as SetupState;
    return parsed;
  } catch {
    // Corrupt JSON — fall back to "not completed" so kiosk.sh's Chromium
    // deep-link (?setup=1) takes over and the wizard reruns cleanly.
    return { completed: false, currentStep: 'language' };
  }
}

function writeSetup(state: SetupState) {
  const dir = path.dirname(SETUP_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  // Atomic-ish: write to .tmp then rename.
  const tmp = `${SETUP_PATH}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, SETUP_PATH);
}

export function registerSystemRoutes(app: Application, _db: Db) {
  // First-setup wizard: GET current state, POST a new state.
  app.get('/api/system/setup-state', ah(async (_req, res) => {
    ok(res, readSetup());
  }));

  app.post('/api/system/setup-state', ah(async (req, res) => {
    const body = req.body as Partial<SetupState> | undefined;
    if (!body || typeof body !== 'object') {
      httpFail(res, 400, 'bad_request', 'body must be a SetupState object');
      return;
    }
    // Merge over existing so partial submissions don't unset fields.
    const next: SetupState = { ...readSetup(), ...body };
    writeSetup(next);
    ok(res, next);
  }));

  // Recovery endpoint: the Settings app surfaces this for WSOD cases.
  app.post('/api/system/setup-reset', ah(async (_req, res) => {
    const next: SetupState = { completed: false, currentStep: 'language' };
    writeSetup(next);
    ok(res, next);
  }));

  app.post('/api/system/shutdown', ah(async (_req, res) => {
    const result = await shutdown();
    ok(res, result);
  }));
  app.post('/api/system/restart', ah(async (_req, res) => {
    const result = await restart();
    ok(res, result);
  }));
}
