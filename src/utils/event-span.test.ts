import { describe, it, expect } from 'vitest'
import { spansDate, segmentsForDate } from './event-span'

const trip = { id: 'trip', date: '2026-07-10', endDate: '2026-07-12' }
const single = { id: 'single', date: '2026-07-11' }

describe('spansDate', () => {
  it('covers every day of the span, inclusive of both ends', () => {
    expect(spansDate(trip, '2026-07-10')).toBe(true)
    expect(spansDate(trip, '2026-07-11')).toBe(true)
    expect(spansDate(trip, '2026-07-12')).toBe(true)
  })

  it('excludes the days either side of the span', () => {
    expect(spansDate(trip, '2026-07-09')).toBe(false)
    expect(spansDate(trip, '2026-07-13')).toBe(false)
  })

  it('matches only its own date for a single-day entry', () => {
    expect(spansDate(single, '2026-07-11')).toBe(true)
    expect(spansDate(single, '2026-07-12')).toBe(false)
  })

  // endDateOf normalizes an inverted span, so the entry stays visible on its start day
  // rather than disappearing from the calendar entirely.
  it('falls back to the start day when the end date is inverted', () => {
    const broken = { date: '2026-07-10', endDate: '2026-07-08' }
    expect(spansDate(broken, '2026-07-10')).toBe(true)
    expect(spansDate(broken, '2026-07-09')).toBe(false)
  })

  it('spans month and year boundaries', () => {
    expect(spansDate({ date: '2026-07-31', endDate: '2026-08-02' }, '2026-08-01')).toBe(true)
    expect(spansDate({ date: '2026-12-31', endDate: '2027-01-01' }, '2027-01-01')).toBe(true)
  })
})

describe('segmentsForDate', () => {
  it('labels each day of a span with its position', () => {
    const at = (date: string) => segmentsForDate([trip], date)[0]

    expect(at('2026-07-10')?.position).toBe('first')
    expect(at('2026-07-11')?.position).toBe('middle')
    expect(at('2026-07-12')?.position).toBe('last')
  })

  it('labels a single-day entry as the only day of its span', () => {
    const segment = segmentsForDate([single], '2026-07-11')[0]

    expect(segment?.position).toBe('only')
    expect(segment?.multiDay).toBe(false)
    expect(segment?.dayCount).toBe(1)
  })

  it('numbers the days of a span from one', () => {
    const segment = segmentsForDate([trip], '2026-07-11')[0]

    expect(segment?.dayIndex).toBe(2)
    expect(segment?.dayCount).toBe(3)
    expect(segment?.multiDay).toBe(true)
  })

  it('returns the entries covering the day and nothing else', () => {
    const tasks = [trip, single, { id: 'later', date: '2026-07-20' }]

    expect(segmentsForDate(tasks, '2026-07-11').map((s) => s.task.id)).toEqual(['trip', 'single'])
    expect(segmentsForDate(tasks, '2026-07-10').map((s) => s.task.id)).toEqual(['trip'])
    expect(segmentsForDate(tasks, '2026-07-15')).toEqual([])
  })

  // Views sort by time or all-day themselves; the selector must not impose an order.
  it('preserves input order', () => {
    const tasks = [{ id: 'b', date: '2026-07-11' }, { id: 'a', date: '2026-07-11' }]

    expect(segmentsForDate(tasks, '2026-07-11').map((s) => s.task.id)).toEqual(['b', 'a'])
  })

  it('carries the day it was asked about', () => {
    expect(segmentsForDate([trip], '2026-07-11')[0]?.date).toBe('2026-07-11')
  })

  it('numbers days correctly across a month boundary', () => {
    const segment = segmentsForDate([{ date: '2026-07-31', endDate: '2026-08-02' }], '2026-08-01')[0]

    expect(segment?.dayIndex).toBe(2)
    expect(segment?.position).toBe('middle')
  })
})
