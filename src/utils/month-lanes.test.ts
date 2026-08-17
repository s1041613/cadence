import { describe, it, expect } from 'vitest'
import { compareForLane, computeHidden, layoutWeek, weekRows, type LaneTask } from './month-lanes'
import { monthGridCells } from './month-grid'

// Minimal shape the lane layout needs. Real Tasks carry far more, but nothing here reads it.
const task = (over: Partial<LaneTask> & Pick<LaneTask, 'id' | 'date'>): LaneTask => ({
  allDay: false,
  start: '',
  ...over
})

// 2026-07-05 is a Sunday, so this is a Sunday-anchored week: Sun 5th → Sat 11th.
const WEEK = ['2026-07-05', '2026-07-06', '2026-07-07', '2026-07-08', '2026-07-09', '2026-07-10', '2026-07-11']

describe('weekRows', () => {
  it('chunks a 35-cell month into 5 weeks of 7', () => {
    const rows = weekRows(Array.from({ length: 35 }, (_, i) => i))

    expect(rows).toHaveLength(5)
    expect(rows.every((r) => r.length === 7)).toBe(true)
  })

  it('chunks a 42-cell month into 6 weeks of 7', () => {
    expect(weekRows(Array.from({ length: 42 }, (_, i) => i))).toHaveLength(6)
  })

  // monthGridCells is the real producer; its length is always a multiple of 7.
  it('chunks a real month grid without a partial row', () => {
    const rows = weekRows(monthGridCells(2026, 6, 'Sunday'))

    expect(rows.every((r) => r.length === 7)).toBe(true)
  })
})

describe('layoutWeek clipping', () => {
  it('maps a span inside the week to its columns', () => {
    const [bar] = layoutWeek([task({ id: 'trip', date: '2026-07-06', endDate: '2026-07-08' })], WEEK).bars

    expect(bar).toMatchObject({ startCol: 1, span: 3, continuesLeft: false, continuesRight: false })
  })

  it('gives a single-day entry a span of one', () => {
    const [bar] = layoutWeek([task({ id: 'solo', date: '2026-07-07' })], WEEK).bars

    expect(bar).toMatchObject({ startCol: 2, span: 1 })
  })

  it('excludes entries that do not touch the week', () => {
    const tasks = [task({ id: 'before', date: '2026-07-01' }), task({ id: 'after', date: '2026-07-20' })]

    expect(layoutWeek(tasks, WEEK).bars).toEqual([])
  })

  it('clips a span that starts before the week and marks it continuing', () => {
    const [bar] = layoutWeek([task({ id: 'x', date: '2026-07-02', endDate: '2026-07-07' })], WEEK).bars

    expect(bar).toMatchObject({ startCol: 0, span: 3, continuesLeft: true, continuesRight: false })
  })

  it('clips a span that runs past the week and marks it continuing', () => {
    const [bar] = layoutWeek([task({ id: 'x', date: '2026-07-09', endDate: '2026-07-15' })], WEEK).bars

    expect(bar).toMatchObject({ startCol: 4, span: 3, continuesLeft: false, continuesRight: true })
  })

  it('spans a whole week from both directions', () => {
    const [bar] = layoutWeek([task({ id: 'long', date: '2026-07-01', endDate: '2026-07-20' })], WEEK).bars

    expect(bar).toMatchObject({ startCol: 0, span: 7, continuesLeft: true, continuesRight: true })
  })

  // The week-boundary split: one task, two week rows, same id on both.
  it('splits a Friday-to-Tuesday span across two week rows', () => {
    const nextWeek = ['2026-07-12', '2026-07-13', '2026-07-14', '2026-07-15', '2026-07-16', '2026-07-17', '2026-07-18']
    const trip = [task({ id: 'trip', date: '2026-07-10', endDate: '2026-07-14' })]

    const [first] = layoutWeek(trip, WEEK).bars
    const [second] = layoutWeek(trip, nextWeek).bars

    expect(first).toMatchObject({ startCol: 5, span: 2, continuesRight: true })
    expect(second).toMatchObject({ startCol: 0, span: 3, continuesLeft: true })
    expect(first?.task.id).toBe(second?.task.id)
  })

  it('spans a month boundary', () => {
    const week = ['2026-07-26', '2026-07-27', '2026-07-28', '2026-07-29', '2026-07-30', '2026-07-31', '2026-08-01']
    const [bar] = layoutWeek([task({ id: 'x', date: '2026-07-31', endDate: '2026-08-02' })], week).bars

    expect(bar).toMatchObject({ startCol: 5, span: 2, continuesRight: true })
  })

  // endDateOf normalizes an inverted range, so the entry stays visible as a single day.
  it('treats an inverted endDate as a single-day bar', () => {
    const [bar] = layoutWeek([task({ id: 'broken', date: '2026-07-08', endDate: '2026-07-06' })], WEEK).bars

    expect(bar).toMatchObject({ startCol: 3, span: 1 })
  })

  // Column index comes from the week array, never getDay() — otherwise Sunday is hardcoded.
  it('honours the first-day-of-week setting', () => {
    const mondayWeek = ['2026-07-06', '2026-07-07', '2026-07-08', '2026-07-09', '2026-07-10', '2026-07-11', '2026-07-12']
    const trip = [task({ id: 'trip', date: '2026-07-08', endDate: '2026-07-09' })]

    expect(layoutWeek(trip, WEEK).bars[0]).toMatchObject({ startCol: 3, span: 2 })
    expect(layoutWeek(trip, mondayWeek).bars[0]).toMatchObject({ startCol: 2, span: 2 })
  })
})

describe('layoutWeek lane packing', () => {
  it('puts non-overlapping bars in the same lane', () => {
    const tasks = [task({ id: 'a', date: '2026-07-05' }), task({ id: 'b', date: '2026-07-09' })]

    expect(layoutWeek(tasks, WEEK).bars.map((b) => b.lane)).toEqual([0, 0])
  })

  it('pushes an overlapping bar to the next lane', () => {
    const tasks = [
      task({ id: 'a', date: '2026-07-05', endDate: '2026-07-08' }),
      task({ id: 'b', date: '2026-07-06', endDate: '2026-07-09' })
    ]

    expect(layoutWeek(tasks, WEEK).bars.map((b) => b.lane)).toEqual([0, 1])
  })

  it('reports how many lanes the week used', () => {
    const tasks = [
      task({ id: 'a', date: '2026-07-05', endDate: '2026-07-11' }),
      task({ id: 'b', date: '2026-07-05', endDate: '2026-07-11' })
    ]

    expect(layoutWeek(tasks, WEEK).laneCount).toBe(2)
  })

  // THE regression test for the bug this change exists to fix: a span must hold one lane
  // across every day it covers, no matter what order the store hands the tasks over in.
  it('keeps a span in one lane regardless of input order', () => {
    const trip = task({ id: 'trip', date: '2026-07-06', endDate: '2026-07-08' })
    const singles = [task({ id: 's1', date: '2026-07-07' }), task({ id: 's2', date: '2026-07-07' })]

    const laneOf = (tasks: LaneTask[]) => layoutWeek(tasks, WEEK).bars.find((b) => b.task.id === 'trip')?.lane

    expect(laneOf([trip, ...singles])).toBe(0)
    expect(laneOf([...singles, trip])).toBe(0)
    expect(laneOf([singles[0]!, trip, singles[1]!])).toBe(0)
  })

  it('produces an identical layout when the input is shuffled', () => {
    const tasks = [
      task({ id: 'a', date: '2026-07-05', endDate: '2026-07-07' }),
      task({ id: 'b', date: '2026-07-06' }),
      task({ id: 'c', date: '2026-07-08', endDate: '2026-07-10' }),
      task({ id: 'd', date: '2026-07-09' })
    ]
    const key = (tasks: LaneTask[]) =>
      layoutWeek(tasks, WEEK).bars.map((b) => `${b.task.id}:${b.lane}:${b.startCol}:${b.span}`).sort()

    expect(key([...tasks].reverse())).toEqual(key(tasks))
    expect(key([tasks[2]!, tasks[0]!, tasks[3]!, tasks[1]!])).toEqual(key(tasks))
  })
})

describe('compareForLane', () => {
  // Dates are 'YYYY-MM-DD' strings. Numeric subtraction yields NaN, which short-circuits the
  // whole comparator chain and silently degrades ordering to span-only — the exact failure
  // that breaks lane stability. This pins the string comparison.
  it('orders by start date, comparing dates as strings', () => {
    const earlier = task({ id: 'z', date: '2026-07-09' })
    const later = task({ id: 'a', date: '2026-07-10' })

    expect(compareForLane(earlier, later)).toBeLessThan(0)
    expect(compareForLane(later, earlier)).toBeGreaterThan(0)
  })

  it('puts the longer span first when start dates match', () => {
    const long = task({ id: 'a', date: '2026-07-06', endDate: '2026-07-09' })
    const short = task({ id: 'b', date: '2026-07-06' })

    expect(compareForLane(long, short)).toBeLessThan(0)
  })

  it('puts all-day first when date and span match', () => {
    const allDay = task({ id: 'b', date: '2026-07-06', allDay: true })
    const timed = task({ id: 'a', date: '2026-07-06', start: '09:00' })

    expect(compareForLane(allDay, timed)).toBeLessThan(0)
  })

  it('orders by start time when date, span and all-day match', () => {
    const morning = task({ id: 'z', date: '2026-07-06', start: '09:00' })
    const evening = task({ id: 'a', date: '2026-07-06', start: '18:00' })

    expect(compareForLane(morning, evening)).toBeLessThan(0)
  })

  it('falls back to id so the order never depends on store order', () => {
    const a = task({ id: 'aaa', date: '2026-07-06', start: '09:00' })
    const b = task({ id: 'bbb', date: '2026-07-06', start: '09:00' })

    expect(compareForLane(a, b)).toBeLessThan(0)
    expect(compareForLane(a, a)).toBe(0)
  })

  // The grid and the day sheet must tell the same story about one day.
  it('gives the grid and a day-sheet list the same order', () => {
    const day = '2026-07-06'
    const tasks = [
      task({ id: 'c', date: day, start: '15:00' }),
      task({ id: 'a', date: day, allDay: true }),
      task({ id: 'b', date: day, start: '09:00' })
    ]

    const sheetOrder = [...tasks].sort(compareForLane).map((t) => t.id)
    const gridOrder = layoutWeek(tasks, WEEK).bars.map((b) => b.task.id)

    expect(gridOrder).toEqual(sheetOrder)
  })
})

describe('computeHidden', () => {
  const barAt = (lane: number, startCol: number, span = 1) => ({ lane, startCol, span })

  it('shows every lane and hides nothing when the week fits', () => {
    expect(computeHidden([barAt(0, 0), barAt(1, 0)], 3)).toEqual({
      visibleLanes: 3,
      hiddenPerDay: [0, 0, 0, 0, 0, 0, 0]
    })
  })

  // Reserving a row for "+N" costs a lane, which can hide a bar that previously fit —
  // so the count has to be recomputed against the reduced budget, not the original one.
  it('reserves a lane for the +N row and recounts against it', () => {
    const bars = [barAt(0, 0), barAt(1, 0), barAt(2, 0)]
    const result = computeHidden(bars, 2)

    expect(result.visibleLanes).toBe(1)
    expect(result.hiddenPerDay[0]).toBe(2)
  })

  it('counts hidden bars per day, not per week', () => {
    const result = computeHidden([barAt(0, 0), barAt(1, 0), barAt(2, 0), barAt(2, 3)], 2)

    expect(result.hiddenPerDay[0]).toBe(2)
    expect(result.hiddenPerDay[3]).toBe(1)
    expect(result.hiddenPerDay[6]).toBe(0)
  })

  it('counts every column a hidden multi-day bar covers', () => {
    const result = computeHidden([barAt(0, 0), barAt(1, 0), barAt(2, 1, 3)], 2)

    expect(result.hiddenPerDay).toEqual([1, 1, 1, 1, 0, 0, 0])
  })

  it('never drops below one visible lane', () => {
    expect(computeHidden([barAt(0, 0), barAt(1, 0)], 1).visibleLanes).toBe(1)
  })
})
