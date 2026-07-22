import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getOrCreateInviteToken, acceptInvite, joinUrl } from './invites-service'

const requireSupabaseMock = vi.fn()

vi.mock('@/lib/supabase', () => ({
  requireSupabase: () => requireSupabaseMock()
}))

describe('invites-service', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  describe('getOrCreateInviteToken', () => {
    it('reuses an existing permanent invite without inserting', async () => {
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
        is: vi.fn((column: string, value: unknown) => {
          calls.push(['is', column, value])
          return builder
        }),
        limit: vi.fn((count: number) => {
          calls.push(['limit', count])
          return builder
        }),
        insert: vi.fn(),
        abortSignal: vi.fn(async () => ({ data: [{ token: 'existing-token' }], error: null }))
      }
      const supabase = { from: vi.fn(() => builder) }
      requireSupabaseMock.mockReturnValue(supabase)

      await expect(getOrCreateInviteToken('cal-1', 'user-1')).resolves.toBe('existing-token')

      expect(supabase.from).toHaveBeenCalledWith('calendar_invites')
      expect(calls).toEqual([
        ['select', 'token'],
        ['eq', 'calendar_id', 'cal-1'],
        ['is', 'expires_at', null],
        ['limit', 1]
      ])
      expect(builder.insert).not.toHaveBeenCalled()
    })

    it('inserts a new invite with created_by when none exists and returns the DB token', async () => {
      const selectBuilder = {
        select: vi.fn(() => selectBuilder),
        eq: vi.fn(() => selectBuilder),
        is: vi.fn(() => selectBuilder),
        limit: vi.fn(() => selectBuilder),
        abortSignal: vi.fn(async () => ({ data: [], error: null }))
      }
      const insertCalls: unknown[] = []
      const insertBuilder = {
        insert: vi.fn((row: unknown) => {
          insertCalls.push(row)
          return insertBuilder
        }),
        select: vi.fn(() => insertBuilder),
        abortSignal: vi.fn(() => insertBuilder),
        single: vi.fn(async () => ({ data: { token: 'fresh-token' }, error: null }))
      }
      let fromCall = 0
      const supabase = {
        from: vi.fn(() => (fromCall++ === 0 ? selectBuilder : insertBuilder))
      }
      requireSupabaseMock.mockReturnValue(supabase)

      await expect(getOrCreateInviteToken('cal-1', 'user-1')).resolves.toBe('fresh-token')

      expect(insertCalls).toEqual([{ calendar_id: 'cal-1', created_by: 'user-1' }])
    })

    it('throws when the lookup or insert errors', async () => {
      const builder = {
        select: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        is: vi.fn(() => builder),
        limit: vi.fn(() => builder),
        abortSignal: vi.fn(async () => ({ data: null, error: new Error('boom') }))
      }
      requireSupabaseMock.mockReturnValue({ from: vi.fn(() => builder) })

      await expect(getOrCreateInviteToken('cal-1', 'user-1')).rejects.toThrow('boom')
    })
  })

  describe('acceptInvite', () => {
    it('joins via the accept_invite RPC and returns the calendar uuid', async () => {
      const rpcAbortSignal = vi.fn(async () => ({ data: 'joined-cal-id', error: null }))
      const supabase = { rpc: vi.fn(() => ({ abortSignal: rpcAbortSignal })) }
      requireSupabaseMock.mockReturnValue(supabase)

      await expect(acceptInvite('a'.repeat(32))).resolves.toBe('joined-cal-id')

      expect(supabase.rpc).toHaveBeenCalledWith('accept_invite', { invite_token: 'a'.repeat(32) })
    })

    it('propagates RPC errors (invalid or expired invite)', async () => {
      const supabase = {
        rpc: vi.fn(() => ({ abortSignal: vi.fn(async () => ({ data: null, error: new Error('invalid or expired invite') })) }))
      }
      requireSupabaseMock.mockReturnValue(supabase)

      await expect(acceptInvite('a'.repeat(32))).rejects.toThrow('invalid or expired invite')
    })

    it('throws when the RPC returns a non-string calendar id', async () => {
      const supabase = { rpc: vi.fn(() => ({ abortSignal: vi.fn(async () => ({ data: null, error: null })) })) }
      requireSupabaseMock.mockReturnValue(supabase)

      await expect(acceptInvite('a'.repeat(32))).rejects.toThrow('accept_invite returned no calendar id')
    })
  })

  describe('joinUrl', () => {
    it('builds the absolute URL from origin with a root router base', () => {
      vi.stubEnv('QUASAR_VUE_ROUTER_BASE', '/')
      vi.stubGlobal('window', { location: { origin: 'http://localhost:9000' } })

      expect(joinUrl('abc123')).toBe('http://localhost:9000/join/abc123')
    })

    it('keeps the sub-path router base for GitHub Pages deploys', () => {
      vi.stubEnv('QUASAR_VUE_ROUTER_BASE', '/cadence/')
      vi.stubGlobal('window', { location: { origin: 'https://example.github.io' } })

      expect(joinUrl('abc123')).toBe('https://example.github.io/cadence/join/abc123')
    })
  })
})
