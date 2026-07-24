<template>
  <CdPopover v-if="ui.eventPreview && task && isDesktop" :anchor="ui.eventPreview.anchor" :width="popWidth" :approx-height="520" caret @scrim-click="close">
    <Pv2CopyToDaysCard
      v-if="copyMode"
      :month-label="copyMonthLabel"
      :cells="copyCells"
      :selected="copySelectedDates"
      :first-day="settings.firstDay"
      :source-date="task?.date ?? null"
      @close="copyMode = false"
      @prev-month="copyMonth = addMonths(copyMonth, -1)"
      @next-month="copyMonth = addMonths(copyMonth, 1)"
      @toggle-day="toggleCopyDay"
      @confirm="confirmCopy"
    />
    <Pv2EventEditCard
      v-else-if="ui.eventPreview.mode === 'edit'"
      :is-new="false"
      :title="editTitle"
      :type="editType"
      :quad="editQuad"
      :color="editColor"
      :icon="editIcon"
      :all-day="editAllDay"
      :date="editDate"
      :start="editStart"
      :end="editEnd"
      :alert-label="alertLabel"
      :reminder="editReminder"
      :repeat-label="repeatLabel"
      :location="editLocation"
      :notes="editNotes"
      :time-format="settings.timeFormat"
      :calendar-options="calendarOptions"
      :calendar-id="editCalendarId"
      @back="backToPreview"
      @delete="deleteTask"
      @save="saveEdit"
      @update:title="(v) => (editTitle = v)"
      @update:type="onUpdateEditType"
      @update:quad="(v) => (editQuad = v)"
      @update:color="(v) => (editColor = v)"
      @update:icon="(v) => (editIcon = v)"
      @remove-icon="editIcon = null"
      @update:all-day="(v) => (editAllDay = v)"
      @update:date="(v) => (editDate = v)"
      @update:start="(v) => (editStart = v)"
      @update:end="(v) => (editEnd = v)"
      @update:reminder="(v) => (editReminder = v)"
      @update:location="(v) => (editLocation = v)"
      @update:notes="(v) => (editNotes = v)"
      @update:calendar-id="(v) => (editCalendarId = v)"
      @cycle-repeat="cycleRepeat"
    />
    <Pv2EventPreviewCard
      v-else
      :title="task.title"
      :color="theme.backgroundColor"
      :eyebrow="eyebrowLabel"
      :when-label="whenLabel"
      :is-task="task.type === 'quadrant'"
      :reminder-label="alertLabel"
      :notes="task.notes"
      :completed-pomodoros="task.completedPomodoros"
      :estimated-pomodoros="task.estimatedPomodoros"
      :mine="isOwnTask"
      @copy="openCopyMode"
      @edit="openEditMode"
      @delete="deleteTask"
      @start-focus="startFocus"
    />
  </CdPopover>
  <CdDrawerOrSheet v-else-if="ui.eventPreview && task" presentation="sheet" scrim-color="var(--cd-scrim-mid)" @scrim-click="close" @dismiss="close">
    <Pv2CopyToDaysCard
      v-if="copyMode"
      :month-label="copyMonthLabel"
      :cells="copyCells"
      :selected="copySelectedDates"
      :first-day="settings.firstDay"
      :source-date="task?.date ?? null"
      @close="copyMode = false"
      @prev-month="copyMonth = addMonths(copyMonth, -1)"
      @next-month="copyMonth = addMonths(copyMonth, 1)"
      @toggle-day="toggleCopyDay"
      @confirm="confirmCopy"
    />
    <Pv2EventEditCard
      v-else-if="ui.eventPreview.mode === 'edit'"
      :is-new="false"
      :title="editTitle"
      :type="editType"
      :quad="editQuad"
      :color="editColor"
      :icon="editIcon"
      :all-day="editAllDay"
      :date="editDate"
      :start="editStart"
      :end="editEnd"
      :alert-label="alertLabel"
      :reminder="editReminder"
      :repeat-label="repeatLabel"
      :location="editLocation"
      :notes="editNotes"
      :time-format="settings.timeFormat"
      :calendar-options="calendarOptions"
      :calendar-id="editCalendarId"
      @back="backToPreview"
      @delete="deleteTask"
      @save="saveEdit"
      @update:title="(v) => (editTitle = v)"
      @update:type="onUpdateEditType"
      @update:quad="(v) => (editQuad = v)"
      @update:color="(v) => (editColor = v)"
      @update:icon="(v) => (editIcon = v)"
      @remove-icon="editIcon = null"
      @update:all-day="(v) => (editAllDay = v)"
      @update:date="(v) => (editDate = v)"
      @update:start="(v) => (editStart = v)"
      @update:end="(v) => (editEnd = v)"
      @update:reminder="(v) => (editReminder = v)"
      @update:location="(v) => (editLocation = v)"
      @update:notes="(v) => (editNotes = v)"
      @update:calendar-id="(v) => (editCalendarId = v)"
      @cycle-repeat="cycleRepeat"
    />
    <Pv2EventPreviewCard
      v-else
      :title="task.title"
      :color="theme.backgroundColor"
      :eyebrow="eyebrowLabel"
      :when-label="whenLabel"
      :is-task="task.type === 'quadrant'"
      :reminder-label="alertLabel"
      :notes="task.notes"
      :completed-pomodoros="task.completedPomodoros"
      :estimated-pomodoros="task.estimatedPomodoros"
      :mine="isOwnTask"
      @copy="openCopyMode"
      @edit="openEditMode"
      @delete="deleteTask"
      @start-focus="startFocus"
    />
  </CdDrawerOrSheet>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import CdDrawerOrSheet from '@/components/ui/CdDrawerOrSheet.vue'
import CdPopover from '@/components/ui/CdPopover.vue'
import Pv2CopyToDaysCard from './Pv2CopyToDaysCard.vue'
import Pv2EventEditCard from './Pv2EventEditCard.vue'
import Pv2EventPreviewCard from './Pv2EventPreviewCard.vue'
import { useAuthStore } from '@/stores/auth-store'
import { useCalendarsStore } from '@/stores/calendars-store'
import { useSettingsStore } from '@/stores/settings-store'
import { useTasksStore } from '@/stores/tasks-store'
import { useUiStore } from '@/stores/ui-store'
import { useBreakpoint } from '@/composables/use-breakpoint'
import { quadrantOf, themeOf } from '@/composables/use-theme'
import { autoPoms, formatTime, parseISO } from '@/utils/convert-date-time'
import { buildCopyToDaysCells, reminderLabel, type CopyToDaysCell } from '@/utils/event-panel'
import type { ReminderPreset, RepeatMode, Task } from '@/types/task'

const REPEAT_LABELS: Record<RepeatMode, string> = {
  none: 'Does not repeat',
  daily: 'Every day',
  weekly: 'Every week',
  monthly: 'Every month'
}
const REPEAT_CYCLE: RepeatMode[] = ['none', 'daily', 'weekly', 'monthly']

const ui = useUiStore()
const tasksStore = useTasksStore()
const auth = useAuthStore()
const settings = useSettingsStore()
const calendarsStore = useCalendarsStore()
const { isDesktop } = useBreakpoint()

const task = computed<Task | null>(() => {
  const id = ui.eventPreview?.taskId
  return id ? (tasksStore.tasks.find((t) => t.id === id) ?? null) : null
})

const isOwnTask = computed(() => {
  const ownerId = task.value?.ownerId
  return ownerId === undefined || ownerId === auth.user?.id
})
const theme = computed(() => themeOf(task.value!))
const alertLabel = computed(() => reminderLabel(task.value?.reminder ?? null))
const calendarOptions = computed(() =>
  [...calendarsStore.calendars].sort((a, b) => a.order - b.order).map((c) => ({ id: c.id, name: c.name }))
)

const eyebrowLabel = computed(() => {
  if (!task.value) return ''
  if (!isOwnTask.value) return 'READ-ONLY'
  return task.value.type === 'event' ? 'EVENT' : quadrantOf(task.value).key.toUpperCase()
})

const whenLabel = computed(() => {
  if (!task.value) return ''
  const d = parseISO(task.value.date)
  const dateLabel = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(d).toUpperCase()
  if (task.value.allDay) return dateLabel
  return `${dateLabel} · ${formatTime(task.value.start, settings.timeFormat)}-${formatTime(task.value.end, settings.timeFormat)}`
})

const popWidth = computed(() => (copyMode.value ? 340 : ui.eventPreview?.mode === 'edit' ? 388 : 370))

const editTitle = ref('')
const editType = ref<'event' | 'task'>('task')
const editQuad = ref<'do' | 'plan' | 'quick' | 'later'>('later')
const editColor = ref<string>('#4A8B85')
const editIcon = ref<string | null>(null)
const editAllDay = ref(false)
const editDate = ref('')
const editStart = ref('')
const editEnd = ref('')
const editLocation = ref('')
const editNotes = ref('')
const editRepeat = ref<RepeatMode>('none')
const editReminder = ref<ReminderPreset | null>(null)
const editCalendarId = ref('')
const copyMode = ref(false)

const repeatLabel = computed(() => REPEAT_LABELS[editRepeat.value])

function cycleRepeat(): void {
  const next = (REPEAT_CYCLE.indexOf(editRepeat.value) + 1) % REPEAT_CYCLE.length
  editRepeat.value = REPEAT_CYCLE[next]!
}

function seedEditState(t: Task): void {
  editTitle.value = t.title
  editType.value = t.type === 'event' ? 'event' : 'task'
  editQuad.value = quadrantOf(t).key
  editColor.value = t.backgroundColor ?? '#4A8B85'
  editIcon.value = t.icon
  editAllDay.value = t.allDay
  editDate.value = t.date
  editStart.value = t.start
  editEnd.value = t.end
  editLocation.value = t.location
  editNotes.value = t.notes
  editRepeat.value = t.repeat
  editReminder.value = t.reminder
  editCalendarId.value = t.calendarId
}

function onUpdateEditType(type: 'event' | 'task'): void {
  editType.value = type
  if (type === 'task') {
    editAllDay.value = false
    if (!editStart.value) editStart.value = '09:00'
    if (!editEnd.value) editEnd.value = '09:30'
  }
}

watch(
  () => ui.eventPreview,
  (pop) => {
    copyMode.value = false
    if (pop && task.value) seedEditState(task.value)
  },
  { immediate: true }
)

function close(): void {
  ui.eventPreview = null
}

function startFocus(): void {
  if (!task.value || !isOwnTask.value) return
  ui.focusTaskId = task.value.id
  close()
}

function openEditMode(): void {
  if (!ui.eventPreview || !isOwnTask.value) return
  if (task.value) seedEditState(task.value)
  ui.eventPreview.mode = 'edit'
}

function backToPreview(): void {
  if (ui.eventPreview) ui.eventPreview.mode = 'preview'
}

function deleteTask(): void {
  if (!task.value || !isOwnTask.value) return
  tasksStore.deleteTask(task.value.id)
  close()
}

function saveEdit(): void {
  if (!task.value || !isOwnTask.value) return
  const isQuadrant = editType.value === 'task'
  const updated: Task = {
    ...task.value,
    title: editTitle.value.trim(),
    type: editType.value === 'event' ? 'event' : 'quadrant',
    important: isQuadrant ? editQuad.value === 'do' || editQuad.value === 'plan' : task.value.important,
    urgent: isQuadrant ? editQuad.value === 'do' || editQuad.value === 'quick' : task.value.urgent,
    backgroundColor: editType.value === 'event' ? editColor.value : task.value.backgroundColor,
    icon: editType.value === 'event' ? editIcon.value : null,
    allDay: editType.value === 'event' ? editAllDay.value : false,
    date: editDate.value,
    start: editType.value === 'event' && editAllDay.value ? '' : editStart.value,
    end: editType.value === 'event' && editAllDay.value ? '' : editEnd.value,
    location: editLocation.value,
    notes: editNotes.value,
    repeat: editRepeat.value,
    reminder: editReminder.value,
    calendarId: editCalendarId.value || task.value.calendarId,
    estimatedPomodoros: autoPoms({
      allDay: editType.value === 'event' && editAllDay.value,
      start: editType.value === 'event' && editAllDay.value ? '' : editStart.value,
      end: editType.value === 'event' && editAllDay.value ? '' : editEnd.value
    })
  }

  tasksStore.saveTask(updated)
  backToPreview()
}

const copyMonth = ref(new Date())
const copySelectedDates = ref<string[]>([])

function addMonths(d: Date, delta: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1)
}

function openCopyMode(): void {
  if (!task.value || !isOwnTask.value) return
  copyMonth.value = parseISO(task.value.date)
  copySelectedDates.value = []
  copyMode.value = true
}

function toggleCopyDay(date: string): void {
  copySelectedDates.value = copySelectedDates.value.includes(date)
    ? copySelectedDates.value.filter((d) => d !== date)
    : [...copySelectedDates.value, date]
}

const copyMonthLabel = computed(() => new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(copyMonth.value))
const copyCells = computed<Array<CopyToDaysCell | null>>(() =>
  buildCopyToDaysCells(copyMonth.value.getFullYear(), copyMonth.value.getMonth(), settings.firstDay, task.value?.date)
)

function confirmCopy(): void {
  if (!task.value || copySelectedDates.value.length === 0) return
  const created = tasksStore.copyToDays(task.value, copySelectedDates.value)
  if (created.length > 0) {
    ui.toast = { type: 'ok', message: `Copied to ${created.length} day${created.length === 1 ? '' : 's'}` }
  }
  copyMode.value = false
  copySelectedDates.value = []
}
</script>
