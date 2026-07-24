<template>
  <!--
    v2 週檢視主檢視。重用既有 store/composable/util 邏輯，外觀照設計稿。
    7 天垂直列表，每天大日期數字 + 事件列；事件點擊開既有 event-preview overlay。
  -->
  <div class="wv2">
    <div class="wv2__body">
      <div class="wv2__header">
        <Pv2WeekHeader
          :week-number="weekNumber"
          :range-label="rangeLabel"
          @prev="stepWeekBy(-1)"
          @next="stepWeekBy(1)"
        />
      </div>

      <!-- 7 天等高平均分攤剩餘高度（不因事件多寡而高矮不一），照設計稿 -->
      <div class="wv2__days">
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

// 某日事件（過濾隱藏日曆），色點取 themeOf，時間標籤 all-day / HH:MM / —
function eventsForDate(date: string): Pv2WeekEvent[] {
  return tasksStore.tasks
    .filter((t) => t.date === date && calendarsStore.isVisible(t.calendarId))
    .map((t) => {
      const timeLabel = t.allDay ? 'all-day' : t.start ? formatTime(t.start, settings.timeFormat) : '—'
      return { id: t.id, title: t.title, color: themeOf(t).backgroundColor, timeLabel }
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
  overflow: hidden;
}

.wv2__header {
  flex: none;
  padding-top: 8px;
  margin-bottom: 4px;
}

/* 7 天等高：每列 flex:1 平均分攤，min-height:0 讓事件多的列在自身內裁切而非撐高 */
.wv2__days {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.wv2__days :deep(.pv2-wdr) {
  flex: 1;
  min-height: 0;
}

/* FAB 浮在底部 nav 之上（同月曆：nav 隨 safe-area 變高，FAB 同步上移恆讓開 ~11px） */
.wv2__fab {
  bottom: max(110px, calc(82px + env(safe-area-inset-bottom)));
}
</style>
