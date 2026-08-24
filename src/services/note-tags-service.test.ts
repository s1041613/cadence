import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchNoteTags, insertNoteTag } from './note-tags-service'
import type { NoteTag } from '@/types/note'

const requireSupabaseMock = vi.fn()

vi.mock('@/lib/supabase', () => ({
  requireSupabase: () => requireSupabaseMock()
}))

type Call = [string, ...unknown[]]

function makeBuilder(result: { data: unknown; error: unknown }): {
  builder: Record<string, ReturnType<typeof vi.fn>>
  calls: Call[]
} {
  const calls: Call[] = []
  const builder: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn((columns: string) => {
      calls.push(['select', columns])
      return builder
    }),
    insert: vi.fn((row: unknown) => {
      calls.push(['insert', row])
      return builder
    }),
    eq: vi.fn((column: string, value: unknown) => {
      calls.push(['eq', column, value])
      return builder
    }),
    order: vi.fn((column: string, options: unknown) => {
      calls.push(['order', column, options])
      return builder
    }),
    abortSignal: vi.fn(async () => result)
  }
  return { builder, calls }
}

const TAG: NoteTag = {
  id: 'tag-1',
  name: 'Rituals',
  position: 0,
  createdAt: '2026-08-24T10:00:00.000Z',
  updatedAt: null
}

describe('note-tags-service', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('reads this user tags ordered by position then creation time', async () => {
    const { builder, calls } = makeBuilder({
      data: [
        {
          id: 'tag-1',
          user_id: 'user-1',
          name: 'Rituals',
          position: 0,
          created_at: '2026-08-24T10:00:00.000Z',
          updated_at: null
        }
      ],
      error: null
    })
    const supabase = { from: vi.fn(() => builder) }
    requireSupabaseMock.mockReturnValue(supabase)

    await expect(fetchNoteTags('user-1')).resolves.toEqual([TAG])

    expect(supabase.from).toHaveBeenCalledWith('note_tags')
    expect(calls).toEqual([
      ['select', '*'],
      ['eq', 'user_id', 'user-1'],
      ['order', 'position', { ascending: true }],
      ['order', 'created_at', { ascending: true }]
    ])
  })

  it('inserts a tag snapshot for the owner', async () => {
    const { builder, calls } = makeBuilder({ data: null, error: null })
    const supabase = { from: vi.fn(() => builder) }
    requireSupabaseMock.mockReturnValue(supabase)

    await insertNoteTag(TAG, 'user-1')

    expect(supabase.from).toHaveBeenCalledWith('note_tags')
    expect(calls).toEqual([
      [
        'insert',
        {
          id: 'tag-1',
          user_id: 'user-1',
          name: 'Rituals',
          position: 0,
          created_at: '2026-08-24T10:00:00.000Z',
          updated_at: null
        }
      ]
    ])
  })

  it('rethrows the raw supabase error', async () => {
    const error = { message: 'duplicate' }
    const { builder } = makeBuilder({ data: null, error })
    requireSupabaseMock.mockReturnValue({ from: vi.fn(() => builder) })

    await expect(insertNoteTag(TAG, 'user-1')).rejects.toBe(error)
  })
})
