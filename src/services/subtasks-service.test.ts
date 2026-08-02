import { describe, it, expect } from 'vitest'
import type { Subtask } from '@/types/subtask'
import { rowToSubtask, subtaskToRow, type SubtaskRow } from './subtasks-service'

const PARENT_ID = '33333333-3333-3333-3333-333333333333'
const SUB_ID = '44444444-4444-4444-4444-444444444444'

function mkSubtask(overrides: Partial<Subtask> = {}): Subtask {
  return {
    id: SUB_ID,
    parentId: PARENT_ID,
    title: 'Read chapter three',
    done: false,
    position: 0,
    ...overrides
  }
}

describe('subtasks-service mapping', () => {
  it('round-trips a subtask unchanged', () => {
    const subtask = mkSubtask({ title: 'Take notes', done: true, position: 2 })

    expect(rowToSubtask(subtaskToRow(subtask))).toEqual(subtask)
  })

  it('maps snake_case row columns onto the camelCase domain shape', () => {
    const row: SubtaskRow = {
      id: SUB_ID,
      parent_id: PARENT_ID,
      title: 'Tidy the desk',
      done: true,
      position: 1
    }

    expect(rowToSubtask(row)).toEqual({
      id: SUB_ID,
      parentId: PARENT_ID,
      title: 'Tidy the desk',
      done: true,
      position: 1
    })
  })

  // created_at is defaulted by the database and never read by the client, so the row the
  // client writes deliberately omits it rather than stamping a clock the server owns.
  it('omits created_at from the written row so the database default stands', () => {
    expect(subtaskToRow(mkSubtask())).not.toHaveProperty('created_at')
  })

  it('carries the parent reference into the row, since a subtask is only ever reached through it', () => {
    expect(subtaskToRow(mkSubtask()).parent_id).toBe(PARENT_ID)
  })
})
