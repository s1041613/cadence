import { describe, it, expect } from 'vitest'
import { hasTimeOverlap, findConflictingTask, type ConflictCheckable } from './check-task-conflict'

function task(overrides: Partial<ConflictCheckable> & { id: string }): ConflictCheckable {
  return {
    date: '2026-07-10',
    start: '14:00',
    end: '15:00',
    allDay: false,
    ...overrides
  }
}

describe('hasTimeOverlap', () => {
  it('flags overlapping same-day tasks', () => {
    const a = task({ id: 'a', start: '14:00', end: '15:00' })
    const b = task({ id: 'b', start: '14:30', end: '15:30' })
    expect(hasTimeOverlap(a, b)).toBe(true)
  })

  it('exempts all-day tasks from conflict checking', () => {
    const a = task({ id: 'a', allDay: true, start: '', end: '' })
    const b = task({ id: 'b', start: '00:00', end: '23:59' })
    expect(hasTimeOverlap(a, b)).toBe(false)
  })

  it('does not flag tasks on different dates', () => {
    const a = task({ id: 'a', date: '2026-07-10' })
    const b = task({ id: 'b', date: '2026-07-11' })
    expect(hasTimeOverlap(a, b)).toBe(false)
  })

  it('does not flag non-overlapping same-day tasks', () => {
    const a = task({ id: 'a', start: '09:00', end: '10:00' })
    const b = task({ id: 'b', start: '10:00', end: '11:00' })
    expect(hasTimeOverlap(a, b)).toBe(false)
  })
})

describe('findConflictingTask', () => {
  it('finds the conflicting task, excluding itself', () => {
    const a = task({ id: 'a', start: '14:00', end: '15:00' })
    const b = task({ id: 'b', start: '14:30', end: '15:30' })
    const c = task({ id: 'c', start: '09:00', end: '10:00' })
    expect(findConflictingTask(a, [a, b, c])).toBe(b)
  })

  it('returns null when there is no conflict', () => {
    const a = task({ id: 'a', start: '14:00', end: '15:00' })
    const c = task({ id: 'c', start: '09:00', end: '10:00' })
    expect(findConflictingTask(a, [a, c])).toBeNull()
  })

  it('still counts a done task as occupying its time slot', () => {
    const a = task({ id: 'a', start: '14:00', end: '15:00' })
    const doneTask = { ...task({ id: 'b', start: '14:30', end: '15:30' }), done: true }
    expect(findConflictingTask(a, [a, doneTask])).toBe(doneTask)
  })
})
