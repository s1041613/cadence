import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useInboxStore } from './inbox-store'
import * as inboxService from '@/services/inbox-service'
import { notifySyncError } from '@/lib/notify'
import type { InboxItem } from './inbox-store'

vi.mock('@/services/inbox-service', () => ({
  fetchInboxItems: vi.fn(),
  upsertInboxItem: vi.fn(),
  deleteInboxItem: vi.fn()
}))
vi.mock('@/lib/notify', () => ({
  notifySyncError: vi.fn()
}))

const fetchInboxItemsMock = vi.mocked(inboxService.fetchInboxItems)
const upsertInboxItemMock = vi.mocked(inboxService.upsertInboxItem)
const deleteInboxItemMock = vi.mocked(inboxService.deleteInboxItem)
const notifySyncErrorMock = vi.mocked(notifySyncError)

interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason: unknown) => void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

// Flushes the microtask queue plus one macrotask so promise chains settle.
function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

// Signs the store in against the mocked services and clears the fetch call made
// by the initial load, so tests only observe their own service traffic.
async function signedInStore(seed: InboxItem[] = []) {
  const store = useInboxStore()
  fetchInboxItemsMock.mockResolvedValueOnce(seed)
  await store.loadFromRemote('user-1', 'ignored-default')
  fetchInboxItemsMock.mockClear()
  return store
}

const SCHEDULED = { type: 'task', color: '#6E839B', tag: 'Scheduled' } as const

describe('inbox-store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
    fetchInboxItemsMock.mockResolvedValue([])
    upsertInboxItemMock.mockResolvedValue(undefined)
    deleteInboxItemMock.mockResolvedValue(undefined)
  })

  describe('unsynced writes', () => {
    it('rejects addItem before loadFromRemote runs, leaving no local item', () => {
      const store = useInboxStore()

      store.addItem('call the dentist')

      expect(store.inboxItems).toHaveLength(0)
      expect(upsertInboxItemMock).not.toHaveBeenCalled()
      expect(notifySyncErrorMock).toHaveBeenCalledWith('尚未完成同步，請稍後再試', expect.any(Function))
    })
  })

  describe('addItem', () => {
    it('optimistically prepends the item and persists it', async () => {
      const store = await signedInStore()

      store.addItem('call the dentist')

      expect(store.inboxItems).toHaveLength(1)
      const item = store.inboxItems[0]!
      expect(item.text).toBe('call the dentist')
      expect(item.done).toBe(false)

      await flush()
      expect(upsertInboxItemMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: item.id, text: 'call the dentist', done: false, scheduled: null }),
        { ownerId: 'user-1' }
      )
    })

    it('marks the item failed and notifies when the write rejects', async () => {
      const store = await signedInStore()
      upsertInboxItemMock.mockRejectedValueOnce(new Error('offline'))

      store.addItem('call the dentist')
      const id = store.inboxItems[0]!.id
      await flush()

      expect(store.syncStatusByItemId[id]).toBe('failed')
      expect(notifySyncErrorMock).toHaveBeenCalledWith('儲存失敗', expect.any(Function))
    })

    it('retry re-sends the same snapshot (same id) instead of creating a duplicate item', async () => {
      const store = await signedInStore()
      upsertInboxItemMock.mockRejectedValueOnce(new Error('offline'))

      store.addItem('call the dentist')
      const id = store.inboxItems[0]!.id
      await flush()
      const retry = notifySyncErrorMock.mock.calls.find((c) => c[0] === '儲存失敗')![1] as () => void

      upsertInboxItemMock.mockClear()
      retry()
      await flush()

      // no new local item, and the retried write carries the ORIGINAL id
      expect(store.inboxItems).toHaveLength(1)
      expect(store.inboxItems[0]!.id).toBe(id)
      expect(upsertInboxItemMock).toHaveBeenCalledWith(expect.objectContaining({ id, text: 'call the dentist' }), {
        ownerId: 'user-1'
      })
    })
  })

  describe('removeItem', () => {
    it('optimistically removes and persists the delete', async () => {
      const seeded: InboxItem = { id: 'i1', text: 'x', createdAt: '2026-07-22', done: false, scheduled: null }
      const store = await signedInStore([seeded])

      store.removeItem('i1')

      expect(store.inboxItems).toHaveLength(0)
      await flush()
      expect(deleteInboxItemMock).toHaveBeenCalledWith('i1')
    })

    it('rolls the removed item back into its original position on failure', async () => {
      const a: InboxItem = { id: 'a', text: 'a', createdAt: '2026-07-22', done: false, scheduled: null }
      const b: InboxItem = { id: 'b', text: 'b', createdAt: '2026-07-22', done: false, scheduled: null }
      const c: InboxItem = { id: 'c', text: 'c', createdAt: '2026-07-22', done: false, scheduled: null }
      const store = await signedInStore([a, b, c])
      deleteInboxItemMock.mockRejectedValueOnce(new Error('offline'))

      store.removeItem('b')
      expect(store.inboxItems.map((i) => i.id)).toEqual(['a', 'c'])

      await flush()
      expect(store.inboxItems.map((i) => i.id)).toEqual(['a', 'b', 'c'])
      expect(store.syncStatusByItemId['b']).toBe('failed')
      expect(notifySyncErrorMock).toHaveBeenCalledWith('刪除失敗', expect.any(Function))
    })
  })

  describe('toggleDone', () => {
    it('flips done and persists a full-row upsert that preserves an existing scheduled tag', async () => {
      const seeded: InboxItem = { id: 'i1', text: 'x', createdAt: '2026-07-22', done: false, scheduled: SCHEDULED }
      const store = await signedInStore([seeded])

      store.toggleDone('i1')

      expect(store.inboxItems[0]!.done).toBe(true)
      await flush()
      // full-row upsert round-trips the scheduled tag — toggling done must not clear it
      expect(upsertInboxItemMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'i1', done: true, scheduled: SCHEDULED }),
        { ownerId: 'user-1' }
      )
    })

    it('retry re-sends the toggled snapshot, not the re-read (already-flipped) local state', async () => {
      const seeded: InboxItem = { id: 'i1', text: 'x', createdAt: '2026-07-22', done: false, scheduled: null }
      const store = await signedInStore([seeded])
      upsertInboxItemMock.mockRejectedValueOnce(new Error('offline'))

      store.toggleDone('i1') // target done=true, but the remote write fails
      await flush()
      expect(store.inboxItems[0]!.done).toBe(true) // local optimistic value stays true
      const retry = notifySyncErrorMock.mock.calls.find((c) => c[0] === '更新失敗')![1] as () => void

      upsertInboxItemMock.mockClear()
      retry()
      await flush()

      // retry must persist done=true (the original intent), not flip it back to false
      expect(upsertInboxItemMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'i1', done: true }), { ownerId: 'user-1' })
      expect(store.inboxItems[0]!.done).toBe(true)
    })
  })

  describe('completePromotion', () => {
    it('marks the item done + tagged, persists it, and clears the marker', async () => {
      const seeded: InboxItem = { id: 'i1', text: 'x', createdAt: '2026-07-22', done: false, scheduled: null }
      const store = await signedInStore([seeded])

      store.promoteItem('i1')
      store.completePromotion(SCHEDULED)

      expect(store.inboxItems[0]!.done).toBe(true)
      expect(store.inboxItems[0]!.scheduled).toEqual(SCHEDULED)
      await flush()
      expect(upsertInboxItemMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'i1', done: true, scheduled: SCHEDULED }),
        { ownerId: 'user-1' }
      )

      // idempotency: the marker cleared, so a second call is a no-op
      upsertInboxItemMock.mockClear()
      store.completePromotion(SCHEDULED)
      expect(upsertInboxItemMock).not.toHaveBeenCalled()
    })

    it('promote then cancelPromotion clears the marker without persisting', async () => {
      const seeded: InboxItem = { id: 'i1', text: 'x', createdAt: '2026-07-22', done: false, scheduled: null }
      const store = await signedInStore([seeded])

      store.promoteItem('i1')
      store.cancelPromotion()
      store.completePromotion(SCHEDULED)

      expect(store.inboxItems[0]!.done).toBe(false)
      await flush()
      expect(upsertInboxItemMock).not.toHaveBeenCalled()
    })

    it('a failed promotion retry persists its own captured item without clobbering a newer promotion', async () => {
      const a: InboxItem = { id: 'a', text: 'a', createdAt: '2026-07-22', done: false, scheduled: null }
      const b: InboxItem = { id: 'b', text: 'b', createdAt: '2026-07-22', done: false, scheduled: null }
      const store = await signedInStore([a, b])

      // Promote A, its persist fails and surfaces a retry callback.
      upsertInboxItemMock.mockRejectedValueOnce(new Error('offline'))
      store.promoteItem('a')
      store.completePromotion(SCHEDULED)
      await flush()
      const retry = notifySyncErrorMock.mock.calls.find((c) => c[0] === '儲存失敗')![1] as () => void

      // Meanwhile the user opens a new promotion for B.
      store.promoteItem('b')

      // Retrying A must persist A (its captured id), and must NOT consume B's marker —
      // completing B afterwards still works.
      upsertInboxItemMock.mockClear()
      retry()
      await flush()
      expect(upsertInboxItemMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'a', done: true }), { ownerId: 'user-1' })

      upsertInboxItemMock.mockClear()
      store.completePromotion(SCHEDULED)
      await flush()
      expect(upsertInboxItemMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'b', done: true }), { ownerId: 'user-1' })
    })
  })

  describe('session race', () => {
    it('discards an in-flight write when the session resets before it settles', async () => {
      const store = await signedInStore()
      const pending = deferred<void>()
      // The store chains its own .then/.catch onto this promise, so the rejection is observed
      // there. Attach a no-op catch as well so the raw deferred doesn't surface as an unhandled
      // rejection in the test runner if the store's guard short-circuits before awaiting it.
      pending.promise.catch(() => {})
      upsertInboxItemMock.mockReturnValueOnce(pending.promise)

      store.addItem('call the dentist')
      const id = store.inboxItems[0]!.id

      // Account switch / logout resets local state and bumps the session version.
      store.resetLocal()
      pending.reject(new Error('too late'))
      await flush()

      // The stale write's failure handler must not fire against the new session.
      expect(store.syncStatusByItemId[id]).toBeUndefined()
      expect(notifySyncErrorMock).not.toHaveBeenCalledWith('儲存失敗', expect.any(Function))
    })
  })
})
