<template>
  <!--
    7 欄月曆格。容器 left/top 邊，cell 各自 right/bottom 邊 → 完整 #E2E2E2 格線。
    grid-auto-rows:1fr 讓 5/6 週月份都撐滿可用高度（不同月 row 數不同，避免固定 density 破版）。
    maxChips 依實測 row 高度算（ResizeObserver），Caveat 載入後高度變也會重算。
  -->
  <div ref="gridEl" class="pv2-grid">
    <Pv2Cell
      v-for="c in cells"
      :key="c.date"
      :day-num="c.dayNum"
      :today="c.today"
      :outside-month="c.outsideMonth"
      :events="c.events"
      :max-chips="maxChips"
      @cell-click="emit('cellClick', c.date)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import Pv2Cell, { type Pv2CellEvent } from './Pv2Cell.vue'

export interface Pv2GridCell {
  date: string
  dayNum: number
  today: boolean
  outsideMonth: boolean
  events: Pv2CellEvent[]
}

const props = defineProps<{
  cells: Pv2GridCell[]
}>()

const emit = defineEmits<{
  cellClick: [date: string]
}>()

// v2 cell 尺寸（px）：cell 垂直 padding 4+5、head→events margin、日期藥丸高、chip 高、chip gap。
// chip 高 ≈ 8px 字 + 上下 padding 1+1 + 邊框 1+1 ≈ 13。
const CELL = { cellPad: 9, headGap: 3, headH: 20, chipH: 13, chipGap: 2 } as const

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

const weekCount = computed(() => Math.max(1, Math.round(props.cells.length / 7)))

const maxChips = computed(() => {
  if (gridHeight.value <= 0) return 3 // pre-measure fallback
  const rowH = gridHeight.value / weekCount.value
  const availH = rowH - CELL.cellPad - CELL.headGap - CELL.headH
  return Math.max(1, Math.floor((availH + CELL.chipGap) / (CELL.chipH + CELL.chipGap)))
})
</script>

<style scoped>
.pv2-grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-auto-rows: 1fr;
  border-left: 1px solid #e2e2e2;
  border-top: 1px solid #e2e2e2;
}
</style>
