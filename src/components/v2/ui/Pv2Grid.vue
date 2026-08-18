<template>
  <!--
    月曆格。只畫水平線：容器 top 邊 + cell 各自 bottom 邊（最後一列除外），
    欄與欄之間不分隔。
    grid-auto-rows:1fr 讓 5/6 週月份都撐滿可用高度（不同月 row 數不同，避免固定 density 破版）。
    maxLanes 依實測 row 高度算（ResizeObserver），Caveat 載入後高度變也會重算。

    Rows are weeks, not days: a multi-day event is drawn as one bar spanning several columns, so
    the element that owns it has to be the week (see Pv2WeekRow).
  -->
  <div ref="gridEl" class="pv2-grid">
    <Pv2WeekRow
      v-for="week in weeks"
      :key="week.key"
      :cells="week.cells"
      :bars="week.bars"
      :visible-lanes="visibleLanesFor(week)"
      :hidden-per-day="hiddenPerDayFor(week)"
      @cell-click="(date) => emit('cellClick', date)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import Pv2WeekRow, { type Pv2WeekBar, type Pv2WeekCell } from './Pv2WeekRow.vue'
import { CELL, computeHidden } from '@/utils/month-lanes'

export interface Pv2GridWeek {
  /** Stable across renders; the week's first date. */
  key: string
  cells: Pv2WeekCell[]
  bars: Pv2WeekBar[]
}

const props = defineProps<{
  weeks: Pv2GridWeek[]
}>()

const emit = defineEmits<{
  cellClick: [date: string]
}>()

const gridEl = ref<HTMLElement | null>(null)
const gridHeight = ref(0)
let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  resizeObserver = new ResizeObserver((entries) => {
    gridHeight.value = entries[0]?.contentRect.height ?? 0
  })
  if (gridEl.value) resizeObserver.observe(gridEl.value)
})

onBeforeUnmount(() => resizeObserver?.disconnect())

// One observer on the grid, not one per week row — the rows are all 1fr of the same box, so a
// single measurement answers for all of them.
const maxLanes = computed(() => {
  if (gridHeight.value <= 0) return 3 // pre-measure fallback
  const rowH = gridHeight.value / Math.max(1, props.weeks.length)
  const availH = rowH - CELL.padTop - CELL.padBottom - CELL.headGap - CELL.headH
  return Math.max(1, Math.floor((availH + CELL.chipGap) / (CELL.chipH + CELL.chipGap)))
})

// Each week overflows independently: one crowded week must not cost the others a lane.
const overflowFor = (week: Pv2GridWeek) => computeHidden(week.bars, maxLanes.value)
const visibleLanesFor = (week: Pv2GridWeek) => overflowFor(week).visibleLanes
const hiddenPerDayFor = (week: Pv2GridWeek) => overflowFor(week).hiddenPerDay
</script>

<style scoped>
.pv2-grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr;
  grid-auto-rows: 1fr;
}
</style>
