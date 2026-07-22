import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ensureDefaultCalendar, fetchCalendars, fetchMembers } from './calendars-service'

const requireSupabaseMock = vi.fn()

vi.mock('@/lib/supabase', () => ({
  requireSupabase: () => requireSupabaseMock()
}))

describe('calendars-service', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('selects the current user owner membership with the lowest position as the default calendar', async () => {
    const calls: Array<[string, unknown, unknown?]> = []
    const builder = {
      select: vi.fn((columns: string) => {
        calls.push(['select', columns])
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
      limit: vi.fn((count: number) => {
        calls.push(['limit', count])
        return builder
      }),
      abortSignal: vi.fn(async () => ({ data: [{ calendar_id: 'owned-calendar' }], error: null }))
    }
    const supabase = {
      from: vi.fn(() => builder)
    }
    requireSupabaseMock.mockReturnValue(supabase)

    await expect(ensureDefaultCalendar('user-1')).resolves.toBe('owned-calendar')

    expect(supabase.from).toHaveBeenCalledWith('calendar_members')
    expect(calls).toEqual([
      ['select', 'calendar_id'],
      ['eq', 'user_id', 'user-1'],
      ['eq', 'role', 'owner'],
      ['order', 'position', { ascending: true }],
      ['limit', 1]
    ])
  })

  it('creates the first calendar via RPC with the literal default name/color when none exists', async () => {
    const selectBuilder = {
      select: vi.fn(() => selectBuilder),
      eq: vi.fn(() => selectBuilder),
      order: vi.fn(() => selectBuilder),
      limit: vi.fn(() => selectBuilder),
      abortSignal: vi.fn(async () => ({ data: [], error: null }))
    }
    const rpcAbortSignal = vi.fn(async () => ({ data: 'new-calendar', error: null }))
    const supabase = {
      from: vi.fn(() => selectBuilder),
      rpc: vi.fn(() => ({ abortSignal: rpcAbortSignal }))
    }
    requireSupabaseMock.mockReturnValue(supabase)

    await expect(ensureDefaultCalendar('user-1')).resolves.toBe('new-calendar')

    expect(supabase.rpc).toHaveBeenCalledWith('create_calendar', { calendar_name: 'My Calendar', calendar_color: '#6E839B' })
  })

  describe('fetchCalendars', () => {
    it('maps calendar_members joined with calendars into Calendar[], ordered by position', async () => {
      const calls: Array<[string, unknown, unknown?]> = []
      const rows = [
        {
          position: 0,
          role: 'owner',
          enabled: true,
          selected: true,
          calendars: { id: 'cal-1', name: 'My Calendar', color: '#6E839B', icon: null, cover_url: null }
        },
        {
          position: 1,
          role: 'member',
          enabled: false,
          selected: false,
          calendars: { id: 'cal-2', name: 'Work', color: '#6863B0', icon: 'work', cover_url: 'https://example.com/cover.png' }
        }
      ]
      const builder = {
        select: vi.fn((columns: string) => {
          calls.push(['select', columns])
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
        abortSignal: vi.fn(async () => ({ data: rows, error: null }))
      }
      const supabase = { from: vi.fn(() => builder) }
      requireSupabaseMock.mockReturnValue(supabase)

      const result = await fetchCalendars('user-1')

      expect(supabase.from).toHaveBeenCalledWith('calendar_members')
      expect(calls).toEqual([
        ['select', expect.stringContaining('calendars')],
        ['eq', 'user_id', 'user-1'],
        ['order', 'position', { ascending: true }]
      ])
      expect(result).toEqual([
        { id: 'cal-1', name: 'My Calendar', color: '#6E839B', icon: null, cover: null, order: 0, role: 'owner', enabled: true, selected: true },
        { id: 'cal-2', name: 'Work', color: '#6863B0', icon: 'work', cover: 'https://example.com/cover.png', order: 1, role: 'member', enabled: false, selected: false }
      ])
    })

    it('throws when the query errors', async () => {
      const builder = {
        select: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        order: vi.fn(() => builder),
        abortSignal: vi.fn(async () => ({ data: null, error: new Error('boom') }))
      }
      requireSupabaseMock.mockReturnValue({ from: vi.fn(() => builder) })

      await expect(fetchCalendars('user-1')).rejects.toThrow('boom')
    })
  })

  describe('fetchMembers', () => {
    it('maps calendar_members joined with profiles into CalendarMember[]', async () => {
      const calls: Array<[string, unknown, unknown?]> = []
      const rows = [
        { role: 'owner', profiles: { id: 'user-1', display_name: 'Chloe Rivera', email: 'chloe@example.com', avatar_url: 'https://example.com/a.png' } },
        { role: 'member', profiles: { id: 'user-2', display_name: null, email: 'da@example.com', avatar_url: null } }
      ]
      const builder = {
        select: vi.fn((columns: string) => {
          calls.push(['select', columns])
          return builder
        }),
        eq: vi.fn((column: string, value: unknown) => {
          calls.push(['eq', column, value])
          return builder
        }),
        abortSignal: vi.fn(async () => ({ data: rows, error: null }))
      }
      const supabase = { from: vi.fn(() => builder) }
      requireSupabaseMock.mockReturnValue(supabase)

      const result = await fetchMembers('cal-1')

      expect(supabase.from).toHaveBeenCalledWith('calendar_members')
      expect(calls).toEqual([
        ['select', expect.stringContaining('profiles')],
        ['eq', 'calendar_id', 'cal-1']
      ])
      expect(result).toEqual([
        { id: 'user-1', name: 'Chloe Rivera', avatarUrl: 'https://example.com/a.png', role: 'owner' },
        { id: 'user-2', name: 'da@example.com', avatarUrl: null, role: 'member' }
      ])
    })

    it('throws when the query errors', async () => {
      const builder = {
        select: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        abortSignal: vi.fn(async () => ({ data: null, error: new Error('boom') }))
      }
      requireSupabaseMock.mockReturnValue({ from: vi.fn(() => builder) })

      await expect(fetchMembers('cal-1')).rejects.toThrow('boom')
    })
  })
})
