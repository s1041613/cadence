import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { iso } from '@/utils/convert-date-time'
import type { InboxContext } from '@/services/inbox-service'
import * as inboxService from '@/services/inbox-service'
import { notifySyncError } from '@/lib/notify'

export interface ScheduledTag {
  type: 'task' | 'event'
  color: string
  tag: string
}

export interface InboxItem {
  id: string
  text: string
  createdAt: string // ISO date (YYYY-MM-DD), drives Today/Yesterday/Previous 7 Days grouping
  done: boolean
  scheduled: ScheduledTag | null
}

export type InboxSyncStatus = 'pending' | 'synced' | 'failed'

export const useInboxStore = defineStore('inbox', () => {
  const inboxItems = ref<InboxItem[]>([])
  const inboxDraft = ref('')
  const isLoading = ref(true)
  const pendingWriteCount = ref(0)
  const isSaving = computed(() => pendingWriteCount.value > 0)
  const syncStatusByItemId = ref<Record<string, InboxSyncStatus>>({})

  // Not returned: promotion is an internal invariant, not public state. A non-null value
  // exists if and only if a promotion-initiated editing session is currently open.
  const promotionSourceItemId = ref<string | null>(null)

  // --- sync state machine (not exposed). Mirrors tasks-store.ts. -------------
  // Set once per sign-in by loadFromRemote. While null, writes are rejected instead of creating
  // local-only state that would disappear on the next remote load.
  let syncCtx: InboxContext | null = null
  // Bumped on loadFromRemote and resetLocal. Async results are discarded when their sessionVersion
  // is no longer current, so requests in flight at logout/account switch never write back.
  let sessionVersion = 0

  async function withWriteState<T>(op: () => Promise<T>): Promise<T> {
    pendingWriteCount.value += 1
    try {
      return await op()
    } finally {
      pendingWriteCount.value -= 1
    }
  }

  // Per-item-id write serialization. Each id owns a promise chain so its network
  // writes run strictly in order — a later edit can never be overtaken by an
  // earlier one, and a delete queued after an upsert always lands last (no
  // delete-then-resurrect). Optimistic local updates stay synchronous; only the
  // service calls are serialized here.
  const writeChains = new Map<string, Promise<void>>()

  function enqueueWrite(id: string, op: () => Promise<void>): Promise<void> {
    const version = sessionVersion
    const prev = writeChains.get(id) ?? Promise.resolve()
    // Chain off the previous write regardless of its outcome, so one failure
    // doesn't wedge the queue. Re-check the session version at dispatch time: by
    // the time a queued write reaches the head of the chain, resetLocal may have
    // run, and a stale write must not reach the network after logout.
    const next = prev.catch(() => {}).then(() => {
      if (version !== sessionVersion) return
      return op()
    })
    writeChains.set(id, next)
    void next.catch(() => {}).finally(() => {
      if (writeChains.get(id) === next) writeChains.delete(id)
    })
    return next
  }

  function setSyncStatus(id: string, status: InboxSyncStatus): void {
    syncStatusByItemId.value = { ...syncStatusByItemId.value, [id]: status }
  }

  function clearSyncStatus(id: string): void {
    const { [id]: _removed, ...rest } = syncStatusByItemId.value
    syncStatusByItemId.value = rest
  }

  function rejectUnsyncedWrite(retry: () => void): void {
    notifySyncError('尚未完成同步，請稍後再試', retry)
  }

  // --- lifecycle ------------------------------------------------------------

  // _defaultId satisfies the DataStoreLike interface shared with tasks/calendars-store;
  // inbox has no calendar concept, so it's intentionally unused.
  async function loadFromRemote(userId: string, _defaultId: string): Promise<void> {
    sessionVersion += 1
    const version = sessionVersion
    isLoading.value = true
    try {
      const ctx: InboxContext = { ownerId: userId }
      syncCtx = ctx
      const remote = await inboxService.fetchInboxItems(ctx)
      if (version !== sessionVersion) return
      inboxItems.value = remote
      syncStatusByItemId.value = {}
    } catch {
      if (version !== sessionVersion) return
      notifySyncError('載入失敗', () => {
        // _defaultId is unused by inbox; passed through only to satisfy the shared signature.
        void loadFromRemote(userId, _defaultId)
      })
    } finally {
      if (version === sessionVersion) isLoading.value = false
    }
  }

  function resetLocal(): void {
    sessionVersion += 1
    inboxItems.value = []
    syncStatusByItemId.value = {}
    // Drop every pending write chain so queued same-id writes don't fire against
    // the new session; the bumped sessionVersion also gates any in-flight op.
    writeChains.clear()
    syncCtx = null
    isLoading.value = true
  }

  // --- actions (optimistic writes; remote persistence runs in the background) -

  // Persists a single item snapshot (id-stable upsert). Callers apply the optimistic local change
  // and pass the resulting snapshot; retry re-sends the SAME snapshot rather than re-deriving it, so
  // a retry never flips state a second time (toggleDone) or mints a new id (addItem). Mirrors
  // tasks-store's saveTask, whose retry also re-sends its captured snapshot.
  function persistUpsert(snapshot: InboxItem, failMessage: string): void {
    const ctx = syncCtx
    if (ctx === null) {
      rejectUnsyncedWrite(() => persistUpsert(snapshot, failMessage))
      return
    }
    const version = sessionVersion
    setSyncStatus(snapshot.id, 'pending')

    void enqueueWrite(snapshot.id, () => withWriteState(() => inboxService.upsertInboxItem(snapshot, ctx)))
      .then(() => {
        if (version !== sessionVersion) return
        clearSyncStatus(snapshot.id)
      })
      .catch(() => {
        if (version !== sessionVersion) return
        setSyncStatus(snapshot.id, 'failed')
        notifySyncError(failMessage, () => persistUpsert(snapshot, failMessage))
      })
  }

  function addItem(text: string): void {
    if (syncCtx === null) {
      rejectUnsyncedWrite(() => addItem(text))
      return
    }
    const snapshot: InboxItem = { id: crypto.randomUUID(), text, createdAt: iso(new Date()), done: false, scheduled: null }
    inboxItems.value.unshift(snapshot)
    persistUpsert(snapshot, '儲存失敗')
  }

  function removeItem(id: string): void {
    const ctx = syncCtx
    if (ctx === null) {
      rejectUnsyncedWrite(() => removeItem(id))
      return
    }
    const version = sessionVersion
    const idx = inboxItems.value.findIndex((item) => item.id === id)
    if (idx === -1) return
    const removed = inboxItems.value[idx]!
    inboxItems.value = inboxItems.value.filter((item) => item.id !== id)
    setSyncStatus(id, 'pending')

    void enqueueWrite(id, () => withWriteState(() => inboxService.deleteInboxItem(id)))
      .then(() => {
        if (version !== sessionVersion) return
        clearSyncStatus(id)
      })
      .catch(() => {
        if (version !== sessionVersion) return
        const insertAt = Math.min(idx, inboxItems.value.length)
        inboxItems.value = [...inboxItems.value.slice(0, insertAt), removed, ...inboxItems.value.slice(insertAt)]
        setSyncStatus(id, 'failed')
        notifySyncError('刪除失敗', () => removeItem(id))
      })
  }

  function toggleDone(id: string): void {
    const item = inboxItems.value.find((i) => i.id === id)
    if (!item) return

    if (syncCtx === null) {
      rejectUnsyncedWrite(() => toggleDone(id))
      return
    }
    // Snapshot the target state once. persistUpsert re-sends THIS snapshot on retry, so retrying a
    // failed toggle can't flip done back the other way.
    const snapshot: InboxItem = { ...item, done: !item.done }
    const idx = inboxItems.value.findIndex((i) => i.id === id)
    if (idx !== -1) inboxItems.value[idx] = snapshot
    persistUpsert(snapshot, '更新失敗')
  }

  function promoteItem(id: string): InboxItem | undefined {
    const item = inboxItems.value.find((i) => i.id === id)
    if (!item) return undefined
    promotionSourceItemId.value = id
    return item
  }

  // Applies a promoted (done + scheduled) state to one item and persists it. Takes id/scheduled by
  // value (not via promotionSourceItemId) so the retry path — carried by persistUpsert's captured
  // snapshot — never clobbers a different promotion the user may have opened in the meantime.
  function persistPromotion(id: string, scheduled: ScheduledTag): void {
    const item = inboxItems.value.find((i) => i.id === id)
    if (!item) return

    if (syncCtx === null) {
      rejectUnsyncedWrite(() => persistPromotion(id, scheduled))
      return
    }
    const snapshot: InboxItem = { ...item, done: true, scheduled }
    const idx = inboxItems.value.findIndex((i) => i.id === id)
    if (idx !== -1) inboxItems.value[idx] = snapshot
    persistUpsert(snapshot, '儲存失敗')
  }

  // inbox-capture spec "Schedule conversion previews availability before promoting": a promoted
  // draft is marked done and tagged rather than removed, so it stays visible (struck through, with
  // its scheduled tag) in the grouped list — matching CdDraftDrawer's presentational contract.
  // The done + scheduled change is a real data mutation, so it is persisted like the other actions.
  function completePromotion(scheduled: ScheduledTag): void {
    if (promotionSourceItemId.value === null) return
    const id = promotionSourceItemId.value
    // Clear the marker before persisting: it's a UI-transient invariant, not persisted state, and
    // persistPromotion no longer depends on it (see its comment).
    promotionSourceItemId.value = null
    persistPromotion(id, scheduled)
  }

  function cancelPromotion(): void {
    promotionSourceItemId.value = null
  }

  return {
    inboxItems,
    inboxDraft,
    isLoading,
    isSaving,
    syncStatusByItemId,
    loadFromRemote,
    resetLocal,
    addItem,
    removeItem,
    toggleDone,
    promoteItem,
    completePromotion,
    cancelPromotion
  }
})
