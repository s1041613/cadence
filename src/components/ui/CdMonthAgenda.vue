<template>
  <div class="cd-month-agenda">
    <div class="cd-month-agenda__header" role="button" tabindex="0" @click="emit('openDay')" @keydown.enter="emit('openDay')">
      <span class="cd-month-agenda__label" :class="{ 'cd-month-agenda__label--today': today }">
        {{ today ? 'TODAY' : dow }}
      </span>
      <span class="cd-month-agenda__date">{{ dateLabel }}</span>
    </div>
    <div v-if="events.length" class="cd-month-agenda__list">
      <button
        v-for="ev in events"
        :key="ev.id"
        type="button"
        class="cd-month-agenda__row"
        @click="(e) => emit('eventClick', ev, e)"
      >
        <span class="cd-month-agenda__dot" :style="{ background: ev.color }" />
        <span class="cd-month-agenda__title">{{ ev.title }}</span>
        <span class="cd-month-agenda__time">{{ ev.allDay ? 'All-day' : ev.time }}</span>
      </button>
    </div>
    <div v-else class="cd-month-agenda__empty">Nothing scheduled.</div>
  </div>
</template>

<script setup lang="ts">
// CdMonthAgenda — the agenda pane in the phone Month split-pane (grid above, agenda below).
// CADENCE Handoff.dc.html's month poster `agenda` block: weekday label (olive "TODAY" for the
// selected day when it is today, else uppercase weekday mono) + date, then dot/title/time rows,
// "Nothing scheduled." italic empty state.
export interface MonthAgendaEvent {
  id: string
  title: string
  color: string
  time: string
  allDay: boolean
}

defineProps<{
  dow: string
  dateLabel: string
  today: boolean
  events: MonthAgendaEvent[]
}>()

const emit = defineEmits<{
  eventClick: [event: MonthAgendaEvent, mouseEvent: MouseEvent]
  openDay: []
}>()
</script>

<style scoped>
.cd-month-agenda {
  padding: 4px 16px 18px;
}

.cd-month-agenda__header {
  display: flex;
  align-items: baseline;
  gap: 9px;
  padding: 14px 0 8px;
  cursor: pointer;
}

.cd-month-agenda__label {
  font: 700 11px var(--cd-font-mono);
  letter-spacing: 0.14em;
  color: var(--cd-muted);
}

.cd-month-agenda__label--today {
  color: var(--cd-olive);
}

.cd-month-agenda__date {
  font: 600 13px var(--cd-font-ui);
  color: var(--cd-ink);
}

.cd-month-agenda__list {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.cd-month-agenda__row {
  display: flex;
  align-items: center;
  gap: 11px;
  width: 100%;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  padding: 10px 8px;
  border-radius: var(--cd-radius-md, 10px);
  transition: background var(--cd-duration-micro-3);
}

.cd-month-agenda__row:hover {
  background: rgba(86, 88, 94, 0.05);
}

.cd-month-agenda__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex: none;
}

.cd-month-agenda__title {
  flex: 1;
  min-width: 0;
  font: 600 15px var(--cd-font-title);
  color: var(--cd-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cd-month-agenda__time {
  font: 600 12px var(--cd-font-mono);
  color: var(--cd-muted);
  flex: none;
}

.cd-month-agenda__empty {
  font: 500 14px var(--cd-font-title);
  color: var(--cd-muted);
  font-style: italic;
  padding: 10px 8px;
}
</style>
