<template>
  <!--
    7 欄月曆格。只畫水平線：容器 top 邊 + cell 各自 bottom 邊（最後一列除外），
    欄與欄之間不分隔。
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
// chip 高 ≈ 9px 字 × 1.2 行高 + 上下 padding 1+1 + 邊框 1+1 ≈ 15。
// 跟著 Pv2EventChip 的字級走：字級變了 chip 高就變，這裡不同步的話每格會多放或少放一個 chip。
const CELL = { cellPad: 9, headGap: 3, headH: 20, chipH: 15, chipGap: 2 } as const

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
  border-top: 1px solid #e2e2e2;
}

/* 最後一列不收底線，月曆下緣開放。cell 是扁平 v-for，最後一列＝最後 7 個子元素；
   從尾端數所以 5 週與 6 週的月份都適用。border-bottom 定義在 Pv2Cell 的 scoped
   style，需 :deep() 才能覆寫。 */
.pv2-grid :deep(.pv2-cell:nth-last-child(-n + 7)) {
  border-bottom: none;
}
</style>
