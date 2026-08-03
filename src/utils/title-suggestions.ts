import type { ReminderPreset, Task } from '../types/task'

// Fits above a mobile on-screen keyboard without scrolling.
export const SUGGESTION_LIMIT = 7

/** A past event or task offered as a starting point for a new one. Deliberately omits `notes`
 * (usually specific to one occurrence) and `repeat` (inert today, but carrying it would silently
 * schedule recurrences once that lands). */
export interface TitleSuggestion {
  /** Identity of the row, and the value persisted when the user dismisses it. */
  key: string
  title: string
  start: string
  end: string
  allDay: boolean
  backgroundColor: string | null
  icon: string | null
  calendarId: string
  reminder: ReminderPreset | null
  location: string
}

export interface TitleSuggestionOptions {
  /** Current user. Events authored by other calendar members are not suggested. */
  ownerId: string | undefined
  query: string
  dismissed: ReadonlySet<string>
}

// Case and surrounding whitespace are noise when deciding whether two titles are "the same".
const normalize = (title: string): string => title.trim().toLowerCase()

/** Identifies a suggestion row. Same title at different times are distinct rows, so dismissing
 * one leaves the others alone — the key has to carry the time as well as the title. */
export function dismissalKey(title: string, start: string, end: string, allDay: boolean): string {
  return allDay ? `${normalize(title)} all-day` : `${normalize(title)} ${start} ${end}`
}

const isOwn = (task: Task, ownerId: string | undefined): boolean =>
  task.ownerId === undefined || task.ownerId === ownerId

// Date alone leaves same-day events tied, and a tie would be broken by whatever order the task
// array happens to be in. Both fields are zero-padded, so lexicographic order is chronological.
const recencyOf = (task: Task): string => `${task.date} ${task.start}`

/** Derives suggestions from the events and tasks already in memory — no separate index table, so
 * the list is complete from the first use rather than accumulating from the day the feature ships. */
export function buildTitleSuggestions(tasks: Task[], options: TitleSuggestionOptions): TitleSuggestion[] {
  const { ownerId, query, dismissed } = options
  const normalizedQuery = normalize(query)

  // Latest occurrence per row wins: it supplies the display casing and the carried-over values.
  const latest = new Map<string, Task>()

  for (const task of tasks) {
    // Events and quadrant tasks both feed the list: a recurring chore is retyped as often as a
    // recurring event, and when you type a title you're thinking of the words, not which of the two
    // it was stored as last time. A task supplies only what it has — no colour, icon or calendar.
    if (!isOwn(task, ownerId)) continue
    if (!task.title.trim()) continue

    const key = dismissalKey(task.title, task.start, task.end, task.allDay)
    if (dismissed.has(key)) continue

    const incumbent = latest.get(key)
    if (!incumbent || recencyOf(task) > recencyOf(incumbent)) latest.set(key, task)
  }

  // An exact title match stays in the list: a row carries the time, colour, calendar, reminder and
  // location too, so someone who typed the full title by hand still has everything else to gain
  // from picking it.
  const matches = [...latest.entries()].filter(
    ([, task]) => !normalizedQuery || normalize(task.title).startsWith(normalizedQuery)
  )

  return matches
    .sort(([, a], [, b]) => recencyOf(b).localeCompare(recencyOf(a)))
    .slice(0, SUGGESTION_LIMIT)
    .map(([key, task]) => ({
      key,
      title: task.title.trim(),
      start: task.start,
      end: task.end,
      allDay: task.allDay,
      backgroundColor: task.backgroundColor,
      icon: task.icon,
      calendarId: task.calendarId,
      reminder: task.reminder,
      location: task.location
    }))
}
