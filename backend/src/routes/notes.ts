import type { Application } from 'express';
import type { Db } from '../db.js';
import { ah } from '../util/error.js';
import { newId } from '../util/ids.js';
import { rowToNote } from '../db.js';
import type { NoteRecord } from '@ace/shared';

export function registerNoteRoutes(app: Application, db: Db) {
  app.get('/api/notes', ah((req, res) => {
    const subjectId = typeof req.query.subjectId === 'string' ? req.query.subjectId : null;
    const rows = subjectId
      ? db.prepare('SELECT * FROM notes WHERE subject_id = ? ORDER BY updated_at DESC').all(subjectId)
      : db.prepare('SELECT * FROM notes ORDER BY updated_at DESC').all();
    res.json(rows.map(rowToNote));
  }));

  app.post('/api/notes', ah(async (req, res) => {
    const n = req.body as Omit<NoteRecord, 'id' | 'createdAt' | 'updatedAt' | 'revisionCount'>;
    if (!n.subjectId || !n.title) { res.status(400).json({ error: 'invalid' }); return; }
    const id = newId('note');
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO notes (id, subject_id, title, body, tags, created_at, updated_at, revision_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
    ).run(id, n.subjectId, n.title, n.body ?? '', JSON.stringify(n.tags ?? []), now, now);
    res.status(201).json(rowToNote(db.prepare('SELECT * FROM notes WHERE id = ?').get(id)));
  }));

  app.patch('/api/notes/:id', ah(async (req, res) => {
    const id = req.params.id;
    const patch = (req.body ?? {}) as Partial<NoteRecord>;

    // Pull the RAW row first so we can detect a true "not found" cleanly,
    // then run it through rowToNote() so the merged object below uses the
    // NoteRecord camelCase shape (subjectId, revisionCount, etc).
    //
    // Previous version typed `existing` directly as the mapped NoteRecord
    // but kept the raw SQL row beneath it. The merge then read
    // `existing.subjectId` (undefined, because the raw column is
    // `subject_id`), so the .run() bound it as SQL NULL and tripped the
    // NOT NULL constraint on notes.subject_id.
    const existingRow = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
    if (!existingRow) { res.status(404).json({ error: 'not_found' }); return; }
    const existing = rowToNote(existingRow);
    const merged = { ...existing, ...patch };
    const now = new Date().toISOString();
    const bumped = patch.body && patch.body !== existing.body
      ? (existing.revisionCount ?? 0) + 1
      : existing.revisionCount ?? 0;
    db.prepare(
      `UPDATE notes SET subject_id=?, title=?, body=?, tags=?, updated_at=?, revision_count=? WHERE id=?`,
    ).run(
      merged.subjectId, merged.title, merged.body ?? '',
      JSON.stringify(merged.tags ?? []), now, bumped, id,
    );
    res.json(rowToNote(db.prepare('SELECT * FROM notes WHERE id = ?').get(id)));
  }));
}
