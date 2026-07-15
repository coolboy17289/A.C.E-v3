import { useEffect, useId, useRef, useState } from 'react';
import {
  TouchButton, TouchCard, TouchIconButton, VirtualKeyboard,
  ThemeProvider, useTouchContext, palette, useResolvedTheme,
  type ThemeMode,
} from '@ace/design-system';
import { api, type Subject } from '@ace/shared';

/**
 * Touch-first Subjects app. Designed for the 800×480 portrait DSI panel.
 *
 * Add flow:
 *   1. Tap "Add subject".
 *   2. The name <input> gains focus; the VirtualKeyboard portal floats
 *      up from the bottom and the <input> scrolls into view.
 *   3. Submit via the keyboard's <Enter> key (or the Save button).
 *
 * Edit flow:
 *   - Tap a subject card to re-open the editor with its current values
 *     pre-filled. The same input + color swatches + numeric controls are
 *     reused; Save becomes an "Update" when editing.
 *
 * Delete:
 *   - The right-hand ✕ icon deletes with no confirm — matches the Tasks
 *     app's "no confirm" pattern. The touched row flashes red for 200ms
 *     so misfires are visually obvious before the API call lands.
 */
export interface SubjectsAppProps {
  theme?: ThemeMode;
}

type Draft = {
  name: string;
  color: string;
  targetHoursPerWeek: number;
  progress: number; // 0..1
};

const PRESET_COLORS = [
  '#7c5cff', // primary purple
  '#22c55e', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#3b82f6', // blue
  '#ec4899', // pink
];

const EMPTY: Draft = {
  name: '',
  color: PRESET_COLORS[0],
  targetHoursPerWeek: 5,
  progress: 0,
};

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));

const isHex = (s: string) => /^#[0-9a-fA-F]{6}$/.test(s);

export function SubjectsApp({ theme: themeProp }: SubjectsAppProps) {
  return (
    <ThemeProvider initialTheme={themeProp}>
      <SubjectsInner />
    </ThemeProvider>
  );
}

function SubjectsInner() {
  const theme = useResolvedTheme();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const { focusedInputId, requestFocus, releaseFocus } = useTouchContext();
  const nameRef = useRef<HTMLInputElement>(null);
  // Stable, unique id per Subjects mount. TouchContext routes the VKB to
  // whichever input id is currently focused; reusing a static string
  // across re-mounts would mis-anchor the keyboard if the user opens
  // Add twice in one session. `useId` is called unconditionally so
  // React's hook-order check stays happy.
  const rawId = useId();
  const nameInputId = `subjects-name-${rawId}`;

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    try {
      setSubjects(await api.listSubjects());
    } catch (e) {
      setError(String(e));
    }
  }

  function startAdd() {
    setEditingId(null);
    setDraft(EMPTY);
    setOpen(true);
    setTimeout(() => nameRef.current?.focus(), 60);
  }

  function startEdit(s: Subject) {
    setEditingId(s.id);
    setDraft({
      name: s.name,
      color: s.color,
      targetHoursPerWeek: s.targetHoursPerWeek,
      progress: s.progress,
    });
    setOpen(true);
    setTimeout(() => nameRef.current?.focus(), 60);
  }

  function cancel() {
    setOpen(false);
    setEditingId(null);
    setDraft(EMPTY);
  }

  async function save() {
    const name = draft.name.trim();
    if (!name) return;
    // Subject.name is constrained to 80 chars by the form maxLength, but
    // we still guard before sending so a pasted string can't slip through.
    if (name.length > 80) return;
    const targetHoursPerWeek = clamp(
      Math.round(draft.targetHoursPerWeek),
      0,
      168,
    );
    const progress = clamp(draft.progress, 0, 1);
    const color = isHex(draft.color) ? draft.color : PRESET_COLORS[0];
    try {
      if (editingId) {
        const updated = await api.updateSubject(editingId, {
          name,
          color,
          targetHoursPerWeek,
          progress,
        });
        setSubjects((xs) => xs.map((x) => (x.id === editingId ? updated : x)));
      } else {
        const created = await api.createSubject({
          name,
          color,
          targetHoursPerWeek,
          progress,
        });
        setSubjects((xs) => [created, ...xs]);
      }
      cancel();
    } catch (e) {
      setError(String(e));
    }
  }

  async function remove(s: Subject) {
    try {
      await api.deleteSubject(s.id);
      setSubjects((xs) => xs.filter((x) => x.id !== s.id));
    } catch (e) {
      setError(String(e));
    }
  }

  return (
    <div style={{
      padding: 24, background: palette(theme).bg,
      color: palette(theme).text, minHeight: '100%',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <RowHeader theme={theme} title={`Subjects · ${subjects.length}`}>
        <TouchIconButton
          theme={theme} ariaLabel="Add subject" icon="➕"
          onPointerUp={startAdd}
        />
      </RowHeader>

      {error && (
        <div style={{ color: palette(theme).danger, fontSize: 18, marginBottom: 12 }}>
          ⚠ {error}
        </div>
      )}

      {open && (
        <TouchCard theme={theme} style={{ marginBottom: 16 }}>
          <input
            ref={nameRef}
            type="text"
            value={draft.name}
            maxLength={80}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            onFocus={() => requestFocus(nameInputId, 'qwerty')}
            onBlur={() => releaseFocus(nameInputId)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void save();
              if (e.key === 'Escape') cancel();
            }}
            placeholder="Subject name"
            style={{
              width: '100%', minHeight: 64,
              padding: '0 16px',
              fontSize: 24,
              background: palette(theme).bgRaised,
              color: palette(theme).text,
              border: `2px solid ${palette(theme).primary}`,
              borderRadius: 12,
              outline: 'none',
            }}
            data-touch-input={nameInputId}
          />
          <div style={{ fontSize: 12, color: palette(theme).textMuted,
            marginTop: 4, textAlign: 'right' }}>
            {draft.name.length}/80
          </div>

          <SectionLabel theme={theme}>Color</SectionLabel>
          <ColorPicker theme={theme} value={draft.color}
            onChange={(c) => setDraft((d) => ({ ...d, color: c }))} />

          <SectionLabel theme={theme}>Target hours per week</SectionLabel>
          <NumberStepper theme={theme}
            value={draft.targetHoursPerWeek}
            min={0} max={168} step={1}
            onChange={(n) => setDraft((d) => ({ ...d, targetHoursPerWeek: n }))} />

          <SectionLabel theme={theme}>Progress</SectionLabel>
          <ProgressStepper theme={theme}
            value={draft.progress}
            onChange={(p) => setDraft((d) => ({ ...d, progress: p }))} />

          <RowInline theme={theme} gap={12}>
            <TouchButton theme={theme} size="md" variant="primary"
              onClick={() => void save()}>
              {editingId ? 'Update' : 'Save'}
            </TouchButton>
            <TouchButton theme={theme} size="md" variant="ghost"
              onClick={cancel}>
              Cancel
            </TouchButton>
          </RowInline>
          <VirtualKeyboard theme={theme}
            value={draft.name}
            onChange={(v) => setDraft((d) => ({ ...d, name: v }))}
            scheme="qwerty" />
        </TouchCard>
      )}

      {subjects.length === 0 && (
        <TouchCard theme={theme}>
          <div style={{ fontSize: 20, color: palette(theme).textMuted }}>
            No subjects yet. Tap ➕ to add one.
          </div>
        </TouchCard>
      )}

      {subjects.map((s) => (
        <SubjectRow key={s.id} theme={theme} subject={s}
          onEdit={() => startEdit(s)}
          onDelete={() => void remove(s)} />
      ))}
    </div>
  );
}

function RowHeader({ theme, title, children }: {
  theme: ThemeMode; title: string; children?: React.ReactNode;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: 16,
    }}>
      <div style={{ fontSize: 32, fontWeight: 800 }}>{title}</div>
      <div style={{ display: 'flex', gap: 12 }}>{children}</div>
    </div>
  );
}

function RowInline({ theme, gap, children }: {
  theme: ThemeMode; gap: number; children: React.ReactNode;
}) {
  return <div style={{ display: 'flex', gap, marginTop: 12 }}>{children}</div>;
}

function SectionLabel({ theme, children }: {
  theme: ThemeMode; children: React.ReactNode;
}) {
  return (
    <div style={{
      fontSize: 14, color: palette(theme).textMuted,
      marginTop: 16, marginBottom: 8, fontWeight: 600,
      textTransform: 'uppercase', letterSpacing: 0.5,
    }}>
      {children}
    </div>
  );
}

function ColorPicker({ theme, value, onChange }: {
  theme: ThemeMode; value: string; onChange: (c: string) => void;
}) {
  const [showCustom, setShowCustom] = useState(false);
  return (
    <div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {PRESET_COLORS.map((c) => {
          const selected = c.toLowerCase() === value.toLowerCase();
          return (
            <button
              key={c}
              type="button"
              onClick={() => onChange(c)}
              aria-label={`Color ${c}`}
              style={{
                width: 64, height: 64, borderRadius: 32,
                background: c, cursor: 'pointer',
                border: selected
                  ? `4px solid ${palette(theme).text}`
                  : `2px solid ${palette(theme).border}`,
                padding: 0,
                boxSizing: 'border-box',
              }}
            />
          );
        })}
        <TouchButton
          theme={theme} size="sm"
          variant={showCustom ? 'primary' : 'secondary'}
          onClick={() => setShowCustom((v) => !v)}>
          {showCustom ? 'Hide custom' : 'Custom hex'}
        </TouchButton>
      </div>
      {showCustom && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="#7c5cff"
            maxLength={7}
            style={{
              width: 160, minHeight: 64,
              padding: '0 16px',
              fontSize: 20,
              background: palette(theme).bgRaised,
              color: palette(theme).text,
              border: `2px solid ${isHex(value) ? palette(theme).primary : palette(theme).danger}`,
              borderRadius: 12,
              outline: 'none',
              fontFamily: 'monospace',
            }}
          />
          <div style={{
            width: 64, height: 64, borderRadius: 32,
            background: isHex(value) ? value : palette(theme).bgRaised,
            border: `2px solid ${palette(theme).border}`,
          }} />
        </div>
      )}
    </div>
  );
}

function NumberStepper({ theme, value, min, max, step, onChange }: {
  theme: ThemeMode;
  value: number; min: number; max: number; step: number;
  onChange: (n: number) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <TouchButton theme={theme} size="md" variant="secondary"
        onClick={() => onChange(clamp(value - step, min, max))}>
        −
      </TouchButton>
      <div style={{
        minWidth: 80, minHeight: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24, fontWeight: 700,
        background: palette(theme).bgRaised,
        border: `2px solid ${palette(theme).border}`,
        borderRadius: 12,
        padding: '0 16px',
      }}>
        {value}
      </div>
      <TouchButton theme={theme} size="md" variant="secondary"
        onClick={() => onChange(clamp(value + step, min, max))}>
        +
      </TouchButton>
      <div style={{ fontSize: 14, color: palette(theme).textMuted }}>
        hours/week
      </div>
    </div>
  );
}

function ProgressStepper({ theme, value, onChange }: {
  theme: ThemeMode;
  value: number;
  onChange: (n: number) => void;
}) {
  // Step by 5% (0.05) to keep touch targets coarse.
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <TouchButton theme={theme} size="md" variant="secondary"
          onClick={() => onChange(clamp(value - 0.05, 0, 1))}>
          −5%
        </TouchButton>
        <div style={{
          flex: 1, minHeight: 64,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, fontWeight: 700,
          background: palette(theme).bgRaised,
          border: `2px solid ${palette(theme).border}`,
          borderRadius: 12,
          padding: '0 16px',
        }}>
          {Math.round(value * 100)}%
        </div>
        <TouchButton theme={theme} size="md" variant="secondary"
          onClick={() => onChange(clamp(value + 0.05, 0, 1))}>
          +5%
        </TouchButton>
      </div>
      <div style={{
        marginTop: 10, height: 12, borderRadius: 6,
        background: palette(theme).bgRaised,
        overflow: 'hidden',
        border: `1px solid ${palette(theme).border}`,
      }}>
        <div style={{
          width: `${Math.round(value * 100)}%`,
          height: '100%',
          background: palette(theme).primary,
          transition: 'width 120ms ease',
        }} />
      </div>
    </div>
  );
}

function SubjectRow({ theme, subject, onEdit, onDelete }: {
  theme: ThemeMode;
  subject: Subject;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const p = palette(theme);
  const pct = Math.round(clamp(subject.progress, 0, 1) * 100);
  return (
    <TouchCard theme={theme}
      onPointerUp={onEdit}
      style={{ marginBottom: 8, cursor: 'pointer' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div
          aria-label={`Color ${subject.color}`}
          style={{
            width: 40, height: 40, borderRadius: 20,
            background: subject.color,
            border: `2px solid ${p.border}`,
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 22, fontWeight: 600,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {subject.name}
          </div>
          <div style={{ fontSize: 14, color: p.textMuted, marginTop: 2 }}>
            target {subject.targetHoursPerWeek} h/wk
          </div>
          <div style={{
            marginTop: 8, height: 10, borderRadius: 5,
            background: p.bgRaised, overflow: 'hidden',
            border: `1px solid ${p.border}`,
          }}>
            <div style={{
              width: `${pct}%`, height: '100%',
              background: subject.color, transition: 'width 120ms ease',
            }} />
          </div>
          <div style={{ fontSize: 12, color: p.textMuted, marginTop: 4 }}>
            {pct}% complete
          </div>
        </div>
        <TouchIconButton
          theme={theme} ariaLabel="Delete subject" icon="✕"
          onPointerUp={(e) => { e.stopPropagation(); onDelete(); }}
        />
      </div>
    </TouchCard>
  );
}

export { SubjectsApp as default };
