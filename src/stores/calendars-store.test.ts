import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCalendarsStore } from './calendars-store'
import * as calendarsService from '@/services/calendars-service'
import type { CalendarWithMembership } from '@/services/calendars-service'

vi.mock('@/services/calendars-service', () => ({
  fetchCalendars: vi.fn()
}))

const fetchCalendarsMock = vi.mocked(calendarsService.fetchCalendars)

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

describe('calendars-store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
  })

  it('starts empty with no default calendar until loadFromRemote resolves', () => {
    const store = useCalendarsStore()
    expect(store.calendars).toEqual([])
    expect(store.defaultCalendarId).toBeNull()
  })

  describe('loadFromRemote', () => {
    it('stores the default calendar id and the fetched calendars', async () => {
      fetchCalendarsMock.mockResolvedValue([mkCalendar({ id: 'cal-1' }), mkCalendar({ id: 'cal-2', role: 'member', order: 1 })])

      const store = useCalendarsStore()
      await store.loadFromRemote('user-1', 'cal-1')

      expect(fetchCalendarsMock).toHaveBeenCalledWith('user-1')
      expect(store.defaultCalendarId).toBe('cal-1')
      expect(store.calendars).toHaveLength(2)
      expect(store.calendars.map((c) => c.id)).toEqual(['cal-1', 'cal-2'])
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
    })
  })

  describe('resetLocal', () => {
    it('clears calendars, hiddenCalendarIds, and defaultCalendarId', async () => {
      fetchCalendarsMock.mockResolvedValue([mkCalendar({ id: 'cal-1' })])
      const store = useCalendarsStore()
      await store.loadFromRemote('user-1', 'cal-1')
      store.toggleVisibility('cal-1')

      store.resetLocal()

      expect(store.calendars).toEqual([])
      expect(store.hiddenCalendarIds).toEqual([])
      expect(store.defaultCalendarId).toBeNull()
    })
  })

  describe('removeCalendar', () => {
    it('is a no-op when defaultCalendarId is not yet loaded (null)', () => {
      const store = useCalendarsStore()
      store.calendars.push(mkCalendar({ id: 'cal-1', role: 'owner' }))

      store.removeCalendar('cal-1')

      expect(store.calendars).toHaveLength(1)
    })

    it('is a no-op for the default calendar', async () => {
      fetchCalendarsMock.mockResolvedValue([mkCalendar({ id: 'cal-1' }), mkCalendar({ id: 'cal-2', order: 1 })])
      const store = useCalendarsStore()
      await store.loadFromRemote('user-1', 'cal-1')

      store.removeCalendar('cal-1')

      expect(store.calendars).toHaveLength(2)
    })

    it('is a no-op for a calendar where the user is not the owner', async () => {
      fetchCalendarsMock.mockResolvedValue([mkCalendar({ id: 'cal-1' }), mkCalendar({ id: 'cal-2', role: 'member', order: 1 })])
      const store = useCalendarsStore()
      await store.loadFromRemote('user-1', 'cal-1')

      store.removeCalendar('cal-2')

      expect(store.calendars).toHaveLength(2)
    })

    it('removes a non-default calendar owned by the user and clears its hidden flag', async () => {
      fetchCalendarsMock.mockResolvedValue([mkCalendar({ id: 'cal-1' }), mkCalendar({ id: 'cal-2', role: 'owner', order: 1 })])
      const store = useCalendarsStore()
      await store.loadFromRemote('user-1', 'cal-1')
      store.toggleVisibility('cal-2')

      store.removeCalendar('cal-2')

      expect(store.calendars).toHaveLength(1)
      expect(store.hiddenCalendarIds).not.toContain('cal-2')
    })
  })

  describe('addCalendar', () => {
    it('appends a new calendar with an incrementing order', async () => {
      fetchCalendarsMock.mockResolvedValue([mkCalendar({ id: 'cal-1' })])
      const store = useCalendarsStore()
      await store.loadFromRemote('user-1', 'cal-1')

      const work = store.addCalendar('Work', '#6863B0')
      expect(store.calendars).toHaveLength(2)
      expect(work.order).toBe(1)
    })
  })

  describe('renameCalendar and recolorCalendar', () => {
    it('update the matching calendar only', async () => {
      fetchCalendarsMock.mockResolvedValue([mkCalendar({ id: 'cal-1', name: 'My Calendar' })])
      const store = useCalendarsStore()
      await store.loadFromRemote('user-1', 'cal-1')

      const work = store.addCalendar('Work', '#6863B0')
      store.renameCalendar(work.id, 'Work Stuff')
      store.recolorCalendar(work.id, '#8E6FB0')

      expect(store.calendars.find((c) => c.id === work.id)).toMatchObject({ name: 'Work Stuff', color: '#8E6FB0' })
      expect(store.calendars[0]!.name).toBe('My Calendar')
    })
  })

  describe('reorderCalendars', () => {
    it('re-derives order from the given id sequence', async () => {
      fetchCalendarsMock.mockResolvedValue([mkCalendar({ id: 'cal-1' })])
      const store = useCalendarsStore()
      await store.loadFromRemote('user-1', 'cal-1')

      const work = store.addCalendar('Work', '#6863B0')
      const personal = store.addCalendar('Personal', '#4A8B85')
      store.reorderCalendars([personal.id, work.id, 'cal-1'])

      expect(store.calendars.map((c) => c.id)).toEqual([personal.id, work.id, 'cal-1'])
      expect(store.calendars.map((c) => c.order)).toEqual([0, 1, 2])
    })
  })

  describe('toggleVisibility', () => {
    it('flips a calendar in and out of hiddenCalendarIds', async () => {
      fetchCalendarsMock.mockResolvedValue([mkCalendar({ id: 'cal-1' })])
      const store = useCalendarsStore()
      await store.loadFromRemote('user-1', 'cal-1')

      const work = store.addCalendar('Work', '#6863B0')
      expect(store.isVisible(work.id)).toBe(true)
      store.toggleVisibility(work.id)
      expect(store.isVisible(work.id)).toBe(false)
      store.toggleVisibility(work.id)
      expect(store.isVisible(work.id)).toBe(true)
    })
  })

  describe('setCalendarIcon and setCalendarCover', () => {
    it('update the matching calendar only', async () => {
      fetchCalendarsMock.mockResolvedValue([mkCalendar({ id: 'cal-1' })])
      const store = useCalendarsStore()
      await store.loadFromRemote('user-1', 'cal-1')

      const work = store.addCalendar('Work', '#6863B0')
      store.setCalendarIcon(work.id, 'work')
      expect(store.calendars.find((c) => c.id === work.id)!.icon).toBe('work')
      expect(store.calendars[0]!.icon).toBeNull()

      store.setCalendarCover(work.id, 'data:image/png;base64,abc')
      expect(store.calendars.find((c) => c.id === work.id)!.cover).toBe('data:image/png;base64,abc')
      store.setCalendarCover(work.id, null)
      expect(store.calendars.find((c) => c.id === work.id)!.cover).toBeNull()
    })
  })
})
