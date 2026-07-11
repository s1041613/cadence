import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Task } from '@/types/task'
import { autoPoms } from '@/utils/convert-date-time'
import { DEFAULT_CALENDAR_ID } from '@/stores/calendars-store'

export function mkTask(overrides: Partial<Task> & Pick<Task, 'date'>): Task {
  const start = overrides.start ?? ''
  const end = overrides.end ?? ''
  const allDay = overrides.allDay ?? false

  return {
    id: crypto.randomUUID(),
    title: '',
    start,
    end,
    allDay,
    location: '',
    repeat: 'none',
    notes: '',
    important: false,
    urgent: false,
    done: false,
    estimatedPomodoros: autoPoms({ allDay, start, end }),
    completedPomodoros: 0,
    type: 'quadrant',
    backgroundColor: null,
    texture: 'none',
    icon: null,
    calendarId: DEFAULT_CALENDAR_ID,
    reminder: null,
    ...overrides
  }
}

export const useTasksStore = defineStore('tasks', () => {
  const tasks = ref<Task[]>([])
  const isLoading = ref(true)

  function saveTask(task: Task): void {
    const idx = tasks.value.findIndex((t) => t.id === task.id)
    if (idx === -1) {
      tasks.value.push(task)
    } else {
      tasks.value[idx] = task
    }
  }

  function deleteTask(id: string): void {
    tasks.value = tasks.value.filter((t) => t.id !== id)
  }

  function toggleDone(id: string): void {
    const task = tasks.value.find((t) => t.id === id)
    if (task) task.done = !task.done
  }

  function incrementCompletedPomodoros(id: string): void {
    const task = tasks.value.find((t) => t.id === id)
    if (!task) return

    const limit = task.estimatedPomodoros > 0 ? task.estimatedPomodoros : autoPoms(task)
    task.completedPomodoros = Math.min(task.completedPomodoros + 1, limit)
  }

  function copyToDays(task: Task, dates: string[]): Task[] {
    const created = dates.map((date) =>
      mkTask({
        ...task,
        id: crypto.randomUUID(),
        date,
        done: false,
        completedPomodoros: 0
      })
    )

    if (created.length) tasks.value.push(...created)
    return created
  }

  return {
    tasks,
    isLoading,
    saveTask,
    deleteTask,
    toggleDone,
    incrementCompletedPomodoros,
    copyToDays
  }
})
