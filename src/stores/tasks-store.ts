import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Task } from '@/types/task'
import { autoPoms } from '@/utils/convert-date-time'
import type { MapContext } from '@/services/events-mapper'
import * as eventsService from '@/services/events-service'
import { notifySyncError } from '@/lib/notify'

// calendarId is required (not defaulted) so every call site must supply a real calendar uuid —
// typically calendarsStore.defaultCalendarId, guaranteed non-null by the isLoading gate at each
// creation entry point (see AppShellChrome/QuickAddPopover/EventComposerOverlay/DraftDrawer).
export function mkTask(overrides: Partial<Task> & Pick<Task, 'date' | 'calendarId'>): Task {
  const start = overrides.start ?? ''
  const end = overrides.end ?? ''
  const allDay = overrides.allDay ?? false

  return {
    id: crypto.randomUUID(),
    title: '',
    start,
    end,
    allDay,
    location: '',
    repeat: 'none',
    notes: '',
    important: false,
    urgent: false,
    done: false,
    estimatedPomodoros: autoPoms({ allDay, start, end }),
    completedPomodoros: 0,
    type: 'quadrant',
    backgroundColor: null,
    icon: null,
    reminder: null,
    ...overrides
  }
}

export type TaskSyncStatus = 'pending' | 'synced' | 'failed'

export const useTasksStore = defineStore('tasks', () => {
  const tasks = ref<Task[]>([])
  const isLoading = ref(true)
  const pendingWriteCount = ref(0)
  const isSaving = computed(() => pendingWriteCount.value > 0)
  const syncStatusByTaskId = ref<Record<string, TaskSyncStatus>>({})

  // --- sync state machine (not exposed) -------------------------------------
  // Set once per sign-in by loadFromRemote. While null, writes are rejected instead of creating
  // local-only state that would disappear on the next remote load.
  let syncCtx: MapContext | null = null
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

  // Per-task-id write serialization. Each task id owns a promise chain so its
  // network writes run strictly in order — a later edit can never be overtaken
  // by an earlier one (out-of-order overwrite), and a delete queued after an
  // upsert always lands last (no delete-then-resurrect). Optimistic local
  // updates stay synchronous; only the service calls are serialized here.
  const writeChains = new Map<string, Promise<void>>()

  function enqueueWrite(id: string, op: () => Promise<void>): Promise<void> {
    const version = sessionVersion
    const prev = writeChains.get(id) ?? Promise.resolve()
    // Chain off the previous write regardless of its outcome, so one failure
    // doesn't wedge the queue for this id. Re-check the session version at
    // dispatch time (not just in the callers' .then/.catch): by the time a
    // queued write reaches the head of the chain, resetLocal may have run, and
    // a stale write must not reach the network after logout/account switch.
    const next = prev.catch(() => {}).then(() => {
      if (version !== sessionVersion) return
      return op()
    })
    writeChains.set(id, next)
    // Drop the map entry once this is the tail so the map doesn't grow unbounded.
    void next.catch(() => {}).finally(() => {
      if (writeChains.get(id) === next) writeChains.delete(id)
    })
    return next
  }

  function setSyncStatus(id: string, status: TaskSyncStatus): void {
    syncStatusByTaskId.value = { ...syncStatusByTaskId.value, [id]: status }
  }

  function clearSyncStatus(id: string): void {
    const { [id]: _removed, ...rest } = syncStatusByTaskId.value
    syncStatusByTaskId.value = rest
  }

  function rejectUnsyncedWrite(retry: () => void): void {
    notifySyncError('尚未完成同步，請稍後再試', retry)
  }

  // --- lifecycle ------------------------------------------------------------

  // defaultCalendarId is resolved once in boot/auth-data-sync.ts (ensureDefaultCalendar) and passed in here
  // so both tasks-store and calendars-store load against the same uuid without either re-deriving it.
  async function loadFromRemote(userId: string, defaultCalendarId: string): Promise<void> {
    sessionVersion += 1
    const version = sessionVersion
    isLoading.value = true
    try {
      const ctx: MapContext = { ownerId: userId, remoteDefaultCalendarId: defaultCalendarId }
      syncCtx = ctx
      const remote = await eventsService.fetchTasks(ctx)
      if (version !== sessionVersion) return
      tasks.value = remote
      syncStatusByTaskId.value = {}
    } catch {
      if (version !== sessionVersion) return
      notifySyncError('載入失敗', () => {
        void loadFromRemote(userId, defaultCalendarId)
      })
    } finally {
      if (version === sessionVersion) isLoading.value = false
    }
  }

  function resetLocal(): void {
    sessionVersion += 1
    tasks.value = []
    syncStatusByTaskId.value = {}
    // Drop every pending write chain so queued same-id writes don't fire against
    // the new session; the bumped sessionVersion also gates any in-flight op at
    // dispatch time (see enqueueWrite).
    writeChains.clear()
    syncCtx = null
    isLoading.value = true
  }

  // --- actions (optimistic writes; remote persistence runs in the background) -

  function saveTask(task: Task): void {
    const ctx = syncCtx
    if (ctx === null) {
      rejectUnsyncedWrite(() => saveTask(task))
      return
    }
    const version = sessionVersion
    const snapshot: Task = { ...task }
    const idx = tasks.value.findIndex((t) => t.id === snapshot.id)
    if (idx === -1) {
      tasks.value.push(snapshot)
    } else {
      tasks.value[idx] = snapshot
    }
    setSyncStatus(snapshot.id, 'pending')

    void enqueueWrite(snapshot.id, () => withWriteState(() => eventsService.upsertTask(snapshot, ctx)))
      .then(() => {
        if (version !== sessionVersion) return
        clearSyncStatus(snapshot.id)
      })
      .catch(() => {
        if (version !== sessionVersion) return
        setSyncStatus(snapshot.id, 'failed')
        notifySyncError('儲存失敗', () => saveTask(snapshot))
      })
  }

  function deleteTask(id: string): void {
    const ctx = syncCtx
    if (ctx === null) {
      rejectUnsyncedWrite(() => deleteTask(id))
      return
    }
    const version = sessionVersion
    const idx = tasks.value.findIndex((t) => t.id === id)
    if (idx === -1) return
    const removed = tasks.value[idx]!
    tasks.value = tasks.value.filter((t) => t.id !== id)
    setSyncStatus(id, 'pending')

    void enqueueWrite(id, () => withWriteState(() => eventsService.deleteTask(id)))
      .then(() => {
        if (version !== sessionVersion) return
        clearSyncStatus(id)
      })
      .catch(() => {
        if (version !== sessionVersion) return
        const insertAt = Math.min(idx, tasks.value.length)
        tasks.value = [...tasks.value.slice(0, insertAt), removed, ...tasks.value.slice(insertAt)]
        setSyncStatus(id, 'failed')
        notifySyncError('刪除失敗', () => deleteTask(id))
      })
  }

  function toggleDone(id: string): void {
    const task = tasks.value.find((t) => t.id === id)
    if (!task) return

    const ctx = syncCtx
    if (ctx === null) {
      rejectUnsyncedWrite(() => toggleDone(id))
      return
    }
    const version = sessionVersion
    const snapshot: Task = { ...task, done: !task.done }
    const idx = tasks.value.findIndex((t) => t.id === id)
    if (idx !== -1) tasks.value[idx] = snapshot
    setSyncStatus(id, 'pending')

    void enqueueWrite(id, () => withWriteState(() => eventsService.upsertTask(snapshot, ctx)))
      .then(() => {
        if (version !== sessionVersion) return
        clearSyncStatus(id)
      })
      .catch(() => {
        if (version !== sessionVersion) return
        setSyncStatus(id, 'failed')
        notifySyncError('更新失敗', () => toggleDone(id))
      })
  }

  function incrementCompletedPomodoros(id: string): void {
    const task = tasks.value.find((t) => t.id === id)
    if (!task) return

    const limit = task.estimatedPomodoros > 0 ? task.estimatedPomodoros : autoPoms(task)
    const snapshot: Task = { ...task, completedPomodoros: Math.min(task.completedPomodoros + 1, limit) }

    const ctx = syncCtx
    if (ctx === null) {
      rejectUnsyncedWrite(() => incrementCompletedPomodoros(id))
      return
    }
    const version = sessionVersion
    const idx = tasks.value.findIndex((t) => t.id === id)
    if (idx !== -1) tasks.value[idx] = snapshot
    setSyncStatus(id, 'pending')

    void enqueueWrite(id, () => withWriteState(() => eventsService.upsertTask(snapshot, ctx)))
      .then(() => {
        if (version !== sessionVersion) return
        clearSyncStatus(id)
      })
      .catch(() => {
        if (version !== sessionVersion) return
        setSyncStatus(id, 'failed')
        notifySyncError('更新失敗', () => incrementCompletedPomodoros(id))
      })
  }

  function copyToDays(task: Task, dates: string[]): Task[] {
    const created = dates.map((date) =>
      mkTask({
        ...task,
        id: crypto.randomUUID(),
        date,
        done: false,
        completedPomodoros: 0
      })
    )

    if (created.length === 0) return []

    const ctx = syncCtx
    if (ctx === null) {
      rejectUnsyncedWrite(() => copyToDays(task, dates))
      return []
    }
    const version = sessionVersion
    const snapshots = created.map((t) => ({ ...t }))
    tasks.value.push(...snapshots)
    for (const snapshot of snapshots) setSyncStatus(snapshot.id, 'pending')

    void withWriteState(() => eventsService.insertTasks(snapshots, ctx))
      .then(() => {
        if (version !== sessionVersion) return
        for (const snapshot of snapshots) clearSyncStatus(snapshot.id)
      })
      .catch(() => {
        if (version !== sessionVersion) return
        for (const snapshot of snapshots) setSyncStatus(snapshot.id, 'failed')
        notifySyncError('複製失敗', () => copyToDays(task, dates))
      })
    return snapshots
  }

  return {
    tasks,
    isLoading,
    isSaving,
    syncStatusByTaskId,
    loadFromRemote,
    resetLocal,
    saveTask,
    deleteTask,
    toggleDone,
    incrementCompletedPomodoros,
    copyToDays
  }
})
