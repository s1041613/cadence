import { defineBoot } from '#q-app'
import { loadStore, saveStore } from '@/utils/save-load-local-storage'
import { useTasksStore } from '@/stores/tasks-store'
import { useInboxStore } from '@/stores/inbox-store'
import { useCalendarsStore } from '@/stores/calendars-store'
import { useSettingsStore } from '@/stores/settings-store'
import type { Task } from '@/types/task'
import type { InboxItem } from '@/stores/inbox-store'
import type { Calendar } from '@/types/calendar'
import type { TimeFormat, FirstDay, MonthEventLabel, MonthlyPhotos } from '@/stores/settings-store'
import { migratePersistedPayload } from '@/utils/migrate-persisted-payload'

const STORAGE_KEY = 'cadence.v1'

export interface PersistedSettings {
  timeFormat: TimeFormat
  firstDay: FirstDay
  monthEventLabel: MonthEventLabel
  showPhoto: boolean
  monthlyPhotos: MonthlyPhotos
}

export interface PersistedShape {
  tasks: Task[]
  inbox: InboxItem[]
  inboxDraft: string
  calendars: Calendar[]
  hiddenCalendarIds: string[]
  settings: PersistedSettings
}

// Sole reader/writer of the `cadence.v1` key: every other store/component must go through
// tasks-store/inbox-store/calendars-store/settings-store rather than touching localStorage directly.
export default defineBoot(({ store }) => {
  const tasksStore = useTasksStore(store)
  const inboxStore = useInboxStore(store)
  const calendarsStore = useCalendarsStore(store)
  const settingsStore = useSettingsStore(store)

  const raw = loadStore<unknown>(STORAGE_KEY)
  const migrated = migratePersistedPayload(raw)
  if (migrated) {
    tasksStore.tasks = migrated.tasks
    inboxStore.inboxItems = migrated.inbox
    inboxStore.inboxDraft = migrated.inboxDraft
    calendarsStore.calendars = migrated.calendars
    calendarsStore.hiddenCalendarIds = migrated.hiddenCalendarIds
    settingsStore.timeFormat = migrated.settings.timeFormat
    settingsStore.firstDay = migrated.settings.firstDay
    settingsStore.monthEventLabel = migrated.settings.monthEventLabel
    settingsStore.showPhoto = migrated.settings.showPhoto
    settingsStore.monthlyPhotos = migrated.settings.monthlyPhotos
  }
  tasksStore.isLoading = false

  function persist(): void {
    saveStore<PersistedShape>(STORAGE_KEY, {
      tasks: tasksStore.tasks,
      inbox: inboxStore.inboxItems,
      inboxDraft: inboxStore.inboxDraft,
      calendars: calendarsStore.calendars,
      hiddenCalendarIds: calendarsStore.hiddenCalendarIds,
      settings: {
        timeFormat: settingsStore.timeFormat,
        firstDay: settingsStore.firstDay,
        monthEventLabel: settingsStore.monthEventLabel,
        showPhoto: settingsStore.showPhoto,
        monthlyPhotos: settingsStore.monthlyPhotos
      }
    })
  }

  // $subscribe：只要該 store 的 state 有任何變動就自動呼叫 persist()，不用在每個修改 state 的地方手動存檔
  tasksStore.$subscribe(persist)
  inboxStore.$subscribe(persist)
  calendarsStore.$subscribe(persist)
  settingsStore.$subscribe(persist)
})
