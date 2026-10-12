import { describe, it, expect } from 'vitest'
import { carriedOver, nextPosition, splitTodoLines, todosOn } from './day-todos'
import type { DayTodo } from '@/types/day-todo'

const todo = (over: Partial<DayTodo> & Pick<DayTodo, 'id' | 'date'>): DayTodo => ({
  originDate: over.date,
  title: over.id,
  done: false,
  position: 0,
  ...over
})

describe('splitTodoLines', () => {
  it('makes one todo per line, trimmed, with blank lines dropped', () => {
    expect(splitTodoLines('  練舞 \n\n系統 demo 確認\n\n')).toEqual(['練舞', '系統 demo 確認'])
  })

  it('handles Windows line endings', () => {
    expect(splitTodoLines('a\r\nb')).toEqual(['a', 'b'])
  })

  it('strips list markers carried in from a pasted list', () => {
    expect(splitTodoLines('- a\n• b\n* c\n1. d\n2) e\n[ ] f\n[x] g')).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g'])
  })

  it('leaves a line that only looks like it starts with a marker', () => {
    // No space after the digit-dot: "2100" is a time, not a list number.
    expect(splitTodoLines('2100 跳舞（？')).toEqual(['2100 跳舞（？'])
    expect(splitTodoLines('-5 度')).toEqual(['-5 度'])
  })

  it('returns nothing for whitespace', () => {
    expect(splitTodoLines(' \n  \n')).toEqual([])
  })
})

describe('todosOn', () => {
  it("is that day's todos in position order", () => {
    const list = [
      todo({ id: 'b', date: '2026-10-12', position: 1 }),
      todo({ id: 'x', date: '2026-10-13', position: 0 }),
      todo({ id: 'a', date: '2026-10-12', position: 0 })
    ]
    expect(todosOn(list, '2026-10-12').map((t) => t.id)).toEqual(['a', 'b'])
  })
})

describe('carriedOver', () => {
  it('moves open todos from earlier days onto today, keeping where they came from', () => {
    const moved = carriedOver([todo({ id: 'a', date: '2026-10-11' })], '2026-10-12')
    expect(moved).toEqual([expect.objectContaining({ id: 'a', date: '2026-10-12', originDate: '2026-10-11' })])
  })

  it('leaves ticked todos on the day they were ticked', () => {
    expect(carriedOver([todo({ id: 'a', date: '2026-10-11', done: true })], '2026-10-12')).toEqual([])
  })

  it('leaves today and later alone', () => {
    const list = [todo({ id: 'a', date: '2026-10-12' }), todo({ id: 'b', date: '2026-10-16' })]
    expect(carriedOver(list, '2026-10-12')).toEqual([])
  })

  it('keeps the original day across a second carry', () => {
    const once = carriedOver([todo({ id: 'a', date: '2026-10-11' })], '2026-10-12')
    const twice = carriedOver(once, '2026-10-13')
    expect(twice[0]).toMatchObject({ date: '2026-10-13', originDate: '2026-10-11' })
  })

  it('appends after what today already holds, older days first', () => {
    const list = [
      todo({ id: 'today', date: '2026-10-12', position: 4 }),
      todo({ id: 'sat-2', date: '2026-10-10', position: 1 }),
      todo({ id: 'sun', date: '2026-10-11', position: 0 }),
      todo({ id: 'sat-1', date: '2026-10-10', position: 0 })
    ]
    const moved = carriedOver(list, '2026-10-12')
    expect(moved.map((t) => [t.id, t.position])).toEqual([
      ['sat-1', 5],
      ['sat-2', 6],
      ['sun', 7]
    ])
  })

  it('is idempotent', () => {
    const list = [todo({ id: 'a', date: '2026-10-11' })]
    const moved = carriedOver(list, '2026-10-12')
    expect(carriedOver(moved, '2026-10-12')).toEqual([])
  })
})

describe('nextPosition', () => {
  it('is one past the highest on that day, and 0 on an empty day', () => {
    const list = [todo({ id: 'a', date: '2026-10-12', position: 3 }), todo({ id: 'b', date: '2026-10-13', position: 9 })]
    expect(nextPosition(list, '2026-10-12')).toBe(4)
    expect(nextPosition(list, '2026-10-14')).toBe(0)
  })
})
