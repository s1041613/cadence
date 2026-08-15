import { iso, parseISO, WD_CAP } from './convert-date-time'

// Month abbreviations for the 7-days-and-older fallback. Declared here rather than in
// convert-date-time because the Notebook card is the only caller — widening the shared
// module for one consumer would make it the place every future format lands.
const MONTH_CAP = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Human label for a note's capture day, as shown on the Notebook card.
 *
 * Not groupByRecency: that returns *buckets* over YYYY-MM-DD day strings and discards
 * anything older than 7 days. The notebook labels each card individually, over ISO
 * instants, and never hides a note however old.
 *
 * Rules:
 *   same day        → 'Today'
 *   previous day    → 'Yesterday'
 *   2-6 days ago    → 'Mon' / 'Sun' …
 *   7+ days ago     → 'Mar 4', or 'Mar 4, 2025' once it is a prior calendar year
 *
 * Seven is where the weekday name stops being useful: at exactly 7 days it repeats
 * today's own weekday, so "Wed" on a Wednesday would read as either today or a week ago.
 *
 * `now` is a parameter, not `new Date()`, so this is testable — same convention as
 * groupByRecency. Callers should pass the shared ticking clock from useCurrentTime()
 * so labels roll over at midnight instead of freezing at render time.
 */
export function relativeDayLabel(createdAtIso: string, now: Date): string {
  const created = new Date(createdAtIso)

  // Compare calendar days, not elapsed milliseconds: a note written at 23:50 must read
  // "Yesterday" at 00:10 the next morning, though only 20 minutes have passed. Round-tripping
  // both instants through iso()/parseISO() normalises each to local midnight, which also makes
  // the subtraction immune to DST-shortened days. `new Date(createdAtIso)` is safe here because
  // the input is a full ISO-8601 instant with an offset — unlike a bare 'YYYY-MM-DD', which
  // convert-date-time warns parses as UTC.
  const createdDayMs = parseISO(iso(created)).getTime()
  const nowDayMs = parseISO(iso(now)).getTime()
  const ageDays = Math.round((nowDayMs - createdDayMs) / DAY_MS)

  // Negative ages come from clock skew between devices. Treat a future-dated note as Today
  // rather than letting it fall through to the weekday branch and read as a week-old note.
  if (ageDays <= 0) return 'Today'
  if (ageDays === 1) return 'Yesterday'
  if (ageDays < 7) return WD_CAP[created.getDay()] as string

  const monthDay = `${MONTH_CAP[created.getMonth()] as string} ${created.getDate()}`
  return created.getFullYear() === now.getFullYear() ? monthDay : `${monthDay}, ${created.getFullYear()}`
}
