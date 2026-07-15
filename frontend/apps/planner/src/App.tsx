import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  TouchButton, TouchCard, TouchIconButton, VirtualKeyboard,
  ThemeProvider, useTouchContext, palette, useResolvedTheme,
  type ThemeMode,
} from '@ace/design-system';
import { api, type CalendarEvent, type Subject } from '@ace/shared';

/**
 * Touch-first Planner app. Designed for the 800×480 portrait DSI panel.
 *
 * Two views, toggled by tabs at the top:
 *
 *   Today — chronological list of events for "today" (local-time
 *           midnight to midnight). Each card shows time, type as a
 *           color stripe, title, and location. Tap a card to delete
 *           (no confirm, matches Tasks).
 *
 *   Week  — 7-column grid, one column per day of the current week
 *           (Mon..Sun, locale-anchored to today). Each column shows
 *           the day short-name + event count; if any event on that
 *           day is an `exam`, a colored dot appears next to the
 *           count. Tapping a column expands that day's events below
 *           the grid, with the same delete-on-tap semantics.
 *
 * Add flow:
 *   1. Tap "Add event".
 *   2. The title <input> gains focus; the VirtualKeyboard portal
 *      floats up from the bottom and the <input> scrolls into view.
 *   3. The type is a segmented control, start/end are ISO datetimes
 *      (validated: end > start), subjectId is an optional dropdown
 *      pulled from api.subjects.list, location + notes are optional.
 *   4. Submit via the keyboard's <Enter> key, or the explicit Save.
 */
export interface PlannerAppProps {
  theme?: ThemeMode;
}

type EventType = CalendarEvent['type'];

type Draft = {
  title: string;
  type: EventType;
  start: string;   // datetime-local string (YYYY-MM-DDTHH:mm)
  end: string;     // datetime-local string (YYYY-MM-DDTHH:mm)
  subjectId: string | null;
  location: string;
  notes: string;
};

const TYPE_OPTIONS: EventType[] = ['assignment', 'exam', 'class', 'session', 'event'];

// Per-type accent colors. Used for the left color stripe on each
// card in the Today list, the badge in the week-grid count, and the
// dot indicator. Picked from a hue-spread palette so all five are
// distinguishable on the kiosk panel.
const TYPE_COLORS: Record<EventType, string> = {
  assignment: '#f59e0b', // amber
  exam:       '#ef4444', // red
  class:      '#3b82f6', // blue
  session:    '#22c55e', // green
  event:      '#a06cff', // accent purple
};

function nowLocalInputValue(d: Date = new Date()): string {
  // datetime-local needs YYYY-MM-DDTHH:mm in *local* time. The
  // browser's `<input type="datetime-local">` will display the value
  // verbatim, so we deliberately avoid `toISOString()` (which would
  // shift the user's local time into UTC and the picker would
  // display an hour earlier/forward).
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function inputValueToIso(v: string): string {
  // The picker gives us a wall-clock local time. Convert to an ISO
  // string (UTC) so the backend stores a stable point-in-time.
  if (!v) return new Date().toISOString();
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfWeek(d: Date): Date {
  // Anchor the week on Monday so the columns are Mon..Sun. This is
  // deliberate; locales that prefer Sunday-start can still read it
  // because the short day name is always rendered on the column.
  const x = startOfDay(d);
  const day = (x.getDay() + 6) % 7; // Mon=0, Sun=6
  x.setDate(x.getDate() - day);
  return x;
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function formatDateLabel(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

function eventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  const a = startOfDay(day).getTime();
  const b = a + 24 * 60 * 60 * 1000;
  return events
    .filter((e) => {
      const t = new Date(e.start).getTime();
      return t >= a && t < b;
    })
    .sort((x, y) => new Date(x.start).getTime() - new Date(y.start).getTime());
}

export function PlannerApp({ theme: themeProp }: PlannerAppProps) {
  return (
    <ThemeProvider initialTheme={themeProp}>
      <PlannerInner />
    </ThemeProvider>
  );
}

function PlannerInner() {
  const theme = useResolvedTheme();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'today' | 'week'>('today');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  // The focused field id determines which input the VirtualKeyboard
  // types into. We use one keyboard instance and just rotate its
  // target via the touch context.
  const { requestFocus, releaseFocus } = useTouchContext();
  const titleRef = useRef<HTMLInputElement>(null);
  const rawId = useId();
  const inputId = (field: string) => `planner-${field}-${rawId}`;

  useEffect(() => { void refresh(); }, []);

  async function refresh() {
    try {
      // Calendar first (the primary data); subjects are best-effort —
      // a backend miss shouldn't blank the planner.
      const [evs, subs] = await Promise.all([
        api.calendar.list().catch((e) => { setError(String(e)); return []; }),
        api.listSubjects().catch(() => []),
      ]);
      setEvents(evs);
      setSubjects(subs);
    } catch (e) {
      setError(String(e));
    }
  }

  function openAdd() {
    // Default the new draft to "now" (start) and "one hour from now"
    // (end) so the form is always submittable; the user can edit the
    // datetimes before saving.
    const start = new Date();
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    setDraft({
      title: '',
      type: 'event',
      start: nowLocalInputValue(start),
      end: nowLocalInputValue(end),
      subjectId: null,
      location: '',
      notes: '',
    });
    setTimeout(() => titleRef.current?.focus(), 60);
  }

  function closeDraft() {
    setDraft(null);
  }

  async function save() {
    if (!draft) return;
    const title = draft.title.trim();
    if (!title) return;
    const startIso = inputValueToIso(draft.start);
    const endIso = inputValueToIso(draft.end);
    if (new Date(endIso).getTime() <= new Date(startIso).getTime()) {
      setError('End must be after start');
      return;
    }
    try {
      const body: Omit<CalendarEvent, 'id'> = {
        title,
        type: draft.type,
        start: startIso,
        end: endIso,
      };
      if (draft.subjectId) body.subjectId = draft.subjectId;
      if (draft.location.trim()) body.location = draft.location.trim();
      if (draft.notes.trim()) body.notes = draft.notes.trim();
      const created = await api.calendar.create(body);
      setEvents((xs) => [...xs, created]);
      setDraft(null);
    } catch (e) {
      setError(String(e));
    }
  }

  async function remove(ev: CalendarEvent) {
    try {
      await api.calendar.delete(ev.id);
      setEvents((xs) => xs.filter((x) => x.id !== ev.id));
    } catch (e) {
      setError(String(e));
    }
  }

  const today = useMemo(() => eventsForDay(events, new Date()), [events]);
  const week = useMemo(() => {
    const monday = startOfWeek(new Date());
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      return { date: day, events: eventsForDay(events, day) };
    });
  }, [events]);

  return (
    <div style={{
      padding: 24, background: palette(theme).bg,
      color: palette(theme).text, minHeight: '100%',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <RowHeader theme={theme} title="Planner">
        <TouchIconButton
          theme={theme} ariaLabel="Add event" icon="➕"
          onPointerUp={openAdd}
        />
      </RowHeader>

      <ViewTabs theme={theme} value={view} onChange={setView} />

      {error && (
        <div style={{ color: palette(theme).danger, fontSize: 18, marginBottom: 12 }}>
          ⚠ {error}
        </div>
      )}

      {draft && (
        <DraftCard
          theme={theme}
          draft={draft}
          subjects={subjects}
          inputId={inputId}
          titleRef={titleRef}
          onTitleFocus={() => requestFocus(inputId('title'), 'qwerty')}
          onTitleBlur={() => releaseFocus(inputId('title'))}
          onLocationFocus={() => requestFocus(inputId('location'), 'qwerty')}
          onLocationBlur={() => releaseFocus(inputId('location'))}
          onNotesFocus={() => requestFocus(inputId('notes'), 'qwerty')}
          onNotesBlur={() => releaseFocus(inputId('notes'))}
          onChange={(patch) => setDraft((d) => (d ? { ...d, ...patch } : d))}
          onSave={() => void save()}
          onCancel={closeDraft}
          onTypeChange={(t) => setDraft((d) => (d ? { ...d, type: t } : d))}
        />
      )}

      {view === 'today' ? (
        <TodayView theme={theme} events={today} onDelete={(e) => void remove(e)} />
      ) : (
        <WeekView
          theme={theme}
          week={week}
          selectedDay={selectedDay}
          onSelectDay={(d) => setSelectedDay((cur) => (cur && cur.getTime() === d.getTime() ? null : d))}
          onDelete={(e) => void remove(e)}
        />
      )}
    </div>
  );
}

// --------------------------------------------------------------------------
// Header + view-tabs
// --------------------------------------------------------------------------

function RowHeader({ theme, title, children }: {
  theme: ThemeMode;
  title: string;
  children?: React.ReactNode;
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

function ViewTabs({ theme, value, onChange }: {
  theme: ThemeMode;
  value: 'today' | 'week';
  onChange: (v: 'today' | 'week') => void;
}) {
  // Two large tabs that always sum to a full-width row. Each is
  // 64px+ tall (touch target) and labeled with the view name.
  return (
    <div style={{
      display: 'flex', gap: 8, marginBottom: 16,
    }}>
      <TouchButton
        theme={theme}
        size="md"
        variant={value === 'today' ? 'primary' : 'secondary'}
        onClick={() => onChange('today')}
        style={{ flex: 1 }}
      >
        Today
      </TouchButton>
      <TouchButton
        theme={theme}
        size="md"
        variant={value === 'week' ? 'primary' : 'secondary'}
        onClick={() => onChange('week')}
        style={{ flex: 1 }}
      >
        Week
      </TouchButton>
    </div>
  );
}

// --------------------------------------------------------------------------
// Today view
// --------------------------------------------------------------------------

function TodayView({ theme, events, onDelete }: {
  theme: ThemeMode;
  events: CalendarEvent[];
  onDelete: (e: CalendarEvent) => void;
}) {
  return (
    <>
      <div style={{
        fontSize: 14, color: palette(theme).textMuted,
        marginBottom: 8, fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: 0.5,
      }}>
        {formatDateLabel(new Date())} · {events.length}
      </div>

      {events.length === 0 && (
        <TouchCard theme={theme}>
          <div style={{ fontSize: 20, color: palette(theme).textMuted }}>
            Nothing scheduled today. Tap ➕ to add an event.
          </div>
        </TouchCard>
      )}

      {events.map((e) => (
        <EventRow
          key={e.id}
          theme={theme}
          event={e}
          onDelete={() => onDelete(e)}
        />
      ))}
    </>
  );
}

// --------------------------------------------------------------------------
// Week view
// --------------------------------------------------------------------------

function WeekView({ theme, week, selectedDay, onSelectDay, onDelete }: {
  theme: ThemeMode;
  week: { date: Date; events: CalendarEvent[] }[];
  selectedDay: Date | null;
  onSelectDay: (d: Date) => void;
  onDelete: (e: CalendarEvent) => void;
}) {
  const today = startOfDay(new Date()).getTime();
  const selectedEvents = selectedDay
    ? week.find((w) => startOfDay(w.date).getTime() === startOfDay(selectedDay).getTime())?.events ?? []
    : [];

  return (
    <>
      <div style={{
        fontSize: 14, color: palette(theme).textMuted,
        marginBottom: 8, fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: 0.5,
      }}>
        Week of {week[0]?.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 6,
        marginBottom: 16,
      }}>
        {week.map(({ date, events }) => {
          const isToday = startOfDay(date).getTime() === today;
          const isSelected = selectedDay != null
            && startOfDay(date).getTime() === startOfDay(selectedDay).getTime();
          const hasExam = events.some((e) => e.type === 'exam');
          return (
            <DayColumn
              key={date.toISOString()}
              theme={theme}
              date={date}
              count={events.length}
              hasExam={hasExam}
              isToday={isToday}
              isSelected={isSelected}
              onSelect={() => onSelectDay(date)}
            />
          );
        })}
      </div>

      {selectedDay && (
        <>
          <div style={{
            fontSize: 14, color: palette(theme).textMuted,
            marginBottom: 8, fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: 0.5,
          }}>
            {formatDateLabel(selectedDay)} · {selectedEvents.length}
          </div>
          {selectedEvents.length === 0 ? (
            <TouchCard theme={theme}>
              <div style={{ fontSize: 18, color: palette(theme).textMuted }}>
                No events.
              </div>
            </TouchCard>
          ) : (
            selectedEvents.map((e) => (
              <EventRow
                key={e.id}
                theme={theme}
                event={e}
                onDelete={() => onDelete(e)}
              />
            ))
          )}
        </>
      )}
    </>
  );
}

function DayColumn({ theme, date, count, hasExam, isToday, isSelected, onSelect }: {
  theme: ThemeMode;
  date: Date;
  count: number;
  hasExam: boolean;
  isToday: boolean;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const dayName = DAY_NAMES[(date.getDay() + 6) % 7]; // Mon..Sun
  const dayNum = date.getDate();
  return (
    <TouchCard
      theme={theme}
      variant={isSelected ? 'accent' : isToday ? 'raised' : 'flat'}
      onPointerUp={onSelect}
      style={{
        minHeight: 96,
        padding: 8,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        cursor: 'pointer',
        border: isToday && !isSelected
          ? `2px solid ${palette(theme).primary}`
          : undefined,
      }}
      ariaLabel={`${dayName} ${dayNum}, ${count} events`}
    >
      <div style={{
        fontSize: 12, color: palette(theme).textMuted,
        fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5,
      }}>
        {dayName}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800 }}>{dayNum}</div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        fontSize: 14, color: palette(theme).textMuted,
      }}>
        <span>{count}</span>
        {hasExam && (
          <span
            aria-label="Exam scheduled"
            style={{
              display: 'inline-block',
              width: 10, height: 10, borderRadius: 5,
              background: TYPE_COLORS.exam,
            }}
          />
        )}
      </div>
    </TouchCard>
  );
}

// --------------------------------------------------------------------------
// Event row (shared between Today + Week views)
// --------------------------------------------------------------------------

function EventRow({ theme, event, onDelete }: {
  theme: ThemeMode;
  event: CalendarEvent;
  onDelete: () => void;
}) {
  const p = palette(theme);
  const stripe = TYPE_COLORS[event.type];
  return (
    <TouchCard
      theme={theme}
      onPointerUp={onDelete}
      style={{
        marginBottom: 8,
        cursor: 'pointer',
        position: 'relative',
        paddingLeft: 24,
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: 0, top: 0, bottom: 0,
          width: 8,
          background: stripe,
          borderRadius: '12px 0 0 12px',
        }}
      />
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 14, color: stripe, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: 0.5,
          }}>
            {event.type}
          </div>
          <div style={{
            fontSize: 22, fontWeight: 600, marginTop: 2,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {event.title}
          </div>
          <div style={{ fontSize: 16, color: p.textMuted, marginTop: 4 }}>
            {formatTime(event.start)} – {formatTime(event.end)}
            {event.location ? ` · ${event.location}` : ''}
          </div>
        </div>
        <TouchIconButton
          theme={theme} ariaLabel="Delete event" icon="✕"
          onPointerUp={(e) => { e.stopPropagation(); onDelete(); }}
        />
      </div>
    </TouchCard>
  );
}

// --------------------------------------------------------------------------
// Add-event draft card
// --------------------------------------------------------------------------

interface DraftCardProps {
  theme: ThemeMode;
  draft: Draft;
  subjects: Subject[];
  inputId: (field: string) => string;
  titleRef: React.RefObject<HTMLInputElement>;
  onTitleFocus: () => void;
  onTitleBlur: () => void;
  onLocationFocus: () => void;
  onLocationBlur: () => void;
  onNotesFocus: () => void;
  onNotesBlur: () => void;
  onChange: (patch: Partial<Draft>) => void;
  onTypeChange: (t: EventType) => void;
  onSave: () => void;
  onCancel: () => void;
}

function DraftCard(props: DraftCardProps) {
  const { theme, draft, subjects, inputId, titleRef } = props;
  const p = palette(theme);
  return (
    <TouchCard theme={theme} style={{ marginBottom: 16 }}>
      <SectionLabel theme={theme}>Title</SectionLabel>
      <input
        ref={titleRef}
        type="text"
        value={draft.title}
        onChange={(e) => props.onChange({ title: e.target.value })}
        onFocus={props.onTitleFocus}
        onBlur={props.onTitleBlur}
        onKeyDown={(e) => {
          if (e.key === 'Enter') props.onSave();
          if (e.key === 'Escape') props.onCancel();
        }}
        placeholder="Event title"
        style={inputStyle(p)}
        data-touch-input={inputId('title')}
      />

      <SectionLabel theme={theme}>Type</SectionLabel>
      <TypeSegmented theme={theme} value={draft.type} onChange={props.onTypeChange} />

      <SectionLabel theme={theme}>Start</SectionLabel>
      <input
        type="datetime-local"
        value={draft.start}
        onChange={(e) => props.onChange({ start: e.target.value })}
        style={inputStyle(p)}
      />

      <SectionLabel theme={theme}>End</SectionLabel>
      <input
        type="datetime-local"
        value={draft.end}
        onChange={(e) => props.onChange({ end: e.target.value })}
        style={inputStyle(p)}
      />

      <SectionLabel theme={theme}>Subject (optional)</SectionLabel>
      <SubjectDropdown
        theme={theme}
        subjects={subjects}
        value={draft.subjectId}
        onChange={(subjectId) => props.onChange({ subjectId })}
      />

      <SectionLabel theme={theme}>Location (optional)</SectionLabel>
      <input
        type="text"
        value={draft.location}
        onChange={(e) => props.onChange({ location: e.target.value })}
        onFocus={props.onLocationFocus}
        onBlur={props.onLocationBlur}
        placeholder="e.g. Room 12"
        style={inputStyle(p)}
        data-touch-input={inputId('location')}
      />

      <SectionLabel theme={theme}>Notes (optional)</SectionLabel>
      <textarea
        value={draft.notes}
        onChange={(e) => props.onChange({ notes: e.target.value })}
        onFocus={props.onNotesFocus}
        onBlur={props.onNotesBlur}
        placeholder="Anything to remember…"
        rows={2}
        style={{
          ...inputStyle(p),
          resize: 'vertical',
          padding: '12px 16px',
          fontFamily: 'system-ui, sans-serif',
        }}
        data-touch-input={inputId('notes')}
      />

      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        <TouchButton
          theme={theme} size="md" variant="primary"
          onClick={props.onSave}
          disabled={!draft.title.trim()}
        >
          Save
        </TouchButton>
        <TouchButton
          theme={theme} size="md" variant="ghost"
          onClick={props.onCancel}
        >
          Cancel
        </TouchButton>
      </div>
    </TouchCard>
  );
}

function inputStyle(p: ReturnType<typeof palette>): React.CSSProperties {
  return {
    width: '100%', minHeight: 64,
    padding: '0 16px',
    fontSize: 22,
    background: p.bgRaised,
    color: p.text,
    border: `2px solid ${p.border}`,
    borderRadius: 12,
    outline: 'none',
  };
}

function SectionLabel({ theme, children }: {
  theme: ThemeMode;
  children: React.ReactNode;
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

function TypeSegmented({ theme, value, onChange }: {
  theme: ThemeMode;
  value: EventType;
  onChange: (t: EventType) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {TYPE_OPTIONS.map((t) => {
        const selected = t === value;
        const color = TYPE_COLORS[t];
        return (
          <button
            key={t}
            type="button"
            onClick={() => onChange(t)}
            aria-pressed={selected}
            style={{
              minHeight: 64,
              minWidth: 96,
              padding: '0 16px',
              fontSize: 16,
              fontWeight: 700,
              background: selected ? color : palette(theme).bgRaised,
              color: selected ? '#0b1020' : palette(theme).text,
              border: `2px solid ${selected ? color : palette(theme).border}`,
              borderRadius: 12,
              cursor: 'pointer',
              touchAction: 'manipulation',
              textTransform: 'capitalize',
            }}
          >
            {t}
          </button>
        );
      })}
    </div>
  );
}

function SubjectDropdown({ theme, subjects, value, onChange }: {
  theme: ThemeMode;
  subjects: Subject[];
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  // A TouchButton-based dropdown would be nice, but plain native
  // `<select>` is the most reliable on the kiosk panel — the OS
  // provides the touch-friendly picker on the Pi's Chromium build.
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      style={{
        width: '100%', minHeight: 64,
        padding: '0 16px',
        fontSize: 20,
        background: palette(theme).bgRaised,
        color: palette(theme).text,
        border: `2px solid ${palette(theme).border}`,
        borderRadius: 12,
        outline: 'none',
        appearance: 'none',
      }}
    >
      <option value="">— None —</option>
      {subjects.map((s) => (
        <option key={s.id} value={s.id}>{s.name}</option>
      ))}
    </select>
  );
}

export { PlannerApp as default };
