import { minutes } from './convert-date-time'

export interface ConflictCheckable {
  id: string
  date: string
  start: string
  end: string
  allDay: boolean
}

// Two tasks conflict when: neither is all-day, both have a start/end, same date, and their time ranges intersect.
// Deliberately preserved prototype boundary behavior: start<end is never validated, all-day/timeless tasks are
// exempt, and a `done` task still counts as occupying its slot — these are design decisions, not gaps.
export function hasTimeOverlap(a: ConflictCheckable, b: ConflictCheckable): boolean {
  if (a.allDay || b.allDay || !a.start || !a.end || !b.start || !b.end) return false
  if (a.date !== b.date) return false
  return minutes(a.start) < minutes(b.end) && minutes(b.start) < minutes(a.end)
}

export function findConflictingTask<T extends ConflictCheckable>(task: T, tasks: T[]): T | null {
  return tasks.find((x) => x.id !== task.id && hasTimeOverlap(task, x)) ?? null
}
