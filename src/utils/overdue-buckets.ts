import { daysBetween } from './convert-date-time'

/**
 * Buckets unfinished tasks by how far they fall before the day being viewed.
 *
 * A sibling of group-by-recency.ts rather than a generalization of it: that one keys on
 * `createdAt`, measures against *today*, and deliberately drops anything older than a week
 * (the notebook has no group for those). This one keys on `date`, measures against whichever
 * day the day view is showing, and must never drop a row — an overdue task that stopped being
 * listed would look like it had been dealt with. Two contracts, two functions; neither is the
 * other with a flag.
 */
export type OverdueBucketKey = 'yesterday' | 'week' | 'older'

export interface OverdueBucket<T> {
  key: OverdueBucketKey
  label: string
  items: T[]
}

/** Most recently overdue first — the same direction the buckets themselves run in. */
const ORDER: readonly OverdueBucketKey[] = ['yesterday', 'week', 'older']

const LABELS: Record<OverdueBucketKey, string> = {
  yesterday: '昨天',
  week: '一週內',
  older: '更早'
}

/** The bucket an age in days belongs to, or null when the task is not overdue at all. */
export function bucketOfAge(ageDays: number): OverdueBucketKey | null {
  if (ageDays < 1) return null
  if (ageDays === 1) return 'yesterday'
  if (ageDays <= 7) return 'week'
  return 'older'
}

/**
 * Groups `items` by how overdue they are relative to `onDate`, newest overdue first within
 * each bucket and empty buckets omitted. Items dated on or after `onDate` are not overdue and
 * are left out; nothing else is.
 */
export function bucketOverdue<T extends { date: string; start: string }>(
  items: readonly T[],
  onDate: string
): OverdueBucket<T>[] {
  const buckets: Record<OverdueBucketKey, T[]> = { yesterday: [], week: [], older: [] }

  for (const item of items) {
    const key = bucketOfAge(daysBetween(item.date, onDate))
    if (key !== null) buckets[key].push(item)
  }

  for (const key of ORDER) {
    // Newest date first, and within one date the earliest slot first: a bucket reads down the
    // same way the sheet does, from "just missed" towards "long gone".
    buckets[key].sort((a, b) => (a.date === b.date ? a.start.localeCompare(b.start) : b.date.localeCompare(a.date)))
  }

  return ORDER.map((key) => ({ key, label: LABELS[key], items: buckets[key] })).filter((b) => b.items.length > 0)
}
