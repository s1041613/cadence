<template>
  <div ref="rootEl" class="cd-date-picker">
    <button
      type="button"
      class="cd-date-picker__trigger"
      :class="{ 'cd-date-picker__trigger--open': open }"
      :aria-expanded="open"
      aria-label="Change date"
      @click="toggle"
    >
      <CdIcon name="calendar" :size="14" color="var(--cd-muted)" />
      <span>{{ triggerLabel }}</span>
    </button>

    <Teleport to="body">
      <div v-if="open" ref="popoverEl" class="cd-date-picker__popover" :style="popoverStyle">
        <div class="cd-date-picker__header">
          <button type="button" class="cd-date-picker__nav" aria-label="Previous month" @click="prevMonth">‹</button>
          <span class="cd-date-picker__month-label">{{ monthLabel }} {{ viewYear }}</span>
          <button type="button" class="cd-date-picker__nav" aria-label="Next month" @click="nextMonth">›</button>
        </div>

        <div class="cd-date-picker__dow-row">
          <span v-for="d in dowLabels" :key="d" class="cd-date-picker__dow">{{ d }}</span>
        </div>

        <div class="cd-date-picker__grid">
          <button
            v-for="cell in cells"
            :key="cell.date"
            type="button"
            class="cd-date-picker__cell"
            :class="{
              'cd-date-picker__cell--outside': cell.outsideMonth,
              'cd-date-picker__cell--selected': cell.date === modelValue,
              'cd-date-picker__cell--today': cell.date === todayIso && cell.date !== modelValue
            }"
            :aria-label="cellLabel(cell)"
            :aria-selected="cell.date === modelValue"
            :aria-current="cell.date === todayIso ? 'date' : undefined"
            @click="selectDay(cell)"
          >
            {{ cell.dayNum }}
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import CdIcon from './CdIcon.vue'
import { useSettingsStore } from '@/stores/settings-store'
import { iso, parseISO, WD_CAP } from '@/utils/convert-date-time'
import { monthGridCells, stepMonth, type MonthGridCellDate } from '@/utils/month-grid'

// CdDatePicker — inline mini-calendar popover for CdEventEditCard's date pill (design mockup
// artifact 3e44a51c). Deliberately not CdMonthSheet: this needs card-anchored popover
// positioning, month<->month navigation, and a plain single-select day grid, none of which
// CdMonthSheet's bottom-sheet/wheel-mode contract offers cheaply.
const props = defineProps<{
  modelValue: string // 'YYYY-MM-DD'
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const settings = useSettingsStore()

// The bound date ref can momentarily be '' before a parent seeds it (QuickAdd/composer paths start
// editDate/date as ''), which parseISO turns into an Invalid Date — formatting that throws
// "Invalid time value". Resolve every read through this guard so the picker falls back to today
// instead of crashing the render.
function safeDate(v: string): Date {
  const d = parseISO(v)
  return Number.isNaN(d.getTime()) ? new Date() : d
}

const seed = safeDate(props.modelValue)
const viewYear = ref(seed.getFullYear())
const viewMonth = ref(seed.getMonth())

// Keep the displayed month in sync when the selected date changes from outside (e.g. Ends row's
// read-only mirror stays consistent, or a parent resets the draft).
watch(
  () => props.modelValue,
  (v) => {
    if (open.value) return
    const d = safeDate(v)
    viewYear.value = d.getFullYear()
    viewMonth.value = d.getMonth()
  }
)

const MONTH_LABELS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const monthLabel = computed(() => MONTH_LABELS[viewMonth.value])
const dowLabels = computed(() => {
  const anchor = settings.firstDay === 'Sunday' ? 0 : settings.firstDay === 'Saturday' ? 6 : 1
  return Array.from({ length: 7 }, (_, i) => WD_CAP[(anchor + i) % 7])
})

const cells = computed<MonthGridCellDate[]>(() => monthGridCells(viewYear.value, viewMonth.value, settings.firstDay))

const todayIso = iso(new Date())

const triggerLabel = computed(() => {
  const d = safeDate(props.modelValue)
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(d)
})

// Full spoken date for screen readers, so a grid cell announces "Wednesday, July 22, 2026"
// instead of a bare "22". aria-selected/aria-current on the button convey selected/today state.
const cellLabelFmt = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
function cellLabel(cell: MonthGridCellDate): string {
  return cellLabelFmt.format(parseISO(cell.date))
}

function prevMonth(): void {
  const next = stepMonth(viewYear.value, viewMonth.value, -1)
  viewYear.value = next.year
  viewMonth.value = next.month
}

function nextMonth(): void {
  const next = stepMonth(viewYear.value, viewMonth.value, 1)
  viewYear.value = next.year
  viewMonth.value = next.month
}

function selectDay(cell: MonthGridCellDate): void {
  emit('update:modelValue', cell.date)
  if (cell.outsideMonth) {
    const d = parseISO(cell.date)
    viewYear.value = d.getFullYear()
    viewMonth.value = d.getMonth()
  }
  close()
}

const open = ref(false)
const rootEl = ref<HTMLElement | null>(null)
const popoverEl = ref<HTMLElement | null>(null)

// The popover is teleported to <body> and positioned with fixed coordinates measured from the
// trigger's rect, for the same reason CdTimeDropdown does it: this picker renders inside the edit
// card's scroll body (overflow-y: auto) and clipping card chain, which would otherwise cut off the
// calendar (especially the lower Ends row on short viewports / mobile sheets). ~296px tall; flips
// above the trigger when there isn't room below, and clamps within the viewport horizontally.
const POPOVER_WIDTH = 236
const POPOVER_EST_HEIGHT = 300
const popoverStyle = ref<{ position: 'fixed'; top: string; left: string }>({
  position: 'fixed',
  top: '0px',
  left: '0px'
})

function updatePopoverPosition(): void {
  const trigger = rootEl.value
  if (!trigger) return
  const rect = trigger.getBoundingClientRect()
  const gap = 6
  const margin = 8
  // Right-align the popover to the trigger's right edge (the pill sits on the card's right side),
  // then clamp so it never spills past either viewport edge.
  let left = rect.right - POPOVER_WIDTH
  left = Math.min(Math.max(left, margin), window.innerWidth - POPOVER_WIDTH - margin)
  // Prefer opening below; flip above when the calendar wouldn't fit under the trigger.
  const spaceBelow = window.innerHeight - rect.bottom
  const openUpward = spaceBelow < POPOVER_EST_HEIGHT + gap && rect.top > spaceBelow
  const actualHeight = popoverEl.value?.offsetHeight ?? POPOVER_EST_HEIGHT
  const top = openUpward ? rect.top - gap - actualHeight : rect.bottom + gap
  popoverStyle.value = { position: 'fixed', top: `${Math.max(top, margin)}px`, left: `${left}px` }
}

function close(): void {
  open.value = false
}

function toggle(): void {
  open.value = !open.value
  if (open.value) {
    const d = safeDate(props.modelValue)
    viewYear.value = d.getFullYear()
    viewMonth.value = d.getMonth()
    updatePopoverPosition()
    // Re-measure once the popover has rendered so upward-flip uses its real height.
    nextTick(updatePopoverPosition)
  }
}

function onOutsideInteraction(e: Event): void {
  const target = e.target as Node
  if (rootEl.value?.contains(target) || popoverEl.value?.contains(target)) return
  close()
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') close()
}

watch(open, (v) => {
  if (v) {
    document.addEventListener('mousedown', onOutsideInteraction)
    document.addEventListener('keydown', onKeydown)
    window.addEventListener('scroll', updatePopoverPosition, true)
    window.addEventListener('resize', updatePopoverPosition)
  } else {
    document.removeEventListener('mousedown', onOutsideInteraction)
    document.removeEventListener('keydown', onKeydown)
    window.removeEventListener('scroll', updatePopoverPosition, true)
    window.removeEventListener('resize', updatePopoverPosition)
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onOutsideInteraction)
  document.removeEventListener('keydown', onKeydown)
  window.removeEventListener('scroll', updatePopoverPosition, true)
  window.removeEventListener('resize', updatePopoverPosition)
})
</script>

<style scoped>
.cd-date-picker {
  position: relative;
}

.cd-date-picker__trigger {
  /* Content-width: the pill hugs "Jul 22, 2026" and sits left, no stretched right-side dead zone.
     Both rows share the same text so their pills come out equal width and their left edges line up
     naturally. */
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--cd-line-2);
  background: var(--cd-surface);
  border-radius: 10px;
  padding: 8px 10px;
  font: 700 12.5px var(--cd-font-mono);
  color: var(--cd-ink);
  cursor: pointer;
  transition: border-color var(--cd-duration-micro-3);
}

.cd-date-picker__trigger--open {
  border-color: var(--cd-olive);
}

.cd-date-picker__popover {
  /* Teleported to <body>; position comes from the inline fixed `top`/`left` set by
     updatePopoverPosition (right-aligned to the trigger, flips above when short on space below).
     z-index 80 matches CdTimeDropdown's menu so it outranks CdPopover (50) and CdDrawer (70). */
  z-index: 80;
  width: 236px;
  max-width: calc(100vw - 16px);
  background: #fff;
  border: 1px solid var(--cd-line-4);
  border-radius: 14px;
  box-shadow: 0 20px 44px -18px rgba(40, 38, 30, 0.42);
  padding: 12px;
}

.cd-date-picker__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.cd-date-picker__nav {
  border: none;
  background: transparent;
  color: var(--cd-ink-2);
  font-size: 16px;
  line-height: 1;
  padding: 4px 8px;
  border-radius: 8px;
  cursor: pointer;
}

.cd-date-picker__nav:hover {
  background: rgba(86, 88, 94, 0.06);
}

.cd-date-picker__month-label {
  font: 700 13px var(--cd-font-title);
  color: var(--cd-ink);
}

.cd-date-picker__dow-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-bottom: 4px;
}

.cd-date-picker__dow {
  text-align: center;
  font: 700 9.5px var(--cd-font-mono);
  letter-spacing: 0.04em;
  color: var(--cd-muted);
}

.cd-date-picker__grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
}

.cd-date-picker__cell {
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
  border: none;
  background: transparent;
  border-radius: 50%;
  font: 600 11.5px var(--cd-font-mono);
  color: var(--cd-ink);
  cursor: pointer;
  transition: background var(--cd-duration-micro-3);
}

.cd-date-picker__cell:hover {
  background: rgba(86, 88, 94, 0.06);
}

.cd-date-picker__cell--outside {
  color: var(--cd-muted);
  opacity: 0.55;
}

.cd-date-picker__cell--today {
  color: var(--cd-olive);
  font-weight: 800;
}

.cd-date-picker__cell--selected {
  background: var(--cd-olive-mix-1);
  color: #fff;
  font-weight: 800;
}
</style>
