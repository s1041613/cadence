import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Task } from '@/types/task'
import { useTasksStore } from './tasks-store'
import { iso } from '@/utils/convert-date-time'

export type ActiveView = 'day' | 'week' | 'month'

export interface Toast {
  type: 'ok' | 'warn'
  message: string
}

export const useUiStore = defineStore('ui', () => {
  const tasksStore = useTasksStore()

  const activeView = ref<ActiveView>('day')
  const selectedDate = ref(iso(new Date()))
  const taskEditorInitialValues = ref<Partial<Task> | null>(null)
  const previewTaskId = ref<string | null>(null)
  const focusTaskId = ref<string | null>(null)
  const inboxOpen = ref(false)
  const toast = ref<Toast | null>(null)

  // Shared lookup so preview/focus always resolve against the live store record,
  // never a cached copy — edits elsewhere are reflected immediately, and deletion
  // makes the getter return undefined with no fallback.
  function findTask(id: string | null): Task | undefined {
    if (id === null) return undefined
    return tasksStore.tasks.find((t) => t.id === id)
  }

  const previewTask = computed(() => findTask(previewTaskId.value))
  const focusTask = computed(() => findTask(focusTaskId.value))

  return {
    activeView,
    selectedDate,
    taskEditorInitialValues,
    previewTaskId,
    focusTaskId,
    inboxOpen,
    toast,
    findTask,
    previewTask,
    focusTask
  }
})
