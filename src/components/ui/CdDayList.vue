<template>
  <div class="cd-day-list">
    <div class="cd-day-list__header">
      <div class="cd-day-list__title">
        <span class="cd-day-list__year">{{ year }}</span>
        <span class="cd-day-list__date">{{ dateLabel }}</span>
      </div>
      <button type="button" class="cd-day-list__close" aria-label="Close" @click="emit('close')">
        <CdIcon name="close" :size="16" />
      </button>
    </div>
    <div class="cd-day-list__list">
      <button
        v-for="(ev, i) in events"
        :key="i"
        type="button"
        class="cd-day-list__row"
        @click="emit('eventClick', ev)"
      >
        <span class="cd-day-list__dot" :style="{ background: ev.color }" />
        <span class="cd-day-list__row-title">{{ ev.title }}</span>
        <span class="cd-day-list__row-time">{{ ev.allDay ? 'All-day' : ev.time }}</span>
      </button>
      <div v-if="events.length === 0" class="cd-day-list__empty">Nothing scheduled.</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import CdIcon from './CdIcon.vue'

// CdDayList — the panel opened by a month cell's "+N" overflow. CADENCE Handoff._dayList: header
// (year + "Month Day" title) + scrollable event rows (dot, title, time/"All-day"), empty state
// "Nothing scheduled." Presentation (desktop right drawer vs phone bottom sheet) is the caller's via
// CdDrawerOrSheet, per the drawer-or-sheet convention — this component only renders the panel body.
export interface DayListEvent {
  title: string
  color: string
  time: string
  allDay: boolean
}

defineProps<{
  year: string
  dateLabel: string
  events: DayListEvent[]
}>()

const emit = defineEmits<{
  close: []
  eventClick: [event: DayListEvent]
}>()
</script>

<style scoped>
.cd-day-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--cd-topbar);
}

.cd-day-list__header {
  flex: none;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 22px 14px;
  border-bottom: 1px solid var(--cd-line);
}

.cd-day-list__title {
  flex: 1;
}

.cd-day-list__year {
  display: block;
  font: 700 11px var(--cd-font-mono);
  letter-spacing: 0.14em;
  color: var(--cd-muted);
}

.cd-day-list__date {
  display: block;
  font: 800 22px var(--cd-font-title);
  color: var(--cd-ink);
  margin-top: 2px;
}

.cd-day-list__close {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--cd-muted);
  border-radius: var(--cd-radius-pill);
  display: grid;
  place-items: center;
}

.cd-day-list__list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 10px 14px 18px;
}

.cd-day-list__row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  padding: 12px 10px;
  border-radius: var(--cd-radius-md, 10px);
  transition: background var(--cd-duration-micro-3);
}

.cd-day-list__row:hover {
  background: rgba(86, 88, 94, 0.05);
}

.cd-day-list__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex: none;
}

.cd-day-list__row-title {
  flex: 1;
  font: 600 15px var(--cd-font-title);
  color: var(--cd-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cd-day-list__row-time {
  font: 600 12px var(--cd-font-mono);
  color: var(--cd-muted);
  flex: none;
}

.cd-day-list__empty {
  font: 500 14px var(--cd-font-title);
  color: var(--cd-muted);
  font-style: italic;
  padding: 14px 10px;
}
</style>
