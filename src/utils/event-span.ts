import { endDateOf, isMultiDay, minutes, spanDayCount, daysBetween, type DateSpan } from './convert-date-time'

export { endDateOf, isMultiDay, spanDayCount, type DateSpan }

const DAY_START_MIN = 0
const DAY_END_MIN = 24 * 60

/** Where a rendered day sits inside its event's span. 'only' means a single-day entry. */
export type SpanPosition = 'only' | 'first' | 'middle' | 'last'

/**
 * One event as it appears on one specific day. A multi-day event yields one segment per day
 * it covers, each carrying where that day falls in the span so the view can render
 * continuation affordances without recomputing the range.
 */
export interface DaySegment<T> {
  task: T
  /** The day this segment renders on. */
  date: string
  position: SpanPosition
  /** True unless the span is a single day — the flag most call sites branch on. */
  multiDay: boolean
  /** 1-based position of `date` within the span, and the span's inclusive length. */
  dayIndex: number
  dayCount: number
}

/**
 * True when `date` falls inside the entry's inclusive span.
 *
 * Zero-padded "YYYY-MM-DD" orders correctly as a string, so this is two comparisons and no
 * Date allocation — it replaces `t.date === date` in per-cell filters that run once per
 * rendered day.
 */
export const spansDate = (t: DateSpan, date: string): boolean => date >= t.date && date <= endDateOf(t)

const positionOf = (dayIndex: number, dayCount: number): SpanPosition => {
  if (dayCount === 1) return 'only'
  if (dayIndex === 1) return 'first'
  return dayIndex === dayCount ? 'last' : 'middle'
}

/**
 * The minute range an entry occupies on one specific day of its span.
 *
 * A time grid lays out a single day, so it cannot render `22:00 -> 02:00` as one block: the
 * raw subtraction is negative and the event would collapse or invert. Each day of the span
 * gets its own bounded segment instead — the first day runs to midnight, the last starts at
 * midnight, and any day between is full. A single-day entry passes through untouched.
 */
export function clipToDay(
  t: DateSpan & { start: string; end: string },
  date: string
): { start: number; end: number } {
  const isFirst = date === t.date
  const isLast = date === endDateOf(t)
  return {
    start: isFirst ? minutes(t.start) : DAY_START_MIN,
    end: isLast ? minutes(t.end) : DAY_END_MIN
  }
}

/**
 * Every entry whose span covers `date`, each wrapped with its position in that span.
 *
 * Input order is preserved; callers that need chronological or all-day-first ordering sort
 * the result themselves, as the views already do.
 */
export function segmentsForDate<T extends DateSpan>(tasks: readonly T[], date: string): DaySegment<T>[] {
  const segments: DaySegment<T>[] = []
  for (const task of tasks) {
    if (!spansDate(task, date)) continue
    const dayCount = spanDayCount(task)
    const dayIndex = daysBetween(task.date, date) + 1
    segments.push({
      task,
      date,
      position: positionOf(dayIndex, dayCount),
      multiDay: dayCount > 1,
      dayIndex,
      dayCount
    })
  }
  return segments
}
