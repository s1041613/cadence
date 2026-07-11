import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Task } from '@/types/task'
import { useTasksStore } from './tasks-store'
import { iso } from '@/utils/convert-date-time'
import type { PopoverAnchor } from '@/components/ui/CdPopover.vue'

export type ActiveView = 'day' | 'week' | 'month'
export type SettingsPane =
  | 'root'
  | 'account'
  | 'time'
  | 'customization'
  | 'notifications'
  | 'privacy'
  | 'calendars'
  | 'addCalendar'
  | 'calendarDetail'

export interface Toast {
  type: 'ok' | 'warn'
  message: string
}

export interface QuickAddState {
  anchor: PopoverAnchor
  date: string
  time: string | null // null = all-day / no time context (month-cell invocation)
  endTime: string | null // paired with `time`; null iff `time` is null
}

export interface EventPreviewState {
  taskId: string
  anchor: PopoverAnchor
  mode: 'preview' | 'edit'
}

export const useUiStore = defineStore('ui', () => {
  const tasksStore = useTasksStore()

  const activeView = ref<ActiveView>('month')
  const selectedDate = ref(iso(new Date()))
  const eventComposerInitialValues = ref<Partial<Task> | null>(null)
  const focusTaskId = ref<string | null>(null)
  const toast = ref<Toast | null>(null)

  // Overlay routing state (design.md "State-driven overlay routing stays in ui-store").
  // Each field is null/false when its overlay is closed; setting it opens the overlay.
  const qaPop = ref<QuickAddState | null>(null)
  const eventPreview = ref<EventPreviewState | null>(null)
  const createOpen = ref(false)
  const dayList = ref<string | null>(null) // date whose Day List overlay is open
  const monthSheet = ref(false)
  const draftDrawer = ref(false)
  const draftConv = ref<string | null>(null) // draft id whose conversion sheet is open
  const assistantOpen = ref(false)
  const settingsOpen = ref(false)
  const settingsPane = ref<SettingsPane>('root')

  // Shared lookup so preview/focus always resolve against the live store record,
  // never a cached copy — edits elsewhere are reflected immediately, and deletion
  // makes the getter return undefined with no fallback.
  function findTask(id: string | null): Task | undefined {
    if (id === null) return undefined
    return tasksStore.tasks.find((t) => t.id === id)
  }

  const focusTask = computed(() => findTask(focusTaskId.value))

  return {
    activeView,
    selectedDate,
    eventComposerInitialValues,
    focusTaskId,
    toast,
    qaPop,
    eventPreview,
    createOpen,
    dayList,
    monthSheet,
    draftDrawer,
    draftConv,
    assistantOpen,
    settingsOpen,
    settingsPane,
    findTask,
    focusTask
  }
})
