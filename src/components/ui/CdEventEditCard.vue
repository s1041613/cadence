<template>
  <div class="cd-edit-card">
    <div class="cd-edit-card__head">
      <button v-if="!isNew" type="button" class="cd-edit-card__back" @click="emit('back')">
        <CdIcon name="chevron-left" :size="14" color="var(--cd-ink-2)" />
        Edit
      </button>
    </div>

    <input
      class="cd-edit-card__title"
      :value="title"
      :autofocus="isNew"
      :placeholder="isNew ? (type === 'task' ? 'Task name' : 'Event name') : 'Event name'"
      @input="emit('update:title', ($event.target as HTMLInputElement).value)"
    />

    <div class="cd-edit-card__scroll">
      <CdSegmented
        class="cd-edit-card__type"
        :model-value="type"
        :options="[{ value: 'event', label: 'Event' }, { value: 'task', label: 'Task' }]"
        @update:model-value="(v) => emit('update:type', v as 'event' | 'task')"
      />

    <div v-if="type === 'event'" class="cd-edit-card__style-row">
      <span class="cd-edit-card__field-icon">
        <CdIcon name="brush" :size="18" color="#9C9E94" />
      </span>
      <span class="cd-edit-card__style-label">Style</span>
      <button type="button" class="cd-edit-card__style-trigger" aria-label="Edit style" @click="appearanceOpen = true">
        <span class="cd-edit-card__style-dot" :style="{ background: color }">
          <CdIcon v-if="iconName" :name="iconName" :size="11" color="#fff" />
        </span>
        <CdIcon name="chevron-right" :size="14" color="#9C9E94" />
      </button>
    </div>

    <div v-if="type === 'task'" class="cd-edit-card__matrix">
      <div class="cd-edit-card__matrix-top">
        <span class="cd-edit-card__matrix-axis-label">URGENT</span>
        <span class="cd-edit-card__matrix-axis-label">NOT URGENT</span>
      </div>
      <div class="cd-edit-card__matrix-body">
        <div class="cd-edit-card__matrix-left-axis">
          <span class="cd-edit-card__matrix-axis-label cd-edit-card__matrix-axis-label--vertical">IMPORTANT</span>
          <span class="cd-edit-card__matrix-axis-label cd-edit-card__matrix-axis-label--vertical cd-edit-card__matrix-axis-label--dim">NOT</span>
        </div>
        <div class="cd-edit-card__matrix-grid">
          <button
            v-for="q in matrixOptions"
            :key="q.k"
            type="button"
            class="cd-edit-card__matrix-cell"
            :class="{ 'cd-edit-card__matrix-cell--selected': quad === q.k }"
            :style="quad === q.k ? { borderColor: quadColor(q.k), background: quadColor(q.k), boxShadow: `0 5px 12px -7px ${quadColor(q.k)}` } : { borderColor: 'var(--cd-line)', '--cd-matrix-hover': `${quadColor(q.k)}88` }"
            @click="emit('update:quad', q.k)"
          >
            <span class="cd-edit-card__matrix-cell-label" :style="{ color: quad === q.k ? '#fff' : quadColor(q.k) }">{{ q.l }}</span>
            <span class="cd-edit-card__matrix-cell-sub" :style="{ color: quad === q.k ? 'rgba(255,255,255,.82)' : 'var(--cd-muted)' }">{{ q.s }}</span>
          </button>
        </div>
      </div>
    </div>

    <div class="cd-edit-card__when-row">
      <span class="cd-edit-card__field-icon">
        <CdIcon name="calendar" :size="18" color="#9C9E94" />
      </span>
      <div class="cd-edit-card__when-content">
        <div v-if="type === 'event'" class="cd-edit-card__allday-row">
          <span class="cd-edit-card__label">All-day</span>
          <CdSwitch :model-value="allDay" size="34x19" @update:model-value="(v) => emit('update:allDay', v)" />
        </div>
        <div class="cd-edit-card__time-row">
          <span class="cd-edit-card__time-label">Starts</span>
          <CdDatePicker :model-value="date" @update:model-value="(v) => emit('update:date', v)" />
          <CdTimeDropdown v-if="!effectiveAllDay" :model-value="start" :format="timeFormat" @update:model-value="(v) => emit('update:start', v)" />
        </div>
        <div class="cd-edit-card__time-row">
          <span class="cd-edit-card__time-label">Ends</span>
          <CdDatePicker :model-value="date" @update:model-value="(v) => emit('update:date', v)" />
          <CdTimeDropdown v-if="!effectiveAllDay" :model-value="end" :format="timeFormat" @update:model-value="(v) => emit('update:end', v)" />
        </div>
        <p v-if="timeInvalid" class="cd-edit-card__time-warning">⚠ End time must be after start time</p>
        <div v-else-if="type === 'task'" class="cd-edit-card__pomodoro-estimate">
          <CdIcon name="tomato" :size="16" />
          <span>{{ pomodoroCount }} pomodoro{{ pomodoroCount === 1 ? '' : 's' }}</span>
          <span class="cd-edit-card__pomodoro-cycle">25 min focus · 5 min break</span>
        </div>
      </div>
    </div>

    <button type="button" class="cd-edit-card__more-toggle" @click="moreOpen = !moreOpen">
      <span>{{ moreOpen ? 'Fewer options' : 'More options' }}</span>
      <span class="cd-edit-card__more-chevron" :class="{ 'cd-edit-card__more-chevron--open': moreOpen }">
        <CdIcon name="chevron-down" :size="14" />
      </span>
    </button>

    <div v-if="moreOpen" class="cd-edit-card__more-body">
      <div class="cd-edit-card__field-row">
        <span class="cd-edit-card__field-icon">
          <CdIcon name="bell" :size="18" color="#9C9E94" />
        </span>
        <button type="button" class="cd-edit-card__pill-btn" @click="emit('openAlertMenu')">{{ alertLabel }}</button>
      </div>
      <div class="cd-edit-card__field-row">
        <span class="cd-edit-card__field-icon">
          <CdIcon name="repeat" :size="18" color="#9C9E94" />
        </span>
        <CdRepeatPill :label="repeatLabel" @cycle="emit('cycleRepeat')" />
      </div>
      <div class="cd-edit-card__field-row">
        <span class="cd-edit-card__field-icon">
          <CdIcon name="globe" :size="18" color="#9C9E94" />
        </span>
        <input
          class="cd-edit-card__input"
          :value="location"
          placeholder="Add location"
          @input="emit('update:location', ($event.target as HTMLInputElement).value)"
        />
      </div>
      <div class="cd-edit-card__divider" />
      <div class="cd-edit-card__field-row cd-edit-card__field-row--top">
        <span class="cd-edit-card__field-icon" style="margin-top: 2px">
          <CdIcon name="notes" :size="18" color="#9C9E94" />
        </span>
        <textarea
          class="cd-edit-card__textarea"
          :value="notes"
          placeholder="Add notes…"
          rows="2"
          @input="emit('update:notes', ($event.target as HTMLTextAreaElement).value)"
        />
      </div>
    </div>
    </div>

    <div class="cd-edit-card__footer">
      <button v-if="isNew" type="button" class="cd-edit-card__cancel" @click="emit('cancel')">Cancel</button>
      <button v-else type="button" class="cd-edit-card__delete" @click="emit('delete')">
        <CdIcon name="trash" :size="15" />
        Delete
      </button>
      <button
        type="button"
        class="cd-edit-card__save"
        :class="{ 'cd-edit-card__save--disabled': timeInvalid }"
        @click="!timeInvalid && emit('save')"
      >
        {{ isNew ? 'Add' : 'Save' }}
      </button>
    </div>

    <CdAppearancePicker
      v-if="appearanceOpen && type === 'event'"
      :icon="icon"
      :color="color"
      @close="appearanceOpen = false"
      @remove="emit('removeIcon')"
      @pick-icon="(v) => emit('update:icon', v)"
      @pick-color="(v) => emit('update:color', v)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import CdSegmented from './CdSegmented.vue'
import CdSwitch from './CdSwitch.vue'
import CdTimeDropdown from './CdTimeDropdown.vue'
import CdDatePicker from './CdDatePicker.vue'
import CdRepeatPill from './CdRepeatPill.vue'
import CdAppearancePicker from './CdAppearancePicker.vue'
import CdIcon from './CdIcon.vue'
import { autoPoms, minutes, type TimeFormatName } from '@/utils/convert-date-time'
import type { IconName } from './icons'

// CdEventEditCard — Event/Task edit popover (same popover swaps between preview/edit, no slide
// transition). design-research-report.md §3.9. desk width 388px.
//
// Event rows use the handoff's Style push subview for color/icon. Tasks show the quadrant matrix.
//
// CADENCE Handoff: event swatches use the handoff's cool event palette (#4A8B85 #63996B #6863B0
// #8E6FB0 #A56D91 #4C4E57) — deliberately distinct from the warm/slate quadrant palette so the two
// classification systems stay visually distinguishable. 38px circles; selected state ring changed
// to `box-shadow: 0 0 0 3px #F1EFE8, 0 0 0 5px {c}` (was `0 0 0 2px #fff, 0 0 0 4px {c}`).
//
// CADENCE Handoff: time validation — when not all-day and end <= start, show a warning below the
// time rows and disable Save (no save emit) until the range is valid again.
const QUAD_COLORS: Record<string, string> = {
  do: '#C56A5E',
  plan: '#6E839B',
  quick: '#BFA86A',
  later: '#9A988F'
}

function quadColor(k: string): string {
  return QUAD_COLORS[k] ?? '#9A988F'
}

const props = withDefaults(
  defineProps<{
    isNew: boolean
    title: string
    type: 'event' | 'task'
    quad: 'do' | 'plan' | 'quick' | 'later'
    color?: string
    icon?: string | null
    allDay: boolean
    date: string
    start: string
    end: string
    alertLabel: string
    repeatLabel: string
    location: string
    notes: string
    estimatedPomodoros?: number
    timeFormat?: TimeFormatName
  }>(),
  { color: '#E3A75C', icon: null, timeFormat: '24-Hour' }
)

const emit = defineEmits<{
  back: []
  cancel: []
  delete: []
  save: []
  'update:title': [value: string]
  'update:type': [value: 'event' | 'task']
  'update:quad': [value: 'do' | 'plan' | 'quick' | 'later']
  'update:color': [value: string]
  'update:icon': [value: IconName]
  removeIcon: []
  'update:allDay': [value: boolean]
  'update:date': [value: string]
  'update:start': [value: string]
  'update:end': [value: string]
  'update:location': [value: string]
  'update:notes': [value: string]
  cycleRepeat: []
  openAlertMenu: []
}>()

const moreOpen = ref(false)
const appearanceOpen = ref(false)

const effectiveAllDay = computed(() => (props.type === 'task' ? false : props.allDay))
const timeInvalid = computed(() => !effectiveAllDay.value && minutes(props.end) <= minutes(props.start))
const pomodoroCount = computed(() => props.estimatedPomodoros ?? autoPoms({ allDay: false, start: props.start, end: props.end }))
const iconName = computed<IconName | null>(() => (props.icon && isIconName(props.icon) ? props.icon : null))

function isIconName(value: string): value is IconName {
  return ICON_NAMES.has(value)
}

const ICON_NAMES = new Set<string>(['copy', 'pencil', 'trash', 'journal', 'spark', 'bell', 'target', 'search', 'calendar', 'clock', 'check', 'image', 'repeat', 'location', 'notes', 'info', 'sync', 'mail', 'reset', 'spark-mono', 'journal-plain', 'calendar-alt', 'tomato', 'view-day', 'view-week', 'view-month', 'view-list', 'gear'])

const matrixOptions = [
  { k: 'do' as const, l: 'Do Now', s: 'Right away' },
  { k: 'plan' as const, l: 'Plan', s: 'Schedule it' },
  { k: 'quick' as const, l: 'Quick', s: 'Quick win' },
  { k: 'later' as const, l: 'Later', s: 'When free' }
]
</script>

<style scoped>
.cd-edit-card {
  width: 388px;
  background: #fff;
  border: 1px solid var(--cd-line-4);
  border-radius: var(--cd-radius-preview);
  display: flex;
  flex-direction: column;
  height: min(600px, calc(100dvh - 24px));
  max-height: min(600px, calc(100dvh - 24px));
  overflow: hidden;
}

@media (max-width: 899px) {
  .cd-edit-card {
    width: 100%;
    border: none;
    border-radius: 0;
  }
}

.cd-edit-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px 8px;
}

.cd-edit-card__back {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  border: none;
  background: transparent;
  cursor: pointer;
  font: 800 12px var(--cd-font-mono);
  text-transform: uppercase;
  color: var(--cd-ink-2);
}

.cd-edit-card__title {
  flex: none;
  width: 100%;
  box-sizing: border-box;
  border: none;
  outline: none;
  background: transparent;
  font: 700 18px var(--cd-font-title);
  color: var(--cd-ink);
  padding: 0 16px 12px;
}

.cd-edit-card__type {
  margin: 0 16px 2px;
}

.cd-edit-card__scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(120, 116, 100, 0.28) transparent;
}

.cd-edit-card__style-row {
  flex: none;
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 11px 16px;
}

.cd-edit-card__style-label {
  flex: 1;
  min-width: 0;
  font: 600 13px var(--cd-font-title);
  color: var(--cd-ink);
}

.cd-edit-card__style-trigger {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--cd-line);
  background: #fff;
  border-radius: 11px;
  padding: 5px 7px;
  cursor: pointer;
}

.cd-edit-card__style-dot {
  width: 22px;
  height: 22px;
  flex: none;
  border-radius: 50%;
  display: grid;
  place-items: center;
}

.cd-edit-card__matrix {
  padding: 12px 16px 4px;
}

.cd-edit-card__matrix-top {
  display: flex;
  padding-left: 20px;
  margin-bottom: 5px;
}

.cd-edit-card__matrix-axis-label {
  flex: 1;
  text-align: center;
  font: 800 8.5px var(--cd-font-mono);
  letter-spacing: 0.1em;
  color: #b0ad9f;
}

.cd-edit-card__matrix-body {
  display: flex;
  gap: 6px;
}

.cd-edit-card__matrix-left-axis {
  width: 14px;
  flex: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.cd-edit-card__matrix-axis-label--vertical {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  letter-spacing: 0.08em;
}

.cd-edit-card__matrix-axis-label--dim {
  color: #cfccc1;
  letter-spacing: 0.06em;
}

.cd-edit-card__matrix-grid {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.cd-edit-card__matrix-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: flex-start;
  border: 1.5px solid var(--cd-line);
  background: #fff;
  border-radius: var(--cd-radius-matrix);
  padding: 9px 11px;
  cursor: pointer;
  text-align: left;
  box-shadow: none;
  transition: border-color var(--cd-duration-micro-2), background var(--cd-duration-micro-2);
}

.cd-edit-card__matrix-cell:not(.cd-edit-card__matrix-cell--selected):hover {
  border-color: var(--cd-matrix-hover);
}

.cd-edit-card__matrix-cell-label {
  font: 800 13px var(--cd-font-title);
}

.cd-edit-card__matrix-cell-sub {
  font: 600 9.5px var(--cd-font-title);
}

.cd-edit-card__when-row {
  display: flex;
  align-items: flex-start;
  gap: 13px;
  padding: 11px 16px;
}

.cd-edit-card__field-icon {
  margin-top: 0;
  flex: none;
  width: 20px;
  min-height: 34px;
  display: grid;
  place-items: center;
}

.cd-edit-card__when-row > .cd-edit-card__field-icon {
  padding-top: 8px;
  min-height: 0;
  align-self: flex-start;
}

.cd-edit-card__when-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cd-edit-card__allday-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.cd-edit-card__label {
  font: 600 13.5px var(--cd-font-ui);
  color: var(--cd-ink);
}

.cd-edit-card__time-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 30px;
}

/* Label sits left; the date pill + time dropdown form a content-width group pushed to the right
   edge via margin-left:auto on the date picker. The pills hug their text (no stretched dead zone),
   and because Starts/Ends share the same date + time-slot widths, the group is right-aligned and
   the two rows line up on the right. */
.cd-edit-card__time-label {
  flex: none;
  width: 46px;
  font: 600 12.5px var(--cd-font-ui);
  color: var(--cd-muted);
}

.cd-edit-card__time-row > .cd-date-picker {
  flex: none;
  margin-left: auto;
}

.cd-edit-card__time-row > .cd-time-dropdown {
  flex: none;
}

.cd-edit-card__time-warning {
  margin: 2px 0 0;
  font: 600 11.5px var(--cd-font-ui);
  color: #c0564b;
}

.cd-edit-card__pomodoro-estimate {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 11px;
  border: 1px solid rgba(179, 172, 145, 0.4);
  border-radius: 10px;
  background: rgba(179, 172, 145, 0.14);
  font: 600 12.5px var(--cd-font-ui);
  color: var(--cd-ink);
}

.cd-edit-card__pomodoro-cycle {
  margin-left: auto;
  font: 600 11px var(--cd-font-mono);
  color: var(--cd-muted);
}

.cd-edit-card__more-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 8px 16px;
  font: 600 13px var(--cd-font-ui);
  color: var(--cd-ink-2);
}

.cd-edit-card__more-chevron {
  display: flex;
  transition: transform var(--cd-duration-micro-5);
}

.cd-edit-card__more-chevron--open {
  transform: rotate(180deg);
}

.cd-edit-card__more-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  animation: cd-scrimIn var(--cd-duration-scrim) ease;
}

.cd-edit-card__field-row {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 7px 16px;
  min-height: 48px;
  box-sizing: border-box;
}

.cd-edit-card__field-row--top {
  align-items: flex-start;
}

.cd-edit-card__field-row--top .cd-edit-card__field-icon {
  align-self: flex-start;
}

.cd-edit-card__pill-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--cd-line);
  background: #fff;
  border-radius: 9px;
  padding: 7px 12px;
  cursor: pointer;
  font: 600 13px var(--cd-font-title);
  color: var(--cd-ink);
}

.cd-edit-card__pill-btn:hover {
  background: rgba(86, 88, 94, 0.04);
}

.cd-edit-card__input,
.cd-edit-card__textarea {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font: 600 13.5px var(--cd-font-ui);
  color: var(--cd-ink);
  padding: 2px 0;
}

.cd-edit-card__textarea {
  resize: none;
  line-height: 1.5;
  min-height: 42px;
}

.cd-edit-card__textarea:placeholder-shown {
  min-height: 34px;
  height: 34px;
  line-height: 34px;
  padding-top: 0;
  padding-bottom: 0;
}

.cd-edit-card__divider {
  height: 1px;
  margin: 2px 16px;
  background: var(--cd-line);
}

.cd-edit-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: none;
  margin-top: 6px;
  padding: 12px 16px 35px;
  border-top: 1px solid var(--cd-line);
  background: #fff;
}

.cd-edit-card__cancel {
  border: none;
  background: transparent;
  cursor: pointer;
  font: 600 13px var(--cd-font-ui);
  color: var(--cd-ink-2);
}

.cd-edit-card__delete {
  display: flex;
  align-items: center;
  gap: 6px;
  border: none;
  background: transparent;
  cursor: pointer;
  font: 600 13px var(--cd-font-ui);
  color: var(--cd-danger-2);
  padding: 6px 8px;
  border-radius: 8px;
}

.cd-edit-card__delete:hover {
  background: rgba(192, 86, 75, 0.08);
}

.cd-edit-card__save {
  margin-left: auto;
  background: var(--cd-olive);
  color: #fff;
  font: 700 13px var(--cd-font-ui);
  border: none;
  border-radius: 10px;
  padding: 9px 24px;
  cursor: pointer;
}

.cd-edit-card__save--disabled {
  opacity: 0.4;
  pointer-events: none;
}
</style>
