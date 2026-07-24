<template>
  <div class="pv2-edit-card">
    <button v-if="!isNew" type="button" class="pv2-edit-card__back" @click="emit('back')">‹ EDIT</button>

    <input
      class="pv2-edit-card__title"
      :value="title"
      :autofocus="isNew"
      :placeholder="isNew ? (type === 'task' ? 'Task name' : 'Event name') : 'Event name'"
      @input="emit('update:title', ($event.target as HTMLInputElement).value)"
    />

    <div class="pv2-edit-card__scroll">
      <CdSegmented
        class="pv2-edit-card__type"
        :model-value="type"
        :options="[{ value: 'event', label: 'Event' }, { value: 'task', label: 'Task' }]"
        @update:model-value="(v) => emit('update:type', v as 'event' | 'task')"
      />

      <div v-if="type === 'event'" class="pv2-edit-card__line">
        <span class="pv2-edit-card__label">STYLE</span>
        <button type="button" class="pv2-edit-card__style" aria-label="Edit style" @click="appearanceOpen = true">
          <span class="pv2-edit-card__style-dot" :style="{ background: color }">
            <CdIcon v-if="iconName" :name="iconName" :size="11" color="#fff" />
          </span>
          <span>›</span>
        </button>
      </div>

      <div v-if="type === 'event'" class="pv2-edit-card__line">
        <span class="pv2-edit-card__label">ALL-DAY</span>
        <CdSwitch :model-value="allDay" size="34x19" @update:model-value="(v) => emit('update:allDay', v)" />
      </div>

      <div v-if="type === 'task'" class="pv2-edit-card__matrix">
        <div class="pv2-edit-card__matrix-head">
          <span>URGENT</span>
          <span>NOT URGENT</span>
        </div>
        <div class="pv2-edit-card__matrix-grid">
          <button
            v-for="q in matrixOptions"
            :key="q.k"
            type="button"
            class="pv2-edit-card__matrix-cell"
            :class="{ 'pv2-edit-card__matrix-cell--selected': quad === q.k }"
            :style="quad === q.k ? { background: q.color, borderColor: q.color } : { '--pv2-quad': q.color }"
            @click="emit('update:quad', q.k)"
          >
            <span>{{ q.l }}</span>
            <small>{{ q.s }}</small>
          </button>
        </div>
      </div>

      <div class="pv2-edit-card__line pv2-edit-card__line--time">
        <span class="pv2-edit-card__label">STARTS</span>
        <div class="pv2-edit-card__time-controls">
          <CdDatePicker :model-value="date" @update:model-value="(v) => emit('update:date', v)" />
          <CdTimeDropdown v-if="!effectiveAllDay" :model-value="start" :format="timeFormat" @update:model-value="(v) => emit('update:start', v)" />
        </div>
      </div>
      <div class="pv2-edit-card__line pv2-edit-card__line--time">
        <span class="pv2-edit-card__label">ENDS</span>
        <div class="pv2-edit-card__time-controls">
          <CdDatePicker :model-value="date" @update:model-value="(v) => emit('update:date', v)" />
          <CdTimeDropdown v-if="!effectiveAllDay" :model-value="end" :format="timeFormat" @update:model-value="(v) => emit('update:end', v)" />
        </div>
      </div>
      <p v-if="timeInvalid" class="pv2-edit-card__warning">End time must be after start time</p>
      <p v-else-if="type === 'task'" class="pv2-edit-card__estimate">{{ pomodoroCount }} pomodoros · 25 min · 5 min</p>

      <button type="button" class="pv2-edit-card__more" @click="moreOpen = !moreOpen">
        {{ moreOpen ? 'FEWER OPTIONS' : 'MORE OPTIONS' }}
        <span :class="{ 'pv2-edit-card__more-icon--open': moreOpen }">⌄</span>
      </button>

      <div v-if="moreOpen" class="pv2-edit-card__more-body">
        <div v-if="calendarOptions && calendarOptions.length > 1" class="pv2-edit-card__line">
          <span class="pv2-edit-card__label">CALENDAR</span>
          <select class="pv2-edit-card__select" :value="calendarId ?? ''" @change="emit('update:calendarId', ($event.target as HTMLSelectElement).value)">
            <option v-for="option in calendarOptions" :key="option.id" :value="option.id">{{ option.name }}</option>
          </select>
        </div>
        <div class="pv2-edit-card__line">
          <span class="pv2-edit-card__label">REMINDER</span>
          <CdReminderPill :model-value="reminder" @update:model-value="(v) => emit('update:reminder', v)" />
        </div>
        <div class="pv2-edit-card__line">
          <span class="pv2-edit-card__label">REPEAT</span>
          <CdRepeatPill :label="repeatLabel" @cycle="emit('cycleRepeat')" />
        </div>
        <label class="pv2-edit-card__field">
          <span class="pv2-edit-card__label">LOCATION</span>
          <input :value="location" placeholder="Add location" @input="emit('update:location', ($event.target as HTMLInputElement).value)" />
        </label>
        <label class="pv2-edit-card__field pv2-edit-card__field--notes">
          <span class="pv2-edit-card__label">NOTES</span>
          <textarea :value="notes" placeholder="Add notes" rows="3" @input="emit('update:notes', ($event.target as HTMLTextAreaElement).value)" />
        </label>
      </div>
    </div>

    <div class="pv2-edit-card__footer">
      <button v-if="isNew" type="button" class="pv2-edit-card__delete" @click="emit('cancel')">CANCEL</button>
      <button v-else type="button" class="pv2-edit-card__delete" @click="emit('delete')">DELETE</button>
      <button type="button" class="pv2-edit-card__save" :disabled="timeInvalid" @click="!timeInvalid && emit('save')">
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
import CdAppearancePicker from '@/components/ui/CdAppearancePicker.vue'
import CdDatePicker from '@/components/ui/CdDatePicker.vue'
import CdIcon from '@/components/ui/CdIcon.vue'
import CdReminderPill from '@/components/ui/CdReminderPill.vue'
import CdRepeatPill from '@/components/ui/CdRepeatPill.vue'
import CdSegmented from '@/components/ui/CdSegmented.vue'
import CdSwitch from '@/components/ui/CdSwitch.vue'
import CdTimeDropdown from '@/components/ui/CdTimeDropdown.vue'
import { autoPoms, minutes, type TimeFormatName } from '@/utils/convert-date-time'
import type { IconName } from '@/components/ui/icons'
import type { ReminderPreset } from '@/types/task'

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
    reminder: ReminderPreset | null
    repeatLabel: string
    location: string
    notes: string
    estimatedPomodoros?: number
    timeFormat?: TimeFormatName
    calendarOptions?: Array<{ id: string; name: string }>
    calendarId?: string | null
  }>(),
  { color: '#E3A75C', icon: null, timeFormat: '24-Hour', calendarId: null }
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
  'update:reminder': [value: ReminderPreset | null]
  'update:location': [value: string]
  'update:notes': [value: string]
  cycleRepeat: []
  'update:calendarId': [value: string]
}>()

const moreOpen = ref(false)
const appearanceOpen = ref(false)

const ICON_NAMES = new Set<string>(['copy', 'pencil', 'trash', 'journal', 'spark', 'bell', 'target', 'search', 'calendar', 'clock', 'check', 'image', 'repeat', 'location', 'notes', 'info', 'sync', 'mail', 'reset', 'spark-mono', 'journal-plain', 'calendar-alt', 'tomato', 'view-day', 'view-week', 'view-month', 'view-list', 'gear'])
const iconName = computed<IconName | null>(() => (props.icon && ICON_NAMES.has(props.icon) ? (props.icon as IconName) : null))
const effectiveAllDay = computed(() => (props.type === 'task' ? false : props.allDay))
const timeInvalid = computed(() => !effectiveAllDay.value && minutes(props.end) <= minutes(props.start))
const pomodoroCount = computed(() => props.estimatedPomodoros ?? autoPoms({ allDay: false, start: props.start, end: props.end }))

const matrixOptions = [
  { k: 'do' as const, l: 'Do Now', s: 'Right away', color: '#C56A5E' },
  { k: 'plan' as const, l: 'Plan', s: 'Schedule it', color: '#6E839B' },
  { k: 'quick' as const, l: 'Quick', s: 'Quick win', color: '#BFA86A' },
  { k: 'later' as const, l: 'Later', s: 'When free', color: '#9A988F' }
]
</script>

<style scoped>
.pv2-edit-card {
  width: 388px;
  height: min(640px, calc(100dvh - 24px));
  max-height: min(640px, calc(100dvh - 24px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #d8d2c5;
  border-radius: 8px;
  background: #fff;
  color: #1b1b1b;
}

@media (max-width: 899px) {
  .pv2-edit-card {
    width: 100%;
    border: none;
    border-radius: 0;
  }
}

.pv2-edit-card__back {
  align-self: flex-start;
  margin: 16px 18px 0;
  border: none;
  background: transparent;
  color: #4b4943;
  cursor: pointer;
  font: 800 11px var(--cd-font-mono);
}

.pv2-edit-card__title {
  flex: none;
  width: calc(100% - 36px);
  margin: 12px 18px 0;
  padding: 0 0 14px;
  border: none;
  border-bottom: 1.5px solid #1b1b1b;
  outline: none;
  background: transparent;
  color: #1b1b1b;
  font: 500 32px/1.04 var(--cd-font-serif);
}

.pv2-edit-card__scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 16px 18px 0;
  scrollbar-width: thin;
}

.pv2-edit-card__type {
  margin-bottom: 12px;
}

.pv2-edit-card__line {
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  min-height: 48px;
  border-bottom: 1px solid #e3ded2;
}

.pv2-edit-card__line--time {
  align-items: start;
  padding: 10px 0;
}

.pv2-edit-card__label,
.pv2-edit-card__matrix-head {
  font: 800 10px var(--cd-font-mono);
  color: #777168;
}

.pv2-edit-card__style {
  justify-self: end;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  border: none;
  background: transparent;
  color: #1b1b1b;
  cursor: pointer;
  font: 700 20px var(--cd-font-ui);
}

.pv2-edit-card__style-dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
}

.pv2-edit-card__matrix {
  padding: 7px 0 14px;
  border-bottom: 1px solid #e3ded2;
}

.pv2-edit-card__matrix-head {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  padding-left: 0;
  margin-bottom: 8px;
  text-align: center;
}

.pv2-edit-card__matrix-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.pv2-edit-card__matrix-cell {
  min-height: 72px;
  border: 1px solid #d8d2c5;
  border-radius: 6px;
  background: #fff;
  color: var(--pv2-quad);
  cursor: pointer;
  text-align: left;
  padding: 12px;
}

.pv2-edit-card__matrix-cell span,
.pv2-edit-card__matrix-cell small {
  display: block;
}

.pv2-edit-card__matrix-cell span {
  font: 800 14px var(--cd-font-ui);
}

.pv2-edit-card__matrix-cell small {
  margin-top: 4px;
  color: #777168;
  font: 600 11px var(--cd-font-ui);
}

.pv2-edit-card__matrix-cell--selected,
.pv2-edit-card__matrix-cell--selected small {
  color: #fff;
}

.pv2-edit-card__time-controls {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.pv2-edit-card__warning,
.pv2-edit-card__estimate {
  margin: 8px 0 0 104px;
  font: 700 12px var(--cd-font-ui);
}

.pv2-edit-card__warning {
  color: #9f3e36;
}

.pv2-edit-card__estimate {
  color: #777168;
}

.pv2-edit-card__more {
  width: 100%;
  min-height: 44px;
  border: none;
  border-bottom: 1px solid #e3ded2;
  background: transparent;
  color: #4b4943;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font: 800 10px var(--cd-font-mono);
}

.pv2-edit-card__more-icon--open {
  transform: rotate(180deg);
}

.pv2-edit-card__select,
.pv2-edit-card__field input,
.pv2-edit-card__field textarea {
  width: 100%;
  border: 1px solid #d8d2c5;
  border-radius: 6px;
  background: #fff;
  color: #1b1b1b;
  font: 700 13px var(--cd-font-ui);
}

.pv2-edit-card__select {
  min-height: 34px;
  padding: 0 10px;
}

.pv2-edit-card__field {
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr);
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #e3ded2;
}

.pv2-edit-card__field input,
.pv2-edit-card__field textarea {
  padding: 9px 10px;
  outline: none;
}

.pv2-edit-card__field textarea {
  resize: vertical;
  min-height: 72px;
}

.pv2-edit-card__footer {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px 16px;
  border-top: 1px solid #d8d2c5;
  background: #fff;
}

.pv2-edit-card__delete,
.pv2-edit-card__save {
  height: 40px;
  border-radius: 6px;
  cursor: pointer;
  font: 800 12px var(--cd-font-ui);
}

.pv2-edit-card__delete {
  border: none;
  background: transparent;
  color: #9f3e36;
}

.pv2-edit-card__save {
  min-width: 92px;
  border: none;
  background: #1b1b1b;
  color: #fff;
}

.pv2-edit-card__save:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
</style>
