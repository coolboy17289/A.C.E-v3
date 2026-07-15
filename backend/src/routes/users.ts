import type { Application } from 'express';
import type { Db } from '../db.js';
import { ah } from '../util/error.js';
import { rowToUser } from '../db.js';
import type { UserProfile } from '@ace/shared';

/**
 * The student profile is a singleton. Both GET and PATCH auto-create the
 * default user if the table is empty so that:
 *   - the kiosk boots straight into a working profile (matches the
 *     defensive behaviour in seed.ts);
 *   - test fixtures that wipe the table mid-run still PATCH successfully
 *     instead of silently updating a non-existent row.
 */
export function registerUserRoutes(app: Application, db: Db) {
  app.get('/api/users/me', ah((_req, res) => {
    res.json(rowToUser(getOrCreateUser(db)));
  }));

  app.patch('/api/users/me', ah(async (req, res) => {
    const patch = (req.body ?? {}) as Partial<UserProfile>;
    const existing = rowToUser(getOrCreateUser(db));
    const merged = {
      name: patch.name?.slice(0, 64) ?? existing.name,
      avatar: patch.avatar?.slice(0, 32) ?? existing.avatar,
      preferences: { ...existing.preferences, ...(patch.preferences ?? {}) },
    };
    db.prepare('UPDATE users SET name = ?, avatar = ?, preferences = ? WHERE id = ?')
      .run(merged.name, merged.avatar, JSON.stringify(merged.preferences), existing.id);
    res.json(rowToUser(db.prepare('SELECT * FROM users WHERE id = ?').get(existing.id)));
  }));
}

/**
 * Returns the singleton user row, inserting the default profile on the
 * first call after a wipe. Both GET and PATCH route through here so the
 * "auto-create on first access" semantics are guaranteed regardless of
 * which endpoint the client hits first.
 */
function getOrCreateUser(db: Db): unknown {
  const row = db.prepare('SELECT * FROM users LIMIT 1').get();
  if (row) return row;
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO users (id, name, avatar, created_at, preferences)
     VALUES ('user_default', 'Student', ?, ?, ?)`,
  ).run('\u{1F98A}', now, JSON.stringify(defaultPrefs()));
  return db.prepare('SELECT * FROM users WHERE id = ?').get('user_default');
}

function defaultPrefs(): UserProfile['preferences'] {
  return {
    theme: 'dark',
    accentColor: '#60a5fa',
    fontScale: 1,
    notificationsEnabled: true,
    reduceMotion: false,
    username: 'Student',
  };
}
