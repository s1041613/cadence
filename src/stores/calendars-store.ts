import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Calendar } from '@/types/calendar'

// Stable id so tasks-store.mkTask and the persistence migration can both reference the default
// calendar without a store round-trip; every fresh install and every migrated legacy payload
// converges on the same default calendar id.
export const DEFAULT_CALENDAR_ID = 'default'

export function defaultCalendar(): Calendar {
  return { id: DEFAULT_CALENDAR_ID, name: 'My Calendar', color: '#6E839B', icon: null, cover: null, order: 0 }
}

export const useCalendarsStore = defineStore('calendars', () => {
  const calendars = ref<Calendar[]>([defaultCalendar()])
  const hiddenCalendarIds = ref<string[]>([])

  function addCalendar(name: string, color: string): Calendar {
    const order = calendars.value.length ? Math.max(...calendars.value.map((c) => c.order)) + 1 : 0
    const calendar: Calendar = { id: crypto.randomUUID(), name, color, icon: null, cover: null, order }
    calendars.value.push(calendar)
    return calendar
  }

  function renameCalendar(id: string, name: string): void {
    const calendar = calendars.value.find((c) => c.id === id)
    if (calendar) calendar.name = name
  }

  function recolorCalendar(id: string, color: string): void {
    const calendar = calendars.value.find((c) => c.id === id)
    if (calendar) calendar.color = color
  }

  function setCalendarIcon(id: string, icon: string | null): void {
    const calendar = calendars.value.find((c) => c.id === id)
    if (calendar) calendar.icon = icon
  }

  function setCalendarCover(id: string, cover: string | null): void {
    const calendar = calendars.value.find((c) => c.id === id)
    if (calendar) calendar.cover = cover
  }

  function removeCalendar(id: string): void {
    if (id === DEFAULT_CALENDAR_ID) return
    calendars.value = calendars.value.filter((c) => c.id !== id)
    hiddenCalendarIds.value = hiddenCalendarIds.value.filter((hiddenId) => hiddenId !== id)
  }

  // Reorders by id sequence and re-derives `order` from array position so it never drifts from
  // display order (the filter strip and calendars pane both render by `order`, not array index).
  function reorderCalendars(orderedIds: string[]): void {
    const byId = new Map(calendars.value.map((c) => [c.id, c]))
    calendars.value = orderedIds.map((id, index) => {
      const calendar = byId.get(id)
      if (!calendar) throw new Error(`reorderCalendars: unknown calendar id "${id}"`)
      calendar.order = index
      return calendar
    })
  }

  function toggleVisibility(id: string): void {
    hiddenCalendarIds.value = hiddenCalendarIds.value.includes(id)
      ? hiddenCalendarIds.value.filter((hiddenId) => hiddenId !== id)
      : [...hiddenCalendarIds.value, id]
  }

  function isVisible(id: string): boolean {
    return !hiddenCalendarIds.value.includes(id)
  }

  return {
    calendars,
    hiddenCalendarIds,
    addCalendar,
    renameCalendar,
    recolorCalendar,
    setCalendarIcon,
    setCalendarCover,
    removeCalendar,
    reorderCalendars,
    toggleVisibility,
    isVisible
  }
})
