import { describe, it, expect } from 'vitest'
import { dayTodoToRow, rowToDayTodo, type DayTodoRow } from './day-todos-service'

describe('day-todos-service mapping', () => {
  const row: DayTodoRow = {
    id: 't1',
    user_id: 'user-1',
    date: '2026-10-12',
    origin_date: '2026-10-11',
    title: '練舞',
    done: false,
    position: 3
  }

  it('round-trips a row through the domain shape', () => {
    const todo = rowToDayTodo(row)
    expect(todo).toEqual({ id: 't1', date: '2026-10-12', originDate: '2026-10-11', title: '練舞', done: false, position: 3 })
    expect(dayTodoToRow(todo, 'user-1')).toEqual(row)
  })

  it('writes the owner it is given, never one carried on the todo', () => {
    expect(dayTodoToRow(rowToDayTodo(row), 'user-2').user_id).toBe('user-2')
  })
})
