<template>
  <div class="cd-month-cell" @click="emit('click')">
    <div class="cd-month-cell__head">
      <span
        class="cd-month-cell__num"
        :class="{
          'cd-month-cell__num--sat': dow === 6,
          'cd-month-cell__num--sun': dow === 0,
          'cd-month-cell__num--outside': outsideMonth,
          'cd-month-cell__num--today': today
        }"
      >
        {{ dayNum }}
      </span>
    </div>
    <div v-if="fmt === 'dot'" class="cd-month-cell__dots">
      <span v-for="(ev, i) in events.slice(0, 4)" :key="i" class="cd-month-cell__dot" :style="{ background: ev.color }" />
    </div>
    <div v-else class="cd-month-cell__events">
      <CdEventChip
        v-for="(ev, i) in events.slice(0, 2)"
        :key="i"
        :title="ev.title"
        :color="ev.color"
        :quad="ev.quad"
        :time="ev.allDay ? null : ev.time"
        :all-day="ev.allDay"
        :done="ev.done"
        :fmt="fmt"
        @click="(e) => { e.stopPropagation(); emit('eventClick', ev) }"
      />
      <button v-if="events.length > 2" type="button" class="cd-month-cell__more" @click.stop="emit('more')">
        +{{ events.length - 2 }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
// CdMonthCell — single month-grid day cell. design-research-report.md §3.5.
// Date number: JetBrains Mono 19px (desk); weekday default #56585E, Sat #3A6EA5, Sun #C0564B,
// outside-month rgba(156,158,148,.5); today = 800 weight, 26x26 circle bg #B3AC91 color #3f4136.
// "+N more" link: 8px mono, color #9C9E94.
import CdEventChip from './CdEventChip.vue'

export interface MonthCellEvent {
  title: string
  color: string
  quad: 'do' | 'plan' | 'quick' | 'later' | 'event'
  time: string
  allDay: boolean
  done: boolean
}

defineProps<{
  dayNum: number
  dow: number // 0=Sun..6=Sat
  outsideMonth: boolean
  today: boolean
  events: MonthCellEvent[]
  fmt: 'time' | 'name' | 'dot'
}>()

const emit = defineEmits<{
  click: []
  eventClick: [event: MonthCellEvent]
  more: []
}>()
</script>

<style scoped>
.cd-month-cell {
  height: 100px;
  padding: 8px 6px;
  border-top: 1px solid var(--cd-line);
  display: flex;
  flex-direction: column;
  gap: 3px;
  cursor: pointer;
  box-sizing: border-box;
}

.cd-month-cell__head {
  display: flex;
  justify-content: flex-start;
}

.cd-month-cell__num {
  font: 500 19px var(--cd-font-mono);
  color: var(--cd-ink);
}

.cd-month-cell__num--sat {
  color: var(--cd-sat);
}

.cd-month-cell__num--sun {
  color: var(--cd-sun);
}

.cd-month-cell__num--outside {
  color: rgba(156, 158, 148, 0.5);
}

.cd-month-cell__num--today {
  font-weight: 800;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--cd-olive);
  color: #3f4136;
  display: grid;
  place-items: center;
}

.cd-month-cell__events {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-height: 0;
  overflow: hidden;
}

.cd-month-cell__dots {
  display: flex;
  gap: 3px;
}

.cd-month-cell__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
}

.cd-month-cell__more {
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
  text-align: left;
  font: 8px var(--cd-font-mono);
  color: var(--cd-muted);
}
</style>
