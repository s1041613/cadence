<template>
  <div class="month-view">
    <div v-if="showPhoto" class="month-view__banner">
      <div class="month-view__banner-slot" :style="{ height: `${bannerHeight}px` }">
        <span class="month-view__banner-placeholder">
          <CdIcon name="image" :size="20" color="var(--cd-muted)" />
          Drop this month's photo
        </span>
      </div>
      <div
        class="month-view__banner-grip"
        title="Drag to resize"
        @pointerdown="onBannerGripDown"
      >
        <span class="month-view__banner-grip-bar" />
      </div>
    </div>

    <CdDatePoster
      variant="month"
      :year="String(year)"
      :title="monthLabel"
      @prev="stepMonthBy(-1)"
      @next="stepMonthBy(1)"
      @today="goToday"
      @open-calendar-sheet="emit('openMonthSheet')"
    />

    <div class="month-view__grid-wrap">
      <CdMonthGrid :cells="gridCells" :fmt="cellFmt" @cell-click="onCellClick" @event-click="onEventClick" @more="onMore" />
    </div>

    <CdDrawerOrSheet
      v-if="ui.monthSheet"
      :presentation="isDesktop ? 'drawer' : 'sheet'"
      side="left"
      width="min(400px, 44%)"
      @scrim-click="ui.monthSheet = false"
    >
      <CdMonthSheet
        :mode="sheetMode"
        :month-label="monthLabel"
        :cells="sheetCells"
        :months="wheelMonths"
        :years="wheelYears"
        :center-idx="wheelCenterIdx"
        @close="ui.monthSheet = false"
        @toggle-mode="sheetMode = sheetMode === 'grid' ? 'wheel' : 'grid'"
        @select-day="onSheetSelectDay"
        @today="goToday"
      />
    </CdDrawerOrSheet>

    <CdDrawerOrSheet
      v-if="ui.dayList"
      :presentation="isDesktop ? 'drawer' : 'sheet'"
      width="min(380px, 40%)"
      @scrim-click="ui.dayList = null"
    >
      <CdDayList
        :year="String(year)"
        :date-label="dayListLabel"
        :events="dayListEvents"
        @close="ui.dayList = null"
        @event-click="onDayListEventClick"
      />
    </CdDrawerOrSheet>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import CdDatePoster from '@/components/ui/CdDatePoster.vue'
import CdMonthGrid, { type MonthGridCell } from '@/components/ui/CdMonthGrid.vue'
import CdMonthSheet, { type MonthSheetCell } from '@/components/ui/CdMonthSheet.vue'
import CdDayList, { type DayListEvent } from '@/components/ui/CdDayList.vue'
import CdDrawerOrSheet from '@/components/ui/CdDrawerOrSheet.vue'
import CdIcon from '@/components/ui/CdIcon.vue'
import type { MonthCellEvent } from '@/components/ui/CdMonthCell.vue'
import { useUiStore } from '@/stores/ui-store'
import { useTasksStore } from '@/stores/tasks-store'
import { useBreakpoint } from '@/composables/use-breakpoint'
import { themeOf } from '@/composables/use-theme'
import { parseISO, iso, addDays } from '@/utils/convert-date-time'
import { monthGridCells, stepMonth } from '@/utils/month-grid'

// MonthView — poster header + resizable photo banner + Monday-start grid, rebuilt against the
// CADENCE Handoff month-poster screen (design.md "3.1 Rebuild Month view"). Photo banner is
// local-only component state for now: settings-store (task 7.1/8.1) does not exist yet, so
// `showPhoto`/`bannerHeight` are not persisted — task 7.1 wires them into the real setting.
const ui = useUiStore()
const tasksStore = useTasksStore()

const emit = defineEmits<{
  openMonthSheet: []
}>()

const cur = computed(() => parseISO(ui.selectedDate))
const year = computed(() => cur.value.getFullYear())
const month = computed(() => cur.value.getMonth())
const monthLabel = computed(() => new Intl.DateTimeFormat('en-US', { month: 'long' }).format(cur.value))
const cellFmt = computed<'time' | 'name' | 'dot'>(() => 'time')

const showPhoto = ref(false)
const DEFAULT_BANNER_H = 230
const MIN_BANNER_H = 90
const MAX_BANNER_H = 560
const bannerHeight = ref(DEFAULT_BANNER_H)

function onBannerGripDown(e: PointerEvent): void {
  e.preventDefault()
  const startY = e.clientY
  const base = bannerHeight.value
  function move(ev: PointerEvent): void {
    bannerHeight.value = Math.max(MIN_BANNER_H, Math.min(MAX_BANNER_H, base + (ev.clientY - startY)))
  }
  function up(): void {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}

function stepMonthBy(delta: number): void {
  const { year: y, month: m } = stepMonth(year.value, month.value, delta)
  ui.selectedDate = iso(new Date(y, m, 1))
}

function goToday(): void {
  ui.selectedDate = iso(new Date())
}

function eventsForDate(date: string): MonthCellEvent[] {
  return tasksStore.tasks
    .filter((t) => t.date === date)
    .map((t) => {
      const theme = themeOf(t)
      return {
        title: t.title,
        color: theme.backgroundColor,
        quad: theme.isEvent ? 'event' : (theme.quad?.key ?? 'later'),
        time: t.start,
        allDay: t.allDay,
        done: t.done
      }
    })
}

const gridCells = computed<MonthGridCell[]>(() =>
  monthGridCells(year.value, month.value).map((c) => ({
    date: c.date,
    dayNum: c.dayNum,
    dow: c.dow,
    outsideMonth: c.outsideMonth,
    today: c.date === iso(new Date()),
    events: eventsForDate(c.date)
  }))
)

// Cell/event/more clicks open Quick-Add, the event preview, and the Day List respectively — all
// anchored popovers wired in tasks 3.2 (Day List) and 5.1/5.2 (Quick-Add, event preview), which
// need the click event's bounding rect to compute `PopoverAnchor`. Not wired here; task 3.1 is
// scoped to the grid's own rendering and date navigation.
function onCellClick(_date: string): void {}

function onEventClick(_date: string, _event: MonthCellEvent): void {}

function onMore(_date: string): void {}
</script>

<style scoped>
.month-view {
  display: flex;
  flex-direction: column;
}

.month-view__banner {
  position: relative;
  padding: 18px 30px 0;
}

.month-view__banner-slot {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  border-radius: var(--cd-radius-lg, 16px);
  background: var(--cd-topbar);
  border: 1px dashed var(--cd-line);
  color: var(--cd-muted);
  font: 500 13px var(--cd-font-ui);
  box-sizing: border-box;
}

.month-view__banner-placeholder {
  display: flex;
  align-items: center;
  gap: 8px;
}

.month-view__banner-grip {
  position: absolute;
  left: 50%;
  bottom: 16px;
  transform: translateX(-50%);
  width: 54px;
  height: 20px;
  display: grid;
  place-items: center;
  cursor: ns-resize;
  background: rgba(28, 26, 20, 0.34);
  border-radius: var(--cd-radius-pill);
  backdrop-filter: blur(2px);
}

.month-view__banner-grip-bar {
  width: 26px;
  height: 4px;
  border-radius: var(--cd-radius-pill);
  background: rgba(255, 255, 255, 0.9);
}

.month-view__grid-wrap {
  padding: 0 22px 22px;
}
</style>
