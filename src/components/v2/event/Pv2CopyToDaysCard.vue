<template>
  <div class="pv2-copy-card">
    <div class="pv2-copy-card__head">
      <h2 class="pv2-copy-card__month">{{ monthLabel }}</h2>
      <div class="pv2-copy-card__head-actions">
        <button type="button" class="pv2-copy-card__arrow" aria-label="Previous month" @click="emit('prevMonth')">‹</button>
        <button type="button" class="pv2-copy-card__arrow" aria-label="Next month" @click="emit('nextMonth')">›</button>
        <button type="button" class="pv2-copy-card__close" aria-label="Close" @click="emit('close')">
          <CdIcon name="close" :size="14" color="#1b1b1b" />
        </button>
      </div>
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
        :class="{ 'pv2-copy-card__cell--blank': !cell, 'pv2-copy-card__cell--selected': !!cell && selected.includes(cell.date) }"
        :disabled="!cell || cell.disabled"
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
  width: 340px;
  background: #fff;
  border: 1px solid #d8d2c5;
  border-radius: 8px;
  padding: 18px;
  color: #1b1b1b;
}

@media (max-width: 899px) {
  .pv2-copy-card {
    width: 100%;
    border: none;
    border-radius: 0;
    padding-bottom: 32px;
  }
}

.pv2-copy-card__head,
.pv2-copy-card__head-actions,
.pv2-copy-card__footer {
  display: flex;
  align-items: center;
}

.pv2-copy-card__head {
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 16px;
  border-bottom: 1.5px solid #1b1b1b;
}

.pv2-copy-card__month {
  margin: 0;
  font: 500 28px/1 var(--cd-font-serif);
}

.pv2-copy-card__head-actions {
  gap: 7px;
}

.pv2-copy-card__arrow,
.pv2-copy-card__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 31px;
  height: 31px;
  border: 1px solid #cfc8ba;
  border-radius: 50%;
  background: #fff;
  color: #1b1b1b;
  cursor: pointer;
}

.pv2-copy-card__arrow {
  font: 500 22px/1 var(--cd-font-ui);
}

.pv2-copy-card__dow-row,
.pv2-copy-card__grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}

.pv2-copy-card__dow-row {
  padding: 14px 0 8px;
}

.pv2-copy-card__dow {
  text-align: center;
  font: 800 10px var(--cd-font-mono);
  color: #777168;
}

.pv2-copy-card__grid {
  gap: 4px;
}

.pv2-copy-card__cell {
  aspect-ratio: 1;
  border: 1px solid transparent;
  border-radius: 6px;
  background: #f4f1eb;
  color: #1b1b1b;
  cursor: pointer;
  font: 800 12px var(--cd-font-mono);
  transition:
    background 160ms ease,
    color 160ms ease,
    border-color 160ms ease;
}

.pv2-copy-card__cell:not(:disabled):hover {
  border-color: #1b1b1b;
}

.pv2-copy-card__cell--selected {
  background: #1b1b1b;
  color: #fff;
}

.pv2-copy-card__cell--blank {
  background: transparent;
  cursor: default;
}

.pv2-copy-card__footer {
  justify-content: space-between;
  gap: 12px;
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid #e3ded2;
}

.pv2-copy-card__count {
  font: 800 11px var(--cd-font-mono);
  color: #777168;
}

.pv2-copy-card__confirm {
  min-width: 86px;
  height: 38px;
  border: none;
  border-radius: 6px;
  background: #1b1b1b;
  color: #fff;
  cursor: pointer;
  font: 800 13px var(--cd-font-ui);
}

.pv2-copy-card__confirm:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
</style>
