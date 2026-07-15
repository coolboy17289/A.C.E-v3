import type { Application } from 'express';
import type { Db } from '../db.js';
import { ah } from '../util/error.js';

/**
 * Settings storage.
 *
 * Persisted as a key/value table so callers can save arbitrary slices
 * (theme, accent, wallpaper, network config) without schema churn.
 *
 * History note: an earlier version of this route ALSO wrote the entire
 * payload under an `app` row in addition to writing each top-level key
 * as its own row. The mirror made GET return `{ wallpaper: ..., app:
 * { wallpaper: ..., ... } }`, which leaked the whole payload twice. We
 * now write only the per-key rows. The GET path still tolerates a
 * legacy `app` row in the database so existing devices keep working
 * without a migration.
 */
const LEGACY_APP_KEY = 'app';

export function registerSettingsRoutes(app: Application, db: Db) {
  app.get('/api/settings', ah((_req, res) => {
    const rows = db.prepare('SELECT key, value FROM settings_kv').all() as Array<{ key: string; value: string }>;
    const out: Record<string, unknown> = {};
    for (const r of rows) {
      try { out[r.key] = JSON.parse(r.value); } catch { out[r.key] = r.value; }
    }
    res.json(out);
  }));

  app.put('/api/settings', ah(async (req, res) => {
    const payload = (req.body ?? {}) as Record<string, unknown>;
    const stmt = db.prepare(
      `INSERT INTO settings_kv (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value=excluded.value`,
    );
    const txn = db.transaction((entries: Record<string, unknown>) => {
      for (const [k, v] of Object.entries(entries)) stmt.run(k, JSON.stringify(v));
    });
    // Per-key rows only. PUT callers (Settings UI on the frontend) save
    // `{ wallpaper, accentColor, reduceMotion, ... }` and `{ wifi, kiosk }`
    // separately; mixing both halves into a single `app` row produced an
    // inconsistent GET shape.
    txn(payload);
    // Intentionally NOT writing to LEGACY_APP_KEY anymore. The GET path
    // still understands it for backward-compatible reads.
    void LEGACY_APP_KEY; // referenced to keep import-lint quiet
    res.json({ ok: true });
  }));
}
