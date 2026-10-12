import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useDayTodosStore } from './day-todos-store'
import * as service from '@/services/day-todos-service'
import { notifySyncError } from '@/lib/notify'
import type { DayTodo } from '@/types/day-todo'

vi.mock('@/services/day-todos-service', () => ({
  fetchDayTodos: vi.fn(),
  upsertDayTodos: vi.fn(),
  deleteDayTodo: vi.fn()
}))
vi.mock('@/lib/notify', () => ({
  notifySyncError: vi.fn()
}))
vi.mock('./auth-store', () => ({
  useAuthStore: () => ({ user: { id: 'user-1' } })
}))

const fetchMock = vi.mocked(service.fetchDayTodos)
const upsertMock = vi.mocked(service.upsertDayTodos)
const deleteMock = vi.mocked(service.deleteDayTodo)
const notifyMock = vi.mocked(notifySyncError)

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

const todo = (over: Partial<DayTodo> & Pick<DayTodo, 'id' | 'date'>): DayTodo => ({
  originDate: over.date,
  title: `title ${over.id}`,
  done: false,
  position: 0,
  ...over
})

async function loadedStore(remote: DayTodo[] = []) {
  fetchMock.mockResolvedValue(remote)
  const store = useDayTodosStore()
  await store.loadFromRemote()
  return store
}

describe('day-todos-store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
    upsertMock.mockResolvedValue(undefined)
    deleteMock.mockResolvedValue(undefined)
  })

  describe('loading', () => {
    it('holds every todo the user has', async () => {
      const store = await loadedStore([todo({ id: 'a', date: '2026-10-12' })])
      expect(store.isLoaded).toBe(true)
      expect(store.todos.map((t) => t.id)).toEqual(['a'])
    })

    it('notifies and stays unloaded when the fetch fails, without rejecting', async () => {
      fetchMock.mockRejectedValue(new Error('offline'))
      const store = useDayTodosStore()
      await expect(store.loadFromRemote()).resolves.toBeUndefined()
      expect(store.isLoaded).toBe(false)
      expect(notifyMock).toHaveBeenCalledWith('載入失敗', expect.any(Function))
    })

    it('refuses writes before the first load', () => {
      const store = useDayTodosStore()
      expect(store.addLines('2026-10-12', 'a')).toBe(0)
      expect(store.todos).toEqual([])
      expect(upsertMock).not.toHaveBeenCalled()
    })
  })

  describe('addLines', () => {
    it('adds every non-blank line, in order, after what the day holds — in one request', async () => {
      const store = await loadedStore([todo({ id: 'old', date: '2026-10-12', position: 2 })])
      const added = store.addLines('2026-10-12', '練舞\n\n系統 demo 確認\n')
      await flush()

      expect(added).toBe(2)
      expect(store.todosFor('2026-10-12').map((t) => [t.title, t.position])).toEqual([
        ['title old', 2],
        ['練舞', 3],
        ['系統 demo 確認', 4]
      ])
      expect(upsertMock).toHaveBeenCalledTimes(1)
      expect(upsertMock.mock.calls[0]![0]).toHaveLength(2)
      expect(upsertMock.mock.calls[0]![1]).toBe('user-1')
    })

    it('writes a new todo with its own day as its origin', async () => {
      const store = await loadedStore()
      store.addLines('2026-10-14', 'ahead')
      expect(store.todos[0]).toMatchObject({ date: '2026-10-14', originDate: '2026-10-14', done: false })
    })

    it('adds nothing for blank input', async () => {
      const store = await loadedStore()
      expect(store.addLines('2026-10-12', '  \n ')).toBe(0)
      expect(upsertMock).not.toHaveBeenCalled()
    })

    it('rolls the rows back and offers a retry when the write fails', async () => {
      const store = await loadedStore()
      upsertMock.mockRejectedValueOnce(new Error('offline'))
      store.addLines('2026-10-12', 'a\nb')
      await flush()

      expect(store.todos).toEqual([])
      expect(notifyMock).toHaveBeenCalledWith('新增代辦失敗', expect.any(Function))
    })

    it('queues a tick behind the insert of the row it ticks', async () => {
      const store = await loadedStore()
      const insert = deferred<void>()
      upsertMock.mockReturnValueOnce(insert.promise)
      store.addLines('2026-10-12', 'a')
      const id = store.todos[0]!.id

      store.toggleDone(id)
      await flush()
      // The tick has not gone out: the insert it depends on is still in flight.
      expect(upsertMock).toHaveBeenCalledTimes(1)

      insert.resolve()
      await flush()
      expect(upsertMock).toHaveBeenCalledTimes(2)
      expect(upsertMock.mock.calls[1]![0]).toEqual([expect.objectContaining({ id, done: true })])
    })
  })

  describe('toggleDone / rename / remove', () => {
    it('ticks and unticks', async () => {
      const store = await loadedStore([todo({ id: 'a', date: '2026-10-12' })])
      store.toggleDone('a')
      expect(store.todos[0]!.done).toBe(true)
      store.toggleDone('a')
      expect(store.todos[0]!.done).toBe(false)
    })

    it('reverts a failed tick', async () => {
      const store = await loadedStore([todo({ id: 'a', date: '2026-10-12' })])
      upsertMock.mockRejectedValueOnce(new Error('offline'))
      store.toggleDone('a')
      await flush()
      expect(store.todos[0]!.done).toBe(false)
      expect(notifyMock).toHaveBeenCalledWith('更新代辦失敗', expect.any(Function))
    })

    it('renames to the trimmed title, and refuses a blank one', async () => {
      const store = await loadedStore([todo({ id: 'a', date: '2026-10-12', title: 'old' })])
      store.rename('a', '  new  ')
      expect(store.todos[0]!.title).toBe('new')
      store.rename('a', '   ')
      expect(store.todos[0]!.title).toBe('new')
      await flush()
      expect(upsertMock).toHaveBeenCalledTimes(1)
    })

    it('restores a failed delete at its original place', async () => {
      const store = await loadedStore([
        todo({ id: 'a', date: '2026-10-12', position: 0 }),
        todo({ id: 'b', date: '2026-10-12', position: 1 }),
        todo({ id: 'c', date: '2026-10-12', position: 2 })
      ])
      deleteMock.mockRejectedValueOnce(new Error('offline'))
      store.remove('b')
      expect(store.todos.map((t) => t.id)).toEqual(['a', 'c'])
      await flush()
      expect(store.todos.map((t) => t.id)).toEqual(['a', 'b', 'c'])
    })
  })

  describe('carryOver', () => {
    it('moves open todos from days that are over onto today, in one request', async () => {
      const store = await loadedStore([
        todo({ id: 'open', date: '2026-10-11' }),
        todo({ id: 'ticked', date: '2026-10-11', done: true }),
        todo({ id: 'ahead', date: '2026-10-14' })
      ])
      const moved = store.carryOver('2026-10-12')
      await flush()

      expect(moved).toBe(1)
      expect(store.todosFor('2026-10-12').map((t) => t.id)).toEqual(['open'])
      expect(store.todosFor('2026-10-11').map((t) => t.id)).toEqual(['ticked'])
      expect(store.todos.find((t) => t.id === 'open')!.originDate).toBe('2026-10-11')
      expect(upsertMock).toHaveBeenCalledTimes(1)
    })

    it('does nothing the second time', async () => {
      const store = await loadedStore([todo({ id: 'open', date: '2026-10-11' })])
      store.carryOver('2026-10-12')
      expect(store.carryOver('2026-10-12')).toBe(0)
      await flush()
      expect(upsertMock).toHaveBeenCalledTimes(1)
    })

    it('is silently a no-op before the first load', () => {
      const store = useDayTodosStore()
      expect(store.carryOver('2026-10-12')).toBe(0)
      expect(notifyMock).not.toHaveBeenCalled()
    })

    it('puts them back where they were when the write fails, so the next run retries', async () => {
      const store = await loadedStore([todo({ id: 'open', date: '2026-10-11' })])
      upsertMock.mockRejectedValueOnce(new Error('offline'))
      store.carryOver('2026-10-12')
      await flush()
      expect(store.todos[0]!.date).toBe('2026-10-11')
      expect(store.carryOver('2026-10-12')).toBe(1)
    })
  })

  describe('scheduling into a task', () => {
    it('removes the todo once the task is saved', async () => {
      const store = await loadedStore([todo({ id: 'a', date: '2026-10-12' })])
      expect(store.beginSchedule('a')?.id).toBe('a')
      expect(store.todos).toHaveLength(1)

      store.completeSchedule()
      expect(store.todos).toEqual([])
      await flush()
      expect(deleteMock).toHaveBeenCalledWith('a')
    })

    it('leaves the list as it was when the composer is cancelled', async () => {
      const store = await loadedStore([todo({ id: 'a', date: '2026-10-12' })])
      store.beginSchedule('a')
      store.cancelSchedule()
      store.completeSchedule()
      expect(store.todos).toHaveLength(1)
      expect(deleteMock).not.toHaveBeenCalled()
    })

    it('does nothing on save when no todo was being scheduled', async () => {
      // The composer calls completeSchedule on every save, including plain task creation.
      const store = await loadedStore([todo({ id: 'a', date: '2026-10-12' })])
      store.completeSchedule()
      expect(store.todos).toHaveLength(1)
    })
  })

  it('resetLocal drops everything and refuses writes until the next load', async () => {
    const store = await loadedStore([todo({ id: 'a', date: '2026-10-12' })])
    store.beginSchedule('a')
    store.resetLocal()
    expect(store.todos).toEqual([])
    expect(store.isLoaded).toBe(false)
    store.completeSchedule()
    expect(deleteMock).not.toHaveBeenCalled()
  })
})
