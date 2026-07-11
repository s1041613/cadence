<template>
  <div class="week-view">
    <CdDatePoster variant="week" :year="String(year)" :title="weekTitle" @prev="stepWeekBy(-1)" @next="stepWeekBy(1)" @today="goToday" @open-calendar-sheet="() => {}" />

    <div v-if="isDesktop" class="week-view__grid-wrap">
      <CdTimeGrid :columns="gridColumns" :row-height="44" :now-minutes="nowMinutes" :time-format="settings.timeFormat" @event-click="onEventClick" @column-click="onColumnClick" />
    </div>

    <div v-else class="week-view__agenda-wrap">
      <CdWeekAgenda :days="agendaDays" @event-click="onAgendaEventClick" @day-click="onAgendaOpenDay" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import CdDatePoster from '@/components/ui/CdDatePoster.vue'
import CdTimeGrid, { type TimeGridColumn } from '@/components/ui/CdTimeGrid.vue'
import CdWeekAgenda, { type WeekAgendaDay } from '@/components/ui/CdWeekAgenda.vue'
import type { MonthAgendaEvent } from '@/components/ui/CdMonthAgenda.vue'
import { useUiStore } from '@/stores/ui-store'
import { useTasksStore } from '@/stores/tasks-store'
import { useSettingsStore } from '@/stores/settings-store'
import { useCalendarsStore } from '@/stores/calendars-store'
import { useCurrentTime } from '@/composables/use-current-time'
import { useBreakpoint } from '@/composables/use-breakpoint'
import { themeOf } from '@/composables/use-theme'
import { parseISO, iso, addDays, startOfWeek, minutes, quickAddTimeRange, WD_CAP, formatTime } from '@/utils/convert-date-time'
import { anchorFromEvent } from '@/utils/popover-anchor'

// WeekView — desktop 7-column CdTimeGrid, phone per-day agenda list, rebuilt against the CADENCE
// Handoff week screen (design.md "4.3 Rebuild Week view"). Phone renders no grid at all, per the
// handoff (design.md "Shared time grid with a pure lane-assignment function"). Column start
// re-anchors with settings.firstDay (task 7.2 "First day of week re-anchors all week-based layouts").
const ui = useUiStore()
const tasksStore = useTasksStore()
const settings = useSettingsStore()
const calendarsStore = useCalendarsStore()
const now = useCurrentTime()
const { isDesktop } = useBreakpoint()

const cur = computed(() => parseISO(ui.selectedDate))
const year = computed(() => cur.value.getFullYear())
const weekStart = computed(() => startOfWeek(cur.value, settings.firstDay))
const weekEnd = computed(() => addDays(weekStart.value, 6))
const weekTitle = computed(() => {
  const s = weekStart.value
  const e = weekEnd.value
  if (s.getMonth() === e.getMonth()) {
    const month = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(s)
    return `${month} ${s.getDate()} - ${e.getDate()}`
  }
  const fmt = (d: Date) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(d)
  return `${fmt(s)} - ${fmt(e)}`
})

const nowMinutes = computed(() => now.value.getHours() * 60 + now.value.getMinutes())

function stepWeekBy(delta: number): void {
  ui.selectedDate = iso(addDays(weekStart.value, delta * 7))
}

function goToday(): void {
  ui.selectedDate = iso(new Date())
}

// calendar-management spec "Calendar visibility filters all views".
function eventsForDate(date: string) {
  return tasksStore.tasks
    .filter((t) => t.date === date && calendarsStore.isVisible(t.calendarId))
    .map((t) => {
      const theme = themeOf(t)
      return { id: t.id, title: t.title, color: theme.backgroundColor, start: t.start, end: t.end, allDay: t.allDay }
    })
}

const weekDays = computed(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart.value, i)))

const gridColumns = computed<TimeGridColumn[]>(() =>
  weekDays.value.map((d) => {
    const date = iso(d)
    const events = eventsForDate(date)
    return {
      date,
      dow: d.getDay(),
      dowLabel: WD_CAP[d.getDay()]!.toUpperCase(),
      dayNum: d.getDate(),
      today: date === iso(new Date()),
      events: events
        .filter((e) => !e.allDay)
        .map((e) => ({ id: e.id, title: e.title, color: e.color, start: minutes(e.start), end: minutes(e.end), allDay: false })),
      allDayEvents: events.filter((e) => e.allDay).map((e) => ({ id: e.id, title: e.title, color: e.color }))
    }
  })
)

const agendaDays = computed<WeekAgendaDay[]>(() =>
  weekDays.value.map((d) => {
    const date = iso(d)
    return {
      date,
      dayNum: d.getDate(),
      dow: d.getDay(),
      weekdayLabel: WD_CAP[d.getDay()]!.toUpperCase(),
      today: date === iso(new Date()),
      events: eventsForDate(date).map<MonthAgendaEvent>((e) => ({ id: e.id, title: e.title, color: e.color, time: e.start ? formatTime(e.start, settings.timeFormat) : e.start, allDay: e.allDay }))
    }
  })
)

// Event-block/agenda-row click opens the anchored preview (app-shell spec "Anchored popovers
// remain fully visible").
function onEventClick(_date: string, eventId: string, e: MouseEvent): void {
  ui.eventPreview = { taskId: eventId, anchor: anchorFromEvent(e), mode: 'preview' }
}
function onAgendaEventClick(event: MonthAgendaEvent, e: MouseEvent): void {
  ui.eventPreview = { taskId: event.id, anchor: anchorFromEvent(e), mode: 'preview' }
}

// Agenda-header click selects that day and switches to Day view (CADENCE Handoff.dc.html's
// _weekAgendaPhone date-tap pattern, line ~1449: setState the tapped date, then onView('Day')).
function onAgendaOpenDay(date: string): void {
  ui.selectedDate = date
  ui.activeView = 'day'
}

// Empty time-grid click opens Quick-Add — same rounding/clamping as DayView (app-shell spec
// "Time-grid click rounds the start time"). Desktop grid only; phone's agenda list has no
// empty-slot click surface per the handoff.
function onColumnClick(date: string, clickedMinutes: number, e: MouseEvent): void {
  const { start, end } = quickAddTimeRange(clickedMinutes)
  ui.qaPop = { anchor: anchorFromEvent(e), date, time: start, endTime: end }
}
</script>

<style scoped>
.week-view {
  display: flex;
  flex-direction: column;
  flex: 1 1 0;
  min-height: 0;
  /* padding: 22px 28px; */
}

.week-view__grid-wrap {
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
  padding: 0 22px 18px;
}

.week-view__agenda-wrap {
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
}
</style>
