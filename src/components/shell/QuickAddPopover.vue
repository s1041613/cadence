<template>
  <CdPopover v-if="ui.qaPop && isDesktop" :anchor="ui.qaPop.anchor" :width="388" :approx-height="520" caret @scrim-click="close">
    <component
      :is="editCardComponent"
      is-new
      :title="title"
      :type="type"
      :quad="quad"
      :color="color"
      :icon="icon"
      :all-day="allDay"
      :date="date"
      :start="start"
      :end="end"
      alert-label="No reminder"
      :reminder="reminder"
      :repeat-label="repeatLabel"
      location=""
      notes=""
      :time-format="settings.timeFormat"
      :calendar-options="calendarOptions"
      :calendar-id="calendarId"
      @update:calendar-id="(v) => (calendarId = v)"
      @back="close"
      @close="close"
      @cancel="close"
      @update:title="(v) => (title = v)"
      @update:type="(v) => (type = v)"
      @update:quad="(v) => (quad = v)"
      @update:color="(v) => (color = v)"
      @update:icon="(v) => (icon = v)"
      @remove-icon="icon = null"
      @update:all-day="(v) => (allDay = v)"
      @update:date="(v) => (date = v)"
      @update:start="(v) => (start = v)"
      @update:end="(v) => (end = v)"
      @update:reminder="(v) => (reminder = v)"
      @cycle-repeat="cycleRepeat"
      @update:location="() => undefined"
      @update:notes="() => undefined"
      @save="onAdd"
    />
  </CdPopover>
  <CdDrawerOrSheet v-else-if="ui.qaPop" presentation="sheet" scrim-color="var(--cd-scrim-mid)" @scrim-click="close" @dismiss="close">
    <component
      :is="editCardComponent"
      is-new
      :title="title"
      :type="type"
      :quad="quad"
      :color="color"
      :icon="icon"
      :all-day="allDay"
      :date="date"
      :start="start"
      :end="end"
      alert-label="No reminder"
      :reminder="reminder"
      :repeat-label="repeatLabel"
      location=""
      notes=""
      :time-format="settings.timeFormat"
      :calendar-options="calendarOptions"
      :calendar-id="calendarId"
      @update:calendar-id="(v) => (calendarId = v)"
      @back="close"
      @close="close"
      @cancel="close"
      @update:title="(v) => (title = v)"
      @update:type="(v) => (type = v)"
      @update:quad="(v) => (quad = v)"
      @update:color="(v) => (color = v)"
      @update:icon="(v) => (icon = v)"
      @remove-icon="icon = null"
      @update:all-day="(v) => (allDay = v)"
      @update:date="(v) => (date = v)"
      @update:start="(v) => (start = v)"
      @update:end="(v) => (end = v)"
      @update:reminder="(v) => (reminder = v)"
      @cycle-repeat="cycleRepeat"
      @update:location="() => undefined"
      @update:notes="() => undefined"
      @save="onAdd"
    />
  </CdDrawerOrSheet>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import CdPopover from '@/components/ui/CdPopover.vue'
import CdDrawerOrSheet from '@/components/ui/CdDrawerOrSheet.vue'
import CdEventEditCard from '@/components/ui/CdEventEditCard.vue'
import Pv2EventEditCard from '@/components/v2/event/Pv2EventEditCard.vue'
import { useUiStore } from '@/stores/ui-store'
import { useTasksStore, mkTask } from '@/stores/tasks-store'
import { useCalendarsStore } from '@/stores/calendars-store'
import { useSettingsStore } from '@/stores/settings-store'
import { useBreakpoint } from '@/composables/use-breakpoint'
import type { IconName } from '@/components/ui/icons'
import type { ReminderPreset, RepeatMode } from '@/types/task'

// QuickAddPopover — feature-layer composition for the Quick-Add overlay (design.md "5.1"): reads
// ui.qaPop (anchor/date/time captured by Month/Day/Week click handlers) opens the handoff's New
// Event/Task edit card directly. Despite the historical file name, this is not the old lightweight
// quick-add card.
const ui = useUiStore()
const tasksStore = useTasksStore()
const calendarsStore = useCalendarsStore()
const settings = useSettingsStore()
const { isDesktop } = useBreakpoint()

const props = withDefaults(
  defineProps<{
    variant?: 'legacy' | 'v2'
  }>(),
  { variant: 'legacy' }
)

const title = ref('')
const type = ref<'task' | 'event'>('event')
const quad = ref<'do' | 'plan' | 'quick' | 'later'>('do')
const color = ref('#E3A75C')
const icon = ref<IconName | null>(null)
const allDay = ref(false)
const date = ref('')
const start = ref('09:00')
const end = ref('09:30')
const repeat = ref<RepeatMode>('none')
const reminder = ref<ReminderPreset | null>(null)
const calendarId = ref('')

const REPEAT_LABELS: Record<RepeatMode, string> = {
  none: 'Does not repeat',
  daily: 'Every day',
  weekly: 'Every week',
  monthly: 'Every month'
}
const REPEAT_CYCLE: RepeatMode[] = ['none', 'daily', 'weekly', 'monthly']

const calendarOptions = computed(() =>
  [...calendarsStore.calendars].sort((a, b) => a.order - b.order).map((c) => ({ id: c.id, name: c.name }))
)
const editCardComponent = computed(() => (props.variant === 'v2' ? Pv2EventEditCard : CdEventEditCard))

watch(
  () => ui.qaPop,
  (pop) => {
    if (!pop) return
    title.value = ''
    type.value = 'event'
    quad.value = 'do'
    color.value = '#E3A75C'
    icon.value = null
    allDay.value = pop.time === null
    date.value = pop.date
    start.value = pop.time ?? '09:00'
    end.value = pop.endTime ?? '10:00'
    repeat.value = 'none'
    reminder.value = null
    calendarId.value = calendarsStore.defaultCalendarId ?? ''
  }
)

function close(): void {
  ui.qaPop = null
}

const repeatLabel = computed(() => REPEAT_LABELS[repeat.value])

function cycleRepeat(): void {
  const next = (REPEAT_CYCLE.indexOf(repeat.value) + 1) % REPEAT_CYCLE.length
  repeat.value = REPEAT_CYCLE[next]!
}

function onAdd(): void {
  // Defensive second layer: the popover itself only opens from views already behind the
  // isLoading gate, but a save button race (e.g. isLoading flips true again mid-edit) is cheap
  // to guard here too.
  if (!ui.qaPop || !title.value.trim() || tasksStore.isLoading) return
  const { time, endTime } = ui.qaPop
  const task = mkTask({
    date: date.value,
    calendarId: calendarId.value || calendarsStore.defaultCalendarId!,
    title: title.value.trim(),
    type: type.value === 'event' ? 'event' : 'quadrant',
    allDay: type.value === 'event' ? allDay.value : false,
    start: type.value === 'event' && allDay.value ? '' : start.value || time || '09:00',
    end: type.value === 'event' && allDay.value ? '' : end.value || endTime || '10:00',
    important: type.value === 'task' ? quad.value === 'do' || quad.value === 'plan' : false,
    urgent: type.value === 'task' ? quad.value === 'do' || quad.value === 'quick' : false,
    backgroundColor: type.value === 'event' ? color.value : null,
    icon: type.value === 'event' ? icon.value : null,
    repeat: repeat.value,
    reminder: reminder.value
  })
  tasksStore.saveTask(task)
  close()
}
</script>
