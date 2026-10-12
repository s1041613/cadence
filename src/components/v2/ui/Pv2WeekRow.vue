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
      :festival="c.festival"
      :hidden-count="mode.cute.value ? 0 : (hiddenPerDay[i] ?? 0)"
      @cell-click="emit('cellClick', c.date)"
    />
    <!-- Cute mode: one dot per event under each day instead of the labelled bars, so the photo is
         not buried under chips. A multi-day event dots every day it covers. All-day events are
         the ones drawn as solid bars otherwise — the loud ones — so they keep the accent here. -->
    <div v-if="mode.cute.value" class="pv2-week__dots" :style="{ top: `${BARS_TOP}px` }">
      <div v-for="(col, i) in dotsPerDay" :key="i" class="pv2-week__dot-col">
        <span
          v-for="d in col"
          :key="d.id"
          class="pv2-week__dot"
          :class="{ 'pv2-week__dot--accent': d.accent }"
        />
      </div>
    </div>
    <div v-else class="pv2-week__bars" :style="{ top: `${BARS_TOP}px` }">
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
import { useBackdropMode } from '@/composables/use-backdrop-mode'
import type { Festival } from '@/utils/festivals'

export interface Pv2WeekCell {
  date: string
  dayNum: number
  today: boolean
  outsideMonth: boolean
  festival: Festival | null
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

const mode = useBackdropMode()

const visibleBars = computed(() => props.bars.filter((b) => b.lane < props.visibleLanes))

/** Past this many a day reads as "busy" either way, and the dots stop fitting the column. */
const MAX_DOTS = 3

// Built from every bar, not just the visible lanes: a dot costs no lane, so nothing has to hide.
const dotsPerDay = computed(() =>
  Array.from({ length: DAYS_PER_WEEK }, (_, col) =>
    props.bars
      .filter((b) => b.startCol <= col && col < b.startCol + b.span)
      .sort((a, b) => a.lane - b.lane)
      .slice(0, MAX_DOTS)
      .map((b) => ({ id: b.id, accent: b.allDay }))
  )
)

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

.pv2-week__dots {
  position: absolute;
  inset-inline: 0;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  pointer-events: none;
}

.pv2-week__dot-col {
  display: flex;
  justify-content: center;
  gap: 4px;
  padding-top: 2px;
}

.pv2-week__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.85);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.pv2-week__dot--accent {
  width: 6px;
  height: 6px;
  background: var(--pv2-accent);
  box-shadow: 0 0 0 1.5px rgba(255, 255, 255, 0.7);
}

.pv2-week__bar {
  position: absolute;
  /* The inset the cell applies to its day number, so bar and number share a left edge. */
  padding-inline: 2px;
  box-sizing: border-box;
}
</style>
