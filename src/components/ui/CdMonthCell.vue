<template>
  <div class="cd-month-cell" @click="(e) => emit('click', e)">
    <div class="cd-month-cell__head">
      <span
        class="cd-month-cell__num"
        :class="{
          'cd-month-cell__num--sat': dow === 6,
          'cd-month-cell__num--sun': dow === 0,
          'cd-month-cell__num--outside': outsideMonth,
          'cd-month-cell__num--today': today,
          'cd-month-cell__num--selected': selected
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
        v-for="ev in visibleEvents"
        :key="ev.id"
        :title="ev.title"
        :color="ev.color"
        :quad="ev.quad"
        :time="ev.allDay ? null : ev.time"
        :end-time="ev.allDay ? null : ev.endTime"
        :all-day="ev.allDay"
        :done="ev.done"
        :fmt="fmt"
        @click="(e) => { e.stopPropagation(); emit('eventClick', ev, e) }"
      />
      <button v-if="hiddenCount > 0" type="button" class="cd-month-cell__more" @click.stop="emit('more')">
        +{{ hiddenCount }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
// CdMonthCell — single month-grid day cell. design-research-report.md §3.5.
// Date number: JetBrains Mono 700 19px in a 26x26 circle (desk) / 12px in 20x20 (<899px, kept small
// so phone rows spend their height on chips), matching CdWeekAgenda's .cd-week-agenda__num type
// system; weekday default #56585E, Sat #3A6EA5, Sun #C0564B, outside-month rgba(156,158,148,.5);
// today = 800 weight, circle bg #B3AC91 color #3f4136. "+N more" link: 8px mono, color #9C9E94.
// Chip count: `maxChips` (computed by CdMonthGrid from the measured row height) caps how much
// event density the cell attempts. When events overflow, the last slot is given to the "+N" button,
// but month cells preserve at least 3 visible events before collapsing the rest.
import { computed } from 'vue'
import CdEventChip from './CdEventChip.vue'

export interface MonthCellEvent {
  id: string
  title: string
  color: string
  quad: 'do' | 'plan' | 'quick' | 'later' | 'event'
  time: string
  endTime: string | null
  allDay: boolean
  done: boolean
}

const props = defineProps<{
  dayNum: number
  dow: number // 0=Sun..6=Sat
  outsideMonth: boolean
  today: boolean
  selected?: boolean
  events: MonthCellEvent[]
  fmt: 'time' | 'name' | 'icon' | 'dot'
  maxChips?: number
}>()

const emit = defineEmits<{
  click: [event: MouseEvent]
  eventClick: [event: MonthCellEvent, mouseEvent: MouseEvent]
  more: []
}>()

const MIN_VISIBLE_EVENTS = 3
const cap = computed(() => Math.max(MIN_VISIBLE_EVENTS, props.maxChips ?? MIN_VISIBLE_EVENTS))
const visibleEvents = computed(() =>
  props.events.length <= cap.value
    ? props.events
    : props.events.slice(0, Math.max(MIN_VISIBLE_EVENTS, cap.value - 1))
)
const hiddenCount = computed(() => props.events.length - visibleEvents.value.length)
</script>

<style scoped>
.cd-month-cell {
  height: 100%;
  padding: 8px 6px;
  border-top: 1px solid var(--cd-line);
  display: flex;
  flex-direction: column;
  gap: 3px;
  cursor: pointer;
  box-sizing: border-box;
  overflow: hidden;
}

.cd-month-cell__head {
  flex: none;
  display: flex;
  /* Day number sits centered under the (also centered) dow letter of its column,
     per the handoff mockup's alignItems:center cells. */
  justify-content: center;
}

.cd-month-cell__num {
  font: 700 19px var(--cd-font-mono);
  color: var(--cd-ink);
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: grid;
  place-items: center;
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
  background: var(--cd-olive);
  color: #3f4136;
}

.cd-month-cell__num--selected {
  background: rgba(86, 88, 94, 0.12);
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
  justify-content: center;
  gap: 3px;
}

.cd-month-cell__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
}

.cd-month-cell__more {
  flex: none;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
  text-align: left;
  font: 8px var(--cd-font-mono);
  color: var(--cd-muted);
}

@media (max-width: 899px) {
  .cd-month-cell {
    /* Fill the readable month-grid row floor; the parent scrolls when the full month exceeds the
       phone viewport instead of compressing event chips. */
    height: 100%;
    padding: 3px;
    gap: 1px;
  }

  .cd-month-cell__num {
    font: 700 12px var(--cd-font-mono);
    width: 20px;
    height: 20px;
  }
}
</style>
