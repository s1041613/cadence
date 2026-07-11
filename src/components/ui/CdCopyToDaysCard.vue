<template>
  <div class="cd-copy-card">
    <div class="cd-copy-card__top">
      <span class="cd-copy-card__title">Copy to days</span>
      <button type="button" class="cd-copy-card__close" aria-label="Close" @click="emit('close')">✕</button>
    </div>

    <div class="cd-copy-card__month-row">
      <button type="button" class="cd-copy-card__nav" aria-label="Previous month" @click="emit('prevMonth')">‹</button>
      <span class="cd-copy-card__month-label">{{ monthLabel }}</span>
      <button type="button" class="cd-copy-card__nav" aria-label="Next month" @click="emit('nextMonth')">›</button>
    </div>

    <div class="cd-copy-card__dow-row">
      <span v-for="d in DOW" :key="d" class="cd-copy-card__dow">{{ d }}</span>
    </div>

    <div class="cd-copy-card__grid">
      <div
        v-for="(cell, i) in cells"
        :key="i"
        class="cd-copy-card__cell"
        :class="{ 'cd-copy-card__cell--selected': !!cell && selected.includes(cell.date), 'cd-copy-card__cell--disabled': !!cell && cell.disabled }"
        @click="cell && !cell.disabled && emit('toggleDay', cell.date)"
      >
        <span v-if="cell" class="cd-copy-card__num">{{ cell.day }}</span>
      </div>
    </div>

    <div class="cd-copy-card__footer">
      <span class="cd-copy-card__count">{{ selected.length }} day{{ selected.length === 1 ? '' : 's' }} selected</span>
      <button type="button" class="cd-copy-card__confirm" :disabled="selected.length === 0" @click="emit('confirm')">
        Copy
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
// CdCopyToDaysCard — multi-date picker for the event preview's copy-to-days flow. The source design
// export was truncated for this region (design.md "Design export had truncated regions ... copy-to-days"),
// so this is a from-scratch standard pattern: a compact month grid with toggleable day cells, styled to
// match CdMonthSheet's grid cell conventions, swapped into the same CdPopover as the preview/edit cards.
export interface CopyToDaysCell {
  date: string
  day: number
  disabled: boolean
}

defineProps<{
  monthLabel: string
  cells: Array<CopyToDaysCell | null>
  selected: string[]
}>()

const emit = defineEmits<{
  close: []
  prevMonth: []
  nextMonth: []
  toggleDay: [date: string]
  confirm: []
}>()

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
</script>

<style scoped>
.cd-copy-card {
  width: 320px;
  background: #fff;
  border: 1px solid var(--cd-line-4);
  border-radius: var(--cd-radius-preview);
  padding: 16px 18px 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

@media (max-width: 899px) {
  .cd-copy-card {
    width: 100%;
    border: none;
    border-radius: 0;
    box-sizing: border-box;
  }
}

.cd-copy-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.cd-copy-card__title {
  font: 700 15px var(--cd-font-title);
  color: var(--cd-ink);
}

.cd-copy-card__close {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: none;
  background: var(--cd-topbar);
  cursor: pointer;
  color: var(--cd-ink);
}

.cd-copy-card__month-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
}

.cd-copy-card__nav {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 16px;
  color: var(--cd-ink-2);
  width: 24px;
  height: 24px;
}

.cd-copy-card__month-label {
  font: 700 13.5px var(--cd-font-ui);
  color: var(--cd-ink);
  min-width: 90px;
  text-align: center;
}

.cd-copy-card__dow-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}

.cd-copy-card__dow {
  text-align: center;
  font: 500 11px var(--cd-font-ui);
  color: var(--cd-muted);
}

.cd-copy-card__grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.cd-copy-card__cell {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 34px;
  border-radius: 9px;
  cursor: pointer;
  transition: background var(--cd-duration-micro-3);
}

.cd-copy-card__cell:hover {
  background: rgba(0, 0, 0, 0.05);
}

.cd-copy-card__cell--selected {
  background: var(--cd-olive);
}

.cd-copy-card__cell--selected .cd-copy-card__num {
  color: #fff;
  font-weight: 700;
}

.cd-copy-card__cell--disabled {
  cursor: not-allowed;
  opacity: 0.35;
}

.cd-copy-card__num {
  font: 600 12.5px var(--cd-font-mono);
  color: var(--cd-ink);
}

.cd-copy-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 6px;
  border-top: 1px solid var(--cd-line-4);
}

.cd-copy-card__count {
  font: 600 12.5px var(--cd-font-ui);
  color: var(--cd-muted);
}

.cd-copy-card__confirm {
  border: none;
  background: var(--cd-olive);
  color: #fff;
  font: 700 13px var(--cd-font-ui);
  border-radius: 10px;
  padding: 8px 18px;
  cursor: pointer;
}

.cd-copy-card__confirm:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
