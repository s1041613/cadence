import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Task } from '@/types/task'
import type { Subtask } from '@/types/subtask'
import { defaultPoms, estPomsOf } from '@/utils/convert-date-time'
import type { MapContext } from '@/services/events-mapper'
import * as eventsService from '@/services/events-service'
import * as subtasksService from '@/services/subtasks-service'
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
    estimatedPomodoros: defaultPoms({ allDay, start, end }),
    completedPomodoros: 0,
    type: 'quadrant',
    backgroundColor: null,
    icon: null,
    reminder: '15-min',
    ...overrides
  }
}

export type TaskSyncStatus = 'pending' | 'synced' | 'failed'

export const useTasksStore = defineStore('tasks', () => {
  const tasks = ref<Task[]>([])
  /** Flat across every parent; subtasksFor() narrows. A dependent row is only ever reached
   *  through its parent, so there is no need for a second index. */
  const subtasks = ref<Subtask[]>([])
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
  // memberCalendarIds scopes the fetch to every calendar the user belongs to (shared calendars
  // included) — resolved from the calendars store, which loads first.
  async function loadFromRemote(userId: string, defaultCalendarId: string, memberCalendarIds: string[]): Promise<void> {
    sessionVersion += 1
    const version = sessionVersion
    isLoading.value = true
    try {
      const ctx: MapContext = { ownerId: userId, remoteDefaultCalendarId: defaultCalendarId }
      syncCtx = ctx
      const remote = await eventsService.fetchTasks(ctx, memberCalendarIds)
      if (version !== sessionVersion) return
      // Subtasks load by parent id, so they can only be fetched once the events are known.
      // Caught separately on purpose: a checklist failure is not a calendar failure. The tasks
      // are already in hand, so an empty checklist is surfaced rather than the whole load being
      // discarded and the user left staring at an empty calendar.
      const remoteSubtasks = await subtasksService
        .fetchSubtasks(remote.map((t) => t.id))
        .catch(() => [])
      if (version !== sessionVersion) return
      tasks.value = remote
      subtasks.value = remoteSubtasks
      syncStatusByTaskId.value = {}
    } catch {
      if (version !== sessionVersion) return
      notifySyncError('載入失敗', () => {
        void loadFromRemote(userId, defaultCalendarId, memberCalendarIds)
      })
    } finally {
      if (version === sessionVersion) isLoading.value = false
    }
  }

  function resetLocal(): void {
    sessionVersion += 1
    tasks.value = []
    subtasks.value = []
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
    // The database cascades on the parent reference; mirror that locally so a deleted
    // event's checklist does not linger until the next full load. Held for rollback.
    const removedSubtasks = subtasks.value.filter((s) => s.parentId === id)
    subtasks.value = subtasks.value.filter((s) => s.parentId !== id)
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
        subtasks.value = [...subtasks.value, ...removedSubtasks]
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

    // Uncapped: the estimate is a reference, so a pomodoro past it still counts. Clamping
    // here made the "start another pomodoro" button appear to work while the count stood still.
    const snapshot: Task = { ...task, completedPomodoros: task.completedPomodoros + 1 }

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

  // --- subtasks --------------------------------------------------------------
  // Same optimistic-write-then-reconcile shape as the task actions above, but keyed on the
  // subtask's own id so two subtasks of one parent are not serialized behind each other.
  // Rollback restores the previous row rather than dropping it: a failed write must not
  // silently discard what the user typed.

  function subtasksFor(parentId: string): Subtask[] {
    return subtasks.value.filter((s) => s.parentId === parentId)
  }

  /** Mirrors the RLS policy: only the parent event's owner may write its subtasks. Enforced
   *  here rather than at each call site so every mutation is covered at once — an optimistic
   *  write the server will reject surfaces as a value that appears to save and then reverts,
   *  which is worse than not accepting the input at all. An absent ownerId means the task was
   *  created locally by the current user. */
  function canWriteSubtasksOf(parentId: string): boolean {
    const parent = tasks.value.find((t) => t.id === parentId)
    if (!parent) return false
    return parent.ownerId === undefined || parent.ownerId === syncCtx?.ownerId
  }

  /** Every subtask write funnels through here so the optimistic update, the rollback and the
   *  retry notice stay in one place. `revert` restores whatever the list held beforehand. */
  function writeSubtask(subtask: Subtask, message: string, revert: () => void, retry: () => void): void {
    const version = sessionVersion
    void enqueueWrite(subtask.id, () => withWriteState(() => subtasksService.upsertSubtask(subtask)))
      .catch(() => {
        if (version !== sessionVersion) return
        revert()
        notifySyncError(message, retry)
      })
  }

  function addSubtask(parentId: string, title: string): void {
    const trimmed = title.trim()
    // The title is the only thing identifying a subtask, so a blank one is refused outright
    // rather than saved as a row nobody can tell from its neighbours.
    if (trimmed === '') return
    // A subtask is a dependent row reached only through its parent. Writing against a parent
    // the store does not hold would create an orphan the user never sees; writing against
    // someone else's event is what RLS would reject.
    if (!canWriteSubtasksOf(parentId)) return

    if (syncCtx === null) {
      rejectUnsyncedWrite(() => addSubtask(parentId, title))
      return
    }

    // Position is insertion order: append past the highest currently held, so a delete
    // followed by an add cannot collide with a surviving row's position.
    const siblings = subtasksFor(parentId)
    const nextPosition = siblings.reduce((max, s) => Math.max(max, s.position), -1) + 1
    const created: Subtask = {
      id: crypto.randomUUID(),
      parentId,
      title: trimmed,
      done: false,
      position: nextPosition
    }
    subtasks.value = [...subtasks.value, created]

    writeSubtask(
      created,
      '新增子任務失敗',
      () => {
        subtasks.value = subtasks.value.filter((s) => s.id !== created.id)
      },
      () => addSubtask(parentId, title)
    )
  }

  function replaceSubtask(next: Subtask): void {
    subtasks.value = subtasks.value.map((s) => (s.id === next.id ? next : s))
  }

  function toggleSubtaskDone(id: string): void {
    const current = subtasks.value.find((s) => s.id === id)
    if (!current) return
    if (!canWriteSubtasksOf(current.parentId)) return

    if (syncCtx === null) {
      rejectUnsyncedWrite(() => toggleSubtaskDone(id))
      return
    }

    // A pure boolean: checking triggers no pomodoro logic. The checkbox stays live even on a
    // checked row, so uncheck → correct → re-check is always available.
    const next: Subtask = { ...current, done: !current.done }
    replaceSubtask(next)

    writeSubtask(next, '更新子任務失敗', () => replaceSubtask(current), () => toggleSubtaskDone(id))
  }

  function renameSubtask(id: string, title: string): void {
    const current = subtasks.value.find((s) => s.id === id)
    if (!current) return
    if (!canWriteSubtasksOf(current.parentId)) return
    // Checking settles an item: the title greys, strikes through and stops accepting edits,
    // which is what makes the strike-through an honest signal rather than decoration.
    // Unchecking lifts this.
    if (current.done) return

    const trimmed = title.trim()
    // Refusing means keeping the previous title, never deleting the row.
    if (trimmed === '' || trimmed === current.title) return

    if (syncCtx === null) {
      rejectUnsyncedWrite(() => renameSubtask(id, title))
      return
    }

    const next: Subtask = { ...current, title: trimmed }
    replaceSubtask(next)

    writeSubtask(next, '重新命名子任務失敗', () => replaceSubtask(current), () => renameSubtask(id, title))
  }

  function deleteSubtask(id: string): void {
    const idx = subtasks.value.findIndex((s) => s.id === id)
    if (idx === -1) return
    if (!canWriteSubtasksOf(subtasks.value[idx]!.parentId)) return

    if (syncCtx === null) {
      rejectUnsyncedWrite(() => deleteSubtask(id))
      return
    }

    const version = sessionVersion
    const removed = subtasks.value[idx]!
    subtasks.value = subtasks.value.filter((s) => s.id !== id)

    void enqueueWrite(id, () => withWriteState(() => subtasksService.deleteSubtask(id)))
      .catch(() => {
        if (version !== sessionVersion) return
        // Restore at its original index so a failed delete does not silently reorder the list.
        const insertAt = Math.min(idx, subtasks.value.length)
        subtasks.value = [...subtasks.value.slice(0, insertAt), removed, ...subtasks.value.slice(insertAt)]
        notifySyncError('刪除子任務失敗', () => deleteSubtask(id))
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
    subtasks,
    isLoading,
    isSaving,
    syncStatusByTaskId,
    loadFromRemote,
    resetLocal,
    saveTask,
    deleteTask,
    toggleDone,
    incrementCompletedPomodoros,
    subtasksFor,
    addSubtask,
    toggleSubtaskDone,
    renameSubtask,
    deleteSubtask,
    copyToDays
  }
})
