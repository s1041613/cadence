<template>
  <!--
    SCHEDULE 分頁：ALL-DAY 列（恆顯示）+ 底部黑線，其下為 06:00–23:00 的像素時間軸。
    時間軸沿用 legacy CdTimeGrid 的幾何（絕對定位、高度正比於時長、重疊分欄、now 線），
    見 Pv2TimeGrid；此檔只負責把 tasksStore 的資料映射成格線要的形狀。
  -->
  <Pv2TimeGrid
    :events="timedEvents"
    :all-day-events="allDayEvents"
    :today="isToday"
    :now-minutes="nowMinutes"
    :time-format="settings.timeFormat"
    @event-click="onEventClick"
    @column-click="onColumnClick"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Pv2TimeGrid, { type Pv2GridEvent, type Pv2GridAllDayEvent } from './Pv2TimeGrid.vue'
import { useUiStore } from '@/stores/ui-store'
import { useTasksStore } from '@/stores/tasks-store'
import { useCalendarsStore } from '@/stores/calendars-store'
import { useSettingsStore } from '@/stores/settings-store'
import { useCurrentTime } from '@/composables/use-current-time'
import { themeOf } from '@/composables/use-theme'
import { anchorFromEvent } from '@/utils/popover-anchor'
import { minutes, hasTimeRange, quickAddTimeRange, iso } from '@/utils/convert-date-time'
import type { Task } from '@/types/task'

const ui = useUiStore()
const tasksStore = useTasksStore()
const calendarsStore = useCalendarsStore()
const settings = useSettingsStore()
const now = useCurrentTime()

// 當日、可見日曆的事件（過濾隱藏日曆），與 month/week 同源。
const dayTasks = computed<Task[]>(() =>
  tasksStore.tasks.filter((t) => t.date === ui.selectedDate && calendarsStore.isVisible(t.calendarId))
)

const isToday = computed(() => ui.selectedDate === iso(new Date()))

const nowMinutes = computed(() => now.value.getHours() * 60 + now.value.getMinutes())

// timed 事件：hasTimeRange 擋掉空/無效的 start-end（防 minutes('') → NaN）。
// 按 start 昇序：短事件會被撐到最小可讀高度而超出自己的時段，排序後 DOM 順序等同時間順序，
// 溢出的部分才會壓在後一個事件底下，而不是蓋住它。
const timedEvents = computed<Pv2GridEvent[]>(() =>
  dayTasks.value
    .filter((t) => !t.allDay && hasTimeRange(t))
    .slice()
    .sort((a, b) => a.start.localeCompare(b.start))
    .map((t) => ({
      id: t.id,
      title: t.title,
      color: themeOf(t).backgroundColor,
      start: minutes(t.start),
      end: minutes(t.end),
      subtasks: tasksStore.subtasksFor(t.id)
    }))
)

const allDayEvents = computed<Pv2GridAllDayEvent[]>(() =>
  dayTasks.value
    .filter((t) => t.allDay)
    .map((t) => ({ id: t.id, title: t.title, color: themeOf(t).backgroundColor }))
)

function onEventClick(taskId: string, e: MouseEvent): void {
  ui.eventPreview = { taskId, anchor: anchorFromEvent(e), mode: 'preview' }
}

// 空白處點擊開 Quick-Add，起始時間往下取整到 30 分、長度一小時（與 legacy Day 同行為）。
function onColumnClick(clickedMinutes: number, e: MouseEvent): void {
  const { start, end } = quickAddTimeRange(clickedMinutes)
  ui.qaPop = { anchor: anchorFromEvent(e), date: ui.selectedDate, time: start, endTime: end }
}
</script>
