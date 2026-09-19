import { describe, expect, it } from 'vitest'
import { bucketOfAge, bucketOverdue } from './overdue-buckets'

const task = (id: string, date: string, start = '09:00') => ({ id, date, start })

describe('bucketOfAge', () => {
  it('has no bucket for a task dated on or after the viewed day', () => {
    expect(bucketOfAge(0)).toBeNull()
    expect(bucketOfAge(-3)).toBeNull()
  })

  it('splits yesterday from the rest of the week, and the week from older', () => {
    expect(bucketOfAge(1)).toBe('yesterday')
    expect(bucketOfAge(2)).toBe('week')
    expect(bucketOfAge(7)).toBe('week')
    expect(bucketOfAge(8)).toBe('older')
  })
})

describe('bucketOverdue', () => {
  const onDate = '2026-09-19'

  it('groups by distance and omits empty buckets', () => {
    const groups = bucketOverdue([task('a', '2026-09-18'), task('b', '2026-09-15')], onDate)
    expect(groups.map((g) => [g.key, g.items.map((i) => i.id)])).toEqual([
      ['yesterday', ['a']],
      ['week', ['b']]
    ])
  })

  it('leaves out tasks that are not overdue', () => {
    expect(bucketOverdue([task('a', onDate), task('b', '2026-09-20')], onDate)).toEqual([])
  })

  it('keeps tasks of any age — nothing falls off the far end', () => {
    const groups = bucketOverdue([task('ancient', '2025-01-02')], onDate)
    expect(groups.map((g) => g.key)).toEqual(['older'])
    expect(groups[0]!.items.map((i) => i.id)).toEqual(['ancient'])
  })

  it('orders a bucket newest first, and one date by its start time', () => {
    const groups = bucketOverdue(
      [
        task('older', '2026-09-14'),
        task('late-slot', '2026-09-17', '15:00'),
        task('early-slot', '2026-09-17', '08:30')
      ],
      onDate
    )
    expect(groups[0]!.items.map((i) => i.id)).toEqual(['early-slot', 'late-slot', 'older'])
  })
})
