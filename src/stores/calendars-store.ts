import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Calendar } from '@/types/calendar'
import {
  fetchCalendars,
  createCalendar as createCalendarRemote,
  updateCalendar as updateCalendarRemote,
  deleteCalendar as deleteCalendarRemote,
  leaveCalendar as leaveCalendarRemote,
  reorderCalendars as reorderCalendarsRemote,
  setCalendarEnabled as setCalendarEnabledRemote,
  setCalendarSelected as setCalendarSelectedRemote
} from '@/services/calendars-service'
import type { CalendarPatch } from '@/services/calendars-service'
import { notifySyncError } from '@/lib/notify'

// UI-facing draft for creating a calendar. cover stays local-only — calendars.cover_url is a
// Storage-path contract and cover persistence is out of scope for this change.
export interface NewCalendarDraft {
  name: string
  color: string
  icon: string | null
  cover: string | null
}

// Chain key for writes that affect the whole list rather than one calendar (reorder).
const LIST_WRITE_KEY = '__calendar_list__'

export const useCalendarsStore = defineStore('calendars', () => {
  const calendars = ref<Calendar[]>([])
  // Two independent per-user visibility dimensions matching the DB contract:
  // enabled (settings drawer toggle) and selected (month view chip).
  const disabledCalendarIds = ref<string[]>([])
  const deselectedCalendarIds = ref<string[]>([])
  // Union kept for existing consumers; a calendar is visible only when enabled AND selected.
  const hiddenCalendarIds = computed(() => {
    const union = new Set([...disabledCalendarIds.value, ...deselectedCalendarIds.value])
    return [...union]
  })
  // The uuid of the user's default calendar, set once per sign-in by loadFromRemote. Null while
  // loading/signed-out — removeCalendar treats null as "not safe to delete anything yet".
  const defaultCalendarId = ref<string | null>(null)
  // True once loadFromRemote has applied the remote list — the "boot sync complete" signal the
  // join flow waits on. Cleared on resetLocal.
  const isLoaded = ref(false)

  // Bumped on loadFromRemote and resetLocal so async results in flight at sign-out never write
  // back into state, mirroring tasks-store's generation guard.
  let generation = 0
  // Set by loadFromRemote; needed for self-removal (leaveCalendar) writes.
  let syncUserId: string | null = null

  // Per-calendar-id write serialization (same rationale as tasks-store): a later edit can never
  // be overtaken by an earlier one, and a delete queued after an update always lands last.
  // Generation is re-checked at dispatch time so queued writes never reach the network after
  // logout/account switch.
  const writeChains = new Map<string, Promise<void>>()

  function enqueueWrite(id: string, op: () => Promise<void>): Promise<void> {
    const gen = generation
    const prev = writeChains.get(id) ?? Promise.resolve()
    const next = prev.catch(() => {}).then(() => {
      if (gen !== generation) return
      return op()
    })
    writeChains.set(id, next)
    void next.catch(() => {}).finally(() => {
      if (writeChains.get(id) === next) writeChains.delete(id)
    })
    return next
  }

  // Writes before the remote list is loaded would create local-only state that the next load
  // wipes — reject them with the same toast contract as tasks-store.
  function rejectUnsyncedWrite(retry: () => void): void {
    notifySyncError('尚未完成同步，請稍後再試', retry)
  }

  async function loadFromRemote(userId: string, defaultId: string): Promise<void> {
    generation += 1
    const gen = generation
    defaultCalendarId.value = defaultId
    const remote = await fetchCalendars(userId)
    if (gen !== generation) return
    calendars.value = remote
    disabledCalendarIds.value = remote.filter((c) => !c.enabled).map((c) => c.id)
    deselectedCalendarIds.value = remote.filter((c) => !c.selected).map((c) => c.id)
    syncUserId = userId
    isLoaded.value = true
  }

  function resetLocal(): void {
    generation += 1
    calendars.value = []
    disabledCalendarIds.value = []
    deselectedCalendarIds.value = []
    defaultCalendarId.value = null
    isLoaded.value = false
    syncUserId = null
    writeChains.clear()
  }

  // Pessimistic: create_calendar returns only the uuid, so an optimistic fake id could never be
  // reconciled (later renames/chips would target a row that does not exist). Local state is
  // touched only after the RPC succeeds.
  async function addCalendar(draft: NewCalendarDraft): Promise<void> {
    if (!isLoaded.value || syncUserId === null) {
      rejectUnsyncedWrite(() => {
        void addCalendar(draft)
      })
      return
    }
    const gen = generation
    try {
      const id = await createCalendarRemote({ name: draft.name, color: draft.color, icon: draft.icon })
      if (gen !== generation) return
      const order = calendars.value.length ? Math.max(...calendars.value.map((c) => c.order)) + 1 : 0
      calendars.value.push({ id, name: draft.name, color: draft.color, icon: draft.icon, cover: draft.cover, order, role: 'owner' })
    } catch {
      if (gen !== generation) return
      notifySyncError('新增日曆失敗', () => {
        void addCalendar(draft)
      })
    }
  }

  // Shared optimistic single-field update: apply locally, persist via the per-id chain. On failure,
  // roll back ONLY if the field still holds this operation's value — a newer edit (X -> A-failed ->
  // B-succeeded) must not be clobbered back to X by A's late rollback.
  function updateCalendarField<K extends 'name' | 'color' | 'icon'>(
    id: string,
    field: K,
    value: Calendar[K],
    retry: () => void
  ): void {
    const calendar = calendars.value.find((c) => c.id === id)
    if (!calendar) return
    const previous = calendar[field]
    calendar[field] = value
    const gen = generation
    void enqueueWrite(id, () => updateCalendarRemote(id, { [field]: value })).catch(() => {
      if (gen !== generation) return
      const current = calendars.value.find((c) => c.id === id)
      if (current && current[field] === value) current[field] = previous
      notifySyncError('日曆更新失敗', retry)
    })
  }

  function renameCalendar(id: string, name: string): void {
    updateCalendarField(id, 'name', name, () => renameCalendar(id, name))
  }

  function recolorCalendar(id: string, color: string): void {
    updateCalendarField(id, 'color', color, () => recolorCalendar(id, color))
  }

  function setCalendarIcon(id: string, icon: string | null): void {
    updateCalendarField(id, 'icon', icon, () => setCalendarIcon(id, icon))
  }

  // Local-only by design: cover persistence (Storage upload + policies) is a follow-up.
  function setCalendarCover(id: string, cover: string | null): void {
    const calendar = calendars.value.find((c) => c.id === id)
    if (calendar) calendar.cover = cover
  }

  // Removes a calendar the user owns. Three-fold safety net: unloaded (null defaultCalendarId),
  // the default calendar itself, and any calendar the current user does not own are all no-ops.
  function removeCalendar(id: string): void {
    if (defaultCalendarId.value === null) return
    if (id === defaultCalendarId.value) return
    const index = calendars.value.findIndex((c) => c.id === id)
    const calendar = calendars.value[index]
    if (calendar?.role !== 'owner') return
    removeWithRollback(id, index, calendar, () => deleteCalendarRemote(id), () => removeCalendar(id))
  }

  // Self-removal from a shared calendar; owners must delete instead (RLS would reject an owner
  // removing their own membership while the calendar lives on ownerless).
  function leaveCalendar(id: string): void {
    const userId = syncUserId
    if (userId === null) return
    const index = calendars.value.findIndex((c) => c.id === id)
    const calendar = calendars.value[index]
    if (calendar?.role !== 'member') return
    removeWithRollback(id, index, calendar, () => leaveCalendarRemote(id, userId), () => leaveCalendar(id))
  }

  function removeWithRollback(id: string, index: number, calendar: Calendar, op: () => Promise<void>, retry: () => void): void {
    const wasDisabled = disabledCalendarIds.value.includes(id)
    const wasDeselected = deselectedCalendarIds.value.includes(id)
    calendars.value = calendars.value.filter((c) => c.id !== id)
    disabledCalendarIds.value = disabledCalendarIds.value.filter((hiddenId) => hiddenId !== id)
    deselectedCalendarIds.value = deselectedCalendarIds.value.filter((hiddenId) => hiddenId !== id)
    const gen = generation
    void enqueueWrite(id, op).catch(() => {
      if (gen !== generation) return
      calendars.value = [...calendars.value.slice(0, index), calendar, ...calendars.value.slice(index)]
      if (wasDisabled) disabledCalendarIds.value = [...disabledCalendarIds.value, id]
      if (wasDeselected) deselectedCalendarIds.value = [...deselectedCalendarIds.value, id]
      notifySyncError('日曆移除失敗', retry)
    })
  }

  // Reorders by id sequence and re-derives `order` from array position so it never drifts from
  // display order (the filter strip and calendars pane both render by `order`, not array index).
  function reorderCalendars(orderedIds: string[]): void {
    const previous = calendars.value.map((c) => ({ id: c.id, order: c.order }))
    const byId = new Map(calendars.value.map((c) => [c.id, c]))
    calendars.value = orderedIds.map((id, index) => {
      const calendar = byId.get(id)
      if (!calendar) throw new Error(`reorderCalendars: unknown calendar id "${id}"`)
      calendar.order = index
      return calendar
    })
    const gen = generation
    void enqueueWrite(LIST_WRITE_KEY, () => reorderCalendarsRemote(orderedIds)).catch(() => {
      if (gen !== generation) return
      const orderById = new Map(previous.map((entry) => [entry.id, entry.order]))
      calendars.value = previous
        .map((entry) => byId.get(entry.id))
        .filter((c): c is Calendar => c !== undefined)
        .map((c) => {
          c.order = orderById.get(c.id) ?? c.order
          return c
        })
      notifySyncError('日曆排序失敗', () => reorderCalendars(orderedIds))
    })
  }

  // Settings drawer toggle — persists calendar_members.enabled.
  function toggleEnabled(id: string): void {
    const wasDisabled = disabledCalendarIds.value.includes(id)
    disabledCalendarIds.value = wasDisabled
      ? disabledCalendarIds.value.filter((hiddenId) => hiddenId !== id)
      : [...disabledCalendarIds.value, id]
    persistToggle(id, () => setCalendarEnabledRemote(id, wasDisabled), () => {
      disabledCalendarIds.value = wasDisabled
        ? [...disabledCalendarIds.value, id]
        : disabledCalendarIds.value.filter((hiddenId) => hiddenId !== id)
    })
  }

  // Month view chip toggle — persists calendar_members.selected.
  function toggleSelected(id: string): void {
    const wasDeselected = deselectedCalendarIds.value.includes(id)
    deselectedCalendarIds.value = wasDeselected
      ? deselectedCalendarIds.value.filter((hiddenId) => hiddenId !== id)
      : [...deselectedCalendarIds.value, id]
    persistToggle(id, () => setCalendarSelectedRemote(id, wasDeselected), () => {
      deselectedCalendarIds.value = wasDeselected
        ? [...deselectedCalendarIds.value, id]
        : deselectedCalendarIds.value.filter((hiddenId) => hiddenId !== id)
    })
  }

  function persistToggle(id: string, op: () => Promise<void>, rollback: () => void): void {
    const gen = generation
    void enqueueWrite(id, op).catch(() => {
      if (gen !== generation) return
      rollback()
      notifySyncError('日曆顯示設定失敗', () => {})
    })
  }

  function isVisible(id: string): boolean {
    return !disabledCalendarIds.value.includes(id) && !deselectedCalendarIds.value.includes(id)
  }

  return {
    calendars,
    hiddenCalendarIds,
    defaultCalendarId,
    isLoaded,
    loadFromRemote,
    resetLocal,
    addCalendar,
    renameCalendar,
    recolorCalendar,
    setCalendarIcon,
    setCalendarCover,
    removeCalendar,
    leaveCalendar,
    reorderCalendars,
    toggleEnabled,
    toggleSelected,
    isVisible
  }
})
