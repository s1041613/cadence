<template>
  <div class="day-view">
    <CdDatePoster variant="day" :year="String(year)" :title="dayTitle" @prev="stepDayBy(-1)" @next="stepDayBy(1)" @today="goToday" @open-calendar-sheet="() => {}">
      <template #extra>
        <CdWeekStrip :days="stripDays" :selected="ui.selectedDate" @select="onStripSelect" />
      </template>
    </CdDatePoster>

    <div class="day-view__grid-wrap">
      <CdTimeGrid
        :columns="[gridColumn]"
        :row-height="52"
        hide-head
        :now-minutes="nowMinutes"
        :time-format="settings.timeFormat"
        @event-click="onEventClick"
        @column-click="onColumnClick"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import CdDatePoster from '@/components/ui/CdDatePoster.vue'
import CdWeekStrip, { type WeekStripDay } from '@/components/ui/CdWeekStrip.vue'
import CdTimeGrid, { type TimeGridColumn } from '@/components/ui/CdTimeGrid.vue'
import { useUiStore } from '@/stores/ui-store'
import { useTasksStore } from '@/stores/tasks-store'
import { useSettingsStore } from '@/stores/settings-store'
import { useCalendarsStore } from '@/stores/calendars-store'
import { useCurrentTime } from '@/composables/use-current-time'
import { themeOf } from '@/composables/use-theme'
import { parseISO, iso, addDays, startOfWeek, minutes, quickAddTimeRange, WD_CAP } from '@/utils/convert-date-time'
import { anchorFromEvent } from '@/utils/popover-anchor'

// DayView — single-column CdTimeGrid + poster header + week-strip cluster, rebuilt against the
// CADENCE Handoff day screen (design.md "4.2 Rebuild Day view"). Reuses the shared CdTimeGrid that
// task 4.1 built for both Day and Week, passing a single-column `columns` array. The week-strip
// re-anchors with settings.firstDay (task 7.2 "First day of week re-anchors all week-based layouts").
const ui = useUiStore()
const tasksStore = useTasksStore()
const settings = useSettingsStore()
const calendarsStore = useCalendarsStore()
const now = useCurrentTime()

const cur = computed(() => parseISO(ui.selectedDate))
const year = computed(() => cur.value.getFullYear())
const dayTitle = computed(() => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(cur.value))

const nowMinutes = computed(() => now.value.getHours() * 60 + now.value.getMinutes())

function stepDayBy(delta: number): void {
  ui.selectedDate = iso(addDays(cur.value, delta))
}

function goToday(): void {
  ui.selectedDate = iso(new Date())
}

function onStripSelect(date: string): void {
  ui.selectedDate = date
}

const stripDays = computed<WeekStripDay[]>(() => {
  const start = startOfWeek(cur.value, settings.firstDay)
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(start, i)
    const date = iso(d)
    return {
      date,
      dow: d.getDay(),
      label: WD_CAP[d.getDay()]!.toUpperCase(),
      dayNum: d.getDate(),
      dots: eventsForDate(date)
        .slice(0, 4)
        .map((e) => e.color)
    }
  })
})

// calendar-management spec "Calendar visibility filters all views": hidden calendars' tasks
// disappear immediately from Day, Week, and Month — display-only, tasksStore.tasks is untouched.
function eventsForDate(date: string) {
  return tasksStore.tasks
    .filter((t) => t.date === date && calendarsStore.isVisible(t.calendarId))
    .map((t) => {
      const theme = themeOf(t)
      return { id: t.id, title: t.title, color: theme.backgroundColor, start: t.start, end: t.end, allDay: t.allDay }
    })
}

const gridColumn = computed<TimeGridColumn>(() => {
  const date = ui.selectedDate
  const events = eventsForDate(date)
  return {
    date,
    dow: cur.value.getDay(),
    dowLabel: WD_CAP[cur.value.getDay()]!.toUpperCase(),
    dayNum: cur.value.getDate(),
    today: date === iso(new Date()),
    events: events
      .filter((e) => !e.allDay)
      .map((e) => ({ id: e.id, title: e.title, color: e.color, start: minutes(e.start), end: minutes(e.end), allDay: false })),
    allDayEvents: events.filter((e) => e.allDay).map((e) => ({ id: e.id, title: e.title, color: e.color }))
  }
})

// Event-block click opens the anchored preview (app-shell spec "Anchored popovers remain fully
// visible").
function onEventClick(_date: string, eventId: string, e: MouseEvent): void {
  ui.eventPreview = { taskId: eventId, anchor: anchorFromEvent(e), mode: 'preview' }
}

// Empty time-grid click opens Quick-Add with the clicked time rounded down to 30 minutes and a
// one-hour duration, clamped to 06:00-22:00 (app-shell spec "Creation entry points seed context
// from where they are invoked" / "Time-grid click rounds the start time").
function onColumnClick(date: string, clickedMinutes: number, e: MouseEvent): void {
  const { start, end } = quickAddTimeRange(clickedMinutes)
  ui.qaPop = { anchor: anchorFromEvent(e), date, time: start, endTime: end }
}
</script>

<style scoped>
.day-view {
  display: flex;
  flex-direction: column;
  flex: 1 1 0;
  min-height: 0;
}

.day-view__grid-wrap {
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
  padding: 0 22px 22px;
}
</style>
