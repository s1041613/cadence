<template>
  <div class="cd-week-strip">
    <button
      v-for="day in days"
      :key="day.date"
      type="button"
      class="cd-week-strip__pill"
      :class="{ 'cd-week-strip__pill--selected': day.date === selected }"
      @click="emit('select', day.date)"
    >
      <span class="cd-week-strip__dow" :class="{ 'cd-week-strip__dow--sat': day.dow === 6, 'cd-week-strip__dow--sun': day.dow === 0 }">
        {{ day.label }}
      </span>
      <span class="cd-week-strip__num">{{ day.dayNum }}</span>
      <span class="cd-week-strip__dots">
        <span
          v-for="(color, i) in day.dots.slice(0, 4)"
          :key="i"
          class="cd-week-strip__dot"
          :style="{ background: day.date === selected ? '#3f4136' : color }"
        />
      </span>
    </button>
  </div>
</template>

<script setup lang="ts">
// CdWeekStrip — Day view's week-strip cluster: 7 day pills, 50px wide (desk). design-research-report.md §3.7.
// Selected pill: solid olive background, radius 12px, ink text/dots turn #3f4136.
export interface WeekStripDay {
  date: string
  dow: number // 0=Sun..6=Sat
  label: string // e.g. 'MON'
  dayNum: number
  dots: string[] // event color dots, max 4 rendered
}

defineProps<{
  days: WeekStripDay[]
  selected: string
}>()

const emit = defineEmits<{
  select: [date: string]
}>()
</script>

<style scoped>
.cd-week-strip {
  display: flex;
  gap: 2px;
}

.cd-week-strip__pill {
  width: 50px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 6px 0 8px;
  border: none;
  background: transparent;
  border-radius: 12px;
  cursor: pointer;
}

.cd-week-strip__pill--selected {
  background: var(--cd-olive);
}

.cd-week-strip__dow {
  font: 600 10px var(--cd-font-ui);
  letter-spacing: 0.02em;
  color: var(--cd-ink-2);
}

.cd-week-strip__pill--selected .cd-week-strip__dow {
  color: #3f4136;
}

.cd-week-strip__dow--sat {
  color: var(--cd-sat);
}

.cd-week-strip__dow--sun {
  color: var(--cd-sun);
}

.cd-week-strip__pill--selected .cd-week-strip__dow--sat,
.cd-week-strip__pill--selected .cd-week-strip__dow--sun {
  color: #3f4136;
}

.cd-week-strip__num {
  font: 700 15px var(--cd-font-mono);
  color: var(--cd-ink);
}

.cd-week-strip__pill--selected .cd-week-strip__num {
  color: #3f4136;
}

.cd-week-strip__dots {
  display: flex;
  gap: 3px;
  min-height: 5px;
}

.cd-week-strip__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
}
</style>
