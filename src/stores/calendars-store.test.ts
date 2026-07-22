import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCalendarsStore } from './calendars-store'
import * as calendarsService from '@/services/calendars-service'
import { notifySyncError } from '@/lib/notify'
import type { CalendarWithMembership } from '@/services/calendars-service'

vi.mock('@/services/calendars-service', () => ({
  fetchCalendars: vi.fn(),
  createCalendar: vi.fn(),
  updateCalendar: vi.fn(),
  deleteCalendar: vi.fn(),
  leaveCalendar: vi.fn(),
  reorderCalendars: vi.fn(),
  setCalendarEnabled: vi.fn(),
  setCalendarSelected: vi.fn()
}))

vi.mock('@/lib/notify', () => ({
  notifySyncError: vi.fn()
}))

const fetchCalendarsMock = vi.mocked(calendarsService.fetchCalendars)
const createCalendarMock = vi.mocked(calendarsService.createCalendar)
const updateCalendarMock = vi.mocked(calendarsService.updateCalendar)
const deleteCalendarMock = vi.mocked(calendarsService.deleteCalendar)
const leaveCalendarMock = vi.mocked(calendarsService.leaveCalendar)
const reorderCalendarsMock = vi.mocked(calendarsService.reorderCalendars)
const setCalendarEnabledMock = vi.mocked(calendarsService.setCalendarEnabled)
const setCalendarSelectedMock = vi.mocked(calendarsService.setCalendarSelected)
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

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

function mkCalendar(overrides: Partial<CalendarWithMembership> & Pick<CalendarWithMembership, 'id'>): CalendarWithMembership {
  return {
    name: 'Calendar',
    color: '#6E839B',
    icon: null,
    cover: null,
    order: 0,
    role: 'owner',
    enabled: true,
    selected: true,
    ...overrides
  }
}

async function loadedStore(rows: CalendarWithMembership[] = [mkCalendar({ id: 'cal-1' })]) {
  fetchCalendarsMock.mockResolvedValueOnce(rows)
  const store = useCalendarsStore()
  await store.loadFromRemote('user-1', rows[0]?.id ?? 'cal-1')
  return store
}

describe('calendars-store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
    updateCalendarMock.mockResolvedValue()
    deleteCalendarMock.mockResolvedValue()
    leaveCalendarMock.mockResolvedValue()
    reorderCalendarsMock.mockResolvedValue()
    setCalendarEnabledMock.mockResolvedValue()
    setCalendarSelectedMock.mockResolvedValue()
  })

  it('starts empty, not loaded, with no default calendar', () => {
    const store = useCalendarsStore()
    expect(store.calendars).toEqual([])
    expect(store.defaultCalendarId).toBeNull()
    expect(store.isLoaded).toBe(false)
  })

  describe('loadFromRemote', () => {
    it('stores the default calendar id, calendars, and flips isLoaded', async () => {
      const store = await loadedStore([mkCalendar({ id: 'cal-1' }), mkCalendar({ id: 'cal-2', role: 'member', order: 1 })])

      expect(fetchCalendarsMock).toHaveBeenCalledWith('user-1')
      expect(store.defaultCalendarId).toBe('cal-1')
      expect(store.calendars.map((c) => c.id)).toEqual(['cal-1', 'cal-2'])
      expect(store.isLoaded).toBe(true)
    })

    it('derives visibility from enabled and selected independently', async () => {
      const store = await loadedStore([
        mkCalendar({ id: 'cal-1' }),
        mkCalendar({ id: 'cal-2', enabled: false, order: 1 }),
        mkCalendar({ id: 'cal-3', selected: false, order: 2 })
      ])

      expect(store.isVisible('cal-1')).toBe(true)
      expect(store.isVisible('cal-2')).toBe(false)
      expect(store.isVisible('cal-3')).toBe(false)
      expect(store.hiddenCalendarIds).toEqual(expect.arrayContaining(['cal-2', 'cal-3']))
    })

    it('discards a fetch that resolves after resetLocal (generation guard)', async () => {
      const pending = deferred<CalendarWithMembership[]>()
      fetchCalendarsMock.mockReturnValueOnce(pending.promise)

      const store = useCalendarsStore()
      const load = store.loadFromRemote('user-1', 'cal-1')

      store.resetLocal()
      pending.resolve([mkCalendar({ id: 'cal-1' })])
      await load

      expect(store.calendars).toEqual([])
      expect(store.defaultCalendarId).toBeNull()
      expect(store.isLoaded).toBe(false)
    })
  })

  describe('resetLocal', () => {
    it('clears calendars, visibility state, defaultCalendarId, and isLoaded', async () => {
      const store = await loadedStore()
      store.toggleSelected('cal-1')
      await flush()

      store.resetLocal()

      expect(store.calendars).toEqual([])
      expect(store.hiddenCalendarIds).toEqual([])
      expect(store.defaultCalendarId).toBeNull()
      expect(store.isLoaded).toBe(false)
    })
  })

  describe('addCalendar', () => {
    it('is pessimistic: pushes only after the RPC returns the real uuid', async () => {
      createCalendarMock.mockResolvedValueOnce('real-uuid')
      const store = await loadedStore()

      await store.addCalendar({ name: 'Work', color: '#6863B0', icon: 'work', cover: null })

      expect(createCalendarMock).toHaveBeenCalledWith({ name: 'Work', color: '#6863B0', icon: 'work' })
      const created = store.calendars.find((c) => c.id === 'real-uuid')
      expect(created).toMatchObject({ name: 'Work', color: '#6863B0', icon: 'work', order: 1, role: 'owner' })
    })

    it('keeps the cover locally without sending it to the RPC', async () => {
      createCalendarMock.mockResolvedValueOnce('real-uuid')
      const store = await loadedStore()

      await store.addCalendar({ name: 'Trip', color: '#4A8B85', icon: null, cover: 'data:image/png;base64,abc' })

      expect(createCalendarMock).toHaveBeenCalledWith({ name: 'Trip', color: '#4A8B85', icon: null })
      expect(store.calendars.find((c) => c.id === 'real-uuid')?.cover).toBe('data:image/png;base64,abc')
    })

    it('leaves state untouched and notifies with retry when the RPC fails', async () => {
      createCalendarMock.mockRejectedValueOnce(new Error('boom'))
      const store = await loadedStore()

      await store.addCalendar({ name: 'Work', color: '#6863B0', icon: null, cover: null })

      expect(store.calendars).toHaveLength(1)
      expect(notifySyncErrorMock).toHaveBeenCalledWith(expect.any(String), expect.any(Function))

      createCalendarMock.mockResolvedValueOnce('retry-uuid')
      const retry = notifySyncErrorMock.mock.calls[0]![1]
      retry()
      await flush()
      expect(store.calendars.find((c) => c.id === 'retry-uuid')).toBeTruthy()
    })

    it('rejects the write without a network call before remote load completes', async () => {
      const store = useCalendarsStore()

      await store.addCalendar({ name: 'Work', color: '#6863B0', icon: null, cover: null })

      expect(createCalendarMock).not.toHaveBeenCalled()
      expect(store.calendars).toHaveLength(0)
      expect(notifySyncErrorMock).toHaveBeenCalled()
    })

    it('discards an RPC result that resolves after resetLocal', async () => {
      const pending = deferred<string>()
      createCalendarMock.mockReturnValueOnce(pending.promise)
      const store = await loadedStore()

      const add = store.addCalendar({ name: 'Work', color: '#6863B0', icon: null, cover: null })
      store.resetLocal()
      pending.resolve('late-uuid')
      await add

      expect(store.calendars).toHaveLength(0)
    })
  })

  describe('renameCalendar / recolorCalendar / setCalendarIcon', () => {
    it('apply optimistically and persist through updateCalendar', async () => {
      const store = await loadedStore([mkCalendar({ id: 'cal-1' }), mkCalendar({ id: 'cal-2', order: 1 })])

      store.renameCalendar('cal-2', 'Renamed')
      store.recolorCalendar('cal-2', '#8E6FB0')
      store.setCalendarIcon('cal-2', 'star')
      await flush()

      expect(store.calendars.find((c) => c.id === 'cal-2')).toMatchObject({ name: 'Renamed', color: '#8E6FB0', icon: 'star' })
      expect(updateCalendarMock).toHaveBeenCalledWith('cal-2', { name: 'Renamed' })
      expect(updateCalendarMock).toHaveBeenCalledWith('cal-2', { color: '#8E6FB0' })
      expect(updateCalendarMock).toHaveBeenCalledWith('cal-2', { icon: 'star' })
    })

    it('rolls back the field and notifies when the write fails', async () => {
      updateCalendarMock.mockRejectedValueOnce(new Error('boom'))
      const store = await loadedStore([mkCalendar({ id: 'cal-1', name: 'Original' })])

      store.renameCalendar('cal-1', 'Renamed')
      expect(store.calendars[0]!.name).toBe('Renamed')
      await flush()

      expect(store.calendars[0]!.name).toBe('Original')
      expect(notifySyncErrorMock).toHaveBeenCalled()
    })

    it('does not roll back a field that a newer edit has already overwritten', async () => {
      // X -> A (fails late) -> B (succeeds): the failed A must not clobber B back to X.
      const firstWrite = deferred<void>()
      updateCalendarMock.mockImplementationOnce(() => firstWrite.promise)
      updateCalendarMock.mockImplementationOnce(async () => {})
      const store = await loadedStore([mkCalendar({ id: 'cal-1', name: 'X' })])

      store.renameCalendar('cal-1', 'A')
      await flush()
      store.renameCalendar('cal-1', 'B')
      firstWrite.reject(new Error('boom'))
      await flush()

      expect(store.calendars[0]!.name).toBe('B')
    })

    it('serializes writes to the same calendar in order', async () => {
      const order: string[] = []
      const first = deferred<void>()
      updateCalendarMock.mockImplementationOnce(() => {
        order.push('rename-start')
        return first.promise
      })
      updateCalendarMock.mockImplementationOnce(async () => {
        order.push('recolor-start')
      })
      const store = await loadedStore()

      store.renameCalendar('cal-1', 'A')
      store.recolorCalendar('cal-1', '#8E6FB0')
      await flush()
      expect(order).toEqual(['rename-start'])

      first.resolve()
      await flush()
      expect(order).toEqual(['rename-start', 'recolor-start'])
    })
  })

  describe('setCalendarCover', () => {
    it('updates local state only (cover persistence is out of scope)', async () => {
      const store = await loadedStore()

      store.setCalendarCover('cal-1', 'data:image/png;base64,abc')
      await flush()

      expect(store.calendars[0]!.cover).toBe('data:image/png;base64,abc')
      expect(updateCalendarMock).not.toHaveBeenCalled()
    })
  })

  describe('removeCalendar', () => {
    it('is a no-op when defaultCalendarId is not yet loaded (null)', () => {
      const store = useCalendarsStore()
      store.calendars.push(mkCalendar({ id: 'cal-1', role: 'owner' }))

      store.removeCalendar('cal-1')

      expect(store.calendars).toHaveLength(1)
      expect(deleteCalendarMock).not.toHaveBeenCalled()
    })

    it('is a no-op for the default calendar', async () => {
      const store = await loadedStore([mkCalendar({ id: 'cal-1' }), mkCalendar({ id: 'cal-2', order: 1 })])

      store.removeCalendar('cal-1')

      expect(store.calendars).toHaveLength(2)
      expect(deleteCalendarMock).not.toHaveBeenCalled()
    })

    it('is a no-op for a calendar where the user is not the owner', async () => {
      const store = await loadedStore([mkCalendar({ id: 'cal-1' }), mkCalendar({ id: 'cal-2', role: 'member', order: 1 })])

      store.removeCalendar('cal-2')

      expect(store.calendars).toHaveLength(2)
      expect(deleteCalendarMock).not.toHaveBeenCalled()
    })

    it('removes optimistically and persists the delete', async () => {
      const store = await loadedStore([mkCalendar({ id: 'cal-1' }), mkCalendar({ id: 'cal-2', role: 'owner', order: 1 })])

      store.removeCalendar('cal-2')
      await flush()

      expect(store.calendars).toHaveLength(1)
      expect(deleteCalendarMock).toHaveBeenCalledWith('cal-2')
    })

    it('restores the calendar at its original index when the delete fails', async () => {
      deleteCalendarMock.mockRejectedValueOnce(new Error('boom'))
      const store = await loadedStore([
        mkCalendar({ id: 'cal-1' }),
        mkCalendar({ id: 'cal-2', role: 'owner', order: 1 }),
        mkCalendar({ id: 'cal-3', role: 'owner', order: 2 })
      ])

      store.removeCalendar('cal-2')
      expect(store.calendars.map((c) => c.id)).toEqual(['cal-1', 'cal-3'])
      await flush()

      expect(store.calendars.map((c) => c.id)).toEqual(['cal-1', 'cal-2', 'cal-3'])
      expect(notifySyncErrorMock).toHaveBeenCalled()
    })
  })

  describe('leaveCalendar', () => {
    it('removes a member calendar locally and deletes the own membership row', async () => {
      const store = await loadedStore([mkCalendar({ id: 'cal-1' }), mkCalendar({ id: 'cal-2', role: 'member', order: 1 })])

      store.leaveCalendar('cal-2')
      await flush()

      expect(store.calendars.map((c) => c.id)).toEqual(['cal-1'])
      expect(leaveCalendarMock).toHaveBeenCalledWith('cal-2', 'user-1')
    })

    it('is a no-op for calendars the user owns', async () => {
      const store = await loadedStore([mkCalendar({ id: 'cal-1' }), mkCalendar({ id: 'cal-2', role: 'owner', order: 1 })])

      store.leaveCalendar('cal-2')
      await flush()

      expect(store.calendars).toHaveLength(2)
      expect(leaveCalendarMock).not.toHaveBeenCalled()
    })

    it('rolls back and notifies when leaving fails', async () => {
      leaveCalendarMock.mockRejectedValueOnce(new Error('boom'))
      const store = await loadedStore([mkCalendar({ id: 'cal-1' }), mkCalendar({ id: 'cal-2', role: 'member', order: 1 })])

      store.leaveCalendar('cal-2')
      await flush()

      expect(store.calendars.map((c) => c.id)).toEqual(['cal-1', 'cal-2'])
      expect(notifySyncErrorMock).toHaveBeenCalled()
    })
  })

  describe('reorderCalendars', () => {
    it('re-derives order optimistically and persists the full ordered list', async () => {
      const store = await loadedStore([
        mkCalendar({ id: 'cal-1' }),
        mkCalendar({ id: 'cal-2', order: 1 }),
        mkCalendar({ id: 'cal-3', order: 2 })
      ])

      store.reorderCalendars(['cal-3', 'cal-1', 'cal-2'])
      await flush()

      expect(store.calendars.map((c) => c.id)).toEqual(['cal-3', 'cal-1', 'cal-2'])
      expect(store.calendars.map((c) => c.order)).toEqual([0, 1, 2])
      expect(reorderCalendarsMock).toHaveBeenCalledWith(['cal-3', 'cal-1', 'cal-2'])
    })

    it('restores the previous order when persistence fails', async () => {
      reorderCalendarsMock.mockRejectedValueOnce(new Error('boom'))
      const store = await loadedStore([mkCalendar({ id: 'cal-1' }), mkCalendar({ id: 'cal-2', order: 1 })])

      store.reorderCalendars(['cal-2', 'cal-1'])
      await flush()

      expect(store.calendars.map((c) => c.id)).toEqual(['cal-1', 'cal-2'])
      expect(notifySyncErrorMock).toHaveBeenCalled()
    })
  })

  describe('toggleEnabled / toggleSelected', () => {
    it('persists the settings toggle through set_calendar_enabled only', async () => {
      const store = await loadedStore()

      store.toggleEnabled('cal-1')
      await flush()

      expect(store.isVisible('cal-1')).toBe(false)
      expect(setCalendarEnabledMock).toHaveBeenCalledWith('cal-1', false)
      expect(setCalendarSelectedMock).not.toHaveBeenCalled()
    })

    it('persists the chip toggle through set_calendar_selected only', async () => {
      const store = await loadedStore()

      store.toggleSelected('cal-1')
      await flush()

      expect(store.isVisible('cal-1')).toBe(false)
      expect(setCalendarSelectedMock).toHaveBeenCalledWith('cal-1', false)
      expect(setCalendarEnabledMock).not.toHaveBeenCalled()
    })

    it('keeps the two visibility dimensions independent', async () => {
      const store = await loadedStore([mkCalendar({ id: 'cal-1', enabled: false })])

      store.toggleSelected('cal-1')
      await flush()

      // still disabled -> still hidden even though selected was toggled back on/off
      expect(setCalendarSelectedMock).toHaveBeenCalledWith('cal-1', false)
      expect(store.isVisible('cal-1')).toBe(false)
    })

    it('rolls back the toggle when persistence fails', async () => {
      setCalendarEnabledMock.mockRejectedValueOnce(new Error('boom'))
      const store = await loadedStore()

      store.toggleEnabled('cal-1')
      expect(store.isVisible('cal-1')).toBe(false)
      await flush()

      expect(store.isVisible('cal-1')).toBe(true)
      expect(notifySyncErrorMock).toHaveBeenCalled()
    })
  })

  describe('logout safety', () => {
    it('does not dispatch queued writes after resetLocal', async () => {
      const first = deferred<void>()
      updateCalendarMock.mockImplementationOnce(() => first.promise)
      const store = await loadedStore()

      store.renameCalendar('cal-1', 'A')
      await flush() // let the rename dispatch (now in flight, blocked on `first`)
      store.recolorCalendar('cal-1', '#8E6FB0')
      store.resetLocal()
      first.resolve()
      await flush()

      // the queued recolor write must not reach the network after logout
      expect(updateCalendarMock).toHaveBeenCalledTimes(1)
    })
  })
})
