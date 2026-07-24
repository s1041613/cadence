import { describe, expect, it } from 'vitest'
import { buildCopyToDaysCells, REMINDER_OPTIONS, reminderLabel } from './event-panel'

describe('reminderLabel', () => {
  it('labels every reminder preset used by event editors', () => {
    expect(REMINDER_OPTIONS).toEqual([
      { value: null, label: 'None' },
      { value: 'at-time', label: 'At time' },
      { value: '5-min', label: '5 min before' },
      { value: '15-min', label: '15 min before' },
      { value: '30-min', label: '30 min before' },
      { value: '1-hour', label: '1 hour before' },
      { value: '1-day', label: '1 day before' }
    ])
    expect(reminderLabel(null)).toBe('None')
    expect(reminderLabel('15-min')).toBe('15 min before')
  })
})

describe('buildCopyToDaysCells', () => {
  it('keeps a stable 42-cell grid with outside-month days blank', () => {
    const cells = buildCopyToDaysCells(2026, 6, 'Monday', '2026-07-10')

    expect(cells).toHaveLength(42)
    expect(cells.slice(0, 2)).toEqual([null, null])
    expect(cells[2]).toMatchObject({ date: '2026-07-01', day: 1, disabled: false })
    expect(cells.at(-1)).toBeNull()
  })

  it('leaves the source date selectable for same-day copies', () => {
    const cells = buildCopyToDaysCells(2026, 6, 'Monday', '2026-07-10')
    const source = cells.find((cell) => cell?.date === '2026-07-10')

    expect(source).toEqual({ date: '2026-07-10', day: 10, disabled: false })
  })
})
