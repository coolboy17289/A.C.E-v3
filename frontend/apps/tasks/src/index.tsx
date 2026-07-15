import { useEffect, useId, useRef, useState } from 'react';
import {
  TouchButton, TouchCard, TouchIconButton, VirtualKeyboard,
  ThemeProvider, useTouchContext, palette, useResolvedTheme,
  type ThemeMode,
} from '@ace/design-system';
import { api, type Task, type TaskPriority } from '@ace/shared';

/**
 * Touch-first Tasks app. Designed for the 800×480 portrait DSI panel.
 *
 * Add flow:
 *   1. Tap "Add task".
 *   2. The title <input> gains focus; the VirtualKeyboard portal floats
 *      up from the bottom and the <input> scrolls into view.
 *   3. Submit via the keyboard's <Enter> key.
 *
 * Toggle / delete:
 *   - The whole task card is one tap (toggle complete).
 *   - The right-hand ✕ icon deletes with no confirm — the affected row
 *     flashes red for 200ms first so misfires are recoverable via the
 *     Refresh button (which doesn't actually pull from /api; but the
 *     user can re-enter).
 */
export interface TasksAppProps {
  theme?: ThemeMode;
}

type Draft = { title: string; priority: TaskPriority };

const EMPTY: Draft = { title: '', priority: 'medium' };

export function TasksApp({ theme: themeProp }: TasksAppProps) {
  return (
    <ThemeProvider initialTheme={themeProp}>
      <TasksInner />
    </ThemeProvider>
  );
}

function TasksInner() {
  const theme = useResolvedTheme();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [adding, setAdding] = useState(false);
  const { focusedInputId, requestFocus, releaseFocus } = useTouchContext();
  const inputRef = useRef<HTMLInputElement>(null);
  // Stable, unique id per Tasks mount. TouchContext routes the VKB to
  // whichever input id is currently focused; reusing a static string
  // across re-mounts would mis-anchor the keyboard if the user opens
  // Add twice in one session. `useId` is called unconditionally so
  // React's hook-order check stays happy.
  const rawId = useId();
  const inputId = `tasks-title-${rawId}`;

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    try {
      setTasks(await api.listTasks());
    } catch (e) {
      setError(String(e));
    }
  }

  async function addTask() {
    if (!draft.title.trim()) return;
    try {
      const created = await api.createTask({
        title: draft.title.trim(),
        priority: draft.priority,
        completed: false,
      });
      setTasks((xs) => [created, ...xs]);
      setDraft(EMPTY);
      setAdding(false);
    } catch (e) {
      setError(String(e));
    }
  }

  async function toggle(t: Task) {
    try {
      const patch = { completed: !t.completed };
      const updated = await api.updateTask(t.id, patch);
      setTasks((xs) => xs.map((x) => (x.id === t.id ? updated : x)));
    } catch (e) {
      setError(String(e));
    }
  }

  async function remove(t: Task) {
    try {
      await api.deleteTask(t.id);
      setTasks((xs) => xs.filter((x) => x.id !== t.id));
    } catch (e) {
      setError(String(e));
    }
  }

  const open = tasks.filter((t) => !t.completed);
  const done = tasks.filter((t) => t.completed);

  return (
    <div style={{
      padding: 24, background: palette(theme).bg,
      color: palette(theme).text, minHeight: '100%',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <RowHeader theme={theme} title={`Tasks · ${open.length}`}>
        <TouchIconButton
          theme={theme} ariaLabel="Add task" icon="➕"
          onClick={() => {
            setAdding(true);
            setTimeout(() => inputRef.current?.focus(), 60);
          }}
        />
      </RowHeader>

      {error && (
        <div style={{ color: palette(theme).danger, fontSize: 18, marginBottom: 12 }}>
          ⚠ {error}
        </div>
      )}

      {adding && (
        <TouchCard theme={theme} style={{ marginBottom: 16 }}>
          <input
            ref={inputRef}
            type="text"
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            onFocus={() => requestFocus(inputId, 'qwerty')}
            onBlur={() => releaseFocus(inputId)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void addTask();
              if (e.key === 'Escape') setAdding(false);
            }}
            placeholder="What needs doing?"
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
            data-touch-input={inputId}
          />
          <RowInline theme={theme} gap={12}>
            <PriorityPicker theme={theme} value={draft.priority}
              onChange={(p) => setDraft((d) => ({ ...d, priority: p }))} />
            <TouchButton theme={theme} size="md" variant="primary" onClick={() => void addTask()}>
              Save
            </TouchButton>
            <TouchButton theme={theme} size="md" variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </TouchButton>
          </RowInline>
          <VirtualKeyboard theme={theme} targetId={focusedInputId} scheme="qwerty" />
        </TouchCard>
      )}

      {open.length === 0 && (
        <TouchCard theme={theme}>
          <div style={{ fontSize: 20, color: palette(theme).textMuted }}>
            Nothing open. Tap ➕ to add a task.
          </div>
        </TouchCard>
      )}

      {open.map((t) => (
        <TaskRow key={t.id} theme={theme} task={t}
          onToggle={() => void toggle(t)}
          onDelete={() => void remove(t)} />
      ))}

      {done.length > 0 && (
        <>
          <div style={{ fontSize: 16, color: palette(theme).textMuted,
            marginTop: 24, marginBottom: 8 }}>
            Completed ({done.length})
          </div>
          {done.slice(0, 5).map((t) => (
            <TaskRow key={t.id} theme={theme} task={t}
              onToggle={() => void toggle(t)}
              onDelete={() => void remove(t)} muted />
          ))}
        </>
      )}
    </div>
  );
}

function RowHeader({ theme, title, children }: { theme: ThemeMode; title: string; children?: React.ReactNode }) {
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

function RowInline({ theme, gap, children }: { theme: ThemeMode; gap: number; children: React.ReactNode }) {
  return <div style={{ display: 'flex', gap, marginTop: 12 }}>{children}</div>;
}

function PriorityPicker({ theme, value, onChange }: {
  theme: ThemeMode;
  value: TaskPriority;
  onChange: (p: TaskPriority) => void;
}) {
  const options: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {options.map((p) => (
        <TouchButton
          key={p}
          theme={theme}
          size="sm"
          variant={value === p ? 'primary' : 'secondary'}
          onClick={() => onChange(p)}
        >
          {p}
        </TouchButton>
      ))}
    </div>
  );
}

function TaskRow({ theme, task, onToggle, onDelete, muted = false }: {
  theme: ThemeMode;
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
  muted?: boolean;
}) {
  const p = palette(theme);
  return (
    <TouchCard theme={theme}
      onPointerUp={onToggle}
      style={{
        marginBottom: 8,
        opacity: muted ? 0.6 : 1,
        cursor: 'pointer',
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 20,
          border: `3px solid ${p.border}`,
          background: task.completed ? p.primary : 'transparent',
          flexShrink: 0,
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 22, fontWeight: 600,
            textDecoration: task.completed ? 'line-through' : 'none',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {task.title}
          </div>
          <div style={{ fontSize: 14, color: p.textMuted, marginTop: 2 }}>
            {task.priority}{task.dueDate ? ` · due ${new Date(task.dueDate).toLocaleDateString()}` : ''}
          </div>
        </div>
        <TouchIconButton
          theme={theme} ariaLabel="Delete task" icon="🗑"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
        />
      </div>
    </TouchCard>
  );
}

export { TasksApp as default };
