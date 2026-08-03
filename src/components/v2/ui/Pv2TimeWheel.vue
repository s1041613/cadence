<template>
  <!--
    Two-column time wheel (hours + minutes at MINUTE_STEP), 24-hour only. Scrolling either
    column commits immediately — there is no confirm button. The centred highlight pill is
    drawn here rather than in Pv2WheelColumn because the month/year sheet deliberately has
    no highlight band; only this wheel wants one.
  -->
  <div class="pv2-time-wheel" :style="{ '--pv2-tw-frame': `${FRAME_H}px`, '--pv2-tw-pill-top': `${PILL_TOP}px`, '--pv2-tw-row': `${ROW_H}px` }">
    <div class="pv2-time-wheel__pill" />
    <div class="pv2-time-wheel__cols">
      <Pv2WheelColumn
        :items="hourItems"
        :model-value="hour"
        :visible-count="VISIBLE_ROWS"
        :ariaLabel="`${ariaLabel} hour`"
        @update:model-value="(v) => commit(Number(v), minute)"
      />
      <span class="pv2-time-wheel__sep" aria-hidden="true">:</span>
      <Pv2WheelColumn
        :items="minuteItems"
        :model-value="minute"
        :visible-count="VISIBLE_ROWS"
        :ariaLabel="`${ariaLabel} minute`"
        @update:model-value="(v) => commit(hour, Number(v))"
      />
    </div>
    <div class="pv2-time-wheel__fade pv2-time-wheel__fade--top" />
    <div class="pv2-time-wheel__fade pv2-time-wheel__fade--bottom" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Pv2WheelColumn from './Pv2WheelColumn.vue'
import { isTimeValue, minutes, pad, snapToStep, toHM } from '@/utils/convert-date-time'

// Where the wheel opens when it has no usable value to show (an all-day event stores '').
const FALLBACK_TIME = '09:00'

const MINUTE_STEP = 5
// Row geometry: the wheel's frame, padding and highlight pill are all derived from these so
// they cannot drift from the column's scroll arithmetic. See Pv2WheelColumn's padHeight.
const VISIBLE_ROWS = 4
const ROW_H = 44
const FRAME_H = VISIBLE_ROWS * ROW_H
const PILL_TOP = ((VISIBLE_ROWS - 1) / 2) * ROW_H

const props = withDefaults(
  defineProps<{
    modelValue: string // 'HH:MM'
    ariaLabel?: string
  }>(),
  { ariaLabel: 'Time' }
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const hourItems = Array.from({ length: 24 }, (_, i) => ({ value: i, label: pad(i) }))
const minuteItems = Array.from({ length: 60 / MINUTE_STEP }, (_, i) => ({ value: i * MINUTE_STEP, label: pad(i * MINUTE_STEP) }))

// A stored time need not sit on the wheel's grid — the chip accepts any valid HH:MM, so
// 09:07 can arrive here. Snap for positioning only and never emit it back: rewriting the
// value on open would turn merely viewing an event into a silent edit.
//
// An all-day event stores start/end as '', which minutes() reads as NaN; fall back to a
// concrete row so the wheel never renders (or commits) NaN.
const snapped = computed(() =>
  minutes(snapToStep(isTimeValue(props.modelValue) ? props.modelValue : FALLBACK_TIME, MINUTE_STEP))
)
const hour = computed(() => Math.floor(snapped.value / 60))
const minute = computed(() => snapped.value % 60)

function commit(h: number, m: number): void {
  emit('update:modelValue', toHM(h * 60 + m))
}
</script>

<style scoped>
.pv2-time-wheel {
  /* Falloff colours for the shared columns, and the surface colour the edge fades dissolve
     into — taken from the host card rather than hard-coded, so the wheel never shows a seam
     against a container with a different background. */
  --pv2-wheel-ink: var(--pv2-ink, #1b1b1b);
  --pv2-wheel-ink-2: var(--pv2-ink-2, #6e6e6e);
  --pv2-wheel-ink-3: var(--pv2-ink-3, #b2b2b2);
  --pv2-wheel-ink-4: #c4c4c4;
  --pv2-wheel-surface: var(--pv2-paper, #fafaf9);

  position: relative;
  height: var(--pv2-tw-frame);
  margin: 4px 0 12px;
}

/* Sits behind the digits (the columns scroll above it) and never intercepts a drag. */
.pv2-time-wheel__pill {
  position: absolute;
  left: 50%;
  top: var(--pv2-tw-pill-top);
  transform: translateX(-50%);
  width: 168px;
  height: var(--pv2-tw-row);
  border-radius: var(--cd-radius-sm);
  background: var(--pv2-fill, #f3f3f1);
  pointer-events: none;
}

.pv2-time-wheel__cols {
  position: relative;
  height: 100%;
  display: flex;
  justify-content: center;
  gap: 4px;
}

.pv2-time-wheel__cols > :deep(.pv2-wheel-col) {
  flex: none;
  width: 66px;
}

/* Fixed separator: it belongs to the frame, not to either scrolling column. */
.pv2-time-wheel__sep {
  align-self: center;
  padding-bottom: 2px;
  color: var(--pv2-wheel-ink);
  font: 500 21px var(--cd-font-ui);
}

.pv2-time-wheel__fade {
  position: absolute;
  left: 0;
  right: 0;
  height: 60px;
  pointer-events: none;
}

.pv2-time-wheel__fade--top {
  top: 0;
  background: linear-gradient(var(--pv2-wheel-surface), transparent);
}

.pv2-time-wheel__fade--bottom {
  bottom: 0;
  background: linear-gradient(transparent, var(--pv2-wheel-surface));
}
</style>
