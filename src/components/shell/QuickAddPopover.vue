<template>
  <CdPopover v-if="ui.qaPop && isDesktop" :anchor="ui.qaPop.anchor" :width="388" :approx-height="520" caret @scrim-click="close">
    <CdEventEditCard
      is-new
      :title="title"
      :type="type"
      :quad="quad"
      :color="color"
      :icon="icon"
      :all-day="allDay"
      :date-label="dateLabel"
      :start="start"
      :end="end"
      alert-label="No reminder"
      :repeat-label="repeatLabel"
      location=""
      notes=""
      :time-format="settings.timeFormat"
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
      @update:start="(v) => (start = v)"
      @update:end="(v) => (end = v)"
      @cycle-repeat="cycleRepeat"
      @update:location="() => undefined"
      @update:notes="() => undefined"
      @save="onAdd"
    />
  </CdPopover>
  <CdDrawerOrSheet v-else-if="ui.qaPop" presentation="sheet" scrim-color="var(--cd-scrim-mid)" @scrim-click="close">
    <CdEventEditCard
      is-new
      :title="title"
      :type="type"
      :quad="quad"
      :color="color"
      :icon="icon"
      :all-day="allDay"
      :date-label="dateLabel"
      :start="start"
      :end="end"
      alert-label="No reminder"
      :repeat-label="repeatLabel"
      location=""
      notes=""
      :time-format="settings.timeFormat"
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
      @update:start="(v) => (start = v)"
      @update:end="(v) => (end = v)"
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
import { useUiStore } from '@/stores/ui-store'
import { useTasksStore, mkTask } from '@/stores/tasks-store'
import { useSettingsStore } from '@/stores/settings-store'
import { useBreakpoint } from '@/composables/use-breakpoint'
import { parseISO } from '@/utils/convert-date-time'
import type { IconName } from '@/components/ui/icons'
import type { RepeatMode } from '@/types/task'

// QuickAddPopover — feature-layer composition for the Quick-Add overlay (design.md "5.1"): reads
// ui.qaPop (anchor/date/time captured by Month/Day/Week click handlers) opens the handoff's New
// Event/Task edit card directly. Despite the historical file name, this is not the old lightweight
// quick-add card.
const ui = useUiStore()
const tasksStore = useTasksStore()
const settings = useSettingsStore()
const { isDesktop } = useBreakpoint()

const title = ref('')
const type = ref<'task' | 'event'>('event')
const quad = ref<'do' | 'plan' | 'quick' | 'later'>('do')
const color = ref('#E3A75C')
const icon = ref<IconName | null>(null)
const allDay = ref(false)
const start = ref('09:00')
const end = ref('09:30')
const repeat = ref<RepeatMode>('none')

const REPEAT_LABELS: Record<RepeatMode, string> = {
  none: 'Does not repeat',
  daily: 'Every day',
  weekly: 'Every week',
  monthly: 'Every month'
}
const REPEAT_CYCLE: RepeatMode[] = ['none', 'daily', 'weekly', 'monthly']

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
    start.value = pop.time ?? '09:00'
    end.value = pop.endTime ?? '10:00'
    repeat.value = 'none'
  }
)

const dateLabel = computed(() => {
  if (!ui.qaPop) return ''
  const d = parseISO(ui.qaPop.date)
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(d)
})

function close(): void {
  ui.qaPop = null
}

const repeatLabel = computed(() => REPEAT_LABELS[repeat.value])

function cycleRepeat(): void {
  const next = (REPEAT_CYCLE.indexOf(repeat.value) + 1) % REPEAT_CYCLE.length
  repeat.value = REPEAT_CYCLE[next]!
}

function onAdd(): void {
  if (!ui.qaPop || !title.value.trim()) return
  const { date, time, endTime } = ui.qaPop
  const task = mkTask({
    date,
    title: title.value.trim(),
    type: type.value === 'event' ? 'event' : 'quadrant',
    allDay: type.value === 'event' ? allDay.value : false,
    start: type.value === 'event' && allDay.value ? '' : start.value || time || '09:00',
    end: type.value === 'event' && allDay.value ? '' : end.value || endTime || '10:00',
    important: type.value === 'task' ? quad.value === 'do' || quad.value === 'plan' : false,
    urgent: type.value === 'task' ? quad.value === 'do' || quad.value === 'quick' : false,
    backgroundColor: type.value === 'event' ? color.value : null,
    icon: type.value === 'event' ? icon.value : null,
    repeat: repeat.value
  })
  tasksStore.saveTask(task)
  close()
}
</script>
