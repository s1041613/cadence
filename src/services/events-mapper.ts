import type { RepeatMode, ReminderPreset, Task } from '@/types/task'
import { QUADRANTS, quadrantOf, type Quadrant } from '@/composables/use-theme'
import { endDateOf, hasTimeRange, iso, pad } from '@/utils/convert-date-time'

export interface MapContext {
  ownerId: string
  remoteDefaultCalendarId: string
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: string): boolean {
  return UUID_RE.test(value)
}

export type QuadrantKey = Quadrant['key']

// Column shape of the events table as written by the client. repeat_rule is
// deliberately absent (reserved for future RRULE support); created_at and
// updated_at are owned by the service layer.
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
  location: string | null
  notes: string | null
  repeat_mode: RepeatMode
  done: boolean
  estimated_pomodoros: number
  completed_pomodoros: number
}

export interface ReminderRow {
  minutes_before: number
}

// Row shape returned by fetchTasks, with the event_reminders embed.
export interface FetchedEventRow extends EventRow {
  event_reminders: ReminderRow[]
}

const REMINDER_MINUTES: Record<ReminderPreset, number> = {
  'at-time': 0,
  '5-min': 5,
  '15-min': 15,
  '30-min': 30,
  '1-hour': 60,
  '1-day': 1440
}

export function reminderToMinutes(preset: ReminderPreset): number {
  return REMINDER_MINUTES[preset]
}

// Unknown minute values read from the database map to no reminder.
export function minutesToReminder(minutes: number): ReminderPreset | null {
  const entry = Object.entries(REMINDER_MINUTES).find(([, value]) => value === minutes)
  return entry ? (entry[0] as ReminderPreset) : null
}

const TASK_TIME_FALLBACK = { start: '09:00', end: '10:00' }

// A same-day range that arrived inverted is widened to this rather than being rejected: the
// DB's end_after_start would refuse the row, and losing the write is worse than a short slot.
const INVERTED_RANGE_REPAIR_MS = 5 * 60_000

// All-day events are encoded at UTC midnight so the calendar date survives
// timezone changes; timed entries are local wall time converted to UTC.
//
// A multi-day span encodes ends_at against the INCLUSIVE end day. The alternative — an
// exclusive end, as iCal uses — would rewrite every existing all-day row (they store
// starts_at === ends_at) and force a backfill. Inclusive also keeps "the first 10 characters
// are the calendar date" true of both columns, so decode stays symmetric and timezone-proof.
// The cost is that a future ICS exporter has to add a day at the boundary.
function encodeInterval(task: Task, isTask: boolean): { all_day: boolean; starts_at: string; ends_at: string } {
  // Tasks can never be all-day (task_has_no_allday constraint).
  const allDay = isTask ? false : task.allDay
  const endDate = endDateOf(task)

  if (allDay) {
    // A single-day all-day event still encodes starts_at === ends_at, exactly as it did
    // before spans existed. end_after_start is waived for all_day, so equal ends are legal.
    return { all_day: true, starts_at: `${task.date}T00:00:00.000Z`, ends_at: `${endDate}T00:00:00.000Z` }
  }

  // Tasks with missing times receive a fallback that satisfies end_after_start.
  const { start, end } = isTask && !hasTimeRange(task) ? TASK_TIME_FALLBACK : task
  const startsAt = new Date(`${task.date}T${start}:00`)
  const endsAt = new Date(`${endDate}T${end}:00`)
  return {
    all_day: false,
    starts_at: startsAt.toISOString(),
    // Only a same-day inverted range can reach the repair — a cross-day span is ordered by
    // construction, which is why 22:00 -> 02:00 the next day survives intact.
    ends_at: (endsAt > startsAt ? endsAt : new Date(startsAt.getTime() + INVERTED_RANGE_REPAIR_MS)).toISOString()
  }
}

// endDate is omitted for a single-day span, so a row written before spans existed decodes to
// exactly the shape it always had — that is what makes this change need no backfill.
function decodeInterval(row: EventRow): { date: string; endDate?: string; start: string; end: string } {
  if (row.all_day) {
    // UTC-midnight encoding: the first 10 characters are the calendar date,
    // independent of the reader's timezone. True of both columns.
    const date = row.starts_at.slice(0, 10)
    const endDate = row.ends_at.slice(0, 10)
    return { date, start: '', end: '', ...(endDate > date ? { endDate } : {}) }
  }

  const startsAt = new Date(row.starts_at)
  const endsAt = new Date(row.ends_at)
  const date = iso(startsAt)
  const endDate = iso(endsAt)
  return {
    date,
    ...(endDate > date ? { endDate } : {}),
    start: `${pad(startsAt.getHours())}:${pad(startsAt.getMinutes())}`,
    end: `${pad(endsAt.getHours())}:${pad(endsAt.getMinutes())}`
  }
}

export function taskToRow(task: Task, ctx: MapContext): EventRow {
  const isTask = task.type === 'quadrant'
  const estimated = task.estimatedPomodoros

  return {
    id: task.id,
    // Safety boundary: a legal uuid calendarId passes through unchanged; anything else (the local
    // 'default' sentinel, a stale id from a since-deleted calendar, or any other garbage value)
    // falls back to the user's remote default calendar so a non-uuid string never reaches the
    // uuid column. This is the only place that consumes ctx.remoteDefaultCalendarId as a fallback —
    // every other layer trusts task.calendarId to already be a real uuid.
    calendar_id: isUuid(task.calendarId) ? task.calendarId : ctx.remoteDefaultCalendarId,
    owner_id: ctx.ownerId,
    type: isTask ? 'task' : 'event',
    title: task.title,
    quadrant: isTask ? quadrantOf(task).key : null,
    // Task quadrant color is derived at render time, never persisted.
    color: isTask ? null : task.backgroundColor,
    icon: isTask ? null : task.icon,
    ...encodeInterval(task, isTask),
    location: task.location === '' ? null : task.location,
    notes: task.notes === '' ? null : task.notes,
    repeat_mode: task.repeat,
    done: task.done,
    estimated_pomodoros: estimated,
    // Not clamped to the estimate: the estimate is derived from the slot length, so it is a
    // reference rather than a limit, and a count past it is displayed as 4/3. The DB
    // constraint that used to enforce the ceiling was dropped in the same change.
    completed_pomodoros: task.completedPomodoros
  }
}

export function rowToTask(row: EventRow & { event_reminders?: ReminderRow[] }, _ctx: MapContext): Task {
  const isTask = row.type === 'task'
  const quad = row.quadrant === null ? undefined : QUADRANTS.find((q) => q.key === row.quadrant)
  const reminderRow = row.event_reminders?.[0]

  return {
    id: row.id,
    title: row.title,
    ...decodeInterval(row),
    allDay: row.all_day,
    location: row.location ?? '',
    repeat: row.repeat_mode,
    notes: row.notes ?? '',
    important: quad?.important ?? false,
    urgent: quad?.urgent ?? false,
    done: row.done,
    estimatedPomodoros: row.estimated_pomodoros,
    completedPomodoros: row.completed_pomodoros,
    type: isTask ? 'quadrant' : 'event',
    backgroundColor: isTask ? null : row.color,
    icon: isTask ? null : row.icon,
    // Pure passthrough: the store holds real uuids end-to-end once Phase A's real calendars are
    // loaded, so there is nothing left to translate here (taskToRow is the only sentinel-consuming
    // boundary now).
    calendarId: row.calendar_id,
    reminder: reminderRow ? minutesToReminder(reminderRow.minutes_before) : null,
    ownerId: row.owner_id
  }
}
