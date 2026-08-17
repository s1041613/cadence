export const pad = (n: number): string => String(n).padStart(2, '0')

export const iso = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

// Always parse "YYYY-MM-DD" through this — never `new Date(string)`, which parses as UTC and can land on the wrong local day.
export const parseISO = (s: string): Date => {
  const [y, m, d] = s.split('-').map(Number) as [number, number, number]
  return new Date(y, m - 1, d)
}

export const addDays = (d: Date, n: number): Date => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export const WD_EN = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
export const WD_CAP = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const WD_SHORT = ['日', '一', '二', '三', '四', '五', '六']

export type FirstDayName = 'Sunday' | 'Monday' | 'Saturday'

// getDay()-style index (0=Sun..6=Sat) each first-day setting anchors the grid's first column to.
const FIRST_DAY_INDEX: Record<FirstDayName, number> = { Sunday: 0, Monday: 1, Saturday: 6 }

// Defaults to Monday start (existing behavior for callers that don't re-anchor by the
// user-settings firstDay preference, e.g. the copy-to-days mini calendar).
export const startOfWeek = (d: Date, firstDay: FirstDayName = 'Monday'): Date => {
  const x = new Date(d)
  const anchor = FIRST_DAY_INDEX[firstDay]
  const day = (x.getDay() - anchor + 7) % 7
  return addDays(x, -day)
}

export const minutes = (t: string): number => {
  const [h, m] = t.split(':').map(Number) as [number, number]
  return h * 60 + m
}

// Whole days from a to b, both "YYYY-MM-DD". Negative when b precedes a. Goes through
// parseISO rather than subtracting timestamps directly so a DST boundary inside the span
// cannot round the quotient down to the previous day.
export const daysBetween = (a: string, b: string): number =>
  Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86_400_000)

/** An inclusive calendar-date range. Absent `endDate` means the entry occupies one day. */
export type DateSpan = { date: string; endDate?: string }

/**
 * An entry's inclusive end date. Absent `endDate` — or one that does not extend past
 * `date` — means a single-day entry, so the start date is the answer.
 *
 * Zero-padded "YYYY-MM-DD" compares correctly as a string, so this needs no Date parsing.
 * An inverted `endDate` normalizes back to single-day rather than yielding a negative span:
 * every consumer downstream assumes end >= start, and repairing it here means none of them
 * has to re-check.
 */
export const endDateOf = (t: DateSpan): string => (t.endDate && t.endDate > t.date ? t.endDate : t.date)

/** Inclusive length of a span in days. Always >= 1; a single-day entry is 1. */
export const spanDayCount = (t: DateSpan): number => daysBetween(t.date, endDateOf(t)) + 1

/** True when a span covers more than one calendar day. */
export const isMultiDay = (t: DateSpan): boolean => endDateOf(t) > t.date

export const isTimeValue = (t: string): boolean => /^([01]\d|2[0-3]):[0-5]\d$/.test(t)

// The "end after start" requirement only holds within a single day: 22:00 -> 02:00 on the
// next day is a legitimate overnight span, not an inverted range. Callers that pass no dates
// (the plain { start, end } shape) keep the original same-day meaning.
export const hasTimeRange = (t: { start: string; end: string } & Partial<DateSpan>): boolean =>
  isTimeValue(t.start) &&
  isTimeValue(t.end) &&
  (minutes(t.end) > minutes(t.start) || (t.date !== undefined && isMultiDay({ ...t, date: t.date })))

export const toHM = (mins: number): string => `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`

export type TimeFormatName = '24-Hour'

// user-settings spec "Time format applies to displayed times": the stored "HH:MM" value is
// always rendered as-is — callers pass the stored value straight through this wrapper.
export const formatTime = (t: string, _format: TimeFormatName): string => t

// Latest time any picker may land on. Times are stored as "HH:MM" and validated by
// isTimeValue, so arithmetic must never produce 24:00 — the wheel has no such row and the
// value would be rejected on save.
const DAY_FIRST_MIN = 0
const DAY_LAST_MIN = 23 * 60 + 55

const clampToDay = (mins: number): number => Math.max(DAY_FIRST_MIN, Math.min(DAY_LAST_MIN, mins))

// Duration given to a range that arrives inverted, empty, or unparseable, so the repaired
// range is still a valid slot. One wheel step.
const MIN_RANGE_MIN = 5

// Rounds a time onto the wheel's minute grid, for positioning only — callers must not write
// the result back over a stored value. A deliberately-typed 09:07 stays 09:07; the wheel just
// renders at 09:05. See the picker spec's "typed values are not snapped".
//
// Unparseable input (an all-day event stores '') returns '' rather than "NaN:NaN": minutes()
// yields NaN, and every arithmetic path below would carry it into the formatted string.
export const snapToStep = (t: string, step: number): string =>
  isTimeValue(t) ? toHM(clampToDay(Math.round(minutes(t) / step) * step)) : ''

/**
 * Moves one edge of a time range and carries the other with it, preserving duration.
 *
 * Moving the start always carries the end. Moving the end carries the start only when the
 * new end would land at or before it — that is the case the "end must be after start" error
 * used to catch, and auto-shifting resolves it instead of blocking the user.
 *
 * Both edges clamp into the day, so a range pushed against midnight compresses rather than
 * producing an invalid time.
 */
export const shiftRange = (
  range: { start: string; end: string },
  edge: 'start' | 'end',
  value: string
): { start: string; end: string } => {
  // A value the picker cannot express is not a shift — leave the range untouched rather than
  // formatting NaN into it.
  if (!isTimeValue(value)) return { start: range.start, end: range.end }

  // The incoming range may be inverted or empty: the card keeps its "end must be after start"
  // backstop precisely because such values arrive from elsewhere, and an all-day event stores
  // ''. Carrying a negative (or NaN) duration would drag the far edge backwards while the
  // user drags this one forwards, preserving the very state auto-shift exists to resolve.
  const rawDuration = minutes(range.end) - minutes(range.start)
  const duration = Number.isNaN(rawDuration) || rawDuration <= 0 ? MIN_RANGE_MIN : rawDuration

  if (edge === 'start') {
    const start = clampToDay(minutes(value))
    return { start: toHM(start), end: toHM(clampToDay(start + duration)) }
  }
  const end = clampToDay(minutes(value))
  const startMins = minutes(range.start)
  const keepStart = !Number.isNaN(startMins) && end > startMins
  return { start: toHM(keepStart ? startMins : clampToDay(end - duration)), end: toHM(end) }
}

export const fmtDur = (m: number): string => (m >= 60 ? `${(m / 60).toFixed(m % 60 ? 1 : 0)} hr` : `${m} min`)

// Pomodoro count derived from slot length: 1 = 25 min, rounded up (all-day = 1).
const POM_MIN = 25

// A slot that spans more than one day is a container, not a focus session — a four-day trip
// would otherwise derive 231 pomodoros and persist that into estimated_pomodoros. Multi-day
// entries answer 1, on the same reasoning already applied to all-day.
const isUnbounded = (t: { allDay: boolean; start: string; end: string } & Partial<DateSpan>): boolean =>
  t.allDay || !t.start || !t.end || (t.date !== undefined && isMultiDay({ ...t, date: t.date }))

export const autoPoms = (t: { allDay: boolean; start: string; end: string } & Partial<DateSpan>): number => {
  if (isUnbounded(t)) return 1
  const dur = minutes(t.end) - minutes(t.start)
  return Math.max(1, Math.ceil(dur / POM_MIN))
}

// How many pomodoros genuinely fit in a slot, counting the breaks between them. autoPoms
// ignores breaks, so it answers 5 for a two-hour slot — but 5 pomodoros occupy 145 minutes
// and overrun it by 25. This answers 4 (115 minutes), which fits.
//
// Deliberately NOT a replacement for autoPoms: this supplies the default estimate at event
// creation only. Reads still go through estPomsOf, so an event never reports one count on
// its card and a different one in a focus session. Widening this to the read path means
// moving every reader at once — see the spec's "deliberately narrow scope".
//
// focusMs/restMs are parameters rather than imports: this module must not depend on
// focus-timer, and passing them keeps the arithmetic testable at any pomodoro length.
export const pomsInSlot = (
  t: { allDay: boolean; start: string; end: string } & Partial<DateSpan>,
  focusMs: number,
  restMs: number
): number => {
  if (isUnbounded(t)) return 1
  const slotMs = (minutes(t.end) - minutes(t.start)) * 60_000
  // The trailing break never has to be served, so it is credited to the slot before dividing.
  return Math.max(1, Math.floor((slotMs + restMs) / (focusMs + restMs)))
}

// The default estimate stamped onto a task at creation, at the app's standard pomodoro
// lengths. Every creation and save path uses this, so a task's seeded estimate never depends
// on which screen created it. Durations live in focus-timer; they are re-stated here rather
// than imported to keep this module free of any dependency on the timer.
const DEFAULT_POM_FOCUS_MS = 25 * 60_000
const DEFAULT_POM_REST_MS = 5 * 60_000

export const defaultPoms = (t: { allDay: boolean; start: string; end: string } & Partial<DateSpan>): number =>
  pomsInSlot(t, DEFAULT_POM_FOCUS_MS, DEFAULT_POM_REST_MS)

// Single source of truth for "how many pomodoros does this task need". The stored estimate
// is a snapshot from creation time; autoPoms recomputes from the slot. Consumers that pick
// differently drift apart once an event's times are edited, which stalls or short-circuits
// progress. Every caller must go through here.
export const estPomsOf = (
  t: { estimatedPomodoros: number; allDay: boolean; start: string; end: string } & Partial<DateSpan>
): number => (t.estimatedPomodoros > 0 ? t.estimatedPomodoros : autoPoms(t))

// Wall-clock instant an event's slot ends, or null when it has no bounded slot (all-day
// events, or times that were never filled in). Date and time are combined deliberately:
// comparing only HH:MM would make yesterday's 09:00-10:00 event look "not yet over" this
// morning. `now` is a parameter so callers stay testable.
//
// The END date carries the time, not the start date: a multi-day event ends on its last day,
// and anchoring to `date` would mark every such event over from its first evening onward.
export const slotEndAt = (
  t: { allDay: boolean; date: string; end: string } & Partial<DateSpan>
): Date | null => {
  if (t.allDay || !t.date || !t.end) return null
  const d = parseISO(endDateOf(t))
  d.setMinutes(minutes(t.end))
  return d
}

/** True once an event's scheduled slot has passed. All-day events never count as over. */
export const isSlotOver = (
  t: { allDay: boolean; date: string; end: string } & Partial<DateSpan>,
  now: Date
): boolean => {
  const endsAt = slotEndAt(t)
  return endsAt !== null && now.getTime() >= endsAt.getTime()
}

// Quick-Add time-grid click: round down to the nearest 30-minute step, clamp the start into
// 06:00-22:00, one-hour duration. app-shell spec "Creation entry points seed context from where
// they are invoked" / Example: rounding and clamping boundaries.
const QUICK_ADD_START_MIN = 6 * 60
const QUICK_ADD_START_MAX = 22 * 60
const QUICK_ADD_STEP = 30
const QUICK_ADD_DURATION = 60

export const quickAddTimeRange = (clickedMinutes: number): { start: string; end: string } => {
  const rounded = Math.floor(clickedMinutes / QUICK_ADD_STEP) * QUICK_ADD_STEP
  const clamped = Math.min(Math.max(rounded, QUICK_ADD_START_MIN), QUICK_ADD_START_MAX)
  return { start: toHM(clamped), end: toHM(clamped + QUICK_ADD_DURATION) }
}
