<template>
  <!--
    v2 月曆主檢視。重用既有 store/composable/util 邏輯，外觀照設計稿
    (~/Downloads/CADENCE Monthly Poster Mobile.dc.html)。
    cell 點擊語義未定（Zoe 未決），暫不綁；event chip 點擊開既有 event-preview overlay。
  -->
  <div class="mv2">
    <div class="mv2__body" v-touch-swipe.horizontal.mouse="onSwipe">
      <div class="mv2__poster">
        <Pv2PosterNav
          :month-name="monthName"
          :year="String(year)"
          prev-label="上個月"
          next-label="下個月"
          @prev="navigate(-1)"
          @next="navigate(1)"
          @open-sheet="openSheet"
        />
      </div>

      <!-- The strip scrolls horizontally itself, so it stops touchstart before the swipe
           directive on .mv2__body can claim a gesture that started inside the chip row. -->
      <Pv2CalStrip
        class="mv2__strip"
        :chips="chips"
        @toggle="onToggleCalendar"
        @touchstart.stop
        @mousedown.stop
      />

      <div class="mv2__weekdays">
        <Pv2WeekdayHeader :first-day="settings.firstDay" />
      </div>

      <div class="pv2-slide-viewport">
        <Transition :name="transitionName">
          <Pv2Grid :key="monthKey" :cells="gridCells" @cell-click="onCellClick" />
        </Transition>
      </div>
    </div>

    <!-- 底部 nav：共用元件，month active -->
    <Pv2BottomNav active="month" />

    <!-- 輪盤 sheet teleport 到 frame（data-poster-root），讓 scrim 蓋滿含頂部 safe-area，
         而非只蓋到 .mv2 範圍（否則頂部 safe-area 那條不會被遮）。
         defer：目標 #mp2-root 由本元件的祖先（MonthPageV2）render，週檢視切回月檢視時
         重掛的時序會讓 Teleport 一次性解析拿到失效節點且不再重解，面板遂打不開。
         defer 讓目標解析延到整個 render cycle 之後，確保 remount 時拿到當前的 #mp2-root。 -->
    <Teleport defer to="#mp2-root">
      <Pv2MonthSheet
        v-if="sheetOpen"
        :month="month"
        :year="year"
        @select="onSheetSelect"
        @close="sheetOpen = false"
      />
    </Teleport>

    <!-- 當日事件面板（cell 點擊長出），同樣 teleport 到 frame 讓 scrim 蓋滿；defer 理由同上 -->
    <Teleport defer to="#mp2-root">
      <Pv2DaySheet
        v-if="daySheetDate"
        :dow="daySheetDow"
        :date-label="daySheetLabel"
        :events="daySheetEvents"
        @close="daySheetDate = null"
        @create="onDaySheetCreate"
        @event-click="onDaySheetEventClick"
      />
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import Pv2CalStrip, { type Pv2ChipItem } from '@/components/v2/ui/Pv2CalStrip.vue'
import Pv2PosterNav from '@/components/v2/ui/Pv2PosterNav.vue'
import Pv2WeekdayHeader from '@/components/v2/ui/Pv2WeekdayHeader.vue'
import Pv2Grid, { type Pv2GridCell } from '@/components/v2/ui/Pv2Grid.vue'
import Pv2MonthSheet from '@/components/v2/ui/Pv2MonthSheet.vue'
import Pv2BottomNav from '@/components/v2/ui/Pv2BottomNav.vue'
import Pv2DaySheet, { type Pv2DayEvent } from '@/components/v2/ui/Pv2DaySheet.vue'
import type { Pv2CellEvent } from '@/components/v2/ui/Pv2Cell.vue'
import { useUiStore } from '@/stores/ui-store'
import { useTasksStore } from '@/stores/tasks-store'
import { useSettingsStore } from '@/stores/settings-store'
import { useCalendarsStore } from '@/stores/calendars-store'
import { themeOf } from '@/composables/use-theme'
import { anchorFromEvent } from '@/utils/popover-anchor'
import { parseISO, iso, WD_CAP, formatTime } from '@/utils/convert-date-time'
import { monthGridCells, stepMonth } from '@/utils/month-grid'
import { useDateSwipe } from '@/composables/use-date-swipe'

const ui = useUiStore()
const tasksStore = useTasksStore()
const settings = useSettingsStore()
const calendarsStore = useCalendarsStore()

const cur = computed(() => parseISO(ui.selectedDate))
const year = computed(() => cur.value.getFullYear())
const month = computed(() => cur.value.getMonth())
const monthName = computed(() => new Intl.DateTimeFormat('en-US', { month: 'long' }).format(cur.value))

// 日曆過濾 chip：ALL + 各日曆，依 order 排序，重用 isVisible/toggleSelected。
const chips = computed<Pv2ChipItem[]>(() =>
  [...calendarsStore.calendars]
    .sort((a, b) => a.order - b.order)
    .map((c) => ({ id: c.id, label: c.name, active: calendarsStore.isVisible(c.id) }))
)

function onToggleCalendar(id: string): void {
  calendarsStore.toggleSelected(id)
}

// 某日的事件（過濾隱藏日曆），色點取 themeOf。
function eventsForDate(date: string): Pv2CellEvent[] {
  return tasksStore.tasks
    .filter((t) => t.date === date && calendarsStore.isVisible(t.calendarId))
    .map((t) => ({ id: t.id, title: t.title, color: themeOf(t).backgroundColor, allDay: t.allDay }))
}

const gridCells = computed<Pv2GridCell[]>(() =>
  monthGridCells(year.value, month.value, settings.firstDay).map((c) => ({
    date: c.date,
    dayNum: c.dayNum,
    today: c.date === iso(new Date()),
    outsideMonth: c.outsideMonth,
    events: eventsForDate(c.date)
  }))
)

// ── 當日事件面板（cell 點擊）──────────────────────────────
const daySheetDate = ref<string | null>(null)

const daySheetDow = computed(() =>
  daySheetDate.value
    ? new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(parseISO(daySheetDate.value)).toUpperCase()
    : ''
)
const daySheetLabel = computed(() =>
  daySheetDate.value
    ? new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric' }).format(parseISO(daySheetDate.value))
    : ''
)

// 當日事件：重用 themeOf 取象限色/標籤；排序 all-day 最前，其餘按 start 昇序。
const daySheetEvents = computed<Pv2DayEvent[]>(() => {
  if (!daySheetDate.value) return []
  return tasksStore.tasks
    .filter((t) => t.date === daySheetDate.value && calendarsStore.isVisible(t.calendarId))
    .slice()
    .sort((a, b) => {
      const at = a.allDay || !a.start ? '' : a.start
      const bt = b.allDay || !b.start ? '' : b.start
      return at.localeCompare(bt)
    })
    .map((t) => {
      const theme = themeOf(t)
      return {
        id: t.id,
        title: t.title,
        timeLabel: t.allDay ? 'all-day' : t.start ? formatTime(t.start, settings.timeFormat) : '—',
        quadColor: theme.backgroundColor,
        quadLabel: theme.isEvent ? 'EVENT' : (theme.quad?.key ?? 'later').toUpperCase()
      }
    })
})

function onCellClick(date: string): void {
  daySheetDate.value = date
}

// 面板右上 +：帶入該天新增（沿用 EventComposerOverlay，已掛在 MonthPageV2）
function onDaySheetCreate(): void {
  if (tasksStore.isLoading) return
  if (daySheetDate.value) ui.selectedDate = daySheetDate.value
  daySheetDate.value = null
  ui.createOpen = true
}

function onDaySheetEventClick(event: Pv2DayEvent, e: MouseEvent): void {
  daySheetDate.value = null
  ui.eventPreview = { taskId: event.id, anchor: anchorFromEvent(e), mode: 'preview' }
}

// 月/年輪盤
const sheetOpen = ref(false)
function openSheet(): void {
  sheetOpen.value = true
}
function onSheetSelect(payload: { month: number; year: number }): void {
  // Slide the way the user moved through time, so a wheel jump reads like a swipe.
  setDirection(payload.year * 12 + payload.month - (year.value * 12 + month.value))
  ui.selectedDate = iso(new Date(payload.year, payload.month, 1))
}

// Month stepping (the header row's arrows). Lands on the 1st of the target month: the month view
// only reads the month, so the day carries no meaning here, and pinning it to the 1st sidesteps
// boundaries like stepping back from Jan 31 into a month that has no 31st.
function stepMonthBy(delta: number): void {
  const { year: y, month: m } = stepMonth(year.value, month.value, delta)
  ui.selectedDate = iso(new Date(y, m, 1))
}

// Re-keying the grid on the month is what drives the slide transition.
const monthKey = computed(() => `${year.value}-${month.value}`)

const { onSwipe, transitionName, navigate, setDirection } = useDateSwipe({
  step: stepMonthBy,
  // Only the two sheets this view owns; the page-shell overlays are handled in the composable.
  blocked: computed(() => sheetOpen.value || daySheetDate.value !== null)
})
</script>

<style scoped>
.mv2 {
  position: relative; /* 絕對定位子層的錨點 */
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.mv2__body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 6px 8px 12px;
  overflow: hidden;
  /* The horizontal month-swipe lives here; pan-y leaves the vertical axis to the browser. */
  touch-action: pan-y;
}

/* touch-action is intersected down the hit-test chain, so the chip row has to ask for the
   horizontal axis back or its own overflow-x scroll stops working. */
.mv2__strip :deep(.pv2-strip__row) {
  touch-action: pan-x;
}

/* 標題與 chip 列之間留白（headline 在上，chip 列不與標題相黏） */
.mv2__strip {
  margin-top: 18px;
}

.mv2__weekdays {
  margin-top: 10px;
}

/* 星期表頭與格線之間，grid 撐滿剩餘高度 */
.mv2__body :deep(.pv2-grid) {
  margin-top: 0;
}

</style>
