import { describe, expect, it } from 'vitest'
import { movedToDate } from './move-task-to-date'
import { mkTask } from '@/stores/tasks-store'

const base = { date: '2026-09-16', calendarId: 'cal-1' }

describe('movedToDate', () => {
  it('re-dates a single-day task and leaves endDate absent', () => {
    const moved = movedToDate(mkTask({ ...base, start: '09:00', end: '10:00' }), '2026-09-19')
    expect(moved.date).toBe('2026-09-19')
    expect(moved.endDate).toBeUndefined()
  })

  it('keeps the time range and the all-day flag as they were', () => {
    const task = mkTask({ ...base, start: '14:30', end: '15:45', allDay: false })
    const moved = movedToDate(task, '2026-09-19')
    expect([moved.start, moved.end, moved.allDay]).toEqual(['14:30', '15:45', false])
  })

  it('carries a multi-day span whole instead of stretching it', () => {
    const task = mkTask({ ...base, endDate: '2026-09-18' })
    const moved = movedToDate(task, '2026-09-19')
    expect([moved.date, moved.endDate]).toEqual(['2026-09-19', '2026-09-21'])
  })

  it('does not invert a span when moving backwards', () => {
    const task = mkTask({ date: '2026-09-16', endDate: '2026-09-20', calendarId: 'cal-1' })
    const moved = movedToDate(task, '2026-09-10')
    expect([moved.date, moved.endDate]).toEqual(['2026-09-10', '2026-09-14'])
  })

  it('leaves everything else on the task alone', () => {
    const task = mkTask({ ...base, title: '訂牙醫', important: true, urgent: false })
    const moved = movedToDate(task, '2026-09-19')
    expect({ ...moved, date: task.date }).toEqual(task)
  })
})
