<template>
  <!--
    月/年輪盤選擇器（照設計稿）：兩欄 scroll-snap，月欄 Instrument Serif italic、年欄 mono。
    中央高亮列有上下細線；上下漸層淡出。捲動 snap 到某列即選定該月/年。
  -->
  <div class="pv2-sheet-scrim" @click="emit('close')">
    <div class="pv2-sheet" @click.stop>
      <div class="pv2-sheet__handle" />

      <!-- 選中列不畫高亮帶（樣式 B）：只靠中央列字最大最深區分選中 -->
      <div class="pv2-sheet__wheels">
        <div ref="monthEl" class="pv2-sheet__col" @scroll="onMonthScroll">
          <div class="pv2-sheet__pad" />
          <div
            v-for="(m, i) in MONTHS_SHORT"
            :key="m"
            class="pv2-sheet__item pv2-sheet__item--month"
            :style="itemStyle(i - monthIdx, false)"
          >
            {{ m }}
          </div>
          <div class="pv2-sheet__pad" />
        </div>

        <div ref="yearEl" class="pv2-sheet__col" @scroll="onYearScroll">
          <div class="pv2-sheet__pad" />
          <div
            v-for="(y, i) in years"
            :key="y"
            class="pv2-sheet__item pv2-sheet__item--year"
            :style="itemStyle(i - yearIdx, true)"
          >
            {{ y }}
          </div>
          <div class="pv2-sheet__pad" />
        </div>

        <div class="pv2-sheet__fade pv2-sheet__fade--top" />
        <div class="pv2-sheet__fade pv2-sheet__fade--bottom" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'

const props = defineProps<{
  month: number // 0-11
  year: number
}>()

const emit = defineEmits<{
  select: [payload: { month: number; year: number }]
  close: []
}>()

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const IH = 44 // item height（與 CSS 對齊）
const BASE_YEAR = 2020
const YEAR_COUNT = 21

const years = computed(() => Array.from({ length: YEAR_COUNT }, (_, i) => String(BASE_YEAR + i)))

const monthEl = ref<HTMLElement | null>(null)
const yearEl = ref<HTMLElement | null>(null)
const monthIdx = ref(props.month)
const yearIdx = ref(props.year - BASE_YEAR)

onMounted(async () => {
  await nextTick()
  if (monthEl.value) monthEl.value.scrollTop = props.month * IH
  if (yearEl.value) yearEl.value.scrollTop = (props.year - BASE_YEAR) * IH
})

function onMonthScroll(e: Event): void {
  const i = Math.max(0, Math.min(11, Math.round((e.target as HTMLElement).scrollTop / IH)))
  if (i !== monthIdx.value) {
    monthIdx.value = i
    emit('select', { month: i, year: BASE_YEAR + yearIdx.value })
  }
}

function onYearScroll(e: Event): void {
  const i = Math.max(0, Math.min(YEAR_COUNT - 1, Math.round((e.target as HTMLElement).scrollTop / IH)))
  if (i !== yearIdx.value) {
    yearIdx.value = i
    emit('select', { month: monthIdx.value, year: BASE_YEAR + i })
  }
}

// 距中央越遠越小越淡（照設計稿 wheelStyle）。月欄字級大於年欄，中央列最大。
function itemStyle(dist: number, isYear: boolean): Record<string, string> {
  const d = Math.abs(dist)
  const sizes = isYear ? ['18px', '15px', '14px', '13px'] : ['25px', '21px', '19px', '18px']
  const fontSize = sizes[Math.min(d, 3)]!
  if (d === 0) return { fontSize, color: '#1b1b1b', opacity: '1' }
  if (d === 1) return { fontSize, color: '#6e6e6e', opacity: '0.6' }
  if (d === 2) return { fontSize, color: '#b2b2b2', opacity: '0.4' }
  return { fontSize, color: '#c4c4c4', opacity: '0.22' }
}
</script>

<style scoped>
.pv2-sheet-scrim {
  position: absolute;
  inset: 0;
  z-index: 30;
  background: rgba(27, 27, 27, 0.32);
  display: flex;
  align-items: flex-end;
}

.pv2-sheet {
  width: 100%;
  background: #fafaf9;
  border-radius: 24px 24px 0 0;
  padding: 14px 24px 30px;
  box-shadow: 0 -12px 34px rgba(0, 0, 0, 0.22);
}

.pv2-sheet__handle {
  width: 40px;
  height: 5px;
  border-radius: 3px;
  background: #dadad4;
  margin: 0 auto 16px;
}

.pv2-sheet__wheels {
  position: relative;
  height: 220px;
  display: flex;
}

.pv2-sheet__col {
  flex: 1;
  height: 100%;
  overflow-y: scroll;
  scroll-snap-type: y mandatory;
  scrollbar-width: none;
}

.pv2-sheet__col::-webkit-scrollbar {
  display: none;
}

.pv2-sheet__pad {
  height: 88px;
}

.pv2-sheet__item {
  height: 44px;
  line-height: 44px;
  text-align: center;
  scroll-snap-align: center;
}

/* 字級由 inline itemStyle 依距中央距離給（月中央 25、年中央 18）；這裡只定 family/style/weight */
.pv2-sheet__item--month {
  font-family: var(--cd-font-serif);
  font-style: italic;
  font-weight: 400;
}

.pv2-sheet__item--year {
  font-family: var(--cd-font-mono);
  font-weight: 500;
  letter-spacing: 0.08em;
}

.pv2-sheet__fade {
  position: absolute;
  left: 0;
  right: 0;
  height: 80px;
  pointer-events: none;
}

.pv2-sheet__fade--top {
  top: 0;
  background: linear-gradient(#fafaf9, rgba(250, 250, 249, 0));
}

.pv2-sheet__fade--bottom {
  bottom: 0;
  background: linear-gradient(rgba(250, 250, 249, 0), #fafaf9);
}
</style>
