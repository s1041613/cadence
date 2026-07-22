import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Calendar } from '@/types/calendar'
import { fetchCalendars } from '@/services/calendars-service'

export const useCalendarsStore = defineStore('calendars', () => {
  const calendars = ref<Calendar[]>([])
  const hiddenCalendarIds = ref<string[]>([])
  // The uuid of the user's default calendar, set once per sign-in by loadFromRemote. Null while
  // loading/signed-out — removeCalendar treats null as "not safe to delete anything yet".
  const defaultCalendarId = ref<string | null>(null)

  // Bumped on loadFromRemote and resetLocal so a load in flight at sign-out never writes back
  // into state, mirroring tasks-store's generation guard.
  let generation = 0

  async function loadFromRemote(userId: string, defaultId: string): Promise<void> {
    generation += 1
    const gen = generation
    defaultCalendarId.value = defaultId
    const remote = await fetchCalendars(userId)
    if (gen !== generation) return
    calendars.value = remote
    hiddenCalendarIds.value = remote.filter((c) => !c.enabled || !c.selected).map((c) => c.id)
  }

  function resetLocal(): void {
    generation += 1
    calendars.value = []
    hiddenCalendarIds.value = []
    defaultCalendarId.value = null
  }

  function addCalendar(name: string, color: string): Calendar {
    const order = calendars.value.length ? Math.max(...calendars.value.map((c) => c.order)) + 1 : 0
    const calendar: Calendar = { id: crypto.randomUUID(), name, color, icon: null, cover: null, order, role: 'owner' }
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

  // Three-fold safety net: unloaded (null defaultCalendarId), the default calendar itself, and
  // any calendar the current user does not own are all no-ops. DB-level protection (position
  // uniqueness, delete policy) is tracked as a follow-up — see plan risk item 2.
  function removeCalendar(id: string): void {
    if (defaultCalendarId.value === null) return
    if (id === defaultCalendarId.value) return
    const calendar = calendars.value.find((c) => c.id === id)
    if (calendar?.role !== 'owner') return
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
    defaultCalendarId,
    loadFromRemote,
    resetLocal,
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
