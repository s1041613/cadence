import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  ensureDefaultCalendar,
  fetchCalendars,
  fetchMembers,
  createCalendar,
  updateCalendar,
  deleteCalendar,
  leaveCalendar,
  reorderCalendars,
  setCalendarEnabled,
  setCalendarSelected
} from './calendars-service'

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

  describe('createCalendar', () => {
    it('creates via the create_calendar RPC and returns the new calendar uuid', async () => {
      const rpcAbortSignal = vi.fn(async () => ({ data: 'new-cal-id', error: null }))
      const supabase = { rpc: vi.fn(() => ({ abortSignal: rpcAbortSignal })) }
      requireSupabaseMock.mockReturnValue(supabase)

      await expect(createCalendar({ name: 'Trip', color: '#6863B0', icon: 'flight' })).resolves.toBe('new-cal-id')

      expect(supabase.rpc).toHaveBeenCalledWith('create_calendar', {
        calendar_name: 'Trip',
        calendar_color: '#6863B0',
        calendar_icon: 'flight'
      })
    })

    it('throws when the RPC errors or returns a non-string id', async () => {
      const supabase = { rpc: vi.fn(() => ({ abortSignal: vi.fn(async () => ({ data: null, error: new Error('boom') })) })) }
      requireSupabaseMock.mockReturnValue(supabase)
      await expect(createCalendar({ name: 'Trip', color: '#6863B0', icon: null })).rejects.toThrow('boom')

      const supabaseNoId = { rpc: vi.fn(() => ({ abortSignal: vi.fn(async () => ({ data: null, error: null })) })) }
      requireSupabaseMock.mockReturnValue(supabaseNoId)
      await expect(createCalendar({ name: 'Trip', color: '#6863B0', icon: null })).rejects.toThrow('create_calendar returned no calendar id')
    })
  })

  describe('updateCalendar', () => {
    it('updates only the mapped name/color/icon columns on the calendars row', async () => {
      const calls: Array<[string, unknown, unknown?]> = []
      const builder = {
        update: vi.fn((row: unknown) => {
          calls.push(['update', row])
          return builder
        }),
        eq: vi.fn((column: string, value: unknown) => {
          calls.push(['eq', column, value])
          return builder
        }),
        abortSignal: vi.fn(async () => ({ data: null, error: null }))
      }
      const supabase = { from: vi.fn(() => builder) }
      requireSupabaseMock.mockReturnValue(supabase)

      await updateCalendar('cal-1', { name: 'Renamed', color: '#6E839B', icon: null })

      expect(supabase.from).toHaveBeenCalledWith('calendars')
      expect(calls).toEqual([
        ['update', { name: 'Renamed', color: '#6E839B', icon: null }],
        ['eq', 'id', 'cal-1']
      ])
    })

    it('omits absent patch fields instead of writing undefined', async () => {
      const updates: unknown[] = []
      const builder = {
        update: vi.fn((row: unknown) => {
          updates.push(row)
          return builder
        }),
        eq: vi.fn(() => builder),
        abortSignal: vi.fn(async () => ({ data: null, error: null }))
      }
      requireSupabaseMock.mockReturnValue({ from: vi.fn(() => builder) })

      await updateCalendar('cal-1', { name: 'Only name' })

      expect(updates).toEqual([{ name: 'Only name' }])
    })

    it('throws when the update errors', async () => {
      const builder = {
        update: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        abortSignal: vi.fn(async () => ({ data: null, error: new Error('boom') }))
      }
      requireSupabaseMock.mockReturnValue({ from: vi.fn(() => builder) })

      await expect(updateCalendar('cal-1', { name: 'x' })).rejects.toThrow('boom')
    })
  })

  describe('deleteCalendar', () => {
    it('deletes the calendars row by id', async () => {
      const calls: Array<[string, unknown, unknown?]> = []
      const builder = {
        delete: vi.fn(() => {
          calls.push(['delete', null])
          return builder
        }),
        eq: vi.fn((column: string, value: unknown) => {
          calls.push(['eq', column, value])
          return builder
        }),
        abortSignal: vi.fn(async () => ({ data: null, error: null }))
      }
      const supabase = { from: vi.fn(() => builder) }
      requireSupabaseMock.mockReturnValue(supabase)

      await deleteCalendar('cal-1')

      expect(supabase.from).toHaveBeenCalledWith('calendars')
      expect(calls).toEqual([
        ['delete', null],
        ['eq', 'id', 'cal-1']
      ])
    })

    it('throws when the delete errors', async () => {
      const builder = {
        delete: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        abortSignal: vi.fn(async () => ({ data: null, error: new Error('boom') }))
      }
      requireSupabaseMock.mockReturnValue({ from: vi.fn(() => builder) })

      await expect(deleteCalendar('cal-1')).rejects.toThrow('boom')
    })
  })

  describe('leaveCalendar', () => {
    it('deletes the current user own calendar_members row', async () => {
      const calls: Array<[string, unknown, unknown?]> = []
      const builder = {
        delete: vi.fn(() => {
          calls.push(['delete', null])
          return builder
        }),
        eq: vi.fn((column: string, value: unknown) => {
          calls.push(['eq', column, value])
          return builder
        }),
        abortSignal: vi.fn(async () => ({ data: null, error: null }))
      }
      const supabase = { from: vi.fn(() => builder) }
      requireSupabaseMock.mockReturnValue(supabase)

      await leaveCalendar('cal-1', 'user-2')

      expect(supabase.from).toHaveBeenCalledWith('calendar_members')
      expect(calls).toEqual([
        ['delete', null],
        ['eq', 'calendar_id', 'cal-1'],
        ['eq', 'user_id', 'user-2']
      ])
    })

    it('throws when the delete errors', async () => {
      const builder = {
        delete: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        abortSignal: vi.fn(async () => ({ data: null, error: new Error('boom') }))
      }
      requireSupabaseMock.mockReturnValue({ from: vi.fn(() => builder) })

      await expect(leaveCalendar('cal-1', 'user-2')).rejects.toThrow('boom')
    })
  })

  describe('reorderCalendars', () => {
    it('sends the full ordered id list to the reorder_calendars RPC', async () => {
      const rpcAbortSignal = vi.fn(async () => ({ data: null, error: null }))
      const supabase = { rpc: vi.fn(() => ({ abortSignal: rpcAbortSignal })) }
      requireSupabaseMock.mockReturnValue(supabase)

      await reorderCalendars(['cal-2', 'cal-1'])

      expect(supabase.rpc).toHaveBeenCalledWith('reorder_calendars', { ordered: ['cal-2', 'cal-1'] })
    })

    it('throws when the RPC errors', async () => {
      const supabase = { rpc: vi.fn(() => ({ abortSignal: vi.fn(async () => ({ data: null, error: new Error('boom') })) })) }
      requireSupabaseMock.mockReturnValue(supabase)

      await expect(reorderCalendars(['cal-1'])).rejects.toThrow('boom')
    })
  })

  describe('setCalendarEnabled / setCalendarSelected', () => {
    it('persists enabled through set_calendar_enabled with { cal, en }', async () => {
      const supabase = { rpc: vi.fn(() => ({ abortSignal: vi.fn(async () => ({ data: null, error: null })) })) }
      requireSupabaseMock.mockReturnValue(supabase)

      await setCalendarEnabled('cal-1', false)

      expect(supabase.rpc).toHaveBeenCalledWith('set_calendar_enabled', { cal: 'cal-1', en: false })
    })

    it('persists selected through set_calendar_selected with { cal, sel }', async () => {
      const supabase = { rpc: vi.fn(() => ({ abortSignal: vi.fn(async () => ({ data: null, error: null })) })) }
      requireSupabaseMock.mockReturnValue(supabase)

      await setCalendarSelected('cal-1', true)

      expect(supabase.rpc).toHaveBeenCalledWith('set_calendar_selected', { cal: 'cal-1', sel: true })
    })

    it('throws when either RPC errors', async () => {
      const supabase = { rpc: vi.fn(() => ({ abortSignal: vi.fn(async () => ({ data: null, error: new Error('boom') })) })) }
      requireSupabaseMock.mockReturnValue(supabase)

      await expect(setCalendarEnabled('cal-1', true)).rejects.toThrow('boom')
      await expect(setCalendarSelected('cal-1', false)).rejects.toThrow('boom')
    })
  })
})
