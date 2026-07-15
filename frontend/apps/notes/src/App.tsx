import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  TouchButton, TouchCard, TouchIconButton,
  ThemeProvider, useTouchContext, palette, useResolvedTheme,
  type ThemeMode,
} from '@ace/design-system';
import { api, type NoteRecord, type Subject } from '@ace/shared';

/**
 * Touch-first Notes app. Designed for the 800×480 portrait DSI panel.
 *
 * Layout: master/detail two-pane.
 *   - Left:  list of notes (sorted by updatedAt desc). Each row shows
 *            title (truncated), subject name, relative time, and up to
 *            three tag chips.
 *   - Right: detail view of the selected note. Tap a row to load it
 *            for editing; the body textarea is the focus point. The
 *            body auto-saves 1s after the last keystroke.
 *
 * Add flow:
 *   1. Tap ➕ in the top right of the master pane.
 *   2. A composer card appears at the top of the list with title,
 *      body, subject dropdown, and tag chips. The title <input>
 *      receives focus and the on-screen keyboard anchors to it.
 *   3. Submit by tapping Save; the new note is prepended to the
 *      list (newest first) and selected.
 *
 * Edit flow:
 *   - Tap a row → it becomes the selected note; title + body become
 *     editable. Changes are debounced and persisted 1s after the
 *     last keystroke.
 *   - Tag chips in the composer turn into editable text below the
 *     body when a note is selected; tags are comma-separated and
 *     capped at 8 × 24 chars (enforced on save).
 *
 * Delete:
 *   - Right-hand ✕ on a list row. No confirm — kiosk convention
 *     matches the Tasks app.
 */
export interface NotesAppProps {
  theme?: ThemeMode;
}

type Draft = {
  title: string;
  body: string;
  subjectId: string;
  /** Comma-separated tag string, parsed on save. */
  tagsRaw: string;
};

const EMPTY: Draft = { title: '', body: '', subjectId: '', tagsRaw: '' };

const MAX_TAGS = 8;
const MAX_TAG_LEN = 24;
const AUTOSAVE_MS = 1000;

export function NotesApp({ theme: themeProp }: NotesAppProps) {
  return (
    <ThemeProvider initialTheme={themeProp}>
      <NotesInner />
    </ThemeProvider>
  );
}

function NotesInner() {
  const theme = useResolvedTheme();
  const [notes, setNotes] = useState<NoteRecord[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  // Refresh on mount.
  useEffect(() => {
    void refresh();
  }, []);

  // When the notes list changes, default the selected note to the
  // top of the list (the most recently updated) so a freshly
  // created note shows in the detail pane immediately.
  useEffect(() => {
    if (selectedId && notes.some((n) => n.id === selectedId)) return;
    setSelectedId(notes[0]?.id ?? null);
  }, [notes, selectedId]);

  async function refresh() {
    try {
      const [ns, ss] = await Promise.all([api.notes.list(), api.listSubjects()]);
      setNotes(ns);
      setSubjects(ss);
    } catch (e) {
      setError(String(e));
    }
  }

  const selected = useMemo(
    () => notes.find((n) => n.id === selectedId) ?? null,
    [notes, selectedId],
  );

  // ----- add -----
  async function saveNew() {
    if (!draft.title.trim()) return;
    const subjectId = draft.subjectId || subjects[0]?.id || '';
    if (!subjectId) {
      setError('Add a subject first via the Subjects app.');
      return;
    }
    const tags = parseTags(draft.tagsRaw);
    try {
      const created = await api.notes.create({
        title: draft.title.trim(),
        body: draft.body,
        subjectId,
        tags,
      });
      setNotes((xs) => [created, ...xs]);
      setSelectedId(created.id);
      setComposing(false);
      setDraft(EMPTY);
    } catch (e) {
      setError(String(e));
    }
  }

  // ----- delete -----
  async function remove(n: NoteRecord) {
    try {
      await api.notes.delete(n.id);
      setNotes((xs) => xs.filter((x) => x.id !== n.id));
    } catch (e) {
      setError(String(e));
    }
  }

  // ----- update (debounced from detail pane) -----
  async function patchSelected(patch: Partial<NoteRecord>) {
    if (!selected) return;
    try {
      const updated = await api.notes.update(selected.id, patch);
      setNotes((xs) => xs.map((x) => (x.id === updated.id ? updated : x)));
    } catch (e) {
      setError(String(e));
    }
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'minmax(280px, 360px) 1fr',
      gap: 16,
      padding: 16,
      background: palette(theme).bg,
      color: palette(theme).text,
      minHeight: '100%',
      boxSizing: 'border-box',
      fontFamily: 'system-ui, sans-serif',
    }}>
      {error && (
        <div style={{
          gridColumn: '1 / -1',
          color: palette(theme).danger, fontSize: 18, marginBottom: 4,
        }}>
          ⚠ {error}
        </div>
      )}

      <MasterPane
        theme={theme}
        notes={notes}
        subjects={subjects}
        selectedId={selectedId}
        composing={composing}
        draft={draft}
        setDraft={setDraft}
        onSelect={setSelectedId}
        onAdd={() => {
          setComposing(true);
          setDraft({ ...EMPTY, subjectId: subjects[0]?.id ?? '' });
        }}
        onCancel={() => { setComposing(false); setDraft(EMPTY); }}
        onSave={() => void saveNew()}
        onDelete={(n) => void remove(n)}
      />

      <DetailPane
        theme={theme}
        note={selected}
        subjects={subjects}
        onPatch={(p) => void patchSelected(p)}
      />
    </div>
  );
}

// ---------- master (left list) ----------

function MasterPane(props: {
  theme: ThemeMode;
  notes: NoteRecord[];
  subjects: Subject[];
  selectedId: string | null;
  composing: boolean;
  draft: Draft;
  setDraft: (d: Draft | ((prev: Draft) => Draft)) => void;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onCancel: () => void;
  onSave: () => void;
  onDelete: (n: NoteRecord) => void;
}) {
  const {
    theme, notes, subjects, selectedId, composing, draft, setDraft,
    onSelect, onAdd, onCancel, onSave, onDelete,
  } = props;

  // Sorted by updatedAt desc — the spec calls for "sorted by updatedAt desc".
  const sorted = useMemo(
    () => [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [notes],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ fontSize: 28, fontWeight: 800 }}>Notes · {notes.length}</div>
        <TouchIconButton
          theme={theme} ariaLabel="Add note" icon="➕"
          onPointerUp={onAdd}
        />
      </div>

      {composing && (
        <ComposerCard
          theme={theme}
          draft={draft}
          setDraft={setDraft}
          subjects={subjects}
          onSave={onSave}
          onCancel={onCancel}
        />
      )}

      <div style={{
        display: 'flex', flexDirection: 'column', gap: 8,
        overflowY: 'auto', maxHeight: 'calc(100vh - 160px)',
      }}>
        {sorted.length === 0 && !composing && (
          <TouchCard theme={theme}>
            <div style={{ fontSize: 18, color: palette(theme).textMuted }}>
              No notes yet. Tap ➕ to start one.
            </div>
          </TouchCard>
        )}
        {sorted.map((n) => (
          <NoteRow
            key={n.id}
            theme={theme}
            note={n}
            subjectName={subjects.find((s) => s.id === n.subjectId)?.name}
            selected={n.id === selectedId}
            onSelect={() => onSelect(n.id)}
            onDelete={() => onDelete(n)}
          />
        ))}
      </div>
    </div>
  );
}

function ComposerCard(props: {
  theme: ThemeMode;
  draft: Draft;
  setDraft: (d: Draft | ((prev: Draft) => Draft)) => void;
  subjects: Subject[];
  onSave: () => void;
  onCancel: () => void;
}) {
  const { theme, draft, setDraft, subjects, onSave, onCancel } = props;
  const { focusedInputId, requestFocus, releaseFocus } = useTouchContext();
  const rawId = useId();
  const titleId = `notes-title-${rawId}`;
  const tagsId = `notes-tags-${rawId}`;
  const titleRef = useRef<HTMLInputElement>(null);

  // Auto-focus the title once the composer mounts.
  useEffect(() => {
    const t = window.setTimeout(() => titleRef.current?.focus(), 60);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <TouchCard theme={theme} style={{ border: `2px solid ${palette(theme).primary}` }}>
      <input
        ref={titleRef}
        type="text"
        value={draft.title}
        placeholder="Note title"
        onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
        onFocus={() => requestFocus(titleId, 'qwerty')}
        onBlur={() => releaseFocus(titleId)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCancel();
        }}
        data-touch-input={titleId}
        style={inputStyle(theme, 24)}
      />
      <div style={{ height: 8 }} />
      <textarea
        value={draft.body}
        placeholder="Start writing…"
        rows={3}
        onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
        onFocus={() => requestFocus(`notes-body-${rawId}`, 'qwerty')}
        onBlur={() => releaseFocus(`notes-body-${rawId}`)}
        data-touch-input={`notes-body-${rawId}`}
        style={{
          ...inputStyle(theme, 18),
          resize: 'vertical',
          fontFamily: 'system-ui, sans-serif',
        }}
      />
      <div style={{ height: 12 }} />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <label style={{ fontSize: 14, color: palette(theme).textMuted }}>Subject:</label>
        <select
          value={draft.subjectId}
          onChange={(e) => setDraft((d) => ({ ...d, subjectId: e.target.value }))}
          style={{
            minHeight: 64,
            padding: '0 16px',
            fontSize: 18,
            background: palette(theme).bgRaised,
            color: palette(theme).text,
            border: `1px solid ${palette(theme).border}`,
            borderRadius: 12,
          }}
        >
          {subjects.length === 0 && <option value="">No subjects</option>}
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>
      <div style={{ height: 12 }} />
      <input
        type="text"
        value={draft.tagsRaw}
        placeholder="Tags (comma separated, max 8 × 24 chars)"
        onChange={(e) => setDraft((d) => ({ ...d, tagsRaw: e.target.value }))}
        onFocus={() => requestFocus(tagsId, 'qwerty')}
        onBlur={() => releaseFocus(tagsId)}
        data-touch-input={tagsId}
        style={inputStyle(theme, 16)}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <TouchButton theme={theme} size="md" variant="primary" onClick={onSave}>
          Save
        </TouchButton>
        <TouchButton theme={theme} size="md" variant="ghost" onClick={onCancel}>
          Cancel
        </TouchButton>
      </div>
      {/* Hidden anchor for the VirtualKeyboard — we use the design-
          system's onChange/value API so the keyboard writes through
          into the title/body/tags inputs. The composer manages the
          active input via requestFocus; the keyboard knows which
          field to update by listening to that focus. */}
      <div data-touch-anchor={titleId} style={{ display: 'none' }} />
    </TouchCard>
  );
}

function NoteRow(props: {
  theme: ThemeMode;
  note: NoteRecord;
  subjectName?: string;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const { theme, note, subjectName, selected, onSelect, onDelete } = props;
  const p = palette(theme);
  const rel = relativeTime(note.updatedAt);
  return (
    <TouchCard
      theme={theme}
      variant={selected ? 'accent' : 'raised'}
      onPointerUp={onSelect}
      style={{ minHeight: 72 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 20, fontWeight: 600,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            color: p.text,
          }}>
            {note.title || '(untitled)'}
          </div>
          <div style={{
            fontSize: 13, color: p.textMuted, marginTop: 2,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {subjectName ?? '—'} · {rel}
          </div>
          {note.tags.length > 0 && (
            <div style={{
              display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap',
            }}>
              {note.tags.slice(0, 3).map((t) => (
                <TagChip key={t} theme={theme} label={t} />
              ))}
              {note.tags.length > 3 && (
                <span style={{ fontSize: 12, color: p.textMuted, alignSelf: 'center' }}>
                  +{note.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
        <TouchIconButton
          theme={theme} ariaLabel="Delete note" icon="✕"
          onPointerUp={(e) => { e.stopPropagation(); onDelete(); }}
        />
      </div>
    </TouchCard>
  );
}

function TagChip({ theme, label }: { theme: ThemeMode; label: string }) {
  const p = palette(theme);
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      fontSize: 12,
      fontWeight: 600,
      background: p.bgRecessed,
      color: p.text,
      border: `1px solid ${p.border}`,
      borderRadius: 999,
    }}>
      {label}
    </span>
  );
}

// ---------- detail (right pane) ----------

function DetailPane(props: {
  theme: ThemeMode;
  note: NoteRecord | null;
  subjects: Subject[];
  onPatch: (patch: Partial<NoteRecord>) => void;
}) {
  const { theme, note, subjects, onPatch } = props;
  const { requestFocus, releaseFocus } = useTouchContext();
  const rawId = useId();

  // Local working copies; flushed to the server on debounce.
  const [title, setTitle] = useState(note?.title ?? '');
  const [body, setBody] = useState(note?.body ?? '');
  const [tagsRaw, setTagsRaw] = useState(note?.tags.join(', ') ?? '');
  const [subjectId, setSubjectId] = useState(note?.subjectId ?? '');

  // Re-sync the local buffers when the selected note changes
  // (e.g. user taps a different row in the master pane).
  useEffect(() => {
    setTitle(note?.title ?? '');
    setBody(note?.body ?? '');
    setTagsRaw(note?.tags.join(', ') ?? '');
    setSubjectId(note?.subjectId ?? '');
  }, [note?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced auto-save: 1s after the last keystroke, flush the
  // working buffer to the server. We compare against the server's
  // last-known value so we only PATCH fields that actually changed.
  const lastSavedRef = useRef<{
    title: string; body: string; tagsRaw: string; subjectId: string;
  }>({ title: note?.title ?? '', body: note?.body ?? '',
        tagsRaw: note?.tags.join(', ') ?? '', subjectId: note?.subjectId ?? '' });
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!note) return;
    const tags = parseTags(tagsRaw);
    const last = lastSavedRef.current;
    const dirty =
      title !== last.title ||
      body !== last.body ||
      subjectId !== last.subjectId ||
      tagsRaw !== last.tagsRaw;
    if (!dirty) return;
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      const patch: Partial<NoteRecord> = {};
      if (title !== note.title) patch.title = title;
      if (body !== note.body) patch.body = body;
      if (subjectId !== note.subjectId) patch.subjectId = subjectId;
      if (tagsRaw !== note.tags.join(', ')) patch.tags = tags;
      if (Object.keys(patch).length > 0) {
        onPatch(patch);
      }
      lastSavedRef.current = { title, body, tagsRaw, subjectId };
    }, AUTOSAVE_MS);
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [title, body, tagsRaw, subjectId, note, onPatch]);

  if (!note) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: 240,
        background: palette(theme).bgRecessed,
        border: `1px dashed ${palette(theme).border}`,
        borderRadius: 20,
        color: palette(theme).textMuted,
        fontSize: 18,
      }}>
        Select a note on the left, or tap ➕ to add one.
      </div>
    );
  }

  const p = palette(theme);
  const titleId = `detail-title-${rawId}`;
  const bodyId = `detail-body-${rawId}`;
  const tagsId = `detail-tags-${rawId}`;

  return (
    <TouchCard theme={theme} style={{ display: 'flex', flexDirection: 'column' }}>
      <input
        type="text"
        value={title}
        placeholder="Title"
        onChange={(e) => setTitle(e.target.value)}
        onFocus={() => requestFocus(titleId, 'qwerty')}
        onBlur={() => releaseFocus(titleId)}
        data-touch-input={titleId}
        style={{
          ...inputStyle(theme, 28),
          fontWeight: 700,
        }}
      />
      <div style={{ height: 12 }} />
      <textarea
        value={body}
        placeholder="Body…"
        onChange={(e) => setBody(e.target.value)}
        onFocus={() => requestFocus(bodyId, 'qwerty')}
        onBlur={() => releaseFocus(bodyId)}
        data-touch-input={bodyId}
        style={{
          ...inputStyle(theme, 18),
          minHeight: 200,
          resize: 'vertical',
          fontFamily: 'system-ui, sans-serif',
          lineHeight: 1.5,
        }}
      />
      <div style={{ height: 12 }} />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ fontSize: 14, color: p.textMuted }}>Subject:</label>
        <select
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          style={{
            minHeight: 64,
            padding: '0 16px',
            fontSize: 18,
            background: p.bgRaised,
            color: p.text,
            border: `1px solid ${p.border}`,
            borderRadius: 12,
          }}
        >
          {subjects.length === 0 && <option value="">No subjects</option>}
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>
      <div style={{ height: 8 }} />
      <input
        type="text"
        value={tagsRaw}
        placeholder="Tags (comma separated, max 8 × 24 chars)"
        onChange={(e) => setTagsRaw(e.target.value)}
        onFocus={() => requestFocus(tagsId, 'qwerty')}
        onBlur={() => releaseFocus(tagsId)}
        data-touch-input={tagsId}
        style={inputStyle(theme, 16)}
      />
      {note.tags.length > 0 && (
        <div style={{ display: 'flex', gap: 4, marginTop: 10, flexWrap: 'wrap' }}>
          {note.tags.map((t) => <TagChip key={t} theme={theme} label={t} />)}
        </div>
      )}
      <div style={{ marginTop: 12, fontSize: 12, color: p.textMuted }}>
        Saved {relativeTime(note.updatedAt)} · {note.revisionCount} revisions
      </div>
    </TouchCard>
  );
}

// ---------- helpers ----------

function inputStyle(theme: ThemeMode, fontSize: number) {
  const p = palette(theme);
  return {
    width: '100%',
    minHeight: 64,
    padding: '12px 16px',
    fontSize,
    background: p.bgRaised,
    color: p.text,
    border: `1px solid ${p.border}`,
    borderRadius: 12,
    outline: 'none',
    boxSizing: 'border-box' as const,
  };
}

function parseTags(raw: string): string[] {
  return raw
    .split(',')
    .map((t) => t.trim().slice(0, MAX_TAG_LEN))
    .filter((t) => t.length > 0)
    .slice(0, MAX_TAGS);
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const diff = Date.now() - then;
  const s = Math.round(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export { NotesApp as default };
