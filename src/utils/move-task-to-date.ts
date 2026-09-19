import { addDays, daysBetween, endDateOf, iso, parseISO } from './convert-date-time'
import type { Task } from '@/types/task'

/**
 * The same task, re-dated onto `target`.
 *
 * Re-dating is not rescheduling: start, end and allDay are carried over untouched, because the
 * user moving an overdue task is saying "this still has to happen", not "this happens at a new
 * time". A multi-day span moves whole — a two-day task lands as a two-day task — which means
 * endDate has to travel with the start rather than staying where it was, or the span would
 * stretch or invert.
 *
 * A task with no endDate keeps none: the field's absence means "single day", and writing one in
 * would turn every moved task into an explicit one-day span for no reason.
 */
export function movedToDate(task: Task, target: string): Task {
  if (task.endDate === undefined) return { ...task, date: target }
  const span = daysBetween(task.date, endDateOf(task))
  return { ...task, date: target, endDate: iso(addDays(parseISO(target), span)) }
}
