import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Note } from '@/types/note'
import { fetchNotes, insertNote, deleteNote } from '@/services/notes-service'
import { notifySyncError } from '@/lib/notify'
import { useAuthStore } from './auth-store'

/** Plain-text notes shown on the Notebook page. Add and delete only — the card has no edit
 *  affordance, and the table has no UPDATE policy to back one. */
export const useNotebookStore = defineStore('notebook', () => {
  // Newest-first: the feed renders in array order, and addNote prepends.
  const notes = ref<Note[]>([])
  // Quick-capture text. Deliberately not persisted — an unsent draft is not a note.
  const draft = ref('')
  // Gates writes and first paint. Only ever set true by a successful load, so a failed load
  // keeps writes rejected rather than letting them build local-only state that the retry
  // would then replace.
  const isLoaded = ref(false)

  // --- sync state (not exposed) ---------------------------------------------
  // Set by loadFromRemote, cleared by resetLocal. While null, writes are refused.
  let syncUserId: string | null = null
  // Bumped on loadFromRemote and resetLocal. Async results whose generation is no longer
  // current are discarded, so work in flight at logout or account switch never writes back.
  let generation = 0

  // Per-note-id write serialization: each id owns a promise chain so its network writes run
  // strictly in order. Mirrors inbox-store — it also stops a double-tapped trash glyph from
  // racing two deletes for the same row.
  const writeChains = new Map<string, Promise<void>>()

  function enqueueWrite(id: string, op: () => Promise<void>): Promise<void> {
    const version = generation
    const prev = writeChains.get(id) ?? Promise.resolve()
    // Chain off the previous write regardless of its outcome so one failure doesn't wedge the
    // queue, and re-check the generation at dispatch time: by the time a queued write reaches
    // the head of the chain, resetLocal may have run, and a stale write must not reach the
    // network after logout.
    const next = prev.catch(() => {}).then(() => {
      if (version !== generation) return
      return op()
    })
    writeChains.set(id, next)
    void next.catch(() => {}).finally(() => {
      if (writeChains.get(id) === next) writeChains.delete(id)
    })
    return next
  }

  function rejectUnsyncedWrite(retry: () => void): void {
    notifySyncError('尚未完成同步，請稍後再試', retry)
  }

  // --- lifecycle ------------------------------------------------------------

  /**
   * Loads this user's notes. Takes no arguments: notes are user-scoped with no calendar
   * dependency, so unlike tasks/calendars there is no default id to thread through.
   *
   * Invariant: this must never reject. auth-data-sync-core awaits it inside a Promise.all
   * whose caller is `void`-invoked, so a rejection here would throw past the boot wiring and
   * take the sibling stores' loads down with it. Every failure path notifies and resolves.
   */
  async function loadFromRemote(): Promise<void> {
    const ownerId = useAuthStore().user?.id
    if (!ownerId) return

    generation += 1
    const version = generation
    syncUserId = ownerId

    try {
      const remote = await fetchNotes(ownerId)
      if (version !== generation) return
      notes.value = remote
      isLoaded.value = true
    } catch {
      if (version !== generation) return
      // Notified rather than swallowed (unlike title-dismissals): a notebook that silently
      // renders empty is indistinguishable from having lost every note.
      notifySyncError('載入失敗', () => {
        void loadFromRemote()
      })
    }
  }

  function resetLocal(): void {
    generation += 1
    notes.value = []
    draft.value = ''
    isLoaded.value = false
    syncUserId = null
    // Drop every pending chain so queued same-id writes don't fire against the new session;
    // the bumped generation also gates anything already in flight.
    writeChains.clear()
  }

  // --- actions (optimistic; remote persistence runs in the background) -------

  /** Restores a note that a failed save had rolled off the feed, back in newest-first order.
   *  Idempotent: a note already present is left alone, so repeated retries can't stack copies. */
  function restoreNote(snapshot: Note): void {
    if (notes.value.some((n) => n.id === snapshot.id)) return
    const insertAt = notes.value.findIndex((n) => n.createdAt <= snapshot.createdAt)
    if (insertAt === -1) notes.value = [...notes.value, snapshot]
    else notes.value = [...notes.value.slice(0, insertAt), snapshot, ...notes.value.slice(insertAt)]
  }

  /**
   * Persists one note snapshot. The retry closure re-sends THIS snapshot rather than
   * re-deriving it — re-running addNote would mint a fresh uuid, turning one failed save into
   * two rows. Mirrors inbox-store's persistUpsert for the same reason.
   *
   * On failure the optimistic card is rolled off the feed, so success has to put it back: a
   * retry that lands would otherwise leave the row persisted but invisible until the next
   * load, and the user — told it failed, then told nothing — retypes the note.
   */
  function persistInsert(snapshot: Note): void {
    const ownerId = syncUserId
    if (ownerId === null) {
      rejectUnsyncedWrite(() => persistInsert(snapshot))
      return
    }
    const version = generation

    void enqueueWrite(snapshot.id, () => insertNote(snapshot, ownerId))
      .then(() => {
        if (version !== generation) return
        restoreNote(snapshot)
      })
      .catch(() => {
        if (version !== generation) return
        notes.value = notes.value.filter((n) => n.id !== snapshot.id)
        notifySyncError('儲存失敗', () => persistInsert(snapshot))
      })
  }

  function addNote(body: string): void {
    const text = body.trim()
    // An empty draft is not an error, it is a no-op: pressing + on an empty pill should do
    // nothing at all, toast included.
    if (text === '') return

    if (!isLoaded.value || syncUserId === null) {
      rejectUnsyncedWrite(() => addNote(body))
      return
    }

    // Built once and reused by every retry. crypto.randomUUID matches tasks-store/inbox-store:
    // the client owns the id, so the insert can be fully optimistic.
    const snapshot: Note = {
      id: crypto.randomUUID(),
      body: text,
      createdAt: new Date().toISOString()
    }
    notes.value.unshift(snapshot)
    persistInsert(snapshot)
  }

  function removeNote(id: string): void {
    if (!isLoaded.value || syncUserId === null) {
      rejectUnsyncedWrite(() => removeNote(id))
      return
    }
    const version = generation
    const idx = notes.value.findIndex((n) => n.id === id)
    if (idx === -1) return
    const removed = notes.value[idx]!
    notes.value = notes.value.filter((n) => n.id !== id)

    void enqueueWrite(id, () => deleteNote(id)).catch(() => {
      // Generation check before the rollback, not just before the network call: a rejection
      // landing after resetLocal would otherwise splice the previous user's note back into a
      // list that now belongs to the next account.
      if (version !== generation) return
      // Clamp — notes may have been prepended while the delete was in flight.
      const insertAt = Math.min(idx, notes.value.length)
      notes.value = [...notes.value.slice(0, insertAt), removed, ...notes.value.slice(insertAt)]
      notifySyncError('刪除失敗', () => removeNote(id))
    })
  }

  return {
    notes,
    draft,
    isLoaded,
    loadFromRemote,
    resetLocal,
    addNote,
    removeNote
  }
})
