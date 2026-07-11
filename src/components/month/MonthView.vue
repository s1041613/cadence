<template>
  <div class="month-view" :class="{ 'month-view--phone-split': !isDesktop }">
    <div v-if="isDesktop" class="month-view__top">
      <CdCalStrip :calendars="calStripCalendars" :selected="selectedCalendarIds" @toggle="onToggleCalendar" />

      <div v-if="showPhoto" class="month-view__banner">
        <div class="month-view__banner-slot" :style="{ height: `${bannerHeight}px` }">
          <img :src="monthPhotoSrc" alt="" class="month-view__banner-img" />
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
        @open-calendar-sheet="openMonthSheet"
      />

      <div class="month-view__grid-wrap">
        <CdMonthGrid :cells="gridCells" :fmt="cellFmt" @cell-click="onCellClick" @event-click="onEventClick" @more="onMore" />
      </div>
    </div>

    <template v-else>
      <div class="month-view__pane month-view__pane--top" :style="{ height: `${splitHeight}px` }">
        <CdDatePoster
          variant="month"
          :year="String(year)"
          :title="monthLabel"
          @prev="stepMonthBy(-1)"
          @next="stepMonthBy(1)"
          @today="goToday"
          @open-calendar-sheet="openMonthSheet"
        />
        <CdCalStrip :calendars="calStripCalendars" :selected="selectedCalendarIds" @toggle="onToggleCalendar" />

        <div class="month-view__top-scroll">
          <div v-if="showPhoto" class="month-view__banner">
            <div class="month-view__banner-slot" :style="{ height: `${bannerHeight}px` }">
              <img :src="monthPhotoSrc" alt="" class="month-view__banner-img" />
            </div>
            <div
              class="month-view__banner-grip"
              title="Drag to resize"
              @pointerdown="onBannerGripDown"
            >
              <span class="month-view__banner-grip-bar" />
            </div>
          </div>
          <div class="month-view__grid-wrap">
            <CdMonthGrid
              :cells="gridCells"
              :fmt="cellFmt"
              :selected-date="ui.selectedDate"
              @cell-click="onCellSelect"
            />
          </div>
        </div>
      </div>

      <div
        class="month-view__split-grip"
        title="Drag to resize"
        @pointerdown="onSplitGripDown"
      >
        <span class="month-view__split-grip-bar" />
      </div>

      <div class="month-view__pane month-view__pane--agenda">
        <CdMonthAgenda
          :dow="agendaDow"
          :date-label="agendaDateLabel"
          :today="agendaIsToday"
          :events="agendaEvents"
          @event-click="onAgendaEventClick"
          @open-day="ui.activeView = 'day'"
        />
      </div>
    </template>

    <CdSheet v-if="ui.monthSheet" :show-handle="false" @scrim-click="ui.monthSheet = false">
      <CdMonthSheet
        :mode="sheetMode"
        :month-label="monthLabel"
        :year="String(year)"
        :cells="sheetCells"
        :months="wheelMonths"
        :years="wheelYears"
        :center-idx="wheelCenterIdx"
        @toggle-mode="sheetMode = sheetMode === 'grid' ? 'wheel' : 'grid'"
        @select-day="onSheetSelectDay"
        @today="goToday"
      />
    </CdSheet>

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
import CdCalStrip, { type CalStripCalendar } from '@/components/ui/CdCalStrip.vue'
import CdMonthGrid, { type MonthGridCell } from '@/components/ui/CdMonthGrid.vue'
import CdMonthSheet, { type MonthSheetCell } from '@/components/ui/CdMonthSheet.vue'
import CdDayList, { type DayListEvent } from '@/components/ui/CdDayList.vue'
import CdMonthAgenda, { type MonthAgendaEvent } from '@/components/ui/CdMonthAgenda.vue'
import CdDrawerOrSheet from '@/components/ui/CdDrawerOrSheet.vue'
import CdSheet from '@/components/ui/CdSheet.vue'
import type { MonthCellEvent } from '@/components/ui/CdMonthCell.vue'
import { useUiStore } from '@/stores/ui-store'
import { useTasksStore } from '@/stores/tasks-store'
import { useSettingsStore } from '@/stores/settings-store'
import { useCalendarsStore } from '@/stores/calendars-store'
import { useBreakpoint } from '@/composables/use-breakpoint'
import { themeOf } from '@/composables/use-theme'
import { anchorFromEvent } from '@/utils/popover-anchor'
import { parseISO, iso, WD_CAP, formatTime } from '@/utils/convert-date-time'
import { monthGridCells, stepMonth } from '@/utils/month-grid'
import { defaultMonthPhotoPath } from '@/utils/public-assets'

// MonthView — poster header + resizable photo banner + first-day-aware grid, rebuilt against the
// CADENCE Handoff month-poster screen (design.md "3.1 Rebuild Month view"). Grid column start
// (task 7.2 "First day of week re-anchors all week-based layouts"), cell label mode ("Month event
// label style drives cell rendering"), and the photo banner toggle ("Settings persist across
// reloads") all read live from settings-store; `bannerHeight`/`splitHeight` stay local-only per the
// design's silence on persisting the banner's resized height or the phone split position.
const ui = useUiStore()
const tasksStore = useTasksStore()
const settings = useSettingsStore()
const calendarsStore = useCalendarsStore()
const { isDesktop } = useBreakpoint()

const cur = computed(() => parseISO(ui.selectedDate))
const year = computed(() => cur.value.getFullYear())
const month = computed(() => cur.value.getMonth())
const monthLabel = computed(() => new Intl.DateTimeFormat('en-US', { month: 'long' }).format(cur.value))
const cellFmt = computed<'time' | 'name' | 'dot'>(() => settings.monthEventLabel)

// Calendar filter strip (task 7.3 "Calendar visibility filters all views"), sorted by the stored
// `order` so drag-reorder in the settings calendars pane is reflected here immediately. Icon slot
// expects an SVG string; calendars have no icon glyph yet (`icon` is always null per
// calendars-store), so an empty string falls through to the chip's own background swatch.
const calStripCalendars = computed<CalStripCalendar[]>(() =>
  [...calendarsStore.calendars]
    .sort((a, b) => a.order - b.order)
    .map((c) => ({ id: c.id, name: c.name, cover: c.cover, iconSvg: '' }))
)
const selectedCalendarIds = computed(() => calendarsStore.calendars.filter((c) => calendarsStore.isVisible(c.id)).map((c) => c.id))

function onToggleCalendar(id: string): void {
  calendarsStore.toggleVisibility(id)
}

const showPhoto = computed(() => settings.showPhoto)

// Banner photo for the currently viewed month: user's own upload (settings-store.monthlyPhotos)
// takes priority; otherwise fall back to the system default for that calendar month
// (public/month-photos/jan.jpg … dec.jpg per "the system provides 1-12 default photos").
const monthPhotoSrc = computed(() => settings.monthlyPhotos[month.value] ?? defaultMonthPhotoPath(month.value))
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

// Phone split-pane: grid pane above, agenda pane below, draggable divider. Local-only component
// state (persists while the view stays mounted, per design.md "3.3" — no store persistence
// requirement stated for the split position, matching the banner-height precedent above).
// DEFAULT sized so the poster (~108px) + calendar strip (~54px) leave a legible ~264px for a full
// 6-week grid (~44px/row) — below this the grid's rows compress until weeks clip out of view, since
// CdMonthGrid fills its container via `grid-auto-rows: 1fr` rather than scrolling internally. Users
// can still drag the grip below this to shrink the grid deliberately; MIN_SPLIT_H is just a floor
// that keeps the poster/strip chrome itself from being clipped.
const DEFAULT_SPLIT_H = 426
const MIN_SPLIT_H = 210
const MAX_SPLIT_H = 720
const splitHeight = ref(DEFAULT_SPLIT_H)

function onSplitGripDown(e: PointerEvent): void {
  e.preventDefault()
  const startY = e.clientY
  const base = splitHeight.value
  function move(ev: PointerEvent): void {
    splitHeight.value = Math.max(MIN_SPLIT_H, Math.min(MAX_SPLIT_H, base + (ev.clientY - startY)))
  }
  function up(): void {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}

const agendaIsToday = computed(() => ui.selectedDate === iso(new Date()))
const agendaDow = computed(() => WD_CAP[cur.value.getDay()]!.toUpperCase())
const agendaDateLabel = computed(
  () => `${monthLabel.value.slice(0, 3)} ${cur.value.getDate()}`
)
const agendaEvents = computed<MonthAgendaEvent[]>(() =>
  eventsForDate(ui.selectedDate).map((e) => ({
    id: e.id,
    title: e.title,
    color: e.color,
    time: e.time,
    allDay: e.allDay
  }))
)

function onAgendaEventClick(event: MonthAgendaEvent, e: MouseEvent): void {
  ui.eventPreview = { taskId: event.id, anchor: anchorFromEvent(e), mode: 'preview' }
}

function stepMonthBy(delta: number): void {
  const { year: y, month: m } = stepMonth(year.value, month.value, delta)
  ui.selectedDate = iso(new Date(y, m, 1))
}

function goToday(): void {
  ui.selectedDate = iso(new Date())
}

// calendar-management spec "Calendar visibility filters all views".
function eventsForDate(date: string): MonthCellEvent[] {
  return tasksStore.tasks
    .filter((t) => t.date === date && calendarsStore.isVisible(t.calendarId))
    .map((t) => {
      const theme = themeOf(t)
      return {
        id: t.id,
        title: t.title,
        color: theme.backgroundColor,
        quad: theme.isEvent ? 'event' : (theme.quad?.key ?? 'later'),
        time: t.start ? formatTime(t.start, settings.timeFormat) : t.start,
        endTime: t.end ? formatTime(t.end, settings.timeFormat) : t.end,
        allDay: t.allDay,
        done: t.done
      }
    })
}

const gridCells = computed<MonthGridCell[]>(() =>
  monthGridCells(year.value, month.value, settings.firstDay).map((c) => ({
    date: c.date,
    dayNum: c.dayNum,
    dow: c.dow,
    outsideMonth: c.outsideMonth,
    today: c.date === iso(new Date()),
    events: eventsForDate(c.date)
  }))
)

// Month-cell click opens Quick-Add anchored to the cell, prefilled with that date and no time
// context (app-shell spec "Creation entry points seed context from where they are invoked" /
// "Month cell click prefills the date"). Event-chip click opens the event preview — wired in task
// 5.2, which needs its own click handling; not wired here.
function onCellClick(date: string, e: MouseEvent): void {
  ui.qaPop = { anchor: anchorFromEvent(e), date, time: null, endTime: null }
}

function onEventClick(_date: string, event: MonthCellEvent, e: MouseEvent): void {
  ui.eventPreview = { taskId: event.id, anchor: anchorFromEvent(e), mode: 'preview' }
}

function onMore(date: string): void {
  ui.dayList = date
}

// Phone-mode month grid: cell click selects the date so the agenda pane below can show its
// events, instead of opening Quick-Add (desktop's onCellClick) or the Day List sheet (onMore).
function onCellSelect(date: string): void {
  ui.selectedDate = date
}

function openMonthSheet(): void {
  sheetMode.value = 'grid'
  ui.monthSheet = true
}

// Month sheet: grid<->wheel toggle. Grid reuses the same month as the poster header; wheel columns
// are a fixed ±4-year / all-12-months window centered on the current month/year, matching
// CdMonthSheet's "purely visual, not scrollable" note (design.md "3.2").
const sheetMode = ref<'grid' | 'wheel'>('grid')

const sheetCells = computed<Array<MonthSheetCell | null>>(() => {
  const first = new Date(year.value, month.value, 1)
  const startDow = first.getDay() // 0=Sun
  const daysInMonth = new Date(year.value, month.value + 1, 0).getDate()
  const todayIso = iso(new Date())
  const leading: Array<MonthSheetCell | null> = Array.from({ length: startDow }, () => null)
  const days: Array<MonthSheetCell | null> = Array.from({ length: daysInMonth }, (_, i) => {
    const dayNum = i + 1
    const date = iso(new Date(year.value, month.value, dayNum))
    return {
      day: dayNum,
      today: date === todayIso,
      dots: eventsForDate(date)
        .slice(0, 3)
        .map((e) => e.color)
    }
  })
  return [...leading, ...days]
})

const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const wheelMonths = computed(() => MONTH_NAMES_SHORT)
const wheelCenterIdx = computed(() => month.value)
const wheelYears = computed(() =>
  Array.from({ length: 9 }, (_, i) => String(year.value - 4 + i))
)

function onSheetSelectDay(day: number): void {
  ui.selectedDate = iso(new Date(year.value, month.value, day))
  ui.monthSheet = false
}

// Day List: opened by a month cell's "+N" overflow (ui.dayList holds the target date).
const dayListDate = computed(() => (ui.dayList ? parseISO(ui.dayList) : null))
const dayListLabel = computed(() =>
  dayListDate.value
    ? new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric' }).format(dayListDate.value)
    : ''
)
const dayListEvents = computed<DayListEvent[]>(() =>
  ui.dayList
    ? eventsForDate(ui.dayList).map((e) => ({
        id: e.id,
        title: e.title,
        color: e.color,
        time: e.time,
        allDay: e.allDay
      }))
    : []
)

function onDayListEventClick(event: DayListEvent, e: MouseEvent): void {
  ui.dayList = null
  ui.eventPreview = { taskId: event.id, anchor: anchorFromEvent(e), mode: 'preview' }
}
</script>

<style scoped>
.month-view {
  display: flex;
  flex-direction: column;
  flex: 1 1 0;
  min-height: 0;
  overflow: hidden;
}

.month-view__top {
  display: flex;
  flex-direction: column;
  flex: 1 1 0;
  min-height: 0;
  overflow: hidden;
}

.month-view--phone-split {
  flex: 1 1 0;
  min-height: 0;
  overflow: hidden;
}

.month-view__pane--top {
  flex: none;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.month-view__pane--top :deep(.cd-date-poster--month) {
  background: var(--cd-topbar);
}

.month-view__top-scroll {
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.month-view__split-grip {
  flex: none;
  height: 20px;
  display: grid;
  place-items: center;
  cursor: ns-resize;
  border-top: 1px solid var(--cd-line);
  touch-action: none;
}

.month-view__split-grip-bar {
  width: 40px;
  height: 4px;
  border-radius: var(--cd-radius-pill);
  background: var(--cd-line);
}

.month-view__pane--agenda {
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
}

.month-view__banner {
  position: relative;
  padding: 18px 15px 18px;
}

.month-view__banner-slot {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  border-radius: var(--cd-radius-lg, 16px);
  background: var(--cd-topbar);
  overflow: hidden;
  box-sizing: border-box;
}

.month-view__banner-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
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
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
  padding: 0 22px 18px;
}

.month-view--phone-split .month-view__grid-wrap {
  flex: none;
  overflow: visible;
}

@media (max-width: 899px) {
  .month-view__banner {
    padding: 12px 8px 12px;
  }

  .month-view__grid-wrap {
    padding: 0 8px 14px;
  }
}
</style>
