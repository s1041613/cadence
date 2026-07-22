<template>
  <CdPopover v-if="ui.eventPreview && task && isDesktop" :anchor="ui.eventPreview.anchor" :width="popWidth" :approx-height="440" caret @scrim-click="close">
    <CdCopyToDaysCard
      v-if="copyMode"
      :month-label="copyMonthLabel"
      :cells="copyCells"
      :selected="copySelectedDates"
      @close="copyMode = false"
      @prev-month="copyMonth = addMonths(copyMonth, -1)"
      @next-month="copyMonth = addMonths(copyMonth, 1)"
      @toggle-day="toggleCopyDay"
      @confirm="confirmCopy"
    />
    <CdEventEditCard
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
      :repeat-label="repeatLabel"
      :location="editLocation"
      :notes="editNotes"
      :time-format="settings.timeFormat"
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
      @update:location="(v) => (editLocation = v)"
      @update:notes="(v) => (editNotes = v)"
      @cycle-repeat="cycleRepeat"
    />
    <CdEventPreviewCard
      v-else
      :title="task.title"
      :color="theme.backgroundColor"
      :when-label="whenLabel"
      :is-task="task.type === 'quadrant'"
      :alert-label="alertLabel"
      :quad-label="quadLabel"
      :completed-pomodoros="task.completedPomodoros"
      :estimated-pomodoros="task.estimatedPomodoros"
      :mine="isOwnTask"
      @copy="openCopyMode"
      @edit="openEditMode"
      @delete="deleteTask"
      @close="close"
      @start-focus="startFocus"
    />
  </CdPopover>
  <CdDrawerOrSheet v-else-if="ui.eventPreview && task" presentation="sheet" scrim-color="var(--cd-scrim-mid)" @scrim-click="close" @dismiss="close">
    <CdCopyToDaysCard
      v-if="copyMode"
      :month-label="copyMonthLabel"
      :cells="copyCells"
      :selected="copySelectedDates"
      @close="copyMode = false"
      @prev-month="copyMonth = addMonths(copyMonth, -1)"
      @next-month="copyMonth = addMonths(copyMonth, 1)"
      @toggle-day="toggleCopyDay"
      @confirm="confirmCopy"
    />
    <CdEventEditCard
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
      :repeat-label="repeatLabel"
      :location="editLocation"
      :notes="editNotes"
      :time-format="settings.timeFormat"
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
      @update:location="(v) => (editLocation = v)"
      @update:notes="(v) => (editNotes = v)"
      @cycle-repeat="cycleRepeat"
    />
    <CdEventPreviewCard
      v-else
      :title="task.title"
      :color="theme.backgroundColor"
      :when-label="whenLabel"
      :is-task="task.type === 'quadrant'"
      :alert-label="alertLabel"
      :quad-label="quadLabel"
      :completed-pomodoros="task.completedPomodoros"
      :estimated-pomodoros="task.estimatedPomodoros"
      :mine="isOwnTask"
      @copy="openCopyMode"
      @edit="openEditMode"
      @delete="deleteTask"
      @close="close"
      @start-focus="startFocus"
    />
  </CdDrawerOrSheet>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import CdPopover from '@/components/ui/CdPopover.vue'
import CdDrawerOrSheet from '@/components/ui/CdDrawerOrSheet.vue'
import CdEventPreviewCard from '@/components/ui/CdEventPreviewCard.vue'
import CdEventEditCard from '@/components/ui/CdEventEditCard.vue'
import CdCopyToDaysCard, { type CopyToDaysCell } from '@/components/ui/CdCopyToDaysCard.vue'
import { useUiStore } from '@/stores/ui-store'
import { useTasksStore } from '@/stores/tasks-store'
import { useAuthStore } from '@/stores/auth-store'
import { useSettingsStore } from '@/stores/settings-store'
import { useBreakpoint } from '@/composables/use-breakpoint'
import { quadrantOf, themeOf } from '@/composables/use-theme'
import { parseISO, iso, addDays, startOfWeek, formatTime, autoPoms } from '@/utils/convert-date-time'
import type { RepeatMode, Task } from '@/types/task'

const REPEAT_LABELS: Record<RepeatMode, string> = {
  none: 'Does not repeat',
  daily: 'Every day',
  weekly: 'Every week',
  monthly: 'Every month'
}
const REPEAT_CYCLE: RepeatMode[] = ['none', 'daily', 'weekly', 'monthly']

// EventPreviewPopover — feature-layer composition for the event preview/edit/copy overlay
// (design.md "5.2 Implement the event preview card"). Reads ui.eventPreview (taskId/anchor/mode),
// swaps CdEventPreviewCard <-> CdEventEditCard <-> CdCopyToDaysCard inside the same CdPopover
// (no slide transition, matching CdEventEditCard's own header comment), and routes saves/deletes/
// copies through tasks-store. Mounted once in IndexPage.vue, matching QuickAddPopover's precedent.
const ui = useUiStore()
const tasksStore = useTasksStore()
const auth = useAuthStore()
const settings = useSettingsStore()
const { isDesktop } = useBreakpoint()

const task = computed<Task | null>(() => {
  const id = ui.eventPreview?.taskId
  return id ? (tasksStore.tasks.find((t) => t.id === id) ?? null) : null
})

// Authorship gate: events fetched from shared calendars carry ownerId; a missing ownerId means a
// locally created task (always the current user's). Foreign events render read-only — RLS would
// reject the write anyway, so no write affordance is offered.
const isOwnTask = computed(() => {
  const ownerId = task.value?.ownerId
  return ownerId === undefined || ownerId === auth.user?.id
})

// theme/quadLabel/whenLabel are only read by the template when `task` is non-null (guarded by
// `v-if="ui.eventPreview && task"`); the `!` narrowing below is safe under that invariant.
const theme = computed(() => themeOf(task.value!))
const quadLabel = computed(() => {
  if (!task.value) return ''
  return task.value.type === 'event' ? 'Event' : quadrantOf(task.value).name
})
const alertLabel = computed(() => 'No reminder')

const whenLabel = computed(() => {
  if (!task.value) return ''
  const d = parseISO(task.value.date)
  const dateLabel = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(d)
  if (task.value.allDay) return dateLabel
  return `${dateLabel} · ${formatTime(task.value.start, settings.timeFormat)}–${formatTime(task.value.end, settings.timeFormat)}`
})

const popWidth = computed(() => (copyMode.value ? 320 : ui.eventPreview?.mode === 'edit' ? 388 : 370))

// Edit-form local state, seeded from `task` whenever the popover opens or switches into edit mode.
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

// copyMode is declared here (ahead of its own "Copy-to-days flow" section below) because the
// `{ immediate: true }` watch just below reads it synchronously during setup, before later
// top-level `const` declarations in this file would otherwise be initialized.
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

// task 7.5 "restyled start button that sets focusTaskId" — FocusSession.vue itself is untouched
// (design.md Non-Goals), this only supplies the trigger the preview surface was missing.
function startFocus(): void {
  if (!task.value || !isOwnTask.value) return
  ui.focusTaskId = task.value.id
  close()
}

function openEditMode(): void {
  if (!ui.eventPreview) return
  // Defense in depth behind the hidden buttons: a foreign event never enters edit mode.
  if (!isOwnTask.value) return
  // Reseed from the live task on every entry into edit mode. The `ui.eventPreview` watcher only
  // fires when the popover object changes, but openEditMode/backToPreview just flip `mode` on the
  // same object — so without this, edits abandoned via Back (e.g. a changed date) survive into the
  // next Edit session and could be committed on Save. Reseeding discards that stale local state.
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
  if (!task.value) return
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
    estimatedPomodoros: autoPoms({
      allDay: editType.value === 'event' && editAllDay.value,
      start: editType.value === 'event' && editAllDay.value ? '' : editStart.value,
      end: editType.value === 'event' && editAllDay.value ? '' : editEnd.value
    })
  }

  tasksStore.saveTask(updated)
  backToPreview()
}

// Copy-to-days flow (design.md's Implementation Contract: "copy-to-days flow"). Behavior ported
// from the legacy TaskPreview.vue copy mode: tasksStore.copyToDays + toast on skip/success.
// (copyMode itself is declared earlier, alongside the edit-form refs — see the comment there.)
const copyMonth = ref(new Date())
const copySelectedDates = ref<string[]>([])

function addMonths(d: Date, delta: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1)
}

function openCopyMode(): void {
  if (!task.value) return
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

const copyCells = computed<Array<CopyToDaysCell | null>>(() => {
  const first = new Date(copyMonth.value.getFullYear(), copyMonth.value.getMonth(), 1)
  const gridStart = startOfWeek(first)
  const srcDate = task.value?.date
  return Array.from({ length: 42 }, (_, i) => {
    const d = addDays(gridStart, i)
    if (d.getMonth() !== copyMonth.value.getMonth()) return null
    const date = iso(d)
    return { date, day: d.getDate(), disabled: date === srcDate }
  })
})

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
