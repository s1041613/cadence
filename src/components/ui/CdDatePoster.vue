<template>
  <div class="cd-date-poster" :class="`cd-date-poster--${variant}`">
    <div class="cd-date-poster__left">
      <span class="cd-date-poster__year">{{ year }}</span>
      <button type="button" class="cd-date-poster__title" @click="emit('openCalendarSheet')">
        <span>{{ title }}</span>
        <span v-if="variant === 'month'" class="cd-date-poster__caret">▾</span>
      </button>
      <div class="cd-date-poster__nav">
        <button type="button" class="cd-date-poster__chev" aria-label="Previous" @click="emit('prev')">‹</button>
        <button type="button" class="cd-date-poster__today" @click="emit('today')">{{ todayLabel }}</button>
        <button type="button" class="cd-date-poster__chev" aria-label="Next" @click="emit('next')">›</button>
      </div>
    </div>
    <div v-if="$slots.extra" class="cd-date-poster__extra">
      <slot name="extra" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

// CdDatePoster — big date navigation header, 3 variants (month/week/day). design-research-report.md §3.3.
// Year row: 700 14px mono, ls .14em, #9C9E94. Title: 800 46px (month) / 44px (week/day) Zen Kaku, ls -.01em, lh .95.
// Month variant has an olive caret next to the title that opens the calendar bottom-sheet (not a dropdown).
// Chevron sizes differ per variant (month footer 30x28, day 24x28, week 30x28) but are visually identical here;
// callers can slot day-view's week-strip cluster into #extra.
const props = defineProps<{
  variant: 'month' | 'week' | 'day'
  year: string
  title: string
}>()

const emit = defineEmits<{
  prev: []
  next: []
  today: []
  openCalendarSheet: []
}>()

const todayLabel = computed(() => (props.variant === 'week' ? 'This Week' : 'Today'))
</script>

<style scoped>
.cd-date-poster {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 22px 30px 18px;
  background: var(--cd-topbar);
}

.cd-date-poster__left {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.cd-date-poster__year {
  font: 700 14px var(--cd-font-mono);
  letter-spacing: 0.14em;
  color: var(--cd-muted);
}

.cd-date-poster__title {
  display: flex;
  align-items: center;
  gap: 9px;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 2px 4px;
  margin: 2px -4px 0;
  border-radius: 10px;
  font: 800 44px var(--cd-font-title);
  letter-spacing: -0.01em;
  line-height: 0.95;
  color: var(--cd-ink);
  transition: background var(--cd-duration-micro-3);
}

.cd-date-poster--month .cd-date-poster__title {
  font-size: 46px;
}

.cd-date-poster__title:hover {
  background: rgba(86, 88, 94, 0.06);
}

.cd-date-poster__caret {
  color: var(--cd-olive);
  font-size: 22px;
  transform: translateY(-2px);
}

.cd-date-poster__nav {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-top: 8px;
}

.cd-date-poster__chev {
  flex: none;
  width: 30px;
  height: 28px;
  display: grid;
  place-items: center;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  color: var(--cd-ink-2);
  font-size: 17px;
  line-height: 1;
  transition: background var(--cd-duration-micro-3);
}

.cd-date-poster--day .cd-date-poster__chev {
  width: 24px;
}

.cd-date-poster__chev:hover {
  background: rgba(86, 88, 94, 0.07);
}

.cd-date-poster__today {
  border: none;
  background: transparent;
  cursor: pointer;
  font: 600 12.5px var(--cd-font-ui);
  color: var(--cd-ink-2);
  padding: 4px 10px;
  border-radius: 8px;
  transition: background var(--cd-duration-micro-3);
}

.cd-date-poster__today:hover {
  background: rgba(86, 88, 94, 0.07);
}

.cd-date-poster__extra {
  display: flex;
}
</style>
