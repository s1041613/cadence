<template>
  <!--
    v2 月曆主檢視。重用既有 store/composable/util 邏輯，外觀照設計稿
    (~/Downloads/CADENCE Monthly Poster Mobile.dc.html)。
    cell 點擊語義未定（Zoe 未決），暫不綁；event chip 點擊開既有 event-preview overlay。
  -->
  <div class="mv2">
    <div class="mv2__body" v-touch-swipe.horizontal.mouse="onSwipe">
      <!-- No prev/next arrows here: the horizontal swipe replaces them. The poster stays
           tappable because the month/year wheel is still the only way to jump across years. -->
      <div class="mv2__poster">
        <Pv2Poster class="mv2__poster-title" :month-name="monthName" :year="posterYear" @open-sheet="openSheet" />
      </div>

      <!-- 待辦雙卡（照參考圖）：標題與月曆之間的一眼區。 -->
      <div class="mv2__todos">
        <Pv2TodoCard
          label="TODAY'S TASKS"
          :total="todayTodos.length"
          :item="todayTodos[0] ?? null"
          empty-text="今天沒有待辦"
          @item-click="onTodoClick"
        />
        <Pv2TodoCard
          label="UP NEXT 7 DAYS"
          :total="weekTodos.length"
          :item="weekTodos[0] ?? null"
          empty-text="七天內沒有待辦"
          @item-click="onTodoClick"
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
          <Pv2Grid :key="monthKey" :weeks="gridWeeks" @cell-click="onCellClick" />
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
      <Transition name="pv2-sheet" :duration="300">
        <Pv2MonthSheet
          v-if="sheetOpen"
          :month="month"
          :year="year"
          @select="onSheetSelect"
          @close="sheetOpen = false"
        />
      </Transition>
    </Teleport>

    <!-- 當日事件面板（cell 點擊長出），同樣 teleport 到 frame 讓 scrim 蓋滿；defer 理由同上。
         Transition sits inside the Teleport so the sheet still resolves its target the
         deferred way; pv2-sheet (app.css) fades the scrim and slides the panel together. -->
    <Teleport defer to="#mp2-root">
      <Transition name="pv2-sheet" :duration="300">
        <Pv2DaySheet
          v-if="daySheetDate"
          :dow="daySheetDow"
          :date-label="daySheetLabel"
          :events="daySheetEvents"
          @close="daySheetDate = null"
          @create="onDaySheetCreate"
          @event-click="onDaySheetEventClick"
          @step="onDaySheetStep"
        />
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import Pv2CalStrip, { type Pv2ChipItem } from '@/components/v2/ui/Pv2CalStrip.vue'
import Pv2Poster from '@/components/v2/ui/Pv2Poster.vue'
import Pv2WeekdayHeader from '@/components/v2/ui/Pv2WeekdayHeader.vue'
import Pv2Grid, { type Pv2GridWeek } from '@/components/v2/ui/Pv2Grid.vue'
import Pv2MonthSheet from '@/components/v2/ui/Pv2MonthSheet.vue'
import Pv2BottomNav from '@/components/v2/ui/Pv2BottomNav.vue'
import Pv2DaySheet, { type Pv2DayEvent } from '@/components/v2/ui/Pv2DaySheet.vue'
import Pv2TodoCard, { type Pv2TodoItem } from '@/components/v2/ui/Pv2TodoCard.vue'
import { useUiStore } from '@/stores/ui-store'
import { useTasksStore } from '@/stores/tasks-store'
import { useSettingsStore } from '@/stores/settings-store'
import { useCalendarsStore } from '@/stores/calendars-store'
import { QUADRANTS, quadrantOf, themeOf } from '@/composables/use-theme'
import { festivalOf } from '@/utils/festivals'
import { anchorFromEvent } from '@/utils/popover-anchor'
import { parseISO, iso, addDays, WD_CAP, formatTime } from '@/utils/convert-date-time'
import { spansDate } from '@/utils/event-span'
import { compareForLane, layoutWeek, weekRows } from '@/utils/month-lanes'
import type { Task } from '@/types/task'
import { monthGridCells, stepMonth } from '@/utils/month-grid'
import { resolveDaySheetStep, useDateSwipe } from '@/composables/use-date-swipe'

const ui = useUiStore()
const tasksStore = useTasksStore()
const settings = useSettingsStore()
const calendarsStore = useCalendarsStore()

const cur = computed(() => parseISO(ui.selectedDate))
const year = computed(() => cur.value.getFullYear())
const month = computed(() => cur.value.getMonth())
const monthName = computed(() => new Intl.DateTimeFormat('en-US', { month: 'long' }).format(cur.value))
// The current year is the one the reader is already in; printing it under every month spends a
// line on an answer nobody asked for. Any other year is genuinely news, so it says so.
const posterYear = computed(() => (year.value === new Date().getFullYear() ? null : String(year.value)))

// 日曆過濾 chip：ALL + 各日曆，依 order 排序，重用 isVisible/toggleSelected。
const chips = computed<Pv2ChipItem[]>(() =>
  [...calendarsStore.calendars]
    .sort((a, b) => a.order - b.order)
    .map((c) => ({ id: c.id, label: c.name, active: calendarsStore.isVisible(c.id) }))
)

function onToggleCalendar(id: string): void {
  calendarsStore.toggleSelected(id)
}

// Events covering this day whose calendar is visible. The grid and the day sheet share
// one predicate so they can never disagree about what a day contains; spansDate puts a
// multi-day event on every day it covers.
function visibleTasksForDate(date: string): Task[] {
  return tasksStore.tasks.filter((t) => spansDate(t, date) && calendarsStore.isVisible(t.calendarId))
}

// One layout pass per week row; a multi-day event gets one bar spanning its columns there.
// Lanes are assigned once per week rather than per day, which is what keeps a span on the same
// row in every cell it covers — assigning per cell let the same event sit on different rows on
// consecutive days, so it never read as one bar.
// 待辦＝象限任務（type 'quadrant'），不是事件：事件是「幾點要在哪」，象限任務才是「要做完的事」。
// 已完成的不進來——卡片只有一行，被打勾的那筆佔掉它就等於沒有卡片。
//
// Order is urgency first, not insertion: the one line a card shows has to be the one worth
// showing, and QUADRANTS is already ordered 馬上做 → 之後再說. Date leads for the seven-day card
// so tomorrow's 之後再說 cannot outrank next Friday's 馬上做 by urgency alone.
const QUAD_RANK: Record<string, number> = Object.fromEntries(QUADRANTS.map((q, i) => [q.key, i]))

function todosBetween(from: string, to: string): Pv2TodoItem[] {
  return tasksStore.tasks
    .filter(
      (t) =>
        t.type === 'quadrant' &&
        !t.done &&
        calendarsStore.isVisible(t.calendarId) &&
        t.date >= from &&
        t.date <= to
    )
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        (QUAD_RANK[quadrantOf(a).key] ?? 0) - (QUAD_RANK[quadrantOf(b).key] ?? 0) ||
        a.title.localeCompare(b.title)
    )
    .map((t) => ({ id: t.id, title: t.title, color: themeOf(t).backgroundColor }))
}

// Today, and then the six days after it — never overlapping, so a task is counted by exactly one
// card and the two badges add up to the work ahead.
const todayTodos = computed(() => todosBetween(iso(new Date()), iso(new Date())))
const weekTodos = computed(() =>
  todosBetween(iso(addDays(new Date(), 1)), iso(addDays(new Date(), 6)))
)

function onTodoClick(id: string, e: MouseEvent): void {
  ui.eventPreview = { taskId: id, anchor: anchorFromEvent(e), mode: 'preview' }
}

const gridWeeks = computed<Pv2GridWeek[]>(() => {
  const today = iso(new Date())
  const visible = tasksStore.tasks.filter((t) => calendarsStore.isVisible(t.calendarId))

  return weekRows(monthGridCells(year.value, month.value, settings.firstDay)).map((week) => {
    const dates = week.map((c) => c.date)
    return {
      key: dates[0]!,
      cells: week.map((c) => ({
        date: c.date,
        dayNum: c.dayNum,
        today: c.date === today,
        outsideMonth: c.outsideMonth,
        festival: festivalOf(c.date)
      })),
      bars: layoutWeek(visible, dates).bars.map((bar) => ({
        id: bar.task.id,
        title: bar.task.title,
        color: themeOf(bar.task).backgroundColor,
        allDay: bar.task.allDay,
        startCol: bar.startCol,
        span: bar.span,
        lane: bar.lane,
        continuesLeft: bar.continuesLeft,
        continuesRight: bar.continuesRight
      }))
    }
  })
})

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

// 當日事件：重用 themeOf 取象限色/標籤。
// compareForLane is the grid's own ordering, shared deliberately: the sheet lists the same day
// the grid just drew, so sorting them differently would show the same events in two orders.
const daySheetEvents = computed<Pv2DayEvent[]>(() => {
  if (!daySheetDate.value) return []
  return visibleTasksForDate(daySheetDate.value)
    .slice()
    .sort(compareForLane)
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

// 面板左右滑：換日（左＝下一天）。跨月時才把底下的 grid 一起帶過去，
// 同月內換日 grid 不動，避免每滑一天就重繪並重播一次月份滑動動畫。
function onDaySheetStep(delta: number): void {
  if (!daySheetDate.value) return
  const next = resolveDaySheetStep(daySheetDate.value, delta, year.value, month.value)
  daySheetDate.value = next.date
  if (next.viewChanged) {
    setDirection(delta)
    ui.selectedDate = next.date
  }
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

// No `navigate` here: with the arrows gone, the swipe and the arrow keys are the only steps,
// and both go through onSwipe / the composable's own keydown listener.
const { onSwipe, transitionName, setDirection } = useDateSwipe({
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
  /* Pv2BottomNav floats over the frame now instead of taking its own flex row, so
     this body has to give up the clearance itself or the grid's last week row sits
     under the pill. .pv2-slide-viewport (app.css) is flex:1 inside this column, so
     padding here — not on the viewport's absolutely-positioned child — is what
     actually shrinks its height. */
  padding-bottom: var(--pv2-nav-h);
  overflow: hidden;
  /* The horizontal month-swipe lives here; pan-y leaves the vertical axis to the browser. */
  touch-action: pan-y;
}

/* Pv2Poster is a shrink-to-fit button that used to be stretched by Pv2PosterNav's flex row.
   With the arrows gone it has to be given the full width itself, or the title stops being
   centred on the row and its tap target collapses to the width of the month word. */
.mv2__poster-title {
  width: 100%;
}

/* touch-action is intersected down the hit-test chain, so the chip row has to ask for the
   horizontal axis back or its own overflow-x scroll stops working. */
.mv2__strip :deep(.pv2-strip__row) {
  touch-action: pan-x;
}

/* 待辦雙卡：與 chip 列、月曆共用同一組左右邊界。 */
.mv2__todos {
  display: flex;
  align-items: stretch;
  gap: 10px;
  /* The design's gap between the month word and the cards. Measured from the title's descender,
     which is why it is smaller than it looks: the poster box adds no padding below itself. */
  margin-top: 26px;
  padding: 0 16px;
}

/* 標題與 chip 列之間留白（headline 在上，chip 列不與標題相黏） */
.mv2__strip {
  margin-top: 14px;
}

.mv2__weekdays {
  margin-top: 10px;
}

/* 星期表頭與格線之間，grid 撐滿剩餘高度 */
.mv2__body :deep(.pv2-grid) {
  margin-top: 0;
}

</style>
