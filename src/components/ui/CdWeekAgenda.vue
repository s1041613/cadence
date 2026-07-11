<template>
  <div class="cd-week-agenda">
    <div v-for="(day, i) in days" :key="day.date" class="cd-week-agenda__row" :class="{ 'cd-week-agenda__row--first': i === 0 }">
      <div
        class="cd-week-agenda__badge"
        :class="{ 'cd-week-agenda__badge--clickable': true }"
        role="button"
        tabindex="0"
        @click="emit('dayClick', day.date)"
        @keydown.enter="emit('dayClick', day.date)"
      >
        <span
          class="cd-week-agenda__num"
          :class="{
            'cd-week-agenda__num--sat': day.dow === 6,
            'cd-week-agenda__num--sun': day.dow === 0,
            'cd-week-agenda__num--today': day.today
          }"
        >
          {{ day.dayNum }}
        </span>
        <span class="cd-week-agenda__dow">{{ day.weekdayLabel }}</span>
      </div>
      <div class="cd-week-agenda__list">
        <button
          v-for="ev in sortedEvents(day.events)"
          :key="ev.id"
          type="button"
          class="cd-week-agenda__item"
          @click="(e) => emit('eventClick', ev, e)"
        >
          <span class="cd-week-agenda__dot" :style="{ background: ev.color }" />
          <span class="cd-week-agenda__title">{{ ev.title }}</span>
          <span class="cd-week-agenda__leader" />
          <span class="cd-week-agenda__time" :class="{ 'cd-week-agenda__time--allday': ev.allDay }">
            {{ ev.allDay ? 'All-day' : ev.time }}
          </span>
        </button>
        <div v-if="day.events.length === 0" class="cd-week-agenda__empty">—</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// CdWeekAgenda — phone Week view's per-day agenda list. CADENCE Handoff.dc.html's
// _weekAgendaPhone (line ~1422): left day badge (num + weekday, olive circle today,
// sat/sun tint) beside a dotted-leader-line event list, all-day items sorted first.
import type { MonthAgendaEvent } from './CdMonthAgenda.vue'

export interface WeekAgendaDay {
  date: string
  dayNum: number
  dow: number // 0=Sun..6=Sat
  weekdayLabel: string
  today: boolean
  events: MonthAgendaEvent[]
}

defineProps<{
  days: WeekAgendaDay[]
}>()

const emit = defineEmits<{
  eventClick: [event: MonthAgendaEvent, mouseEvent: MouseEvent]
  dayClick: [date: string]
}>()

function sortedEvents(events: MonthAgendaEvent[]): MonthAgendaEvent[] {
  return [...events].sort((a, b) => {
    if (a.allDay && !b.allDay) return -1
    if (!a.allDay && b.allDay) return 1
    if (a.allDay && b.allDay) return 0
    return a.time.localeCompare(b.time)
  })
}
</script>

<style scoped>
.cd-week-agenda {
  padding: 6px 18px 18px;
  background: var(--cd-surface);
  min-height: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.cd-week-agenda__row {
  display: flex;
  align-items: stretch;
  gap: 14px;
  padding: 14px 4px;
  border-top: 1px solid var(--cd-line);
  flex: 1 1 0;
  min-height: 64px;
  min-width: 0;
  box-sizing: border-box;
  overflow: hidden;
}

.cd-week-agenda__row--first {
  border-top: none;
}

.cd-week-agenda__badge {
  width: 46px;
  flex: none;
  align-self: center;
  text-align: center;
  cursor: pointer;
  border-radius: var(--cd-radius-matrix, 11px);
  padding: 5px 2px;
  background: transparent;
  transition: background var(--cd-duration-micro-3);
}

.cd-week-agenda__badge:hover {
  background: rgba(179, 172, 145, 0.12);
}

.cd-week-agenda__badge:active {
  background: rgba(179, 172, 145, 0.3);
}

.cd-week-agenda__num {
  display: block;
  font: 700 17px var(--cd-font-mono);
  line-height: 0.9;
  letter-spacing: -0.02em;
  color: var(--cd-ink);
}

.cd-week-agenda__num--sat {
  color: var(--cd-sat);
}

.cd-week-agenda__num--sun {
  color: var(--cd-sun);
}

.cd-week-agenda__num--today {
  font-weight: 800;
  background: var(--cd-olive);
  color: var(--cd-olive-ink);
  border-radius: 50%;
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  margin: 0 auto;
  line-height: 1;
}

.cd-week-agenda__dow {
  display: block;
  font: 700 9px var(--cd-font-mono);
  letter-spacing: 0.14em;
  color: var(--cd-muted);
  margin-top: 5px;
}

.cd-week-agenda__list {
  flex: 1;
  min-width: 0;
  min-height: 0;
  align-self: stretch;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.cd-week-agenda__item {
  display: flex;
  align-items: baseline;
  gap: 8px;
  width: 100%;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  padding: 5px 0;
}

.cd-week-agenda__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex: none;
  transform: translateY(-1px);
}

.cd-week-agenda__title {
  font: 500 13px var(--cd-font-ui);
  color: var(--cd-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cd-week-agenda__leader {
  flex: 1;
  min-width: 8px;
  border-bottom: 1px dotted rgba(86, 88, 94, 0.3);
  transform: translateY(-3px);
}

.cd-week-agenda__time {
  font: 600 11px var(--cd-font-mono);
  color: var(--cd-muted);
  flex: none;
}

.cd-week-agenda__time--allday {
  color: var(--cd-sun);
}

.cd-week-agenda__empty {
  font: 400 12px var(--cd-font-ui);
  color: var(--cd-muted);
  font-style: italic;
  padding: 5px 0;
}
</style>
