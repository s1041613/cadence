import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useNotebookStore } from './notebook-store'
import * as notesService from '@/services/notes-service'
import * as noteTagsService from '@/services/note-tags-service'
import { notifySyncError } from '@/lib/notify'
import type { Note, NoteTag } from '@/types/note'

vi.mock('@/services/notes-service', () => ({
  fetchNotes: vi.fn(),
  insertNote: vi.fn(),
  updateNote: vi.fn(),
  deleteNote: vi.fn()
}))
vi.mock('@/services/note-tags-service', () => ({
  fetchNoteTags: vi.fn(),
  insertNoteTag: vi.fn()
}))
vi.mock('@/lib/notify', () => ({
  notifySyncError: vi.fn()
}))
vi.mock('./auth-store', () => ({
  useAuthStore: () => ({ user: { id: 'user-1' } })
}))

const fetchNotesMock = vi.mocked(notesService.fetchNotes)
const insertNoteMock = vi.mocked(notesService.insertNote)
const updateNoteMock = vi.mocked(notesService.updateNote)
const deleteNoteMock = vi.mocked(notesService.deleteNote)
const fetchNoteTagsMock = vi.mocked(noteTagsService.fetchNoteTags)
const insertNoteTagMock = vi.mocked(noteTagsService.insertNoteTag)
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
  createdAt: '2026-03-04T09:00:00.000Z',
  updatedAt: null,
  tagId: null
})

const taggedNote = (id: string, tagId: string, body = `body ${id}`): Note => ({
  ...note(id, body),
  tagId
})

const tag = (id: string, name = `Tag ${id}`, position = 0): NoteTag => ({
  id,
  name,
  position,
  createdAt: '2026-08-24T10:00:00.000Z',
  updatedAt: null
})

/** Loads the store against the mocked services, then clears the fetch call from the
 *  initial load so each test only observes its own service traffic. */
async function loadedStore(seed: Note[] = []) {
  const store = useNotebookStore()
  fetchNotesMock.mockResolvedValueOnce(seed)
  fetchNoteTagsMock.mockResolvedValueOnce([])
  await store.loadFromRemote()
  fetchNotesMock.mockClear()
  fetchNoteTagsMock.mockClear()
  return store
}

async function loadedStoreWith(seed: Note[], tags: NoteTag[]) {
  const store = useNotebookStore()
  fetchNotesMock.mockResolvedValueOnce(seed)
  fetchNoteTagsMock.mockResolvedValueOnce(tags)
  await store.loadFromRemote()
  fetchNotesMock.mockClear()
  fetchNoteTagsMock.mockClear()
  return store
}

describe('notebook-store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
    fetchNotesMock.mockResolvedValue([])
    fetchNoteTagsMock.mockResolvedValue([])
    insertNoteMock.mockResolvedValue(undefined)
    insertNoteTagMock.mockResolvedValue(undefined)
    updateNoteMock.mockResolvedValue(undefined)
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

  describe('tag navigation and filtering', () => {
    it('starts on the virtual All tab with no default tags', async () => {
      const store = await loadedStore([taggedNote('a', 'tag-1'), note('b')])

      expect(store.activeTagId).toBeNull()
      expect(store.tags).toEqual([])
      expect(store.visibleNotes.map((n) => n.id)).toEqual(['a', 'b'])
    })

    it('filters notes by the active tag while All still shows every note', async () => {
      const store = await loadedStoreWith(
        [taggedNote('a', 'tag-1'), taggedNote('b', 'tag-2'), note('c')],
        [tag('tag-1', 'Rituals'), tag('tag-2', 'Trips', 1)]
      )

      store.selectTag('tag-1')
      expect(store.visibleNotes.map((n) => n.id)).toEqual(['a'])

      store.selectTag(null)
      expect(store.visibleNotes.map((n) => n.id)).toEqual(['a', 'b', 'c'])
    })

    it('applies search inside the current tag filter', async () => {
      const store = await loadedStoreWith(
        [taggedNote('a', 'tag-1', 'Morning pages'), taggedNote('b', 'tag-1', 'Evening walk'), note('c', 'Morning call')],
        [tag('tag-1', 'Rituals')]
      )

      store.selectTag('tag-1')
      store.query = 'morning'

      expect(store.visibleNotes.map((n) => n.id)).toEqual(['a'])
    })

    it('steps between All and tags without wrapping at the edges', async () => {
      const store = await loadedStoreWith([], [tag('tag-1', 'Rituals'), tag('tag-2', 'Trips', 1)])

      store.stepTag(1)
      expect(store.activeTagId).toBe('tag-1')
      store.stepTag(1)
      expect(store.activeTagId).toBe('tag-2')
      store.stepTag(1)
      expect(store.activeTagId).toBe('tag-2')
      store.stepTag(-1)
      expect(store.activeTagId).toBe('tag-1')
      store.stepTag(-1)
      expect(store.activeTagId).toBeNull()
      store.stepTag(-1)
      expect(store.activeTagId).toBeNull()
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

    it('uses null tagId when adding from All', async () => {
      const store = await loadedStore()

      store.addNote('untagged')
      await flush()

      expect(insertNoteMock.mock.calls[0]?.[0]?.tagId).toBeNull()
    })

    it('uses the active tag when adding from a tag page', async () => {
      const store = await loadedStoreWith([], [tag('tag-1', 'Rituals')])
      store.selectTag('tag-1')

      store.addNote('tagged')
      await flush()

      expect(store.notes[0]?.tagId).toBe('tag-1')
      expect(insertNoteMock.mock.calls[0]?.[0]?.tagId).toBe('tag-1')
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

  describe('addTag', () => {
    it('trims the name and appends a tag optimistically', async () => {
      const store = await loadedStore()

      store.addTag('  Rituals  ')
      await flush()

      expect(store.tags.map((t) => t.name)).toEqual(['Rituals'])
      expect(insertNoteTagMock).toHaveBeenCalledTimes(1)
      expect(insertNoteTagMock.mock.calls[0]?.[0]?.name).toBe('Rituals')
      expect(insertNoteTagMock.mock.calls[0]?.[0]?.position).toBe(0)
    })

    it('silently ignores an empty tag name', async () => {
      const store = await loadedStore()

      store.addTag('   ')
      await flush()

      expect(store.tags).toEqual([])
      expect(insertNoteTagMock).not.toHaveBeenCalled()
    })
  })

  describe('editNote', () => {
    it('rewrites the body optimistically and persists the trimmed text', async () => {
      const store = await loadedStore([note('a', 'before')])

      store.editNote('a', '  after  ')
      await flush()

      expect(store.notes[0]?.body).toBe('after')
      expect(updateNoteMock).toHaveBeenCalledTimes(1)
      expect(updateNoteMock.mock.calls[0]?.[0]).toBe('a')
      expect(updateNoteMock.mock.calls[0]?.[1]).toBe('after')
    })

    it('stamps updatedAt while leaving createdAt alone', async () => {
      const store = await loadedStore([note('a', 'before')])

      store.editNote('a', 'after')
      await flush()

      expect(store.notes[0]?.createdAt).toBe('2026-03-04T09:00:00.000Z')
      expect(store.notes[0]?.updatedAt).not.toBeNull()
    })

    // Editing must not reorder the feed — a note keeps the position it was written in.
    it('does not move the note within the feed', async () => {
      const store = await loadedStore([note('a'), note('b'), note('c')])

      store.editNote('b', 'edited')
      await flush()

      expect(store.notes.map((n) => n.id)).toEqual(['a', 'b', 'c'])
    })

    // Clearing the field is not a delete: the trash glyph is the only way to remove a note,
    // and silently destroying the text would not be recoverable.
    it('ignores an emptied body rather than deleting the note', async () => {
      const store = await loadedStore([note('a', 'keep me')])

      store.editNote('a', '   ')
      await flush()

      expect(store.notes[0]?.body).toBe('keep me')
      expect(updateNoteMock).not.toHaveBeenCalled()
    })

    it('skips the write when the body is unchanged', async () => {
      const store = await loadedStore([note('a', 'same')])

      store.editNote('a', 'same')
      await flush()

      expect(updateNoteMock).not.toHaveBeenCalled()
    })

    it('restores the previous body when the write fails', async () => {
      const store = await loadedStore([note('a', 'before')])
      updateNoteMock.mockRejectedValueOnce(new Error('offline'))

      store.editNote('a', 'after')
      await flush()

      expect(store.notes[0]?.body).toBe('before')
      expect(notifySyncErrorMock).toHaveBeenCalledTimes(1)
    })

    it('refuses to edit before the first load', () => {
      const store = useNotebookStore()

      store.editNote('a', 'anything')

      expect(updateNoteMock).not.toHaveBeenCalled()
    })

    // Same resurrection hazard as removeNote: a rejection landing after sign-out must not
    // write the previous session's text back into a cleared feed.
    it('does not restore the old body when the failure settles after resetLocal', async () => {
      const store = await loadedStore([note('a', 'before')])
      const failing = deferred<void>()
      updateNoteMock.mockReturnValueOnce(failing.promise)

      store.editNote('a', 'after')
      await flush()
      expect(updateNoteMock).toHaveBeenCalledTimes(1)

      store.resetLocal()
      failing.reject(new Error('offline'))
      await flush()

      expect(store.notes).toEqual([])
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
      fetchNoteTagsMock.mockResolvedValueOnce([tag('tag-1', 'Rituals')])

      await store.loadFromRemote()

      expect(store.notes.map((n) => n.id)).toEqual(['a', 'b'])
      expect(store.tags.map((t) => t.id)).toEqual(['tag-1'])
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
      expect(store.tags).toEqual([])
      expect(store.draft).toBe('')
      expect(store.isLoaded).toBe(false)
    })
  })
})
