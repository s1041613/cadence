<template>
  <!--
    SCHEDULE 分頁（照設計稿）：ALL-DAY 列（恆顯示）+ 底部黑線，其下每整點一列時間軸。
    事件掛在其起始整點列，色點 + 標題 + 時長標；點擊開既有 event-preview overlay。
    時軸範圍按當日實際 timed 事件動態決定（無事件時給預設 08–18）。
    已知限制：事件僅掛起始整點，不表現時長跨度/重疊（v2 draft 刻意簡化）。
  -->
  <div class="dsch">
    <!-- ALL-DAY 列：恆顯示，無 all-day 事件時留白 -->
    <div class="dsch__allday">
      <span class="dsch__allday-label">ALL-DAY</span>
      <div class="dsch__allday-items">
        <button
          v-for="ev in allDayEvents"
          :key="ev.id"
          type="button"
          class="dsch__chip"
          :style="{ background: tint(ev.color) }"
          @click="(e) => onEventClick(ev.id, e)"
        >
          <span class="dsch__dot" :style="{ background: ev.color }" />
          <span class="dsch__chip-title">{{ ev.title }}</span>
        </button>
      </div>
    </div>

    <div class="dsch__rule" />

    <!-- 小時軸：每整點一列 -->
    <div class="dsch__hours">
      <div v-for="row in hourRows" :key="row.hour" class="dsch__hour">
        <span class="dsch__time">{{ row.timeLabel }}</span>
        <div class="dsch__events">
          <button
            v-for="ev in row.events"
            :key="ev.id"
            type="button"
            class="dsch__event"
            @click="(e) => onEventClick(ev.id, e)"
          >
            <span class="dsch__dot" :style="{ background: ev.color }" />
            <span class="dsch__event-title">{{ ev.title }}</span>
            <span v-if="ev.durationLabel" class="dsch__event-dur">{{ ev.durationLabel }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useUiStore } from '@/stores/ui-store'
import { useTasksStore } from '@/stores/tasks-store'
import { useCalendarsStore } from '@/stores/calendars-store'
import { themeOf } from '@/composables/use-theme'
import { anchorFromEvent } from '@/utils/popover-anchor'
import { minutes, isTimeValue, fmtDur, pad } from '@/utils/convert-date-time'
import type { Task } from '@/types/task'

const ui = useUiStore()
const tasksStore = useTasksStore()
const calendarsStore = useCalendarsStore()

// 當日、可見日曆的事件（過濾隱藏日曆），與 month/week 同源。
const dayTasks = computed<Task[]>(() =>
  tasksStore.tasks.filter((t) => t.date === ui.selectedDate && calendarsStore.isVisible(t.calendarId))
)

interface ScheduleEvent {
  id: string
  title: string
  color: string
  durationLabel: string | null
}

function toScheduleEvent(t: Task): ScheduleEvent {
  const hasRange = isTimeValue(t.start) && isTimeValue(t.end) && minutes(t.end) > minutes(t.start)
  return {
    id: t.id,
    title: t.title,
    color: themeOf(t).backgroundColor,
    durationLabel: hasRange ? fmtDur(minutes(t.end) - minutes(t.start)) : null
  }
}

const allDayEvents = computed<ScheduleEvent[]>(() =>
  dayTasks.value.filter((t) => t.allDay).map(toScheduleEvent)
)

// timed 事件：濾掉無效/空 start（防 minutes('') → NaN），按 start 昇序。
const timedTasks = computed<Task[]>(() =>
  dayTasks.value
    .filter((t) => !t.allDay && isTimeValue(t.start))
    .slice()
    .sort((a, b) => a.start.localeCompare(b.start))
)

const DEFAULT_START_HOUR = 8
const DEFAULT_END_HOUR = 18

// 時軸範圍：有 timed 事件時取最早~最晚整點，否則給預設，避免空軸。
const hourRange = computed<{ start: number; end: number }>(() => {
  if (timedTasks.value.length === 0) return { start: DEFAULT_START_HOUR, end: DEFAULT_END_HOUR }
  const hours = timedTasks.value.map((t) => Math.floor(minutes(t.start) / 60))
  return { start: Math.min(...hours), end: Math.max(...hours) }
})

interface HourRow {
  hour: number
  timeLabel: string
  events: ScheduleEvent[]
}

const hourRows = computed<HourRow[]>(() => {
  const { start, end } = hourRange.value
  const rows: HourRow[] = []
  for (let h = start; h <= end; h += 1) {
    rows.push({
      hour: h,
      timeLabel: `${pad(h)}.00`,
      events: timedTasks.value
        .filter((t) => Math.floor(minutes(t.start) / 60) === h)
        .map(toScheduleEvent)
    })
  }
  return rows
})

function onEventClick(taskId: string, e: MouseEvent): void {
  ui.eventPreview = { taskId, anchor: anchorFromEvent(e), mode: 'preview' }
}

// ALL-DAY chip 底色 = 事件色的淡版（照設計稿：Kyoto trip 金事件 → 淡金底）。
// 事件色來自 themeOf，為 #RRGGBB；轉半透明 rgba 當底。
function tint(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return 'rgba(27, 27, 27, 0.08)'
  const n = parseInt(m[1]!, 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return `rgba(${r}, ${g}, ${b}, 0.16)`
}
</script>

<style scoped>
.dsch {
  display: flex;
  flex-direction: column;
}

/* ALL-DAY 列 */
.dsch__allday {
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: 30px;
}

.dsch__allday-label {
  flex: none;
  width: 58px;
  font: 600 11px var(--cd-font-mono);
  letter-spacing: 0.12em;
  color: #9c9c9c;
}

.dsch__allday-items {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.dsch__chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border: none;
  border-radius: 10px;
  /* background 由 inline style 依事件色動態帶入（見 tint()） */
  cursor: pointer;
}

.dsch__chip-title {
  font: 600 14px var(--cd-font-ui);
  color: #1b1b1b;
}

.dsch__rule {
  height: 1.5px;
  background: #1b1b1b;
  margin: 12px 0 4px;
}

/* 小時軸 */
.dsch__hour {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 14px 0;
  border-bottom: 1px solid rgba(27, 27, 27, 0.07);
}

.dsch__time {
  flex: none;
  width: 58px;
  padding-top: 1px;
  font: 500 13px var(--cd-font-mono);
  letter-spacing: 0.02em;
  color: #b7b7b1;
}

.dsch__events {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dsch__event {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  text-align: left;
}

.dsch__dot {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.dsch__event-title {
  flex: 1;
  min-width: 0;
  font: 600 16px var(--cd-font-ui);
  color: #1b1b1b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dsch__event-dur {
  flex: none;
  font: 500 13px var(--cd-font-mono);
  color: #b7b7b1;
}
</style>
