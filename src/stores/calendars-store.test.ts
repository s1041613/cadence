import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCalendarsStore, DEFAULT_CALENDAR_ID } from './calendars-store'

describe('calendars-store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts with exactly one default calendar', () => {
    const store = useCalendarsStore()
    expect(store.calendars).toHaveLength(1)
    expect(store.calendars[0]!.id).toBe(DEFAULT_CALENDAR_ID)
  })

  it('addCalendar appends a new calendar with an incrementing order', () => {
    const store = useCalendarsStore()
    const work = store.addCalendar('Work', '#6863B0')
    expect(store.calendars).toHaveLength(2)
    expect(work.order).toBe(1)
  })

  it('renameCalendar and recolorCalendar update the matching calendar only', () => {
    const store = useCalendarsStore()
    const work = store.addCalendar('Work', '#6863B0')
    store.renameCalendar(work.id, 'Work Stuff')
    store.recolorCalendar(work.id, '#8E6FB0')
    expect(store.calendars.find((c) => c.id === work.id)).toMatchObject({ name: 'Work Stuff', color: '#8E6FB0' })
    expect(store.calendars[0]!.name).toBe('My Calendar')
  })

  it('removeCalendar removes a non-default calendar and clears its hidden flag', () => {
    const store = useCalendarsStore()
    const work = store.addCalendar('Work', '#6863B0')
    store.toggleVisibility(work.id)
    store.removeCalendar(work.id)
    expect(store.calendars).toHaveLength(1)
    expect(store.hiddenCalendarIds).not.toContain(work.id)
  })

  it('removeCalendar is a no-op for the default calendar', () => {
    const store = useCalendarsStore()
    store.removeCalendar(DEFAULT_CALENDAR_ID)
    expect(store.calendars).toHaveLength(1)
  })

  it('reorderCalendars re-derives order from the given id sequence', () => {
    const store = useCalendarsStore()
    const work = store.addCalendar('Work', '#6863B0')
    const personal = store.addCalendar('Personal', '#4A8B85')
    store.reorderCalendars([personal.id, work.id, DEFAULT_CALENDAR_ID])
    expect(store.calendars.map((c) => c.id)).toEqual([personal.id, work.id, DEFAULT_CALENDAR_ID])
    expect(store.calendars.map((c) => c.order)).toEqual([0, 1, 2])
  })

  it('toggleVisibility flips a calendar in and out of hiddenCalendarIds', () => {
    const store = useCalendarsStore()
    const work = store.addCalendar('Work', '#6863B0')
    expect(store.isVisible(work.id)).toBe(true)
    store.toggleVisibility(work.id)
    expect(store.isVisible(work.id)).toBe(false)
    store.toggleVisibility(work.id)
    expect(store.isVisible(work.id)).toBe(true)
  })

  it('setCalendarIcon updates the matching calendar only', () => {
    const store = useCalendarsStore()
    const work = store.addCalendar('Work', '#6863B0')
    store.setCalendarIcon(work.id, 'work')
    expect(store.calendars.find((c) => c.id === work.id)!.icon).toBe('work')
    expect(store.calendars[0]!.icon).toBeNull()
  })

  it('setCalendarCover updates the matching calendar only', () => {
    const store = useCalendarsStore()
    const work = store.addCalendar('Work', '#6863B0')
    store.setCalendarCover(work.id, 'data:image/png;base64,abc')
    expect(store.calendars.find((c) => c.id === work.id)!.cover).toBe('data:image/png;base64,abc')
    store.setCalendarCover(work.id, null)
    expect(store.calendars.find((c) => c.id === work.id)!.cover).toBeNull()
  })
})
