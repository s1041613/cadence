// Pure rules for the mcp Edge Function: time zones, input validation, and the mapping between
// events/day_todos rows and what a tool returns.
//
// Split out of index.ts for the same reason as send-reminders/notifications.ts: index.ts imports
// `npm:` specifiers and calls Deno.serve, none of which load under vitest. Nothing in here touches
// the network, the database or a global, so core.test.ts imports it directly.
//
// The browser app writes timed events as the DEVICE's local wall time converted to UTC
// (src/services/events-mapper.ts encodeInterval). An Edge Function has no device, so every
// conversion here takes the time zone explicitly. events-mapper.parity.test.ts pins that a row
// built here is byte-for-byte the row the app would write for the same input.

// ---------------------------------------------------------------------------------------------
// Row shapes (mirrors of src/services/events-mapper.ts and day-todos-service.ts — this file
// cannot import from src/, which is outside what the function bundles)
// ---------------------------------------------------------------------------------------------

export type RepeatMode = 'none' | 'daily' | 'weekly' | 'monthly'
export type QuadrantKey = 'do' | 'plan' | 'quick' | 'later'

export interface EventRow {
  id: string
  calendar_id: string
  owner_id: string
  type: 'task' | 'event'
  title: string
  quadrant: QuadrantKey | null
  color: string | null
  icon: string | null
  all_day: boolean
  starts_at: string
  ends_at: string
  show_in_month: boolean
  location: string | null
  notes: string | null
  repeat_mode: RepeatMode
  done: boolean
  estimated_pomodoros: number
  completed_pomodoros: number
  time_edited_at: string | null
}

export interface FetchedEventRow extends EventRow {
  event_reminders?: Array<{ minutes_before: number }>
}

export interface DayTodoRow {
  id: string
  user_id: string
  date: string
  origin_date: string
  title: string
  done: boolean
  position: number
}

export const REMINDERS = ['none', 'at-time', '5-min', '15-min', '30-min', '1-hour', '1-day'] as const
export type Reminder = (typeof REMINDERS)[number]

const REMINDER_MINUTES: Record<Exclude<Reminder, 'none'>, number> = {
  'at-time': 0,
  '5-min': 5,
  '15-min': 15,
  '30-min': 30,
  '1-hour': 60,
  '1-day': 1440
}

/** The app's default for a new entry (src/stores/tasks-store.ts mkTask). */
export const DEFAULT_REMINDER: Reminder = '15-min'

export function reminderToMinutes(reminder: Reminder): number | null {
  return reminder === 'none' ? null : REMINDER_MINUTES[reminder]
}

export function minutesToReminder(minutes: number | undefined): Reminder {
  if (minutes === undefined) return 'none'
  const entry = Object.entries(REMINDER_MINUTES).find(([, v]) => v === minutes)
  return entry ? (entry[0] as Reminder) : 'none'
}

// ---------------------------------------------------------------------------------------------
// Errors a tool reports back to the model (as opposed to bugs, which throw anything else)
// ---------------------------------------------------------------------------------------------

/** A problem with the request the model can fix by calling again differently. */
export class ToolInputError extends Error {}

// ---------------------------------------------------------------------------------------------
// Dates, times and time zones
// ---------------------------------------------------------------------------------------------

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

export function isDate(value: string): boolean {
  const m = DATE_RE.exec(value)
  if (!m) return false
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const probe = new Date(Date.UTC(y, mo - 1, d))
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === mo - 1 && probe.getUTCDate() === d
}

export function isTime(value: string): boolean {
  return TIME_RE.test(value)
}

function requireDate(value: string, field: string): string {
  if (!isDate(value)) throw new ToolInputError(`${field} must be a real date in YYYY-MM-DD form, got "${value}".`)
  return value
}

function requireTime(value: string, field: string): string {
  if (!isTime(value)) throw new ToolInputError(`${field} must be a 24-hour time in HH:MM form, got "${value}".`)
  return value
}

export function isTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

const partsFormatters = new Map<string, Intl.DateTimeFormat>()

function partsIn(utcMs: number, tz: string): { y: number; mo: number; d: number; h: number; mi: number; s: number } {
  let fmt = partsFormatters.get(tz)
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
    partsFormatters.set(tz, fmt)
  }
  const out: Record<string, number> = {}
  for (const p of fmt.formatToParts(new Date(utcMs))) {
    if (p.type !== 'literal') out[p.type] = Number(p.value)
  }
  return { y: out.year!, mo: out.month!, d: out.day!, h: out.hour!, mi: out.minute!, s: out.second! }
}

/** How far `tz`'s wall clock is ahead of UTC at the instant `utcMs`. */
function offsetMs(utcMs: number, tz: string): number {
  const p = partsIn(utcMs, tz)
  return Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s) - Math.floor(utcMs / 1000) * 1000
}

/**
 * The UTC instant at which `tz`'s wall clock reads `date` `time`.
 *
 * The offset to use is the one in force AT the answer, which is not known until there is an
 * answer, so this tries the offsets on both sides of the naive reading and keeps one whose wall
 * clock really reads `date` `time`. Near a DST change those can differ:
 * - a repeated wall time (fall back) matches twice; the earlier is used, as JavaScript's Date does;
 * - a wall time that does not exist (spring forward) matches neither; it lands just after the
 *   gap, which is what a person who typed it would expect.
 */
export function wallTimeToUtc(date: string, time: string, tz: string): Date {
  const [y, mo, d] = date.split('-').map(Number) as [number, number, number]
  const [h, mi] = time.split(':').map(Number) as [number, number]
  const naive = Date.UTC(y, mo - 1, d, h, mi)
  const first = naive - offsetMs(naive, tz)
  const second = naive - offsetMs(first, tz)
  const candidates = [first, second]
  const reads = (t: number): boolean => {
    const w = utcToWallTime(new Date(t), tz)
    return w.date === date && w.time === time
  }
  const matching = candidates.filter(reads)
  return new Date(matching.length > 0 ? Math.min(...matching) : Math.max(...candidates))
}

const pad = (n: number): string => String(n).padStart(2, '0')

/** `tz`'s wall-clock date and HH:MM at a UTC instant. */
export function utcToWallTime(instant: string | Date, tz: string): { date: string; time: string } {
  const p = partsIn(new Date(instant).getTime(), tz)
  return { date: `${p.y}-${pad(p.mo)}-${pad(p.d)}`, time: `${pad(p.h)}:${pad(p.mi)}` }
}

export function todayIn(tz: string, now: Date = new Date()): string {
  return utcToWallTime(now, tz).date
}

export function addDaysToDate(date: string, n: number): string {
  const [y, mo, d] = date.split('-').map(Number) as [number, number, number]
  const t = new Date(Date.UTC(y, mo - 1, d + n))
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`
}

export function daysBetween(a: string, b: string): number {
  const ms = (s: string): number => {
    const [y, mo, d] = s.split('-').map(Number) as [number, number, number]
    return Date.UTC(y, mo - 1, d)
  }
  return Math.round((ms(b) - ms(a)) / 86_400_000)
}

/** The longest window a single read may cover. Keeps one tool call from pulling a year of rows
 *  into the model's context, and the query bounded for every user, not just light ones. */
export const MAX_RANGE_DAYS = 62

export interface DateRange {
  from: string
  /** Inclusive. */
  to: string
}

export function parseRange(from: string, to: string | undefined): DateRange {
  requireDate(from, 'from')
  const end = to === undefined ? from : requireDate(to, 'to')
  if (end < from) throw new ToolInputError(`to (${end}) is before from (${from}).`)
  if (daysBetween(from, end) + 1 > MAX_RANGE_DAYS) {
    throw new ToolInputError(`A range may cover at most ${MAX_RANGE_DAYS} days; split it into smaller ranges.`)
  }
  return { from, to: end }
}

/**
 * The UTC instants bounding a date range for the events query. The window is widened by a day
 * on each side: an all-day row is stored at UTC midnight and a timed row at its real instant, so
 * a single tight bound cannot be right for both. Rows that fall outside the range after decoding
 * are dropped by entryOverlaps, so the widening only ever costs a few extra rows.
 */
export function rangeQueryBounds(range: DateRange): { startsBefore: string; endsAfter: string } {
  return {
    startsBefore: `${addDaysToDate(range.to, 2)}T00:00:00.000Z`,
    endsAfter: `${addDaysToDate(range.from, -2)}T00:00:00.000Z`
  }
}

// ---------------------------------------------------------------------------------------------
// Reading: rows → what a tool returns
// ---------------------------------------------------------------------------------------------

/** Mirrors src/composables/use-theme.ts QUADRANTS. */
const QUADRANT_FLAGS: Record<QuadrantKey, { important: boolean; urgent: boolean }> = {
  do: { important: true, urgent: true },
  plan: { important: true, urgent: false },
  quick: { important: false, urgent: true },
  later: { important: false, urgent: false }
}

export interface ScheduleEntry {
  id: string
  /** 'event' is a calendar event; 'task' is a quadrant task from the app's task view. */
  kind: 'event' | 'task'
  title: string
  date: string
  /** Inclusive; present only when the entry spans more than one day. */
  end_date?: string
  all_day: boolean
  /** HH:MM in the user's time zone; absent for all-day events. */
  start?: string
  end?: string
  calendar_id: string
  calendar_name?: string
  location?: string
  notes?: string
  repeat: RepeatMode
  reminder: Reminder
  /** False for an entry another member of a shared calendar created — it is read-only. */
  mine: boolean
  /** Tasks only. */
  done?: boolean
  important?: boolean
  urgent?: boolean
}

export function rowToEntry(
  row: FetchedEventRow,
  tz: string,
  userId: string,
  calendarNames: ReadonlyMap<string, string>
): ScheduleEntry {
  let date: string
  let endDate: string
  let start: string | undefined
  let end: string | undefined
  if (row.all_day) {
    // UTC-midnight encoding: the first 10 characters are the calendar date, in any zone.
    date = row.starts_at.slice(0, 10)
    endDate = row.ends_at.slice(0, 10)
  } else {
    const s = utcToWallTime(row.starts_at, tz)
    const e = utcToWallTime(row.ends_at, tz)
    date = s.date
    endDate = e.date
    start = s.time
    end = e.time
  }

  const entry: ScheduleEntry = {
    id: row.id,
    kind: row.type === 'task' ? 'task' : 'event',
    title: row.title,
    date,
    ...(endDate > date ? { end_date: endDate } : {}),
    all_day: row.all_day,
    ...(start !== undefined ? { start, end } : {}),
    calendar_id: row.calendar_id,
    ...(calendarNames.has(row.calendar_id) ? { calendar_name: calendarNames.get(row.calendar_id) } : {}),
    ...(row.location ? { location: row.location } : {}),
    ...(row.notes ? { notes: row.notes } : {}),
    repeat: row.repeat_mode,
    reminder: minutesToReminder(row.event_reminders?.[0]?.minutes_before),
    mine: row.owner_id === userId
  }
  if (row.type === 'task') {
    const flags = QUADRANT_FLAGS[row.quadrant as QuadrantKey] ?? { important: false, urgent: false }
    entry.done = row.done
    entry.important = flags.important
    entry.urgent = flags.urgent
  }
  return entry
}

export function entryOverlaps(entry: Pick<ScheduleEntry, 'date' | 'end_date'>, range: DateRange): boolean {
  return entry.date <= range.to && (entry.end_date ?? entry.date) >= range.from
}

export function compareEntries(a: ScheduleEntry, b: ScheduleEntry): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1
  // All-day first, then by start time — the order of the app's day view.
  if (a.all_day !== b.all_day) return a.all_day ? -1 : 1
  return (a.start ?? '').localeCompare(b.start ?? '')
}

export interface TodoEntry {
  id: string
  /** The day whose list it is on, as the user sees it today (see todosForRange). */
  date: string
  title: string
  done: boolean
  /** The day it was first written, when it has been carried forward since. */
  carried_from?: string
}

/**
 * Day todos in a range, as the app would show them.
 *
 * The app re-dates an open todo from a past day onto today when it next opens
 * (src/stores/day-todos-store.ts carryOver). A user who has not opened it for a few days still
 * has those rows on their old dates, so reading the table as-is would show yesterday's open
 * todos on yesterday and none on today. This applies the same rule on read, without writing:
 * open todos dated before `today` are reported on today. Ticked ones stay where they were.
 */
export function todosForRange(rows: DayTodoRow[], range: DateRange, today: string): TodoEntry[] {
  return rows
    .map((row) => {
      const shownOn = !row.done && row.date < today ? today : row.date
      return { row, shownOn }
    })
    .filter(({ shownOn }) => shownOn >= range.from && shownOn <= range.to)
    .sort((a, b) =>
      a.shownOn !== b.shownOn
        ? a.shownOn < b.shownOn
          ? -1
          : 1
        : a.row.date !== b.row.date
          ? a.row.date < b.row.date
            ? -1
            : 1
          : a.row.position - b.row.position
    )
    .map(({ row, shownOn }) => ({
      id: row.id,
      date: shownOn,
      title: row.title,
      done: row.done,
      ...(row.origin_date < shownOn ? { carried_from: row.origin_date } : {})
    }))
}

// ---------------------------------------------------------------------------------------------
// Writing events
// ---------------------------------------------------------------------------------------------

export interface EventFields {
  title: string
  date: string
  end_date?: string
  all_day?: boolean
  start?: string
  end?: string
  location?: string
  notes?: string
}

const MAX_TITLE = 200
const MAX_TEXT = 4000
/** When only a start time is given. One hour is what a person means by "a meeting at 3". */
const DEFAULT_DURATION_MIN = 60

function cleanTitle(title: string): string {
  const t = title.trim().replace(/\s+/g, ' ')
  if (t === '') throw new ToolInputError('title must not be blank.')
  if (t.length > MAX_TITLE) throw new ToolInputError(`title is longer than ${MAX_TITLE} characters.`)
  return t
}

function cleanText(value: string | undefined, field: string): string | null {
  if (value === undefined) return null
  const t = value.trim()
  if (t.length > MAX_TEXT) throw new ToolInputError(`${field} is longer than ${MAX_TEXT} characters.`)
  return t === '' ? null : t
}

function minutesOf(time: string): number {
  const [h, m] = time.split(':').map(Number) as [number, number]
  return h * 60 + m
}

/**
 * The interval columns for an event, encoded exactly as events-mapper's encodeInterval does:
 * all-day at UTC midnight against the INCLUSIVE end day; timed as wall time in `tz`.
 *
 * Unlike the app, an inverted or empty range is refused instead of repaired. The app repairs
 * because a person is looking at the result and losing their typing is worse; a model can just
 * be told and try again, and silently writing a 5-minute slot would be a wrong answer.
 */
export function encodeEventInterval(
  fields: Pick<EventFields, 'date' | 'end_date' | 'all_day' | 'start' | 'end'>,
  tz: string
): { all_day: boolean; starts_at: string; ends_at: string } {
  const date = requireDate(fields.date, 'date')
  const endDate = fields.end_date === undefined ? date : requireDate(fields.end_date, 'end_date')
  if (endDate < date) throw new ToolInputError(`end_date (${endDate}) is before date (${date}).`)

  if (fields.all_day) {
    return { all_day: true, starts_at: `${date}T00:00:00.000Z`, ends_at: `${endDate}T00:00:00.000Z` }
  }

  if (fields.start === undefined) {
    throw new ToolInputError('start is required unless all_day is true.')
  }
  const start = requireTime(fields.start, 'start')
  let end: string
  if (fields.end !== undefined) {
    end = requireTime(fields.end, 'end')
  } else {
    const endMin = minutesOf(start) + DEFAULT_DURATION_MIN
    if (endMin >= 24 * 60 && endDate === date) {
      throw new ToolInputError('An hour from start runs past midnight; give end (and end_date if it ends the next day).')
    }
    end = `${pad(Math.floor(endMin / 60) % 24)}:${pad(endMin % 60)}`
  }
  if (endDate === date && minutesOf(end) <= minutesOf(start)) {
    throw new ToolInputError(
      `end (${end}) is not after start (${start}). For something that ends the next day, set end_date.`
    )
  }

  return {
    all_day: false,
    starts_at: wallTimeToUtc(date, start, tz).toISOString(),
    ends_at: wallTimeToUtc(endDate, end, tz).toISOString()
  }
}

export function buildNewEventRow(
  fields: EventFields,
  ids: { id: string; ownerId: string; calendarId: string },
  tz: string
): EventRow {
  return {
    id: ids.id,
    calendar_id: ids.calendarId,
    owner_id: ids.ownerId,
    type: 'event',
    title: cleanTitle(fields.title),
    quadrant: null,
    // The app's default for a new event: no custom colour, no icon, shown on the month grid.
    color: null,
    icon: null,
    ...encodeEventInterval(fields, tz),
    show_in_month: true,
    location: cleanText(fields.location, 'location'),
    notes: cleanText(fields.notes, 'notes'),
    repeat_mode: 'none',
    done: false,
    // 0 is the app's "derive it from the slot" value (convert-date-time.ts estPomsOf), and
    // pomodoros are only meaningful on tasks anyway.
    estimated_pomodoros: 0,
    completed_pomodoros: 0,
    time_edited_at: null
  }
}

export type EventPatch = Partial<EventFields> & { calendar_id?: string }

/**
 * The columns an update writes, given the row as it is now.
 *
 * Every interval field the patch leaves out is taken from the current row, so "move it to 4pm"
 * keeps the date and the duration the event already had. time_edited_at follows
 * tasks-store.saveTask isTimeChange: stamped when a timed entry's date or start moves.
 */
export function buildEventUpdate(
  current: EventRow,
  patch: EventPatch,
  tz: string,
  now: Date = new Date()
): Partial<EventRow> {
  if (current.type !== 'event') {
    throw new ToolInputError('This is a task, not an event. Tasks can be read but not changed through this connection yet.')
  }

  const was = rowToEntry(current, tz, current.owner_id, new Map())
  const update: Partial<EventRow> = {}

  if (patch.title !== undefined) update.title = cleanTitle(patch.title)
  if (patch.location !== undefined) update.location = cleanText(patch.location, 'location')
  if (patch.notes !== undefined) update.notes = cleanText(patch.notes, 'notes')
  if (patch.calendar_id !== undefined) update.calendar_id = patch.calendar_id

  const touchesTime = (['date', 'end_date', 'all_day', 'start', 'end'] as const).some((k) => patch[k] !== undefined)
  if (touchesTime) {
    const allDay = patch.all_day ?? was.all_day
    const date = patch.date ?? was.date
    // Moving the start date carries a multi-day span with it, the same length it was.
    const span = daysBetween(was.date, was.end_date ?? was.date)
    const endDate = patch.end_date ?? (patch.date !== undefined ? addDaysToDate(date, span) : was.end_date ?? was.date)

    let start = patch.start ?? was.start
    let end = patch.end ?? was.end
    if (!allDay && was.all_day && patch.start === undefined) {
      throw new ToolInputError('Turning an all-day event into a timed one needs start (and usually end).')
    }
    // Moving only the start keeps the duration, as the app's time picker does (shiftRange).
    if (!allDay && patch.start !== undefined && patch.end === undefined && was.start && was.end && endDate === date) {
      const dur = minutesOf(was.end) - minutesOf(was.start)
      const endMin = minutesOf(requireTime(patch.start, 'start')) + dur
      end = endMin < 24 * 60 ? `${pad(Math.floor(endMin / 60))}:${pad(endMin % 60)}` : undefined
    }
    if (allDay) {
      start = undefined
      end = undefined
    }

    Object.assign(update, encodeEventInterval({ date, end_date: endDate, all_day: allDay, start, end }, tz))

    const isTimeChange = !was.all_day && !allDay && (date !== was.date || start !== was.start)
    if (isTimeChange) update.time_edited_at = now.toISOString()
  }

  if (Object.keys(update).length === 0) throw new ToolInputError('Nothing to change: pass at least one field.')
  return update
}

// ---------------------------------------------------------------------------------------------
// Writing day todos
// ---------------------------------------------------------------------------------------------

/** One call's worth. A pasted list is rarely longer; a runaway loop is stopped here. */
export const MAX_TODOS_PER_CALL = 30

export function buildNewTodoRows(
  titles: string[],
  date: string,
  existingOnDate: Pick<DayTodoRow, 'position'>[],
  ids: { ownerId: string; newId: () => string }
): DayTodoRow[] {
  requireDate(date, 'date')
  const cleaned = titles.map((t) => t.trim().replace(/\s+/g, ' ')).filter((t) => t !== '')
  if (cleaned.length === 0) throw new ToolInputError('titles must contain at least one non-blank line.')
  if (cleaned.length > MAX_TODOS_PER_CALL) throw new ToolInputError(`At most ${MAX_TODOS_PER_CALL} todos per call.`)
  for (const t of cleaned) if (t.length > MAX_TITLE) throw new ToolInputError(`A todo is longer than ${MAX_TITLE} characters.`)

  // utils/day-todos.ts nextPosition: one past the highest position already on that day.
  const first = existingOnDate.reduce((max, t) => Math.max(max, t.position), -1) + 1
  return cleaned.map((title, i) => ({
    id: ids.newId(),
    user_id: ids.ownerId,
    date,
    origin_date: date,
    title,
    done: false,
    position: first + i
  }))
}

export function cleanTodoTitle(title: string): string {
  return cleanTitle(title)
}
