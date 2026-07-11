import { describe, expect, it } from 'vitest'
import { groupByRecency } from './group-by-recency'

describe('groupByRecency', () => {
  const today = new Date('2026-07-10')

  it('groups an item created today under Today and one from three days ago under Previous 7 Days', () => {
    const items = [
      { id: 'a', createdAt: '2026-07-10' },
      { id: 'b', createdAt: '2026-07-07' }
    ]
    const groups = groupByRecency(items, today)
    expect(groups).toEqual([
      { label: 'Today', items: [items[0]] },
      { label: 'Previous 7 Days', items: [items[1]] }
    ])
  })

  it('groups yesterday separately from Previous 7 Days', () => {
    const items = [{ id: 'a', createdAt: '2026-07-09' }]
    const groups = groupByRecency(items, today)
    expect(groups).toEqual([{ label: 'Yesterday', items: [items[0]] }])
  })

  it('orders groups newest first and omits empty groups', () => {
    const items = [
      { id: 'a', createdAt: '2026-07-04' },
      { id: 'b', createdAt: '2026-07-10' }
    ]
    const groups = groupByRecency(items, today)
    expect(groups.map((g) => g.label)).toEqual(['Today', 'Previous 7 Days'])
  })

  it('drops items older than 7 days', () => {
    const items = [{ id: 'a', createdAt: '2026-07-01' }]
    const groups = groupByRecency(items, today)
    expect(groups).toEqual([])
  })
})
