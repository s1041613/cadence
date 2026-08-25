<template>
  <!--
    v2 週檢視主檢視。重用既有 store/composable/util 邏輯，外觀照設計稿。
    7 天垂直列表，每天大日期數字 + 事件列；事件點擊開既有 event-preview overlay。
  -->
  <div class="wv2">
    <div class="wv2__body" v-touch-swipe.horizontal.mouse="onSwipe">
      <div class="wv2__header">
        <Pv2WeekHeader :week-number="weekNumber" :range-label="rangeLabel" @today="goToday" />
      </div>

      <div class="pv2-slide-viewport">
        <Transition :name="transitionName">
          <!-- All seven days share the remaining height equally, so a busy day is no taller
               than a quiet one (per the design). -->
          <div class="wv2__days" :key="weekKey">
            <Pv2WeekDayRow
              v-for="d in weekRows"
              :key="d.date"
              :day-num="d.dayNum"
              :dow-label="d.dowLabel"
              :today="d.today"
              :in-week-focus="true"
              :events="d.events"
              @event-click="onEventClick"
            />
          </div>
        </Transition>
      </div>
    </div>

    <Pv2Fab class="wv2__fab" @click="onCreate" />
    <Pv2BottomNav active="week" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Pv2WeekHeader from '@/components/v2/ui/Pv2WeekHeader.vue'
import Pv2WeekDayRow, { type Pv2WeekEvent } from '@/components/v2/ui/Pv2WeekDayRow.vue'
import Pv2Fab from '@/components/v2/ui/Pv2Fab.vue'
import Pv2BottomNav from '@/components/v2/ui/Pv2BottomNav.vue'
import { useUiStore } from '@/stores/ui-store'
import { useTasksStore } from '@/stores/tasks-store'
import { useSettingsStore } from '@/stores/settings-store'
import { useCalendarsStore } from '@/stores/calendars-store'
import { themeOf } from '@/composables/use-theme'
import { anchorFromEvent } from '@/utils/popover-anchor'
import { parseISO, iso, addDays, startOfWeek, WD_CAP, formatTime } from '@/utils/convert-date-time'
import { useDateSwipe } from '@/composables/use-date-swipe'
import { spansDate } from '@/utils/event-span'

const ui = useUiStore()
const tasksStore = useTasksStore()
const settings = useSettingsStore()
const calendarsStore = useCalendarsStore()

const cur = computed(() => parseISO(ui.selectedDate))
const weekStart = computed(() => startOfWeek(cur.value, settings.firstDay))
const weekEnd = computed(() => addDays(weekStart.value, 6))
const weekDays = computed(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart.value, i)))

// ISO 8601 週數（週四所在年的第幾週）。repo 無現成 util，自行計算。
function isoWeekNumber(d: Date): number {
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const dayNr = (target.getDay() + 6) % 7 // 週一=0..週日=6
  target.setDate(target.getDate() - dayNr + 3) // 移到當週週四
  const firstThursday = new Date(target.getFullYear(), 0, 4)
  const firstDayNr = (firstThursday.getDay() + 6) % 7
  firstThursday.setDate(firstThursday.getDate() - firstDayNr + 3)
  const diff = target.getTime() - firstThursday.getTime()
  return 1 + Math.round(diff / (7 * 24 * 3600 * 1000))
}

// 週數以週四為準（跨年週歸屬更穩），與 ISO 一致
const weekNumber = computed(() => isoWeekNumber(addDays(weekStart.value, 3)))

// 區間標籤：同月 "JUL 20 — 26"；跨月 "JUL 30 — AUG 5"（大寫、em dash，照設計稿）
const rangeLabel = computed(() => {
  const s = weekStart.value
  const e = weekEnd.value
  const mon = (d: Date) => new Intl.DateTimeFormat('en-US', { month: 'short' }).format(d).toUpperCase()
  if (s.getMonth() === e.getMonth()) {
    return `${mon(s)} ${s.getDate()} — ${e.getDate()}`
  }
  return `${mon(s)} ${s.getDate()} — ${mon(e)} ${e.getDate()}`
})

// How many subtask names one row reveals. Seven rows have to stay readable at a glance,
// so the rest is carried by the done/total count rather than by more lines.
const WEEK_SUBTASK_PREVIEW = 3

// 某日事件（過濾隱藏日曆），色點取 themeOf，時間標籤 all-day / HH:MM / —
// spansDate rather than an equality check: a multi-day event belongs to every day it covers.
function eventsForDate(date: string): Pv2WeekEvent[] {
  return tasksStore.tasks
    .filter((t) => spansDate(t, date) && calendarsStore.isVisible(t.calendarId))
    .map((t) => {
      const timeLabel = t.allDay ? 'all-day' : t.start ? formatTime(t.start, settings.timeFormat) : '—'
      const subtasks = tasksStore.subtasksFor(t.id)
      return {
        id: t.id,
        title: t.title,
        color: themeOf(t).backgroundColor,
        timeLabel,
        subtaskTitles: subtasks.slice(0, WEEK_SUBTASK_PREVIEW).map((s) => s.title),
        subtaskDone: subtasks.filter((s) => s.done).length,
        subtaskTotal: subtasks.length
      }
    })
}

const weekRows = computed(() =>
  weekDays.value.map((d) => {
    const date = iso(d)
    return {
      date,
      dayNum: d.getDate(),
      dowLabel: WD_CAP[d.getDay()]!.toUpperCase(),
      today: date === iso(new Date()),
      events: eventsForDate(date)
    }
  })
)

function stepWeekBy(delta: number): void {
  ui.selectedDate = iso(addDays(weekStart.value, delta * 7))
}

// Re-keying the day list on the week start is what drives the slide transition.
const weekKey = computed(() => iso(weekStart.value))

// No view-local overlays here — the composable already covers the page-shell overlays.
const { onSwipe, transitionName, setDirection } = useDateSwipe({ step: stepWeekBy })

// Back to this week. Selects today rather than the week's first day so switching to the day
// view lands on today.
function goToday(): void {
  const today = new Date()
  setDirection(today.getTime() - weekStart.value.getTime())
  ui.selectedDate = iso(today)
}

function onEventClick(event: Pv2WeekEvent, e: MouseEvent): void {
  ui.eventPreview = { taskId: event.id, anchor: anchorFromEvent(e), mode: 'preview' }
}

function onCreate(): void {
  if (tasksStore.isLoading) return
  ui.createOpen = true
}
</script>

<style scoped>
.wv2 {
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.wv2__body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 6px 22px 12px;
  /* Pv2BottomNav floats over the frame now instead of taking its own flex row, so
     this body has to give up the clearance itself or the 7th day row sits under the
     pill. .pv2-slide-viewport (app.css) is flex:1 inside this column, so padding here
     — not on its absolutely-positioned child — is what actually shrinks its height. */
  padding-bottom: var(--pv2-nav-h);
  overflow: hidden;
  /* The horizontal week-swipe lives here; pan-y leaves each row's own vertical scroll alone. */
  touch-action: pan-y;
}

/* 6 (body) + 9 puts "Week N"'s visual top 20px below the frame, level with Day, Notebook and
   Settings. It is not the same number as theirs because the four titles run at different sizes
   and line-heights over the same face: capTop = paddingTop + fontSize × (lineHeight/2 − 0.37).
   margin-bottom absorbs the 6px the padding gave up — .wv2__days splits the remaining height
   into seven equal rows, so moving the viewport's start would resize every row. */
.wv2__header {
  flex: none;
  padding-top: 9px;
  margin-bottom: 10px;
}

/* Seven equal rows fill the screen and the page itself never scrolls. Once the height is
   split evenly, a compact event row still reveals at least three events; from the fourth on,
   the row scrolls within itself (see Pv2WeekDayRow).
   Height now comes from .pv2-slide-viewport, which absolutely positions this element. */
.wv2__days {
  display: flex;
  flex-direction: column;
}

.wv2__days :deep(.pv2-wdr) {
  flex: 1;
  min-height: 0;
}

/* FAB 浮在底部 nav 之上：離 nav 頂緣 16px，隨 nav 高度自動跟著走 */
.wv2__fab {
  bottom: calc(var(--pv2-nav-h) + 16px);
}
</style>
