<template>
  <CdPopover v-if="ui.eventPreview && task && isDesktop" :anchor="ui.eventPreview.anchor" :width="popWidth" :approx-height="previewApproxHeight" caret @scrim-click="close">
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
      :all-day="editAllDay"
      :date="editDate"
      :end-date="editEndDate"
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
      @update:all-day="(v) => (editAllDay = v)"
      @update:date="(v) => (editDate = v)"
      @update:end-date="(v: string) => (editEndDate = v)"
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
      :all-day="task.allDay"
      :reminder-label="alertLabel"
      :notes="task.notes"
      :completed-pomodoros="task.completedPomodoros"
      :estimated-pomodoros="task.estimatedPomodoros"
      :mine="isOwnTask"
      :subtasks="subtasks"
      @copy="openCopyMode"
      @edit="openEditMode"
      @delete="deleteTask"
      @start-focus="startFocus"
      @add-subtask="addSubtask"
      @toggle-subtask="tasksStore.toggleSubtaskDone"
      @rename-subtask="tasksStore.renameSubtask"
      @delete-subtask="tasksStore.deleteSubtask"
    />
  </CdPopover>
  <!-- The branch condition lives on <Transition>, not on CdDrawerOrSheet: this is the
       v-else-if half of a pair whose v-if is the CdPopover above, and a wrapper between
       the two would sever that chain. :duration is explicit because the animated layers
       (.cd-sheet, .cd-scrim) are below the transition root, so Vue can neither infer the
       timing nor see a transitionend whose target is the root. -->
  <Transition v-else-if="ui.eventPreview && task" name="cd-sheet" :duration="300">
    <CdDrawerOrSheet presentation="sheet" scrim-color="var(--cd-scrim)" @scrim-click="close" @dismiss="close">
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
        :all-day="editAllDay"
        :date="editDate"
        :end-date="editEndDate"
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
        @update:all-day="(v) => (editAllDay = v)"
        @update:date="(v) => (editDate = v)"
        @update:end-date="(v: string) => (editEndDate = v)"
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
        :all-day="task.allDay"
        :reminder-label="alertLabel"
        :notes="task.notes"
        :completed-pomodoros="task.completedPomodoros"
        :estimated-pomodoros="task.estimatedPomodoros"
        :mine="isOwnTask"
        :subtasks="subtasks"
        @copy="openCopyMode"
        @edit="openEditMode"
        @delete="deleteTask"
        @start-focus="startFocus"
        @add-subtask="addSubtask"
        @toggle-subtask="tasksStore.toggleSubtaskDone"
        @rename-subtask="tasksStore.renameSubtask"
        @delete-subtask="tasksStore.deleteSubtask"
      />
    </CdDrawerOrSheet>
  </Transition>
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
import { autoPoms, endDateOf, formatTime, parseISO } from '@/utils/convert-date-time'
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

const subtasks = computed(() => (task.value ? tasksStore.subtasksFor(task.value.id) : []))

function addSubtask(title: string): void {
  if (!task.value || !isOwnTask.value) return
  tasksStore.addSubtask(task.value.id, title)
}

// The popover is positioned from an expected height, so a variable-length checklist would
// otherwise flip or overflow for events near the bottom of the viewport. 520 was the height
// before subtasks existed; the block adds its 48px header, its rows (capped at the list's own
// 196px scroll limit) and — for one's own event — the composer row.
const SUBTASK_HEAD_PX = 48
const SUBTASK_ROW_PX = 44
const SUBTASK_LIST_MAX_PX = 196
const BASE_PREVIEW_HEIGHT_PX = 520

const previewApproxHeight = computed(() => {
  if (ui.eventPreview?.mode === 'edit' || copyMode.value) return BASE_PREVIEW_HEIGHT_PX
  const rows = Math.min(subtasks.value.length * SUBTASK_ROW_PX, SUBTASK_LIST_MAX_PX)
  return BASE_PREVIEW_HEIGHT_PX + SUBTASK_HEAD_PX + rows + (isOwnTask.value ? SUBTASK_ROW_PX : 0)
})

const editTitle = ref('')
const editType = ref<'event' | 'task'>('task')
const editQuad = ref<'do' | 'plan' | 'quick' | 'later'>('later')
const editColor = ref<string>('#4A8B85')
// No UI writes this any more — v2's STYLE field picks a colour only. It is kept because
// seedEditState/saveEdit round-trip it: dropping the ref would null out the stored icon of
// any event edited in v2, which v1's picker can still set.
const editIcon = ref<string | null>(null)
const editAllDay = ref(false)
const editDate = ref('')
// Always a concrete date while editing; saveEdit drops it again when the span is one day.
const editEndDate = ref('')
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
  editEndDate.value = endDateOf(t)
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
    // Absent rather than equal to the start date, so a single-day event keeps the shape it
    // has always had; delete below covers the multi-day -> single-day edit.
    ...(editEndDate.value > editDate.value ? { endDate: editEndDate.value } : {}),
    start: editType.value === 'event' && editAllDay.value ? '' : editStart.value,
    end: editType.value === 'event' && editAllDay.value ? '' : editEnd.value,
    location: editLocation.value,
    notes: editNotes.value,
    repeat: editRepeat.value,
    reminder: editReminder.value,
    calendarId: editCalendarId.value || task.value.calendarId,
    // autoPoms, not defaultPoms: this is an edit of an existing event, and the break-aware
    // count is scoped to creation. Recomputing it here would rewrite the stored estimate of
    // every event the user touches — including one they had set by hand.
    estimatedPomodoros: autoPoms({
      allDay: editType.value === 'event' && editAllDay.value,
      start: editType.value === 'event' && editAllDay.value ? '' : editStart.value,
      end: editType.value === 'event' && editAllDay.value ? '' : editEnd.value,
      // Without the dates a multi-day span would be estimated from its clock times alone.
      date: editDate.value,
      ...(editEndDate.value > editDate.value ? { endDate: editEndDate.value } : {})
    })
  }

  // Shrinking a span back to one day has to remove the field: the spread above carried the
  // previous endDate in, and the conditional spread cannot overwrite it with absence.
  if (editEndDate.value <= editDate.value) delete updated.endDate

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
