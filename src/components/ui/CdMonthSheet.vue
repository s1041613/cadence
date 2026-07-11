<template>
  <div class="cd-month-sheet">
    <div class="cd-month-sheet__header">
      <button type="button" class="cd-month-sheet__title" @click="emit('toggleMode')">
        <span>{{ monthLabel }} {{ year }}</span>
        <span class="cd-month-sheet__caret">▾</span>
      </button>
      <button v-if="mode === 'grid'" type="button" class="cd-month-sheet__today-pill" @click="emit('today')">Today</button>
    </div>

    <div class="cd-month-sheet__body">
      <template v-if="mode === 'grid'">
        <div class="cd-month-sheet__dow-row">
          <span v-for="d in DOW" :key="d" class="cd-month-sheet__dow">{{ d }}</span>
        </div>
        <div class="cd-month-sheet__grid">
          <div v-for="(cell, i) in cells" :key="i" class="cd-month-sheet__cell" @click="cell && emit('selectDay', cell.day)">
            <template v-if="cell">
              <span v-if="cell.today" class="cd-month-sheet__num cd-month-sheet__num--today">{{ cell.day }}</span>
              <span v-else class="cd-month-sheet__num">{{ cell.day }}</span>
              <div class="cd-month-sheet__dots">
                <span v-for="(c, j) in cell.dots" :key="j" class="cd-month-sheet__dot" :style="{ background: c }" />
              </div>
            </template>
          </div>
        </div>
      </template>

      <template v-else>
        <div class="cd-month-sheet__wheels">
          <div class="cd-month-sheet__wheel-col">
            <span
              v-for="(m, i) in months"
              :key="m"
              class="cd-month-sheet__wheel-item"
              :class="{ 'cd-month-sheet__wheel-item--center': i === centerIdx }"
              :style="{ opacity: wheelOpacity(i, centerIdx) }"
            >
              {{ m }}
            </span>
          </div>
          <div class="cd-month-sheet__wheel-col">
            <span
              v-for="(y, i) in years"
              :key="y"
              class="cd-month-sheet__wheel-item cd-month-sheet__wheel-item--big"
              :class="{ 'cd-month-sheet__wheel-item--center': i === centerIdx }"
              :style="{ opacity: wheelOpacity(i, centerIdx) }"
            >
              {{ y }}
            </span>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
// CdMonthSheet — bottom-sheet calendar picker with grid<->wheel toggle. CADENCE Handoff §3.17.
// Grid: Sunday-start, today = 22px ink circle + white number, event dots (max shown per day left to
// caller-provided `cells`). Grid header title is 700 17px title font, paired with a "Today" pill
// (bg #EFEDE4, pill radius, 600 12px ui font, ink color) that emits `today`. Wheel: month+year
// columns, opacity gradient by distance from center (1/.55/.32/.16/.08), mask-image fade top/bottom
// — purely visual, not scrollable (prototype note: "純視覺，不可捲動").
export interface MonthSheetCell {
  day: number
  today: boolean
  dots: string[]
}

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const props = defineProps<{
  mode: 'grid' | 'wheel'
  monthLabel: string
  year: string
  cells: Array<MonthSheetCell | null> // null = leading/trailing blank cell
  months: string[]
  years: string[]
  centerIdx: number
}>()

const emit = defineEmits<{
  toggleMode: []
  selectDay: [day: number]
  today: []
}>()

function wheelOpacity(i: number, center: number): number {
  const dist = Math.abs(i - center)
  if (dist === 0) return 1
  if (dist === 1) return 0.55
  if (dist === 2) return 0.32
  if (dist === 3) return 0.16
  return 0.08
}
</script>

<style scoped>
.cd-month-sheet {
  position: relative;
  padding: 0 18px 22px;
}

.cd-month-sheet__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0 14px;
}

.cd-month-sheet__title {
  display: flex;
  align-items: center;
  gap: 9px;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
  font: 700 17px var(--cd-font-title);
  letter-spacing: -0.01em;
  color: var(--cd-ink);
}

.cd-month-sheet__caret {
  color: var(--cd-olive);
  font-size: 20px;
  transform: translateY(-2px);
}

.cd-month-sheet__today-pill {
  border: none;
  background: #efede4;
  border-radius: var(--cd-radius-pill);
  padding: 6px 12px;
  font: 600 12px var(--cd-font-ui);
  color: var(--cd-ink);
  cursor: pointer;
}

.cd-month-sheet__body {
  height: 300px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.cd-month-sheet__dow-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-bottom: 8px;
}

.cd-month-sheet__dow {
  text-align: center;
  font: 500 12px var(--cd-font-ui);
  color: var(--cd-muted);
}

.cd-month-sheet__grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.cd-month-sheet__cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 5px 0 4px;
  border-radius: 9px;
  cursor: pointer;
  min-height: 42px;
  transition: background var(--cd-duration-micro-3);
}

.cd-month-sheet__cell:hover {
  background: rgba(0, 0, 0, 0.05);
}

.cd-month-sheet__num {
  font: 700 13px var(--cd-font-mono);
  color: #3a3a3a;
}

.cd-month-sheet__num--today {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--cd-ink);
  color: #fff;
  display: grid;
  place-items: center;
  font: 700 12px var(--cd-font-mono);
}

.cd-month-sheet__dots {
  display: flex;
  gap: 2.5px;
  margin-top: 4px;
  height: 5px;
}

.cd-month-sheet__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
}

.cd-month-sheet__wheels {
  display: flex;
  height: 100%;
  overflow: hidden;
  align-items: center;
  -webkit-mask-image: linear-gradient(180deg, transparent, #000 28%, #000 72%, transparent);
  mask-image: linear-gradient(180deg, transparent, #000 28%, #000 72%, transparent);
}

.cd-month-sheet__wheel-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.cd-month-sheet__wheel-item {
  font: 500 17px var(--cd-font-title);
  color: var(--cd-ink);
  white-space: nowrap;
}

.cd-month-sheet__wheel-item--center {
  font-weight: 700;
  font-size: 24px;
}

.cd-month-sheet__wheel-item--big.cd-month-sheet__wheel-item--center {
  font-size: 26px;
}
</style>
