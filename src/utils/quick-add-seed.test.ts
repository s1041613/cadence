import { describe, it, expect } from 'vitest'
import { quickAddSeed } from './quick-add-seed'
import { quickAddTimeRange } from './convert-date-time'
import type { QuickAddState } from '@/stores/ui-store'

// The anchor is irrelevant to the seed; only the date/time triple matters.
const anchor = { x: 0, y: 0, w: 0, h: 0 } as unknown as QuickAddState['anchor']

const pop = (over: Partial<QuickAddState>): QuickAddState => ({
  anchor,
  date: '2026-08-19',
  time: '11:00',
  endTime: '12:00',
  ...over
})

describe('quickAddSeed', () => {
  it('carries the tapped slot through untouched', () => {
    // The day grid's click handler (DaySchedule.onColumnClick) rounds first, so the seed's
    // only job is to not lose what it was given.
    const { start, end } = quickAddTimeRange(11 * 60 + 43)
    const seed = quickAddSeed(pop({ date: '2026-08-19', time: start, endTime: end }))
    expect(seed.date).toBe('2026-08-19')
    expect(seed.start).toBe('11:30')
    expect(seed.end).toBe('12:30')
    expect(seed.allDay).toBe(false)
  })

  it('opens single-day: endDate starts on the tapped date, not empty', () => {
    // An undefined/empty endDate reaching the card is what made its ENDS date picker
    // disappear (parseISO throws in CdDatePicker's setup).
    expect(quickAddSeed(pop({ date: '2026-08-19' })).endDate).toBe('2026-08-19')
  })

  it('treats a month cell (no time context) as all-day', () => {
    const seed = quickAddSeed(pop({ time: null, endTime: null }))
    expect(seed.allDay).toBe(true)
    expect(seed.start).toBe('09:00')
    expect(seed.end).toBe('10:00')
    expect(seed.endDate).toBe(seed.date)
  })
})
