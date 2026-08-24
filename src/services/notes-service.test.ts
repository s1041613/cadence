import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchNotes, insertNote, updateNote, deleteNote } from './notes-service'
import type { Note } from '@/types/note'

const requireSupabaseMock = vi.fn()

vi.mock('@/lib/supabase', () => ({
  requireSupabase: () => requireSupabaseMock()
}))

type Call = [string, ...unknown[]]

/** Chainable query-builder stub, matching calendars-service.test.ts: every method records its
 *  arguments and returns the builder, and abortSignal is the awaited terminal. */
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
    upsert: vi.fn((row: unknown, options: unknown) => {
      calls.push(['upsert', row, options])
      return builder
    }),
    insert: vi.fn((row: unknown) => {
      calls.push(['insert', row])
      return builder
    }),
    update: vi.fn((row: unknown) => {
      calls.push(['update', row])
      return builder
    }),
    delete: vi.fn(() => {
      calls.push(['delete'])
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

const NOTE: Note = {
  id: 'note-1',
  body: 'Kyoto — book the ryokan',
  createdAt: '2026-03-04T09:00:00.000Z',
  updatedAt: null,
  tagId: 'tag-1'
}

describe('notes-service', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('fetchNotes', () => {
    it('reads this user rows newest-first and maps them to the domain shape', async () => {
      const { builder, calls } = makeBuilder({
        data: [
          {
            id: 'note-1',
            user_id: 'user-1',
            body: 'first',
            created_at: '2026-03-04T09:00:00.000Z',
            updated_at: null,
            tag_id: 'tag-1'
          },
          {
            id: 'note-2',
            user_id: 'user-1',
            body: 'second',
            created_at: '2026-03-03T09:00:00.000Z',
            updated_at: '2026-03-05T09:00:00.000Z',
            tag_id: null
          }
        ],
        error: null
      })
      const supabase = { from: vi.fn(() => builder) }
      requireSupabaseMock.mockReturnValue(supabase)

      await expect(fetchNotes('user-1')).resolves.toEqual([
        { id: 'note-1', body: 'first', createdAt: '2026-03-04T09:00:00.000Z', updatedAt: null, tagId: 'tag-1' },
        {
          id: 'note-2',
          body: 'second',
          createdAt: '2026-03-03T09:00:00.000Z',
          updatedAt: '2026-03-05T09:00:00.000Z',
          tagId: null
        }
      ])

      expect(supabase.from).toHaveBeenCalledWith('notes')
      expect(calls).toEqual([
        ['select', '*'],
        ['eq', 'user_id', 'user-1'],
        ['order', 'created_at', { ascending: false }]
      ])
    })

    it('returns an empty list when the query yields no rows', async () => {
      const { builder } = makeBuilder({ data: null, error: null })
      requireSupabaseMock.mockReturnValue({ from: vi.fn(() => builder) })

      await expect(fetchNotes('user-1')).resolves.toEqual([])
    })

    it('rethrows the raw supabase error', async () => {
      const error = { message: 'boom' }
      const { builder } = makeBuilder({ data: null, error })
      requireSupabaseMock.mockReturnValue({ from: vi.fn(() => builder) })

      await expect(fetchNotes('user-1')).rejects.toBe(error)
    })
  })

  describe('insertNote', () => {
    // The write must be idempotent: the store's retry re-sends the same snapshot, id included.
    // A bare .insert() would hit the primary key on a retry after a write that actually landed
    // server-side, and the store would roll the card off screen while the row sits in the DB.
    // A bare .upsert() would take the ON CONFLICT DO UPDATE path, which makes Postgres evaluate
    // the UPDATE policy this table deliberately does not have. ignoreDuplicates is the one
    // option that satisfies both — so both regressions have to break this test.
    it('writes via upsert with ignoreDuplicates so a resent snapshot is a harmless no-op', async () => {
      const { builder, calls } = makeBuilder({ data: null, error: null })
      const supabase = { from: vi.fn(() => builder) }
      requireSupabaseMock.mockReturnValue(supabase)

      await insertNote(NOTE, 'user-1')

      expect(supabase.from).toHaveBeenCalledWith('notes')
      expect(builder.insert).not.toHaveBeenCalled()
      expect(calls).toEqual([
        [
          'upsert',
          {
            id: 'note-1',
            user_id: 'user-1',
            body: 'Kyoto — book the ryokan',
            created_at: '2026-03-04T09:00:00.000Z',
            updated_at: null,
            tag_id: 'tag-1'
          },
          { ignoreDuplicates: true }
        ]
      ])
    })

    it('rethrows the raw supabase error', async () => {
      const error = { message: 'boom' }
      const { builder } = makeBuilder({ data: null, error })
      requireSupabaseMock.mockReturnValue({ from: vi.fn(() => builder) })

      await expect(insertNote(NOTE, 'user-1')).rejects.toBe(error)
    })
  })

  describe('updateNote', () => {
    // An update, not an upsert: the row is known to exist, and narrowing the write to the two
    // columns that change means a stale snapshot can never rewrite created_at or reassign
    // user_id to somebody else.
    it('writes only the body and updated_at, scoped by id', async () => {
      const { builder, calls } = makeBuilder({ data: null, error: null })
      const supabase = { from: vi.fn(() => builder) }
      requireSupabaseMock.mockReturnValue(supabase)

      await updateNote('note-1', 'edited', '2026-03-06T10:00:00.000Z')

      expect(supabase.from).toHaveBeenCalledWith('notes')
      expect(builder.upsert).not.toHaveBeenCalled()
      expect(calls).toEqual([
        ['update', { body: 'edited', updated_at: '2026-03-06T10:00:00.000Z' }],
        ['eq', 'id', 'note-1']
      ])
    })

    it('rethrows the raw supabase error', async () => {
      const error = { message: 'boom' }
      const { builder } = makeBuilder({ data: null, error })
      requireSupabaseMock.mockReturnValue({ from: vi.fn(() => builder) })

      await expect(updateNote('note-1', 'edited', '2026-03-06T10:00:00.000Z')).rejects.toBe(error)
    })
  })

  describe('deleteNote', () => {
    it('deletes by id', async () => {
      const { builder, calls } = makeBuilder({ data: null, error: null })
      const supabase = { from: vi.fn(() => builder) }
      requireSupabaseMock.mockReturnValue(supabase)

      await deleteNote('note-1')

      expect(supabase.from).toHaveBeenCalledWith('notes')
      expect(calls).toEqual([['delete'], ['eq', 'id', 'note-1']])
    })

    it('rethrows the raw supabase error', async () => {
      const error = { message: 'boom' }
      const { builder } = makeBuilder({ data: null, error })
      requireSupabaseMock.mockReturnValue({ from: vi.fn(() => builder) })

      await expect(deleteNote('note-1')).rejects.toBe(error)
    })
  })
})
