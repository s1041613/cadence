import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { onAuthUserChange } from './auth-data-sync-core'

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

function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

describe('onAuthUserChange', () => {
  type StoreMock = { loadFromRemote: Mock<(userId: string, defaultId: string) => Promise<void>>; resetLocal: Mock<() => void> }
  let ensureDefaultCalendar: Mock<(userId: string) => Promise<string>>
  let tasksStore: StoreMock
  let calendarsStore: StoreMock
  let inboxStore: StoreMock
  let getCurrentUserId: Mock<() => string | null>

  beforeEach(() => {
    ensureDefaultCalendar = vi.fn()
    tasksStore = { loadFromRemote: vi.fn().mockResolvedValue(undefined), resetLocal: vi.fn() }
    calendarsStore = { loadFromRemote: vi.fn().mockResolvedValue(undefined), resetLocal: vi.fn() }
    inboxStore = { loadFromRemote: vi.fn().mockResolvedValue(undefined), resetLocal: vi.fn() }
    getCurrentUserId = vi.fn()
  })

  it('ensures the default calendar once, then loads both stores with the same id', async () => {
    ensureDefaultCalendar.mockResolvedValue('cal-uuid-1')
    getCurrentUserId.mockReturnValue('user-1')

    await onAuthUserChange('user-1', { ensureDefaultCalendar, tasksStore, calendarsStore, inboxStore, getCurrentUserId })

    expect(ensureDefaultCalendar).toHaveBeenCalledWith('user-1')
    expect(tasksStore.loadFromRemote).toHaveBeenCalledWith('user-1', 'cal-uuid-1')
    expect(calendarsStore.loadFromRemote).toHaveBeenCalledWith('user-1', 'cal-uuid-1')
    expect(inboxStore.loadFromRemote).toHaveBeenCalledWith('user-1', 'cal-uuid-1')
  })

  it('resets all stores when the user signs out', async () => {
    await onAuthUserChange(null, { ensureDefaultCalendar, tasksStore, calendarsStore, inboxStore, getCurrentUserId })

    expect(tasksStore.resetLocal).toHaveBeenCalledTimes(1)
    expect(calendarsStore.resetLocal).toHaveBeenCalledTimes(1)
    expect(inboxStore.resetLocal).toHaveBeenCalledTimes(1)
    expect(ensureDefaultCalendar).not.toHaveBeenCalled()
  })

  it('does not load either store when the session goes stale (user changed) while ensureDefaultCalendar is pending', async () => {
    const pending = deferred<string>()
    ensureDefaultCalendar.mockReturnValue(pending.promise)
    // By the time ensureDefaultCalendar resolves, auth has moved on to a different user.
    getCurrentUserId.mockReturnValue('user-2')

    const run = onAuthUserChange('user-1', { ensureDefaultCalendar, tasksStore, calendarsStore, inboxStore, getCurrentUserId })
    pending.resolve('cal-uuid-1')
    await run

    expect(tasksStore.loadFromRemote).not.toHaveBeenCalled()
    expect(calendarsStore.loadFromRemote).not.toHaveBeenCalled()
    expect(inboxStore.loadFromRemote).not.toHaveBeenCalled()
  })

  it('does not load any store when the session goes stale (signed out) while ensureDefaultCalendar is pending', async () => {
    const pending = deferred<string>()
    ensureDefaultCalendar.mockReturnValue(pending.promise)
    getCurrentUserId.mockReturnValue(null)

    const run = onAuthUserChange('user-1', { ensureDefaultCalendar, tasksStore, calendarsStore, inboxStore, getCurrentUserId })
    pending.resolve('cal-uuid-1')
    await run

    expect(tasksStore.loadFromRemote).not.toHaveBeenCalled()
    expect(calendarsStore.loadFromRemote).not.toHaveBeenCalled()
    expect(inboxStore.loadFromRemote).not.toHaveBeenCalled()
  })

  it('leaves all stores unloaded when ensureDefaultCalendar throws', async () => {
    ensureDefaultCalendar.mockRejectedValue(new Error('offline'))
    getCurrentUserId.mockReturnValue('user-1')

    await onAuthUserChange('user-1', { ensureDefaultCalendar, tasksStore, calendarsStore, inboxStore, getCurrentUserId })
    await flush()

    expect(tasksStore.loadFromRemote).not.toHaveBeenCalled()
    expect(calendarsStore.loadFromRemote).not.toHaveBeenCalled()
    expect(inboxStore.loadFromRemote).not.toHaveBeenCalled()
    expect(tasksStore.resetLocal).not.toHaveBeenCalled()
    expect(calendarsStore.resetLocal).not.toHaveBeenCalled()
    expect(inboxStore.resetLocal).not.toHaveBeenCalled()
  })
})
