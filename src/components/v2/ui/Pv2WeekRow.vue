<template>
  <!--
    One week row: seven day cells underneath, one absolutely positioned bar overlay on top.

    The overlay is what makes a multi-day event readable as one thing: a bar is a single element
    sized across the columns it covers, so its title renders once and it has no seams. Cells
    cannot do this — each is its own grid item and clips its own box.

    The overlay never takes pointer events, so clicking a bar falls through to the day cell
    underneath and opens that day's sheet, exactly as clicking empty space does.
  -->
  <div class="pv2-week">
    <Pv2Cell
      v-for="(c, i) in cells"
      :key="c.date"
      :day-num="c.dayNum"
      :today="c.today"
      :outside-month="c.outsideMonth"
      :hidden-count="hiddenPerDay[i] ?? 0"
      @cell-click="emit('cellClick', c.date)"
    />
    <div class="pv2-week__bars" :style="{ top: `${BARS_TOP}px` }">
      <div
        v-for="bar in visibleBars"
        :key="`${bar.id}-${bar.startCol}`"
        class="pv2-week__bar"
        :style="barStyle(bar)"
      >
        <Pv2EventChip
          :title="bar.title"
          :color="bar.color"
          :all-day="bar.allDay"
          :continues-left="bar.continuesLeft"
          :continues-right="bar.continuesRight"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Pv2Cell from './Pv2Cell.vue'
import Pv2EventChip from './Pv2EventChip.vue'
import { BARS_TOP, DAYS_PER_WEEK, laneTop } from '@/utils/month-lanes'

export interface Pv2WeekCell {
  date: string
  dayNum: number
  today: boolean
  outsideMonth: boolean
}

/** A laid-out bar, ready to position: view concerns only, no Task and no date arithmetic. */
export interface Pv2WeekBar {
  id: string
  title: string
  color: string
  allDay: boolean
  startCol: number
  span: number
  lane: number
  continuesLeft: boolean
  continuesRight: boolean
}

const props = defineProps<{
  cells: Pv2WeekCell[]
  bars: Pv2WeekBar[]
  /** Lanes that fit; bars below this are represented by the cells' "+N" instead. */
  visibleLanes: number
  hiddenPerDay: number[]
}>()

const emit = defineEmits<{
  cellClick: [date: string]
}>()

const visibleBars = computed(() => props.bars.filter((b) => b.lane < props.visibleLanes))

// Columns are percentages of the row so they track the grid's 1fr tracks at any width. The
// inline padding keeps the bar off the column edge, matching where the day number starts.
const barStyle = (bar: Pv2WeekBar) => ({
  insetInlineStart: `calc(100% / ${DAYS_PER_WEEK} * ${bar.startCol})`,
  width: `calc(100% / ${DAYS_PER_WEEK} * ${bar.span})`,
  top: `${laneTop(bar.lane)}px`
})
</script>

<style scoped>
.pv2-week {
  position: relative;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}

.pv2-week__bars {
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  /* Clicks belong to the day cells underneath; a bar is a label, not a target. */
  pointer-events: none;
  overflow: hidden;
}

.pv2-week__bar {
  position: absolute;
  /* The inset the cell applies to its day number, so bar and number share a left edge. */
  padding-inline: 2px;
  box-sizing: border-box;
}
</style>
