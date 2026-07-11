import { iso, parseISO } from './convert-date-time'

export interface RecencyGroup<T> {
  label: 'Today' | 'Yesterday' | 'Previous 7 Days'
  items: T[]
}

const LABELS: RecencyGroup<never>['label'][] = ['Today', 'Yesterday', 'Previous 7 Days']

// Groups items by their `createdAt` ISO date relative to `today`, newest group first. Items older
// than 7 days are dropped from every group (spec scopes grouping to Today/Yesterday/Previous 7 Days
// only; no group exists for them). Empty groups are omitted.
export function groupByRecency<T extends { createdAt: string }>(items: T[], today: Date): RecencyGroup<T>[] {
  const todayIso = iso(today)
  const todayMs = parseISO(todayIso).getTime()
  const dayMs = 24 * 60 * 60 * 1000

  const buckets: Record<RecencyGroup<never>['label'], T[]> = { Today: [], Yesterday: [], 'Previous 7 Days': [] }

  for (const item of items) {
    const ageDays = Math.round((todayMs - parseISO(item.createdAt).getTime()) / dayMs)
    if (ageDays === 0) buckets.Today.push(item)
    else if (ageDays === 1) buckets.Yesterday.push(item)
    else if (ageDays > 1 && ageDays <= 7) buckets['Previous 7 Days'].push(item)
  }

  return LABELS.map((label) => ({ label, items: buckets[label] })).filter((g) => g.items.length > 0)
}
