<template>
  <div class="pv2-copy-card">
    <!-- Title row: fixed "Copy to days" heading with a round close button, above a
         black hairline (the month lives in its own nav row below, per the design). -->
    <div class="pv2-copy-card__head">
      <h2 class="pv2-copy-card__title">Copy to days</h2>
      <button type="button" class="pv2-copy-card__close" aria-label="Close" @click="emit('close')">
        <CdIcon name="close" :size="15" color="#1b1b1b" />
      </button>
    </div>

    <!-- Month nav: ‹  italic "July 2026"  › -->
    <div class="pv2-copy-card__nav">
      <button type="button" class="pv2-copy-card__arrow" aria-label="Previous month" @click="emit('prevMonth')">‹</button>
      <span class="pv2-copy-card__month">{{ monthLabel }}</span>
      <button type="button" class="pv2-copy-card__arrow" aria-label="Next month" @click="emit('nextMonth')">›</button>
    </div>

    <div class="pv2-copy-card__dow-row">
      <span v-for="day in weekdays" :key="day" class="pv2-copy-card__dow">{{ day }}</span>
    </div>

    <div class="pv2-copy-card__grid">
      <button
        v-for="(cell, index) in cells"
        :key="cell?.date ?? `blank-${index}`"
        type="button"
        class="pv2-copy-card__cell"
        :class="{
          'pv2-copy-card__cell--blank': !cell,
          'pv2-copy-card__cell--selected': !!cell && selected.includes(cell.date),
          'pv2-copy-card__cell--source': !!cell && cell.date === sourceDate
        }"
        :disabled="!cell || cell.disabled || (!!cell && cell.date === sourceDate)"
        @click="cell && emit('toggleDay', cell.date)"
      >
        <span v-if="cell">{{ cell.day }}</span>
      </button>
    </div>

    <div class="pv2-copy-card__footer">
      <span class="pv2-copy-card__count">{{ selected.length }} day{{ selected.length === 1 ? '' : 's' }} selected</span>
      <button type="button" class="pv2-copy-card__confirm" :disabled="selected.length === 0" @click="emit('confirm')">
        Copy
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import CdIcon from '@/components/ui/CdIcon.vue'
import type { FirstDayName } from '@/utils/convert-date-time'
import type { CopyToDaysCell } from '@/utils/event-panel'

const props = defineProps<{
  monthLabel: string
  cells: Array<CopyToDaysCell | null>
  selected: string[]
  firstDay: FirstDayName
  // The task's own date — marked with a soft ring and made unselectable (you can't
  // copy a day onto itself), matching the design's greyed source day.
  sourceDate?: string | null
}>()

const emit = defineEmits<{
  close: []
  prevMonth: []
  nextMonth: []
  toggleDay: [date: string]
  confirm: []
}>()

const BASE_DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const weekdays = computed(() => {
  const start = props.firstDay === 'Monday' ? 1 : props.firstDay === 'Saturday' ? 6 : 0
  return [...BASE_DOW.slice(start), ...BASE_DOW.slice(0, start)]
})
</script>

<style scoped>
.pv2-copy-card {
  /* v2 neutral palette — same ink/paper/line family as the month surface and the
     edit card, not a warm-beige variant. */
  --cc-ink: #1b1b1b;
  --cc-ink-2: #6e6e6e;
  --cc-ink-3: #b2b2b2;
  --cc-line: #e2e2e2;
  --cc-paper: #fafaf9;

  /* Matches the desktop popover width (EventPreviewPopoverV2 popWidth = 340 in copy
     mode); CdPopover fixes the wrapper to that and clips overflow, so the card must
     not exceed it. Mobile sheet mode overrides to 100% below. */
  width: 340px;
  background: var(--cc-paper);
  border: 1px solid var(--cc-line);
  border-radius: 8px;
  padding: 24px 22px 20px;
  color: var(--cc-ink);
}

@media (max-width: 899px) {
  .pv2-copy-card {
    width: 100%;
    border: none;
    border-radius: 0;
    padding: 26px 24px 34px;
  }
}

/* Title row */
.pv2-copy-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 18px;
  border-bottom: 1.5px solid var(--cc-ink);
}

.pv2-copy-card__title {
  margin: 0;
  font: 400 32px/1 var(--cd-font-serif);
  color: var(--cc-ink);
}

.pv2-copy-card__close {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: 1px solid var(--cc-line);
  border-radius: 50%;
  background: #fff;
  cursor: pointer;
  transition: background 160ms ease;
}

.pv2-copy-card__close:hover {
  background: var(--cc-paper);
}

/* Month nav */
.pv2-copy-card__nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 22px;
  padding: 20px 0 6px;
}

.pv2-copy-card__month {
  min-width: 150px;
  text-align: center;
  font: italic 400 26px/1 var(--cd-font-serif);
  color: var(--cc-ink);
}

.pv2-copy-card__arrow {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 1px solid var(--cc-line);
  border-radius: 50%;
  background: #fff;
  color: var(--cc-ink);
  cursor: pointer;
  font: 400 20px/1 var(--cd-font-ui);
  transition: background 160ms ease;
}

.pv2-copy-card__arrow:hover {
  background: var(--cc-paper);
}

.pv2-copy-card__dow-row,
.pv2-copy-card__grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}

.pv2-copy-card__dow-row {
  padding: 12px 0 10px;
}

.pv2-copy-card__dow {
  text-align: center;
  font: 700 11px var(--cd-font-mono);
  letter-spacing: 0.02em;
  color: var(--cc-ink-2);
}

.pv2-copy-card__grid {
  gap: 2px 0;
}

/* Days are bare numerals — no fill, no border — the way the design reads. A day gets
   a background only when selected (dark disc) or as the source day (soft ring). */
.pv2-copy-card__cell {
  aspect-ratio: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--cc-ink);
  cursor: pointer;
  font: 700 15px var(--cd-font-mono);
  transition:
    background 160ms ease,
    color 160ms ease;
}

.pv2-copy-card__cell > span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
}

.pv2-copy-card__cell:not(:disabled):hover > span {
  background: var(--cc-line);
}

.pv2-copy-card__cell--selected {
  color: #fff;
}

.pv2-copy-card__cell--selected > span {
  background: var(--cc-ink);
}

/* Source day: greyed and ringed, unselectable. */
.pv2-copy-card__cell--source {
  color: var(--cc-ink-3);
  cursor: default;
}

.pv2-copy-card__cell--source > span {
  background: #ececea;
}

.pv2-copy-card__cell--blank {
  cursor: default;
}

.pv2-copy-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 16px;
  padding-top: 18px;
  border-top: 1px solid var(--cc-line);
}

.pv2-copy-card__count {
  font: 700 12px var(--cd-font-mono);
  letter-spacing: 0.02em;
  color: var(--cc-ink-2);
}

.pv2-copy-card__confirm {
  min-width: 132px;
  height: 52px;
  padding: 0 26px;
  border: none;
  border-radius: 14px;
  background: var(--cc-ink);
  color: #fff;
  cursor: pointer;
  font: 600 17px var(--cd-font-ui);
  transition: opacity 160ms ease;
}

.pv2-copy-card__confirm:disabled {
  background: var(--cc-line);
  color: #fff;
  cursor: not-allowed;
}
</style>
