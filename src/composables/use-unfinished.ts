import { computed, type ComputedRef, type Ref } from 'vue'
import { useTasksStore } from '@/stores/tasks-store'
import { useCalendarsStore } from '@/stores/calendars-store'
import { useAuthStore } from '@/stores/auth-store'
import { bucketOverdue, type OverdueBucket } from '@/utils/overdue-buckets'
import type { Task } from '@/types/task'

/**
 * The unfinished tasks sitting before `date` — one source for the day header's count and for
 * the sheet that lists them, so the number on the pill can never disagree with what opens.
 *
 * "Before `date`" and not "before today": the day view swipes, and a count anchored to today
 * would stop matching the date printed above it the moment you moved off today.
 */
export function useUnfinished(date: Ref<string>): {
  tasks: ComputedRef<Task[]>
  buckets: ComputedRef<OverdueBucket<Task>[]>
  count: ComputedRef<number>
} {
  const tasksStore = useTasksStore()
  const calendarsStore = useCalendarsStore()
  const auth = useAuthStore()

  const tasks = computed(() =>
    tasksStore.tasks.filter(
      (t) =>
        // An event says where you had to be — it cannot be left unfinished, only missed.
        t.type === 'quadrant' &&
        !t.done &&
        t.date < date.value &&
        calendarsStore.isVisible(t.calendarId) &&
        // Someone else's row is read-only under RLS, so it would arrive here with two buttons
        // that cannot work. Absent ownerId means locally created, i.e. our own.
        (t.ownerId === undefined || t.ownerId === auth.user?.id)
    )
  )

  const buckets = computed(() => bucketOverdue(tasks.value, date.value))

  return { tasks, buckets, count: computed(() => tasks.value.length) }
}
