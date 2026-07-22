import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { InboxItem } from '@/stores/inbox-store'
import {
  fetchInboxItems,
  upsertInboxItem,
  deleteInboxItem,
  rowToInboxItem,
  inboxItemToRow,
  type InboxContext,
  type InboxItemRow
} from './inbox-service'

const requireSupabaseMock = vi.fn()

vi.mock('@/lib/supabase', () => ({
  requireSupabase: () => requireSupabaseMock()
}))

const ctx: InboxContext = { ownerId: 'user-1' }

const item: InboxItem = {
  id: 'inbox-1',
  text: 'call the dentist',
  createdAt: '2026-07-22',
  done: false,
  scheduled: null
}

const scheduledRow: InboxItemRow = {
  id: 'inbox-2',
  user_id: 'user-1',
  text: 'book flights',
  created_on: '2026-07-21',
  done: true,
  scheduled_type: 'task',
  scheduled_tag: 'Scheduled',
  scheduled_color: '#6E839B'
}

describe('inbox-service', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('mappers', () => {
    it('rowToInboxItem reconstructs a scheduled tag when all three columns are set', () => {
      expect(rowToInboxItem(scheduledRow)).toEqual({
        id: 'inbox-2',
        text: 'book flights',
        createdAt: '2026-07-21',
        done: true,
        scheduled: { type: 'task', tag: 'Scheduled', color: '#6E839B' }
      })
    })

    it('rowToInboxItem yields null scheduled when the columns are all null', () => {
      const row: InboxItemRow = { ...scheduledRow, scheduled_type: null, scheduled_tag: null, scheduled_color: null }
      expect(rowToInboxItem(row).scheduled).toBeNull()
    })

    it('inboxItemToRow splits a scheduled tag back into three columns and maps createdAt -> created_on', () => {
      const withTag: InboxItem = { ...item, scheduled: { type: 'event', tag: 'Scheduled', color: '#abc' } }
      expect(inboxItemToRow(withTag, 'user-1')).toEqual({
        id: 'inbox-1',
        user_id: 'user-1',
        text: 'call the dentist',
        created_on: '2026-07-22',
        done: false,
        scheduled_type: 'event',
        scheduled_tag: 'Scheduled',
        scheduled_color: '#abc'
      })
    })

    it('inboxItemToRow writes null to all three scheduled columns when scheduled is null', () => {
      const row = inboxItemToRow(item, 'user-1')
      expect(row.scheduled_type).toBeNull()
      expect(row.scheduled_tag).toBeNull()
      expect(row.scheduled_color).toBeNull()
    })
  })

  describe('fetchInboxItems', () => {
    it('scopes by user_id and orders newest-first, mapping rows to domain items', async () => {
      const order2 = vi.fn(() => ({ abortSignal: vi.fn(async () => ({ data: [scheduledRow], error: null })) }))
      const order1 = vi.fn(() => ({ order: order2 }))
      const eq = vi.fn(() => ({ order: order1 }))
      const select = vi.fn(() => ({ eq }))
      const supabase = { from: vi.fn(() => ({ select })) }
      requireSupabaseMock.mockReturnValue(supabase)

      const result = await fetchInboxItems(ctx)

      expect(supabase.from).toHaveBeenCalledWith('inbox_items')
      expect(eq).toHaveBeenCalledWith('user_id', 'user-1')
      expect(order1).toHaveBeenCalledWith('created_on', { ascending: false })
      expect(order2).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(result).toHaveLength(1)
      expect(result[0]!.scheduled).toEqual({ type: 'task', tag: 'Scheduled', color: '#6E839B' })
    })
  })

  describe('upsertInboxItem', () => {
    it('upserts a full row carrying user_id and a client-stamped updated_at', async () => {
      const abortSignal = vi.fn(async () => ({ error: null }))
      const upsert = vi.fn(() => ({ abortSignal }))
      const supabase = { from: vi.fn(() => ({ upsert })) }
      requireSupabaseMock.mockReturnValue(supabase)

      await upsertInboxItem(item, ctx)

      expect(supabase.from).toHaveBeenCalledWith('inbox_items')
      expect(upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'inbox-1',
          user_id: 'user-1',
          text: 'call the dentist',
          created_on: '2026-07-22',
          done: false,
          scheduled_type: null,
          updated_at: expect.any(String)
        })
      )
    })

    it('throws when supabase returns an error', async () => {
      const abortSignal = vi.fn(async () => ({ error: new Error('rls denied') }))
      const upsert = vi.fn(() => ({ abortSignal }))
      requireSupabaseMock.mockReturnValue({ from: vi.fn(() => ({ upsert })) })

      await expect(upsertInboxItem(item, ctx)).rejects.toThrow('rls denied')
    })
  })

  describe('deleteInboxItem', () => {
    it('deletes by id', async () => {
      const abortSignal = vi.fn(async () => ({ error: null }))
      const eq = vi.fn(() => ({ abortSignal }))
      const del = vi.fn(() => ({ eq }))
      const supabase = { from: vi.fn(() => ({ delete: del })) }
      requireSupabaseMock.mockReturnValue(supabase)

      await deleteInboxItem('inbox-1')

      expect(supabase.from).toHaveBeenCalledWith('inbox_items')
      expect(eq).toHaveBeenCalledWith('id', 'inbox-1')
    })
  })
})
