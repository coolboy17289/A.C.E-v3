import { useEffect, useMemo, useState } from 'react';
import {
  TouchCard,
  ThemeProvider, useResolvedTheme,
  palette,
  type ThemeMode,
} from '@ace/design-system';
import { api, type FocusSession, type Task, type Subject } from '@ace/shared';

/**
 * Touch-first Statistics app for the 800x480 kiosk panel.
 *
 * Top: range pills (Today / 7d / 30d) — re-derive every chart on tap.
 * Middle: 3 stat tiles (Focus minutes / Tasks completed / Active subjects)
 *         each with a delta vs the immediately previous window of the
 *         same length.
 * Bottom: pure-SVG bar chart of focus minutes/day + a pure-SVG donut
 *         of completed-tasks grouped by subject. No chart libraries —
 *         the kiosk has to boot on a Pi 4 with a 4MB preload.
 */
export interface StatisticsAppProps {
  theme?: ThemeMode;
}

type Range = 'today' | '7d' | '30d';

const RANGE_DAYS: Record<Range, number> = { today: 1, '7d': 7, '30d': 30 };

const RANGE_PILLS: { id: Range; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: '7d',    label: '7 days' },
  { id: '30d',   label: '30 days' },
];

// Subject fallback colours — cycled when a task's subjectId isn't in
// the /api/subjects list (e.g. legacy task with deleted subject).
const SUBJECT_FALLBACK = ['#3da8ff', '#a06cff', '#ffd166', '#7fe0a8', '#ff5e6c', '#5cb6ff'];

export function StatisticsApp({ theme: themeProp }: StatisticsAppProps) {
  return (
    <ThemeProvider initialTheme={themeProp}>
      <StatisticsInner />
    </ThemeProvider>
  );
}

export default StatisticsApp;

function StatisticsInner() {
  const theme = useResolvedTheme();
  const p = palette(theme);

  const [range, setRange] = useState<Range>('7d');
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { void loadAll(); }, []);

  async function loadAll() {
    try {
      // Fire the three reads in parallel — backend is local and
      // same-host so the overhead is just the socket cost.
      const [s, t, sj] = await Promise.all([
        api.listSessions(),
        api.listTasks(),
        // Subjects are optional — a missing subject id shouldn't
        // blow up the whole page.
        api.listSubjects().catch(() => [] as Subject[]),
      ]);
      setSessions(s);
      setTasks(t);
      setSubjects(sj);
    } catch (e) {
      setError(String(e));
    }
  }

  const subjectById = useMemo(() => {
    const m = new Map<string, Subject>();
    for (const s of subjects) m.set(s.id, s);
    return m;
  }, [subjects]);

  // Build the day-buckets for the *current* range and for the
  // *previous* range (so we can compute deltas). Both windows have
  // the same length.
  const { current: curBuckets, previous: prevBuckets } = useMemo(
    () => buildBuckets(range, sessions, tasks),
    [range, sessions, tasks],
  );

  const stats = useMemo(
    () => computeStats(curBuckets, prevBuckets, tasks, subjectById),
    [curBuckets, prevBuckets, tasks, subjectById],
  );

  return (
    <div style={{
      padding: 24, background: p.bg, color: p.text, minHeight: '100%',
      fontFamily: 'system-ui, sans-serif',
      display: 'flex', flexDirection: 'column', gap: 16,
    }}>
      {/* Title + range pills */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 16, flexWrap: 'wrap',
      }}>
        <div style={{ fontSize: 32, fontWeight: 800 }}>Statistics</div>
        <div role="tablist" aria-label="Date range"
          style={{ display: 'flex', gap: 8 }}>
          {RANGE_PILLS.map((r) => {
            const active = range === r.id;
            return (
              <button
                key={r.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setRange(r.id)}
                style={{
                  minWidth: 96, minHeight: 64, // touch target
                  padding: '0 20px',
                  fontSize: 18, fontWeight: 700,
                  color: active ? p.primaryText : p.text,
                  background: active ? p.primary : p.bgRaised,
                  border: `2px solid ${active ? p.primary : p.border}`,
                  borderRadius: 32,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div style={{ color: p.danger, fontSize: 18 }}>⚠ {error}</div>
      )}

      {/* Stat tiles — 3 across, fills the 800px width comfortably */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16,
      }}>
        <StatTile
          theme={theme}
          label="Focus minutes"
          value={stats.focusMinutes}
          unit="min"
          delta={stats.focusMinutesDelta}
        />
        <StatTile
          theme={theme}
          label="Tasks completed"
          value={stats.tasksCompleted}
          unit=""
          delta={stats.tasksCompletedDelta}
        />
        <StatTile
          theme={theme}
          label="Active subjects"
          value={stats.activeSubjects}
          unit=""
          delta={stats.activeSubjectsDelta}
        />
      </div>

      {/* Charts row — bar chart + donut side by side */}
      <div style={{
        display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16,
        flex: 1, minHeight: 0,
      }}>
        <TouchCard theme={theme} style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
            Focus minutes per day
          </div>
          <div style={{ flex: 1, minHeight: 200 }}>
            <BarChart theme={theme} buckets={curBuckets} />
          </div>
        </TouchCard>

        <TouchCard theme={theme} style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
            Tasks by subject
          </div>
          <div style={{ flex: 1, minHeight: 200 }}>
            <DonutChart theme={theme} data={stats.bySubject} />
          </div>
        </TouchCard>
      </div>
    </div>
  );
}

/* ───────────────────────────  stat tile  ─────────────────────────── */

function StatTile({
  theme, label, value, unit, delta,
}: {
  theme: ThemeMode;
  label: string;
  value: number;
  unit: string;
  delta: number; // can be negative, zero, or positive
}) {
  const p = palette(theme);
  const arrow = delta > 0 ? '▲' : delta < 0 ? '▼' : '–';
  const deltaColor = delta > 0 ? p.success : delta < 0 ? p.danger : p.textMuted;
  const deltaText = delta === 0
    ? 'no change'
    : `${arrow} ${Math.abs(delta).toLocaleString()}`;

  return (
    <TouchCard theme={theme} style={{ minHeight: 140, display: 'flex',
      flexDirection: 'column', justifyContent: 'space-between' }}>
      <div style={{ fontSize: 16, color: p.textMuted, textTransform: 'uppercase',
        letterSpacing: 1 }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <div style={{ fontSize: 56, fontWeight: 900, lineHeight: 1,
          fontVariantNumeric: 'tabular-nums' }}>
          {value.toLocaleString()}
        </div>
        {unit && (
          <div style={{ fontSize: 20, color: p.textMuted }}>{unit}</div>
        )}
      </div>
      <div style={{ fontSize: 16, color: deltaColor, fontWeight: 600,
        minHeight: 24 }}>
        {deltaText}
      </div>
    </TouchCard>
  );
}

/* ───────────────────────────  bar chart  ─────────────────────────── */

interface DayBucket {
  /** YYYY-MM-DD */
  key: string;
  /** Short label, e.g. "Mon" or "12/03" */
  label: string;
  focusMinutes: number;
}

const BAR_W = 560;
const BAR_H = 200;
const BAR_PAD_X = 28;
const BAR_PAD_TOP = 12;
const BAR_PAD_BOTTOM = 32;

function BarChart({ theme, buckets }: { theme: ThemeMode; buckets: DayBucket[] }) {
  const p = palette(theme);
  const max = Math.max(1, ...buckets.map((b) => b.focusMinutes));
  const innerW = BAR_W - BAR_PAD_X * 2;
  const innerH = BAR_H - BAR_PAD_TOP - BAR_PAD_BOTTOM;
  const slotW = innerW / Math.max(1, buckets.length);
  const barW = Math.max(6, Math.min(36, slotW * 0.6));

  // Y-axis ticks — 0, mid, max, labelled in minutes.
  const ticks = [0, Math.round(max / 2), max];

  return (
    <svg viewBox={`0 0 ${BAR_W} ${BAR_H}`} width="100%" height="100%"
      preserveAspectRatio="none" role="img"
      aria-label="Focus minutes per day bar chart">
      {/* Horizontal grid lines + tick labels */}
      {ticks.map((t) => {
        const y = BAR_PAD_TOP + innerH - (t / max) * innerH;
        return (
          <g key={t}>
            <line x1={BAR_PAD_X} x2={BAR_W - BAR_PAD_X} y1={y} y2={y}
              stroke={p.border} strokeWidth={1}
              strokeDasharray={t === 0 ? undefined : '3 4'} />
            <text x={BAR_PAD_X - 6} y={y + 4} textAnchor="end"
              fontSize={11} fill={p.textMuted}>{t}m</text>
          </g>
        );
      })}

      {/* Bars */}
      {buckets.map((b, i) => {
        const h = (b.focusMinutes / max) * innerH;
        const x = BAR_PAD_X + slotW * i + (slotW - barW) / 2;
        const y = BAR_PAD_TOP + innerH - h;
        return (
          <g key={b.key}>
            <rect x={x} y={y} width={barW} height={Math.max(0, h)}
              rx={4} fill={p.primary} />
            <text
              x={BAR_PAD_X + slotW * i + slotW / 2}
              y={BAR_H - BAR_PAD_BOTTOM + 18}
              textAnchor="middle" fontSize={11} fill={p.textMuted}>
              {b.label}
            </text>
          </g>
        );
      })}

      {buckets.length === 0 && (
        <text x={BAR_W / 2} y={BAR_H / 2} textAnchor="middle"
          fontSize={16} fill={p.textMuted}>
          No data yet
        </text>
      )}
    </svg>
  );
}

/* ───────────────────────────  donut chart  ───────────────────────── */

interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

const DONUT_W = 520;
const DONUT_H = 220;
const DONUT_R = 80;
const DONUT_CX = 110;
const DONUT_CY = DONUT_H / 2;
const DONUT_STROKE = 28;

function DonutChart({ theme, data }: { theme: ThemeMode; data: DonutSlice[] }) {
  const p = palette(theme);
  const total = data.reduce((s, d) => s + d.value, 0);

  if (total === 0) {
    return (
      <div style={{
        height: '100%', display: 'flex', alignItems: 'center',
        justifyContent: 'center', color: p.textMuted, fontSize: 18,
      }}>
        No data yet
      </div>
    );
  }

  // Build an arc for each slice. Each arc starts where the previous
  // one ended (cumulative angle).
  let cursor = -Math.PI / 2; // 12 o'clock
  const arcs = data.map((d) => {
    const fraction = d.value / total;
    const start = cursor;
    const end = cursor + fraction * Math.PI * 2;
    cursor = end;
    return { ...d, fraction, start, end };
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, height: '100%' }}>
      <svg viewBox={`0 0 ${DONUT_W} ${DONUT_H}`}
        width={DONUT_W} height="100%"
        preserveAspectRatio="xMidYMid meet" role="img"
        aria-label="Tasks completed grouped by subject">
        {arcs.map((a) => (
          <path
            key={a.label}
            d={arcPath(DONUT_CX, DONUT_CY, DONUT_R, a.start, a.end)}
            fill="none"
            stroke={a.color}
            strokeWidth={DONUT_STROKE}
            strokeLinecap="butt"
          />
        ))}
        <text x={DONUT_CX} y={DONUT_CY - 4} textAnchor="middle"
          fontSize={28} fontWeight={800} fill={p.text}>
          {total}
        </text>
        <text x={DONUT_CX} y={DONUT_CY + 18} textAnchor="middle"
          fontSize={12} fill={p.textMuted}>
          completed
        </text>
      </svg>

      {/* Legend */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 6,
        flex: 1, minWidth: 0, overflow: 'auto',
      }}>
        {arcs.map((a) => (
          <div key={a.label} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 16, color: p.text, minHeight: 32,
          }}>
            <span style={{
              width: 16, height: 16, borderRadius: 4,
              background: a.color, flexShrink: 0,
            }} />
            <span style={{
              flex: 1, minWidth: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {a.label}
            </span>
            <span style={{ color: p.textMuted, fontVariantNumeric: 'tabular-nums' }}>
              {a.value} · {Math.round(a.fraction * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** SVG arc path for a donut slice — outer radius, no fill. */
function arcPath(cx: number, cy: number, r: number, start: number, end: number) {
  // Single-arc path: M start → A r,r to end. SVG flag = 0 (small arc)
  // because each slice is < 180°; large-arc-flag is 1 only when a
  // slice is bigger, which we treat as a non-issue (max slice = 100%).
  const x1 = cx + r * Math.cos(start);
  const y1 = cy + r * Math.sin(start);
  const x2 = cx + r * Math.cos(end);
  const y2 = cy + r * Math.sin(end);
  const largeArc = end - start > Math.PI ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}

/* ──────────────────────────  data plumbing  ──────────────────────── */

interface RangeBuckets {
  current: DayBucket[];
  previous: DayBucket[];
}

function buildBuckets(
  range: Range,
  sessions: FocusSession[],
  _tasks: Task[], // tasks aren't bucketed by day for the bar chart
): RangeBuckets {
  const days = RANGE_DAYS[range];
  const now = startOfLocalDay(new Date());

  const current = makeEmptyBuckets(now, days);
  const previous = makeEmptyBuckets(addDays(now, -days), days);

  for (const s of sessions) {
    if (!s.startedAt) continue;
    const d = startOfLocalDay(new Date(s.startedAt));
    const idx = current.findIndex((b) => b.key === keyOf(d));
    if (idx >= 0) {
      current[idx].focusMinutes += effectiveMinutes(s);
    } else {
      const prevIdx = previous.findIndex((b) => b.key === keyOf(d));
      if (prevIdx >= 0) {
        previous[prevIdx].focusMinutes += effectiveMinutes(s);
      }
    }
  }

  return { current, previous };
}

function effectiveMinutes(s: FocusSession): number {
  // If the session never closed, fall back to the planned duration.
  if (s.durationMinutes && (!s.endedAt || s.durationMinutes > 0)) {
    return s.durationMinutes;
  }
  if (s.endedAt) {
    return Math.max(0, Math.round(
      (new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 60000
    ));
  }
  return 0;
}

function makeEmptyBuckets(startDay: Date, days: number): DayBucket[] {
  const out: DayBucket[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(startDay, -i);
    out.push({ key: keyOf(d), label: formatLabel(d, days), focusMinutes: 0 });
  }
  return out;
}

function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function keyOf(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatLabel(d: Date, spanDays: number): string {
  if (spanDays <= 1) {
    return `${String(d.getHours()).padStart(2, '0')}:00`;
  }
  if (spanDays <= 7) {
    return d.toLocaleDateString(undefined, { weekday: 'short' });
  }
  // For 30d show "M/D" — keeps the axis legible at 800x480.
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function computeStats(
  cur: DayBucket[],
  prev: DayBucket[],
  tasks: Task[],
  subjectById: Map<string, Subject>,
) {
  const focusMinutes = cur.reduce((s, b) => s + b.focusMinutes, 0);
  const focusMinutesPrev = prev.reduce((s, b) => s + b.focusMinutes, 0);

  const curStart = cur[0]?.key;
  const curEnd   = cur[cur.length - 1]?.key;
  const prevStart = prev[0]?.key;
  const prevEnd   = prev[prev.length - 1]?.key;

  const completedCur  = tasks.filter((t) =>
    t.completed && !!t.completedAt && inRange(t.completedAt, curStart, curEnd));
  const completedPrev = tasks.filter((t) =>
    t.completed && !!t.completedAt && inRange(t.completedAt, prevStart, prevEnd));

  const activeCur  = new Set(completedCur.map((t) => t.subjectId ?? ''));
  const activePrev = new Set(completedPrev.map((t) => t.subjectId ?? ''));

  // Group by subject for the donut.
  const bySubjectMap = new Map<string, number>();
  for (const t of completedCur) {
    const k = t.subjectId ?? '__none__';
    bySubjectMap.set(k, (bySubjectMap.get(k) ?? 0) + 1);
  }
  const bySubject: DonutSlice[] = Array.from(bySubjectMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([id, value], i) => {
      const subj = id !== '__none__' ? subjectById.get(id) : undefined;
      const label = subj?.name ?? (id === '__none__' ? 'Uncategorised' : 'Unknown');
      const color = subj?.color ?? SUBJECT_FALLBACK[i % SUBJECT_FALLBACK.length];
      return { label, value, color };
    });

  return {
    focusMinutes,
    focusMinutesDelta: focusMinutes - focusMinutesPrev,
    tasksCompleted: completedCur.length,
    tasksCompletedDelta: completedCur.length - completedPrev.length,
    activeSubjects: activeCur.size,
    activeSubjectsDelta: activeCur.size - activePrev.size,
    bySubject,
  };
}

function inRange(iso: string, startKey?: string, endKey?: string): boolean {
  if (!startKey || !endKey) return false;
  const k = keyOf(new Date(iso));
  return k >= startKey && k <= endKey;
}
