import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useNotebookStore } from './notebook-store'
import * as notesService from '@/services/notes-service'
import { notifySyncError } from '@/lib/notify'
import type { Note } from '@/types/note'

vi.mock('@/services/notes-service', () => ({
  fetchNotes: vi.fn(),
  insertNote: vi.fn(),
  deleteNote: vi.fn()
}))
vi.mock('@/lib/notify', () => ({
  notifySyncError: vi.fn()
}))
vi.mock('./auth-store', () => ({
  useAuthStore: () => ({ user: { id: 'user-1' } })
}))

const fetchNotesMock = vi.mocked(notesService.fetchNotes)
const insertNoteMock = vi.mocked(notesService.insertNote)
const deleteNoteMock = vi.mocked(notesService.deleteNote)
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

/** Flushes the microtask queue plus one macrotask so promise chains settle. */
function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

const note = (id: string, body = `body ${id}`): Note => ({
  id,
  body,
  createdAt: '2026-03-04T09:00:00.000Z'
})

/** Loads the store against the mocked services, then clears the fetch call from the
 *  initial load so each test only observes its own service traffic. */
async function loadedStore(seed: Note[] = []) {
  const store = useNotebookStore()
  fetchNotesMock.mockResolvedValueOnce(seed)
  await store.loadFromRemote()
  fetchNotesMock.mockClear()
  return store
}

describe('notebook-store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
    fetchNotesMock.mockResolvedValue([])
    insertNoteMock.mockResolvedValue(undefined)
    deleteNoteMock.mockResolvedValue(undefined)
  })

  describe('writes before the first load', () => {
    it('refuses addNote and asks the user to retry instead of creating local-only state', () => {
      const store = useNotebookStore()

      store.addNote('unsynced')

      expect(store.notes).toEqual([])
      expect(insertNoteMock).not.toHaveBeenCalled()
      expect(notifySyncErrorMock).toHaveBeenCalledTimes(1)
    })

    it('refuses removeNote the same way', () => {
      const store = useNotebookStore()

      store.removeNote('note-1')

      expect(deleteNoteMock).not.toHaveBeenCalled()
      expect(notifySyncErrorMock).toHaveBeenCalledTimes(1)
    })
  })

  describe('addNote', () => {
    it('trims the body and prepends the note so the newest is first', async () => {
      const store = await loadedStore([note('old')])

      store.addNote('  fresh thought  ')
      await flush()

      expect(store.notes.map((n) => n.body)).toEqual(['fresh thought', 'body old'])
      expect(insertNoteMock).toHaveBeenCalledTimes(1)
      expect(insertNoteMock.mock.calls[0]?.[0]?.body).toBe('fresh thought')
    })

    // Pressing + on an empty pill is not an error — it should do nothing at all,
    // including not raising a toast.
    it('silently ignores a whitespace-only draft without notifying', async () => {
      const store = await loadedStore()

      store.addNote('   ')
      store.addNote('')
      await flush()

      expect(store.notes).toEqual([])
      expect(insertNoteMock).not.toHaveBeenCalled()
      expect(notifySyncErrorMock).not.toHaveBeenCalled()
    })

    it('removes the optimistic card and notifies when the write fails', async () => {
      const store = await loadedStore()
      insertNoteMock.mockRejectedValueOnce(new Error('offline'))

      store.addNote('doomed')
      await flush()

      expect(store.notes).toEqual([])
      expect(notifySyncErrorMock).toHaveBeenCalledTimes(1)
    })

    // The correctness pin: retrying must re-send the SAME snapshot. Re-running addNote
    // would mint a second uuid, so one failed save would become two notes in the DB.
    it('retries with the same snapshot id rather than minting a duplicate', async () => {
      const store = await loadedStore()
      insertNoteMock.mockRejectedValueOnce(new Error('offline'))

      store.addNote('retry me')
      await flush()

      const firstId = insertNoteMock.mock.calls[0]?.[0]?.id
      expect(firstId).toBeTruthy()

      const retry = notifySyncErrorMock.mock.calls[0]?.[1] as () => void
      insertNoteMock.mockResolvedValueOnce(undefined)
      retry()
      await flush()

      expect(insertNoteMock).toHaveBeenCalledTimes(2)
      expect(insertNoteMock.mock.calls[1]?.[0]?.id).toBe(firstId)
    })

    // The failure path removes the optimistic card, so a retry that succeeds has to put it
    // back. Without that, the row is persisted but invisible until the next load — the user
    // sees their note vanish despite the retry reporting success, and is likely to retype it.
    it('restores the note when a retry succeeds after the first save failed', async () => {
      const store = await loadedStore()
      insertNoteMock.mockRejectedValueOnce(new Error('offline'))

      store.addNote('comes back')
      await flush()
      expect(store.notes).toEqual([])

      const retry = notifySyncErrorMock.mock.calls[0]?.[1] as () => void
      insertNoteMock.mockResolvedValueOnce(undefined)
      retry()
      await flush()

      expect(store.notes.map((n) => n.body)).toEqual(['comes back'])
    })

    // A retry that fails again must not stack duplicate cards when it later succeeds.
    it('does not duplicate the card when a retry fails and is retried again', async () => {
      const store = await loadedStore()
      insertNoteMock.mockRejectedValueOnce(new Error('offline'))

      store.addNote('twice failed')
      await flush()

      const firstRetry = notifySyncErrorMock.mock.calls[0]?.[1] as () => void
      insertNoteMock.mockRejectedValueOnce(new Error('still offline'))
      firstRetry()
      await flush()

      const secondRetry = notifySyncErrorMock.mock.calls[1]?.[1] as () => void
      insertNoteMock.mockResolvedValueOnce(undefined)
      secondRetry()
      await flush()

      expect(store.notes.map((n) => n.body)).toEqual(['twice failed'])
    })
  })

  describe('removeNote', () => {
    it('removes optimistically and deletes remotely', async () => {
      const store = await loadedStore([note('a'), note('b')])

      store.removeNote('a')
      await flush()

      expect(store.notes.map((n) => n.id)).toEqual(['b'])
      expect(deleteNoteMock).toHaveBeenCalledWith('a')
    })

    it('restores the note at its original index when the delete fails', async () => {
      const store = await loadedStore([note('a'), note('b'), note('c')])
      deleteNoteMock.mockRejectedValueOnce(new Error('offline'))

      store.removeNote('b')
      await flush()

      expect(store.notes.map((n) => n.id)).toEqual(['a', 'b', 'c'])
      expect(notifySyncErrorMock).toHaveBeenCalledTimes(1)
    })
  })

  describe('loadFromRemote', () => {
    it('populates the feed and marks the store loaded', async () => {
      const store = useNotebookStore()
      fetchNotesMock.mockResolvedValueOnce([note('a'), note('b')])

      await store.loadFromRemote()

      expect(store.notes.map((n) => n.id)).toEqual(['a', 'b'])
      expect(store.isLoaded).toBe(true)
    })

    // The store is awaited inside a Promise.all in auth-data-sync-core. If it rejected,
    // onAuthUserChange would throw at a void caller and take the other stores' loads
    // down with it — so a failed load must resolve, having notified instead.
    it('resolves rather than rejecting when the fetch fails, leaving the store unloaded', async () => {
      const store = useNotebookStore()
      fetchNotesMock.mockRejectedValueOnce(new Error('offline'))

      await expect(store.loadFromRemote()).resolves.toBeUndefined()

      expect(store.isLoaded).toBe(false)
      expect(notifySyncErrorMock).toHaveBeenCalledTimes(1)
    })
  })

  describe('generation guard', () => {
    it('discards a load that resolves after resetLocal', async () => {
      const store = useNotebookStore()
      const pending = deferred<Note[]>()
      fetchNotesMock.mockReturnValueOnce(pending.promise)

      const loading = store.loadFromRemote()
      store.resetLocal()
      pending.resolve([note('stale')])
      await loading

      expect(store.notes).toEqual([])
      expect(store.isLoaded).toBe(false)
    })

    it('does not send a write that was still queued when resetLocal ran', async () => {
      const store = await loadedStore([note('a')])

      // enqueueWrite chains off a resolved promise, so op() is dispatched on a microtask
      // rather than synchronously. resetLocal lands first and bumps the generation, and the
      // dispatch-time check must then drop the write instead of deleting a row that now
      // belongs to a signed-out (or different) session.
      store.removeNote('a')
      store.resetLocal()
      await flush()

      expect(deleteNoteMock).not.toHaveBeenCalled()
    })

    // The subtlest one: a delete rejection landing after logout would splice the previous
    // user's note back into a list that now belongs to nobody (or to the next account).
    it('does not resurrect a note when a failed delete settles after resetLocal', async () => {
      const store = await loadedStore([note('a')])
      // The delete must actually reach the service and then fail, so hold it open until after
      // resetLocal: that is the window where a rollback would splice the previous session's
      // note back into a list that now belongs to nobody.
      const failing = deferred<void>()
      deleteNoteMock.mockReturnValueOnce(failing.promise)

      store.removeNote('a')
      await flush() // let enqueueWrite dispatch, so deleteNote is genuinely in flight
      expect(deleteNoteMock).toHaveBeenCalledTimes(1)

      store.resetLocal()
      failing.reject(new Error('offline'))
      await flush()

      expect(store.notes).toEqual([])
    })
  })

  describe('resetLocal', () => {
    it('clears the feed, the draft and the loaded flag', async () => {
      const store = await loadedStore([note('a')])
      store.draft = 'half typed'

      store.resetLocal()

      expect(store.notes).toEqual([])
      expect(store.draft).toBe('')
      expect(store.isLoaded).toBe(false)
    })
  })
})
