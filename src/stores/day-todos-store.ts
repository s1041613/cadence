import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { DayTodo } from '@/types/day-todo'
import { fetchDayTodos, upsertDayTodos, deleteDayTodo } from '@/services/day-todos-service'
import { carriedOver, nextPosition, splitTodoLines, todosOn } from '@/utils/day-todos'
import { notifySyncError } from '@/lib/notify'
import { useAuthStore } from './auth-store'

/**
 * The day's rough to-do list (see the day_todos migration for what it is and is not). Every
 * write is optimistic and rolls back on failure, the same shape as notebook-store.
 */
export const useDayTodosStore = defineStore('dayTodos', () => {
  /** Flat across every day; todosFor() narrows. */
  const todos = ref<DayTodo[]>([])
  // Gates writes and first paint. Only set by a successful load, so a failed load keeps writes
  // refused rather than letting them build local state the retry would then replace.
  const isLoaded = ref(false)

  // --- sync state (not exposed) ---------------------------------------------
  let syncUserId: string | null = null
  // Bumped on loadFromRemote and resetLocal. Async results from an older generation are
  // discarded, so work in flight at logout or account switch never writes back.
  let generation = 0

  // Per-id write serialization, as in notebook-store: a tick queued behind the insert of the
  // row it ticks can never overtake it and be overwritten by the insert landing second.
  const writeChains = new Map<string, Promise<void>>()

  function enqueueWrite(id: string, op: () => Promise<void>): Promise<void> {
    const version = generation
    const prev = writeChains.get(id) ?? Promise.resolve()
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

  /**
   * Writes several rows in one request while still queueing each behind its own id. The request
   * starts when the first chain reaches it and every other chain waits on that same request, so
   * a paste of twelve lines is one round trip, not twelve.
   */
  function enqueueBatch(snapshots: DayTodo[], ownerId: string): Promise<void> {
    let request: Promise<void> | null = null
    const send = (): Promise<void> => (request ??= upsertDayTodos(snapshots, ownerId))
    return Promise.all(snapshots.map((s) => enqueueWrite(s.id, send))).then(() => {})
  }

  function rejectUnsyncedWrite(retry: () => void): void {
    notifySyncError('尚未完成同步，請稍後再試', retry)
  }

  function replace(next: DayTodo): void {
    todos.value = todos.value.map((t) => (t.id === next.id ? next : t))
  }

  // --- reads ----------------------------------------------------------------

  function todosFor(date: string): DayTodo[] {
    return todosOn(todos.value, date)
  }

  // --- lifecycle ------------------------------------------------------------

  /**
   * Loads every todo this user has. Must never reject: auth-data-sync-core awaits it inside a
   * Promise.all whose caller is `void`-invoked. Every failure path notifies and resolves.
   */
  async function loadFromRemote(): Promise<void> {
    const ownerId = useAuthStore().user?.id
    if (!ownerId) return

    generation += 1
    const version = generation
    syncUserId = ownerId

    try {
      const remote = await fetchDayTodos(ownerId)
      if (version !== generation) return
      todos.value = remote
      isLoaded.value = true
    } catch {
      if (version !== generation) return
      // Notified rather than swallowed: an empty list is indistinguishable from a lost one.
      notifySyncError('載入失敗', () => {
        void loadFromRemote()
      })
    }
  }

  function resetLocal(): void {
    generation += 1
    todos.value = []
    isLoaded.value = false
    syncUserId = null
    scheduleSourceId.value = null
    writeChains.clear()
  }

  // --- actions --------------------------------------------------------------

  /**
   * Adds every non-blank line of `text` to `date`'s list, in order. Returns how many were added
   * so the composer knows whether to clear itself.
   */
  function addLines(date: string, text: string): number {
    const titles = splitTodoLines(text)
    if (titles.length === 0) return 0

    const ownerId = syncUserId
    if (ownerId === null || !isLoaded.value) {
      rejectUnsyncedWrite(() => addLines(date, text))
      return 0
    }

    const version = generation
    const first = nextPosition(todos.value, date)
    const created: DayTodo[] = titles.map((title, i) => ({
      id: crypto.randomUUID(),
      date,
      originDate: date,
      title,
      done: false,
      position: first + i
    }))
    todos.value = [...todos.value, ...created]

    void enqueueBatch(created, ownerId).catch(() => {
      if (version !== generation) return
      const ids = new Set(created.map((t) => t.id))
      todos.value = todos.value.filter((t) => !ids.has(t.id))
      notifySyncError('新增代辦失敗', () => addLines(date, text))
    })
    return created.length
  }

  function toggleDone(id: string): void {
    const current = todos.value.find((t) => t.id === id)
    if (!current) return
    const ownerId = syncUserId
    if (ownerId === null) {
      rejectUnsyncedWrite(() => toggleDone(id))
      return
    }

    const version = generation
    const next: DayTodo = { ...current, done: !current.done }
    replace(next)

    void enqueueWrite(id, () => upsertDayTodos([next], ownerId)).catch(() => {
      if (version !== generation) return
      replace(current)
      notifySyncError('更新代辦失敗', () => toggleDone(id))
    })
  }

  function rename(id: string, title: string): void {
    const current = todos.value.find((t) => t.id === id)
    if (!current) return
    const trimmed = title.trim()
    // Refusing keeps the previous title; clearing a title never deletes the row — that is ×.
    if (trimmed === '' || trimmed === current.title) return
    const ownerId = syncUserId
    if (ownerId === null) {
      rejectUnsyncedWrite(() => rename(id, title))
      return
    }

    const version = generation
    const next: DayTodo = { ...current, title: trimmed }
    replace(next)

    void enqueueWrite(id, () => upsertDayTodos([next], ownerId)).catch(() => {
      if (version !== generation) return
      replace(current)
      notifySyncError('更新代辦失敗', () => rename(id, title))
    })
  }

  function remove(id: string): void {
    const idx = todos.value.findIndex((t) => t.id === id)
    if (idx === -1) return
    if (syncUserId === null) {
      rejectUnsyncedWrite(() => remove(id))
      return
    }

    const version = generation
    const removed = todos.value[idx]!
    todos.value = todos.value.filter((t) => t.id !== id)

    void enqueueWrite(id, () => deleteDayTodo(id)).catch(() => {
      if (version !== generation) return
      // Restore at its original index so a failed delete does not reorder the list.
      const insertAt = Math.min(idx, todos.value.length)
      todos.value = [...todos.value.slice(0, insertAt), removed, ...todos.value.slice(insertAt)]
      notifySyncError('刪除代辦失敗', () => remove(id))
    })
  }

  /**
   * Re-dates every open todo from a day that is over onto `today` (utils/day-todos.ts carriedOver
   * for which ones and in what order). Runs on its own, not from a tap, so it is silently a
   * no-op before the first load rather than raising a "not synced" toast nobody asked for.
   *
   * Safe to call as often as the caller likes: once moved, nothing is before today any more.
   * Two devices running it on the same morning write the same date onto the same rows.
   */
  function carryOver(today: string): number {
    const ownerId = syncUserId
    if (ownerId === null || !isLoaded.value) return 0

    const moved = carriedOver(todos.value, today)
    if (moved.length === 0) return 0

    const version = generation
    const before = new Map(moved.map((t) => [t.id, todos.value.find((x) => x.id === t.id)!]))
    const after = new Map(moved.map((t) => [t.id, t]))
    todos.value = todos.value.map((t) => after.get(t.id) ?? t)

    void enqueueBatch(moved, ownerId).catch(() => {
      if (version !== generation) return
      // Put them back where they were. The next foreground runs this again, so a failed carry
      // costs a retry, never a todo.
      todos.value = todos.value.map((t) => before.get(t.id) ?? t)
    })
    return moved.length
  }

  // --- scheduling into a task -----------------------------------------------
  // Swiping a todo opens the task composer seeded from it. The todo is removed only when that
  // task is actually saved; cancelling the composer leaves the list as it was. Same shape as
  // inbox-store's promotion, which hands an inbox draft to the same composer.

  // Not returned: a non-null value exists exactly while a schedule-initiated composer is open.
  const scheduleSourceId = ref<string | null>(null)

  function beginSchedule(id: string): DayTodo | undefined {
    const todo = todos.value.find((t) => t.id === id)
    if (!todo) return undefined
    scheduleSourceId.value = id
    return todo
  }

  function completeSchedule(): void {
    const id = scheduleSourceId.value
    if (id === null) return
    scheduleSourceId.value = null
    remove(id)
  }

  function cancelSchedule(): void {
    scheduleSourceId.value = null
  }

  return {
    todos,
    isLoaded,
    todosFor,
    loadFromRemote,
    resetLocal,
    addLines,
    toggleDone,
    rename,
    remove,
    carryOver,
    beginSchedule,
    completeSchedule,
    cancelSchedule
  }
})
