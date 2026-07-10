<template>
  <div class="cd-cal-strip">
    <div ref="rowEl" class="cd-cal-strip__row" :class="{ 'cd-cal-strip__row--expanded': expanded }">
      <CdCalendarChip
        v-for="cal in calendars"
        :key="cal.id"
        :name="cal.name"
        :on="selected.includes(cal.id)"
        :cover="cal.cover ?? null"
        @toggle="emit('toggle', cal.id)"
      >
        <template #icon>
          <span class="cd-cal-strip__icon-fallback" v-html="cal.iconSvg" />
        </template>
      </CdCalendarChip>
    </div>
    <button
      v-if="showChevron"
      type="button"
      class="cd-cal-strip__chevron"
      :class="{ 'cd-cal-strip__chevron--expanded': expanded }"
      aria-label="Toggle calendar strip overflow"
      @click="expanded = !expanded"
    >
      <CdIcon name="chevron-right" :size="15" color="#9C9E94" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import CdCalendarChip from './CdCalendarChip.vue'
import CdIcon from './CdIcon.vue'

export interface CalStripCalendar {
  id: string
  name: string
  cover?: string | null
  iconSvg: string
}

// CdCalStrip — calendar filter strip. design-research-report.md §3.4.
// Overflow chevron only shows when the row's content overflows its container
// (scrollWidth > clientWidth + 2) or when already expanded; re-measures on window resize.
// Collapsed = horizontal scroll (scrollbar hidden via CSS); expanded = flex-wrap.
defineProps<{
  calendars: CalStripCalendar[]
  selected: string[]
}>()

const emit = defineEmits<{
  toggle: [id: string]
}>()

const expanded = ref(false)
const showChevron = ref(false)
const rowEl = ref<HTMLElement | null>(null)

function measure(): void {
  const el = rowEl.value
  if (!el) return
  const overflow = el.scrollWidth > el.clientWidth + 2
  showChevron.value = expanded.value || overflow
}

onMounted(() => {
  measure()
  window.addEventListener('resize', measure)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', measure)
})
</script>

<style scoped>
.cd-cal-strip {
  flex: none;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 10px 11px 18px;
  background: var(--cd-topbar);
  border-bottom: 1px solid var(--cd-line);
}

.cd-cal-strip__row {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
  flex-wrap: nowrap;
  scrollbar-width: none;
}

.cd-cal-strip__row::-webkit-scrollbar {
  display: none;
}

.cd-cal-strip__row--expanded {
  flex-wrap: wrap;
  overflow-x: visible;
  align-items: flex-start;
}

.cd-cal-strip__icon-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
}

.cd-cal-strip__chevron {
  width: 30px;
  height: 30px;
  flex: none;
  align-self: center;
  border: none;
  background: transparent;
  border-radius: var(--cd-radius-pill);
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: background var(--cd-duration-micro-3);
}

.cd-cal-strip__chevron:hover {
  background: rgba(86, 88, 94, 0.06);
}

.cd-cal-strip__chevron--expanded {
  align-self: flex-start;
}

.cd-cal-strip__chevron svg {
  transform: rotate(90deg);
  transition: transform var(--cd-duration-micro-5);
}

.cd-cal-strip__chevron--expanded svg {
  transform: rotate(-90deg);
}
</style>
