import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useTasksStore, mkTask } from './tasks-store'
import * as eventsService from '@/services/events-service'
import * as subtasksService from '@/services/subtasks-service'
import { notifySyncError } from '@/lib/notify'
import type { Task } from '@/types/task'

vi.mock('@/services/events-service', () => ({
  fetchTasks: vi.fn(),
  upsertTask: vi.fn(),
  insertTasks: vi.fn(),
  deleteTask: vi.fn()
}))
vi.mock('@/services/subtasks-service', () => ({
  fetchSubtasks: vi.fn(),
  upsertSubtask: vi.fn(),
  deleteSubtask: vi.fn()
}))
vi.mock('@/lib/notify', () => ({
  notifySyncError: vi.fn()
}))

const fetchTasksMock = vi.mocked(eventsService.fetchTasks)
const upsertTaskMock = vi.mocked(eventsService.upsertTask)
const insertTasksMock = vi.mocked(eventsService.insertTasks)
const deleteTaskMock = vi.mocked(eventsService.deleteTask)
const fetchSubtasksMock = vi.mocked(subtasksService.fetchSubtasks)
const upsertSubtaskMock = vi.mocked(subtasksService.upsertSubtask)
const deleteSubtaskMock = vi.mocked(subtasksService.deleteSubtask)
const notifySyncErrorMock = vi.mocked(notifySyncError)

const DEFAULT_CALENDAR_UUID = 'cal-uuid-1'

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

// Signs the store in against the mocked services and clears the fetch call
// made by the initial load, so tests only observe their own service traffic.
async function signedInStore() {
  const store = useTasksStore()
  await store.loadFromRemote('user-1', DEFAULT_CALENDAR_UUID, [DEFAULT_CALENDAR_UUID])
  fetchTasksMock.mockClear()
  return store
}

describe('tasks-store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
    fetchTasksMock.mockResolvedValue([])
    upsertTaskMock.mockResolvedValue(undefined)
    insertTasksMock.mockResolvedValue(undefined)
    deleteTaskMock.mockResolvedValue(undefined)
    fetchSubtasksMock.mockResolvedValue([])
    upsertSubtaskMock.mockResolvedValue(undefined)
    deleteSubtaskMock.mockResolvedValue(undefined)
  })

  describe('mkTask default pomodoro estimate', () => {
    // focus-subtasks spec "A new slot-to-pomodoro function supplies the default for newly
    // created events only": a fresh task's estimate must be achievable within its slot.
    // The old count ignored breaks, so a 2-hour slot was seeded with 5 — 145 minutes of work
    // in a 120-minute block, an overrun guaranteed before the user starts.
    it('seeds a two-hour slot with a count that fits', () => {
      expect(mkTask({ date: '2026-08-02', start: '10:00', end: '12:00', calendarId: DEFAULT_CALENDAR_UUID }).estimatedPomodoros).toBe(4)
    })

    it('seeds a one-hour slot with two', () => {
      expect(mkTask({ date: '2026-08-02', start: '10:00', end: '11:00', calendarId: DEFAULT_CALENDAR_UUID }).estimatedPomodoros).toBe(2)
    })

    it('seeds an all-day task with one', () => {
      expect(mkTask({ date: '2026-08-02', allDay: true, start: '', end: '', calendarId: DEFAULT_CALENDAR_UUID }).estimatedPomodoros).toBe(1)
    })

    // An explicit override still wins: the derived count is only a default.
    it('lets an explicit estimate override the derived default', () => {
      expect(
        mkTask({ date: '2026-08-02', start: '10:00', end: '12:00', estimatedPomodoros: 7, calendarId: DEFAULT_CALENDAR_UUID }).estimatedPomodoros
      ).toBe(7)
    })
  })

  describe('copyToDays', () => {
    it('copies to every date even when the slot conflicts with an existing task', async () => {
      const store = await signedInStore()
      const existing = mkTask({ date: '2026-07-11', start: '14:30', end: '15:30', calendarId: DEFAULT_CALENDAR_UUID })
      store.tasks.push(existing)

      const source = mkTask({ date: '2026-07-10', start: '14:00', end: '15:00', calendarId: DEFAULT_CALENDAR_UUID })
      const created = store.copyToDays(source, ['2026-07-11', '2026-07-12', '2026-07-13'])

      expect(created).toHaveLength(3)
      expect(created.map((t) => t.date).sort()).toEqual(['2026-07-11', '2026-07-12', '2026-07-13'])
      // existing (1) + three newly created tasks
      expect(store.tasks).toHaveLength(4)
    })

    it('creates a task on every date when none conflict', async () => {
      const store = await signedInStore()
      const source = mkTask({ date: '2026-07-10', start: '14:00', end: '15:00', calendarId: DEFAULT_CALENDAR_UUID })
      const created = store.copyToDays(source, ['2026-07-11', '2026-07-12'])

      expect(created).toHaveLength(2)
      expect(store.tasks).toHaveLength(2)
    })

    it('resets completion state on copied tasks while preserving task details', async () => {
      const store = await signedInStore()
      const source = mkTask({
        date: '2026-07-10',
        calendarId: DEFAULT_CALENDAR_UUID,
        title: 'Review notes',
        start: '14:00',
        end: '15:00',
        done: true,
        completedPomodoros: 2,
        estimatedPomodoros: 3,
        backgroundColor: '#c8a2c8',
        icon: 'star',
        important: true,
        urgent: true,
        notes: 'Keep this note'
      })

      const created = store.copyToDays(source, ['2026-07-11'])

      expect(created[0]).toMatchObject({
        title: 'Review notes',
        date: '2026-07-11',
        start: '14:00',
        end: '15:00',
        done: false,
        completedPomodoros: 0,
        estimatedPomodoros: 3,
        backgroundColor: '#c8a2c8',
        icon: 'star',
        important: true,
        urgent: true,
        notes: 'Keep this note'
      })
      expect(created[0]!.id).not.toBe(source.id)
    })
  })

  describe('incrementCompletedPomodoros', () => {
    it('increases the count by exactly one after the server write succeeds', async () => {
      const store = await signedInStore()
      const task = mkTask({ date: '2026-07-10', calendarId: DEFAULT_CALENDAR_UUID })
      store.tasks.push(task)

      store.incrementCompletedPomodoros(task.id)

      expect(store.tasks[0]!.completedPomodoros).toBe(1)
    })

    // focus-subtasks spec "The estimate ceases to be an upper bound": a user in flow at the
    // estimate can record a further pomodoro. Previously this silently did nothing — the
    // Math.min meant the button worked but the count never moved.
    it('increases past the estimated pomodoro count', async () => {
      const store = await signedInStore()
      const task = mkTask({
        date: '2026-07-10',
        calendarId: DEFAULT_CALENDAR_UUID,
        start: '14:00',
        end: '15:00',
        estimatedPomodoros: 2,
        completedPomodoros: 2
      })
      store.tasks.push(task)

      store.incrementCompletedPomodoros(task.id)

      expect(store.tasks[0]!.completedPomodoros).toBe(3)
    })

    it('keeps counting when the estimate is zero', async () => {
      const store = await signedInStore()
      const task = mkTask({
        date: '2026-07-10',
        calendarId: DEFAULT_CALENDAR_UUID,
        start: '14:00',
        end: '15:00',
        estimatedPomodoros: 0,
        completedPomodoros: 3
      })
      store.tasks.push(task)

      store.incrementCompletedPomodoros(task.id)

      expect(store.tasks[0]!.completedPomodoros).toBe(4)
    })
  })

  describe('saveTask', () => {
    it('saves successfully even when the time overlaps an existing task', async () => {
      const store = await signedInStore()
      const existing = mkTask({ date: '2026-07-10', start: '14:00', end: '15:00', calendarId: DEFAULT_CALENDAR_UUID })
      store.tasks.push(existing)

      const incoming = mkTask({ date: '2026-07-10', start: '14:30', end: '15:30', calendarId: DEFAULT_CALENDAR_UUID })
      store.saveTask(incoming)

      expect(store.tasks).toHaveLength(2)
      expect(store.tasks.map((t) => t.id)).toContain(incoming.id)
    })

    it('updates an existing task in place when saving by the same id', async () => {
      const store = await signedInStore()
      const task = mkTask({ date: '2026-07-10', calendarId: DEFAULT_CALENDAR_UUID, title: 'Original' })
      store.tasks.push(task)

      store.saveTask({ ...task, title: 'Updated' })

      expect(store.tasks).toHaveLength(1)
      expect(store.tasks[0]!.title).toBe('Updated')
    })
  })

  describe('TimeTree-like optimistic writes', () => {
    it('updates store state immediately while the server write is pending', async () => {
      const store = await signedInStore()
      const pending = deferred<void>()
      upsertTaskMock.mockReturnValueOnce(pending.promise)

      const task = mkTask({ date: '2026-07-10', calendarId: DEFAULT_CALENDAR_UUID, start: '09:00', end: '10:00', title: 'Smooth' })
      store.saveTask(task)
      await flush()

      expect(store.isSaving).toBe(true)
      expect(store.tasks).toHaveLength(1)
      expect(store.tasks[0]!.title).toBe('Smooth')
      expect(store.syncStatusByTaskId[task.id]).toBe('pending')

      pending.resolve(undefined)
      await flush()
      expect(upsertTaskMock).toHaveBeenCalledTimes(1)
      expect(store.isSaving).toBe(false)
      expect(store.syncStatusByTaskId[task.id]).toBeUndefined()
    })

    it('rejects writes before loadFromRemote has run', async () => {
      const store = useTasksStore()
      const task = mkTask({ date: '2026-07-10', calendarId: DEFAULT_CALENDAR_UUID, start: '09:00', end: '10:00' })

      store.saveTask(task)
      store.toggleDone(task.id)
      store.incrementCompletedPomodoros(task.id)
      expect(store.copyToDays(task, ['2026-07-11'])).toEqual([])
      store.deleteTask(task.id)
      await flush()

      expect(store.tasks).toEqual([])
      expect(upsertTaskMock).not.toHaveBeenCalled()
      expect(insertTasksMock).not.toHaveBeenCalled()
      expect(deleteTaskMock).not.toHaveBeenCalled()
      expect(notifySyncErrorMock).toHaveBeenCalledTimes(3)
      expect(notifySyncErrorMock.mock.calls.every(([message]) => message === '尚未完成同步，請稍後再試')).toBe(true)
    })

    it('removes locally first and restores the task when the server delete fails', async () => {
      const store = await signedInStore()
      deleteTaskMock.mockRejectedValueOnce(new Error('offline'))

      const task = mkTask({ date: '2026-07-10', calendarId: DEFAULT_CALENDAR_UUID, start: '09:00', end: '10:00' })
      store.tasks.push(task)

      store.deleteTask(task.id)
      expect(store.tasks).toEqual([])
      expect(store.syncStatusByTaskId[task.id]).toBe('pending')
      await flush()

      expect(deleteTaskMock).toHaveBeenCalledWith(task.id)
      expect(store.tasks).toEqual([task])
      expect(store.syncStatusByTaskId[task.id]).toBe('failed')
      expect(notifySyncErrorMock.mock.calls[0]![0]).toBe('刪除失敗')
    })

    it('keeps copied tasks visible and marks them failed when the server insert fails', async () => {
      const store = await signedInStore()
      insertTasksMock.mockRejectedValueOnce(new Error('offline'))

      const source = mkTask({ date: '2026-07-10', calendarId: DEFAULT_CALENDAR_UUID, start: '09:00', end: '10:00' })
      const created = store.copyToDays(source, ['2026-07-11', '2026-07-12'])
      expect(store.tasks).toEqual(created)
      expect(created.every((task) => store.syncStatusByTaskId[task.id] === 'pending')).toBe(true)
      await flush()

      expect(insertTasksMock).toHaveBeenCalledTimes(1)
      expect(store.tasks).toEqual(created)
      expect(created.every((task) => store.syncStatusByTaskId[task.id] === 'failed')).toBe(true)
      expect(notifySyncErrorMock.mock.calls[0]![0]).toBe('複製失敗')
    })
  })

  describe('write failures', () => {
    it('notifies with a retry action when a write fails', async () => {
      const store = await signedInStore()
      upsertTaskMock.mockRejectedValueOnce(new Error('offline'))

      const task = mkTask({ date: '2026-07-10', calendarId: DEFAULT_CALENDAR_UUID, start: '09:00', end: '10:00' })
      store.saveTask(task)
      await flush()

      expect(notifySyncErrorMock).toHaveBeenCalledTimes(1)
      expect(notifySyncErrorMock.mock.calls[0]![0]).toBe('儲存失敗')
      expect(notifySyncErrorMock.mock.calls[0]![1]).toBeTypeOf('function')
      expect(store.syncStatusByTaskId[task.id]).toBe('failed')
    })

    it('resubmits the same snapshot when the retry action runs', async () => {
      const store = await signedInStore()
      upsertTaskMock.mockRejectedValueOnce(new Error('offline'))

      const task = mkTask({ date: '2026-07-10', calendarId: DEFAULT_CALENDAR_UUID, start: '09:00', end: '10:00', title: 'Retry me' })
      store.saveTask(task)
      await flush()
      expect(upsertTaskMock).toHaveBeenCalledTimes(1)

      const retry = notifySyncErrorMock.mock.calls[0]![1]
      retry()
      await flush()

      expect(upsertTaskMock).toHaveBeenCalledTimes(2)
      expect(upsertTaskMock.mock.calls[1]![0]).toEqual(upsertTaskMock.mock.calls[0]![0])
    })
  })

  describe('per-task write serialization', () => {
    it('holds the second write for the same task until the first settles, preserving order', async () => {
      const store = await signedInStore()
      const first = deferred<void>()
      const second = deferred<void>()
      upsertTaskMock.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)

      const task = mkTask({ date: '2026-07-10', calendarId: DEFAULT_CALENDAR_UUID, start: '09:00', end: '10:00', title: 'A' })
      store.saveTask(task)
      store.saveTask({ ...task, title: 'AB' })
      await flush()

      // The second write is queued behind the first, not sent in parallel.
      expect(upsertTaskMock).toHaveBeenCalledTimes(1)
      expect(upsertTaskMock.mock.calls[0]![0]).toMatchObject({ title: 'A' })

      first.resolve(undefined)
      await flush()

      // Only after the first settles does the second write go out — in order.
      expect(upsertTaskMock).toHaveBeenCalledTimes(2)
      expect(upsertTaskMock.mock.calls[1]![0]).toMatchObject({ title: 'AB' })

      second.resolve(undefined)
      await flush()
      expect(store.syncStatusByTaskId[task.id]).toBeUndefined()
    })

    it('never lets an earlier edit overtake a later one (no out-of-order overwrite)', async () => {
      const store = await signedInStore()
      const first = deferred<void>()
      upsertTaskMock.mockReturnValueOnce(first.promise).mockResolvedValue(undefined)

      const task = mkTask({ date: '2026-07-10', calendarId: DEFAULT_CALENDAR_UUID, start: '09:00', end: '10:00', title: 'A' })
      store.saveTask(task)
      store.saveTask({ ...task, title: 'AB' })
      store.saveTask({ ...task, title: 'ABC' })
      await flush()

      // Serialized: only the first is in flight, the rest wait their turn.
      expect(upsertTaskMock).toHaveBeenCalledTimes(1)

      first.resolve(undefined)
      await flush()

      // Writes reach the service in exactly the order they were issued; the last
      // one written is the last edit, so the newest value can never be clobbered.
      expect(upsertTaskMock).toHaveBeenCalledTimes(3)
      expect(upsertTaskMock.mock.calls.map((c) => c[0].title)).toEqual(['A', 'AB', 'ABC'])
    })

    it('queues a delete behind an in-flight upsert so the task is not resurrected', async () => {
      const store = await signedInStore()
      const upsert = deferred<void>()
      upsertTaskMock.mockReturnValueOnce(upsert.promise)

      const task = mkTask({ date: '2026-07-10', calendarId: DEFAULT_CALENDAR_UUID, start: '09:00', end: '10:00' })
      store.saveTask(task)
      store.deleteTask(task.id)
      await flush()

      // The delete must wait for the upsert; if it fired now, an out-of-order
      // upsert could land after it and resurrect the row.
      expect(upsertTaskMock).toHaveBeenCalledTimes(1)
      expect(deleteTaskMock).not.toHaveBeenCalled()

      upsert.resolve(undefined)
      await flush()

      // Delete lands last — DB ends in the deleted state.
      expect(deleteTaskMock).toHaveBeenCalledTimes(1)
      expect(deleteTaskMock).toHaveBeenCalledWith(task.id)
    })

    it('discards a queued write for the same id after resetLocal (no stale write leaks past logout)', async () => {
      const store = await signedInStore()
      const first = deferred<void>()
      upsertTaskMock.mockReturnValueOnce(first.promise)

      const task = mkTask({ date: '2026-07-10', calendarId: DEFAULT_CALENDAR_UUID, start: '09:00', end: '10:00', title: 'A' })
      store.saveTask(task)
      store.saveTask({ ...task, title: 'AB' })
      await flush()
      // First write is in flight; the second is queued behind it.
      expect(upsertTaskMock).toHaveBeenCalledTimes(1)

      // Account switch / logout while a same-id write is still queued.
      store.resetLocal()
      first.resolve(undefined)
      await flush()

      // The queued write must NOT reach the service after reset — its session is stale.
      expect(upsertTaskMock).toHaveBeenCalledTimes(1)
    })

    it('keeps draining the queue for a task after one write fails', async () => {
      const store = await signedInStore()
      upsertTaskMock.mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined)

      const task = mkTask({ date: '2026-07-10', calendarId: DEFAULT_CALENDAR_UUID, start: '09:00', end: '10:00', title: 'A' })
      store.saveTask(task)
      store.saveTask({ ...task, title: 'AB' })
      await flush()

      // A failed write does not wedge the chain; the next write for the same id runs.
      expect(upsertTaskMock).toHaveBeenCalledTimes(2)
      expect(upsertTaskMock.mock.calls[1]![0]).toMatchObject({ title: 'AB' })
    })
  })

  describe('loadFromRemote / resetLocal', () => {
    it('fetches tasks with the given owner and default calendar id, then ends loading', async () => {
      const serverTasks: Task[] = [
        mkTask({ date: '2026-07-10', calendarId: DEFAULT_CALENDAR_UUID, start: '09:00', end: '10:00', title: 'loaded' })
      ]
      fetchTasksMock.mockImplementation(async (ctx) => {
        expect(ctx).toEqual({ ownerId: 'user-1', remoteDefaultCalendarId: DEFAULT_CALENDAR_UUID })
        return serverTasks
      })

      const store = useTasksStore()
      expect(store.isLoading).toBe(true)
      await store.loadFromRemote('user-1', DEFAULT_CALENDAR_UUID, [DEFAULT_CALENDAR_UUID])

      expect(fetchTasksMock).toHaveBeenCalledTimes(1)
      expect(store.tasks).toEqual(serverTasks)
      expect(store.isLoading).toBe(false)
    })

    it('notifies with a retry action and ends loading when the load fails', async () => {
      fetchTasksMock.mockRejectedValueOnce(new Error('offline'))

      const store = useTasksStore()
      await store.loadFromRemote('user-1', DEFAULT_CALENDAR_UUID, [DEFAULT_CALENDAR_UUID])

      expect(notifySyncErrorMock).toHaveBeenCalledTimes(1)
      expect(notifySyncErrorMock.mock.calls[0]![0]).toBe('載入失敗')
      expect(store.isLoading).toBe(false)

      // The retry action performs the load again.
      const retry = notifySyncErrorMock.mock.calls[0]![1]
      retry()
      await flush()
      expect(fetchTasksMock).toHaveBeenCalledTimes(2)
    })

    it('discards an in-flight fetch that resolves after resetLocal', async () => {
      const pendingFetch = deferred<Task[]>()
      fetchTasksMock.mockReturnValueOnce(pendingFetch.promise)

      const store = useTasksStore()
      const load = store.loadFromRemote('user-1', DEFAULT_CALENDAR_UUID, [DEFAULT_CALENDAR_UUID])
      await flush()

      store.resetLocal()
      pendingFetch.resolve([mkTask({ date: '2026-07-10', calendarId: DEFAULT_CALENDAR_UUID, start: '09:00', end: '10:00', title: 'stale' })])
      await load

      expect(store.tasks).toEqual([])
      expect(store.isLoading).toBe(true)
    })

    it('clears tasks and stops syncing after resetLocal', async () => {
      const store = await signedInStore()
      store.saveTask(mkTask({ date: '2026-07-10', calendarId: DEFAULT_CALENDAR_UUID, start: '09:00', end: '10:00' }))
      await flush()
      upsertTaskMock.mockClear()
      notifySyncErrorMock.mockClear()

      store.resetLocal()
      expect(store.tasks).toEqual([])

      store.saveTask(mkTask({ date: '2026-07-10', calendarId: DEFAULT_CALENDAR_UUID, start: '09:00', end: '10:00' }))
      await flush()
      expect(upsertTaskMock).not.toHaveBeenCalled()
      expect(notifySyncErrorMock.mock.calls[0]![0]).toBe('尚未完成同步，請稍後再試')
    })
  })

  // focus-subtasks spec: subtasks are a checklist on the parent timebox — a title, a done
  // flag and a parent, mutated through the same optimistic-write path as the task itself.
  describe('subtasks', () => {
    async function storeWithTask(): Promise<{ store: ReturnType<typeof useTasksStore>; task: Task }> {
      const store = await signedInStore()
      const task = mkTask({ date: '2026-07-10', calendarId: DEFAULT_CALENDAR_UUID, start: '09:00', end: '10:00' })
      store.saveTask(task)
      await flush()
      upsertTaskMock.mockClear()
      return { store, task }
    }

    describe('adding', () => {
      it('shows a new subtask immediately, before the write settles', async () => {
        const { store, task } = await storeWithTask()
        const pending = deferred<void>()
        upsertSubtaskMock.mockReturnValue(pending.promise)

        store.addSubtask(task.id, 'Read chapter three')

        expect(store.subtasksFor(task.id).map((s) => s.title)).toEqual(['Read chapter three'])
        pending.resolve()
        await flush()
      })

      it('keeps insertion order rather than reordering, so the list does not move under the finger', async () => {
        const { store, task } = await storeWithTask()

        store.addSubtask(task.id, 'first')
        store.addSubtask(task.id, 'second')
        store.addSubtask(task.id, 'third')
        await flush()

        expect(store.subtasksFor(task.id).map((s) => s.title)).toEqual(['first', 'second', 'third'])
      })

      it('refuses a whitespace-only title, since the title is the only thing identifying a row', async () => {
        const { store, task } = await storeWithTask()

        store.addSubtask(task.id, '   ')
        await flush()

        expect(store.subtasksFor(task.id)).toEqual([])
        expect(upsertSubtaskMock).not.toHaveBeenCalled()
      })

      it('trims the stored title so leading and trailing space never reaches the database', async () => {
        const { store, task } = await storeWithTask()

        store.addSubtask(task.id, '  Take notes  ')
        await flush()

        expect(store.subtasksFor(task.id)[0]!.title).toBe('Take notes')
      })

      // A subtask is a dependent row reached only through its parent; issuing an insert
      // against a parent that does not exist locally would write an orphan.
      it('refuses to add against a parent the store does not hold', async () => {
        const store = await signedInStore()

        store.addSubtask('no-such-task', 'orphan')
        await flush()

        expect(upsertSubtaskMock).not.toHaveBeenCalled()
      })
    })

    // focus-subtasks spec: "viewing an event shared by someone else, I want the same read-only
    // treatment subtasks that the rest of the card already has". RLS rejects these writes
    // server-side, so without a local guard the optimistic update flips, the write fails and
    // the value silently reverts — the exact failure the spec warns about.
    describe('a shared event owned by someone else', () => {
      async function storeWithForeignTask() {
        const store = await signedInStore()
        const task: Task = {
          ...mkTask({ date: '2026-07-10', calendarId: DEFAULT_CALENDAR_UUID, start: '09:00', end: '10:00' }),
          ownerId: 'someone-else'
        }
        store.saveTask(task)
        await flush()
        upsertSubtaskMock.mockClear()
        return { store, task }
      }

      it('refuses to add a subtask', async () => {
        const { store, task } = await storeWithForeignTask()

        store.addSubtask(task.id, 'not mine')
        await flush()

        expect(store.subtasksFor(task.id)).toEqual([])
        expect(upsertSubtaskMock).not.toHaveBeenCalled()
      })

      it('refuses to toggle, rename or delete an existing subtask', async () => {
        const { store, task } = await storeWithForeignTask()
        // Seeded as though it arrived from the remote load, which is the only way a foreign
        // event's subtasks reach the store.
        store.subtasks = [{ id: 'sub-1', parentId: task.id, title: 'theirs', done: false, position: 0 }]

        store.toggleSubtaskDone('sub-1')
        store.renameSubtask('sub-1', 'mine now')
        store.deleteSubtask('sub-1')
        await flush()

        expect(store.subtasksFor(task.id)).toEqual([
          { id: 'sub-1', parentId: task.id, title: 'theirs', done: false, position: 0 }
        ])
        expect(upsertSubtaskMock).not.toHaveBeenCalled()
        expect(deleteSubtaskMock).not.toHaveBeenCalled()
      })

      it('rolls the subtask back out of the list when the write fails', async () => {
        const { store, task } = await storeWithTask()
        upsertSubtaskMock.mockRejectedValue(new Error('offline'))

        store.addSubtask(task.id, 'doomed')
        await flush()

        expect(store.subtasksFor(task.id)).toEqual([])
        expect(notifySyncErrorMock).toHaveBeenCalled()
      })
    })

    describe('toggling done', () => {
      it('flips done optimistically and persists the new value', async () => {
        const { store, task } = await storeWithTask()
        store.addSubtask(task.id, 'Read chapter three')
        await flush()
        upsertSubtaskMock.mockClear()
        const id = store.subtasksFor(task.id)[0]!.id

        store.toggleSubtaskDone(id)

        expect(store.subtasksFor(task.id)[0]!.done).toBe(true)
        await flush()
        expect(upsertSubtaskMock.mock.calls[0]![0]).toMatchObject({ id, done: true })
      })

      // Checking settles an item, but the checkbox itself always stays live: uncheck,
      // correct, re-check is the only path back and it must never be a dead end.
      it('unchecks a checked subtask', async () => {
        const { store, task } = await storeWithTask()
        store.addSubtask(task.id, 'Read chapter three')
        await flush()
        const id = store.subtasksFor(task.id)[0]!.id
        store.toggleSubtaskDone(id)
        await flush()

        store.toggleSubtaskDone(id)
        await flush()

        expect(store.subtasksFor(task.id)[0]!.done).toBe(false)
      })

      it('leaves completed subtasks in place rather than reordering them', async () => {
        const { store, task } = await storeWithTask()
        store.addSubtask(task.id, 'first')
        store.addSubtask(task.id, 'second')
        store.addSubtask(task.id, 'third')
        await flush()
        const first = store.subtasksFor(task.id)[0]!.id

        store.toggleSubtaskDone(first)
        await flush()

        expect(store.subtasksFor(task.id).map((s) => s.title)).toEqual(['first', 'second', 'third'])
      })

      it('restores the previous done value when the write fails', async () => {
        const { store, task } = await storeWithTask()
        store.addSubtask(task.id, 'Read chapter three')
        await flush()
        const id = store.subtasksFor(task.id)[0]!.id
        upsertSubtaskMock.mockRejectedValue(new Error('offline'))

        store.toggleSubtaskDone(id)
        await flush()

        expect(store.subtasksFor(task.id)[0]!.done).toBe(false)
        expect(notifySyncErrorMock).toHaveBeenCalled()
      })
    })

    describe('renaming', () => {
      it('renames in place, keeping the row identity and its done state', async () => {
        const { store, task } = await storeWithTask()
        store.addSubtask(task.id, 'Reed chapter three')
        await flush()
        const id = store.subtasksFor(task.id)[0]!.id

        store.renameSubtask(id, 'Read chapter three')
        await flush()

        expect(store.subtasksFor(task.id)[0]).toMatchObject({ id, title: 'Read chapter three', done: false })
      })

      // Refusing means keeping the previous title, not deleting the row: a nameless row
      // could not be told apart from its neighbours.
      it('refuses an empty rename and keeps the previous title', async () => {
        const { store, task } = await storeWithTask()
        store.addSubtask(task.id, 'Read chapter three')
        await flush()
        const id = store.subtasksFor(task.id)[0]!.id
        upsertSubtaskMock.mockClear()

        store.renameSubtask(id, '   ')
        await flush()

        expect(store.subtasksFor(task.id)[0]!.title).toBe('Read chapter three')
        expect(upsertSubtaskMock).not.toHaveBeenCalled()
      })

      // The strike-through has to be an honest signal rather than decoration: struck text
      // is not editable text.
      it('refuses to rename a checked subtask', async () => {
        const { store, task } = await storeWithTask()
        store.addSubtask(task.id, 'Read chapter three')
        await flush()
        const id = store.subtasksFor(task.id)[0]!.id
        store.toggleSubtaskDone(id)
        await flush()
        upsertSubtaskMock.mockClear()

        store.renameSubtask(id, 'Something else')
        await flush()

        expect(store.subtasksFor(task.id)[0]!.title).toBe('Read chapter three')
        expect(upsertSubtaskMock).not.toHaveBeenCalled()
      })

      it('permits the rename again once the subtask is unchecked', async () => {
        const { store, task } = await storeWithTask()
        store.addSubtask(task.id, 'Read chapter three')
        await flush()
        const id = store.subtasksFor(task.id)[0]!.id
        store.toggleSubtaskDone(id)
        await flush()
        store.toggleSubtaskDone(id)
        await flush()

        store.renameSubtask(id, 'Read chapter four')
        await flush()

        expect(store.subtasksFor(task.id)[0]!.title).toBe('Read chapter four')
      })

      it('restores the previous title when the write fails', async () => {
        const { store, task } = await storeWithTask()
        store.addSubtask(task.id, 'Read chapter three')
        await flush()
        const id = store.subtasksFor(task.id)[0]!.id
        upsertSubtaskMock.mockRejectedValue(new Error('offline'))

        store.renameSubtask(id, 'Read chapter four')
        await flush()

        expect(store.subtasksFor(task.id)[0]!.title).toBe('Read chapter three')
        expect(notifySyncErrorMock).toHaveBeenCalled()
      })
    })

    describe('deleting', () => {
      it('removes the subtask immediately and persists the delete', async () => {
        const { store, task } = await storeWithTask()
        store.addSubtask(task.id, 'Read chapter three')
        await flush()
        const id = store.subtasksFor(task.id)[0]!.id

        store.deleteSubtask(id)

        expect(store.subtasksFor(task.id)).toEqual([])
        await flush()
        expect(deleteSubtaskMock).toHaveBeenCalledWith(id)
      })

      it('puts the subtask back in its original position when the delete fails', async () => {
        const { store, task } = await storeWithTask()
        store.addSubtask(task.id, 'first')
        store.addSubtask(task.id, 'second')
        store.addSubtask(task.id, 'third')
        await flush()
        const second = store.subtasksFor(task.id)[1]!.id
        deleteSubtaskMock.mockRejectedValue(new Error('offline'))

        store.deleteSubtask(second)
        await flush()

        expect(store.subtasksFor(task.id).map((s) => s.title)).toEqual(['first', 'second', 'third'])
        expect(notifySyncErrorMock).toHaveBeenCalled()
      })
    })

    // The database cascades on the parent reference; the local mirror has to match, or a
    // deleted event's checklist would linger in memory until the next full load.
    it("drops a parent's subtasks when the parent is deleted", async () => {
      const { store, task } = await storeWithTask()
      store.addSubtask(task.id, 'Read chapter three')
      await flush()

      store.deleteTask(task.id)
      await flush()

      expect(store.subtasksFor(task.id)).toEqual([])
    })

    it('loads subtasks alongside tasks on sign-in', async () => {
      const task = mkTask({ date: '2026-07-10', calendarId: DEFAULT_CALENDAR_UUID, start: '09:00', end: '10:00' })
      fetchTasksMock.mockResolvedValue([task])
      fetchSubtasksMock.mockResolvedValue([
        { id: 'sub-1', parentId: task.id, title: 'Read chapter three', done: false, position: 0 }
      ])
      const store = useTasksStore()

      await store.loadFromRemote('user-1', DEFAULT_CALENDAR_UUID, [DEFAULT_CALENDAR_UUID])

      expect(store.subtasksFor(task.id).map((s) => s.title)).toEqual(['Read chapter three'])
    })

    it('clears subtasks on resetLocal so they do not survive a sign-out', async () => {
      const { store, task } = await storeWithTask()
      store.addSubtask(task.id, 'Read chapter three')
      await flush()

      store.resetLocal()

      expect(store.subtasksFor(task.id)).toEqual([])
    })
  })
})
