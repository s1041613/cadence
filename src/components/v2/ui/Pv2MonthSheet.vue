<template>
  <!--
    月/年輪盤選擇器（照設計稿）：兩欄 scroll-snap，月欄 Instrument Serif italic、年欄 mono。
    中央高亮列有上下細線；上下漸層淡出。捲動 snap 到某列即選定該月/年。
    兩欄都是 Pv2WheelColumn，與時間滾輪共用同一份 scroll-snap 實作。
  -->
  <div class="pv2-sheet-scrim" @click="emit('close')">
    <div class="pv2-sheet" @click.stop>
      <div class="pv2-sheet__handle" />

      <!-- 選中列不畫高亮帶（樣式 B）：只靠中央列字最大最深區分選中 -->
      <div class="pv2-sheet__wheels">
        <Pv2WheelColumn
          :items="monthItems"
          :model-value="monthIdx"
          variant="serif"
          :sizes="['25px', '21px', '19px', '18px']"
          ariaLabel="Month"
          @update:model-value="(v) => onSelect(Number(v), yearIdx)"
        />
        <Pv2WheelColumn
          :items="yearItems"
          :model-value="yearIdx"
          variant="mono"
          :sizes="['18px', '15px', '14px', '13px']"
          ariaLabel="Year"
          @update:model-value="(v) => onSelect(monthIdx, Number(v))"
        />

        <div class="pv2-sheet__fade pv2-sheet__fade--top" />
        <div class="pv2-sheet__fade pv2-sheet__fade--bottom" />
      </div>

      <!-- 動作列：TODAY 把輪盤轉回今天（同時 emit select），DONE 收起面板。
           輪盤本來就邊捲邊 emit select，所以 DONE 只是確認關閉，不是提交。 -->
      <div class="pv2-sheet__actions">
        <button type="button" class="pv2-sheet__today" @click="onToday">
          <svg class="pv2-sheet__today-icon" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2" />
            <path d="M12 7v5l3.5 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
          Today
        </button>
        <button type="button" class="pv2-sheet__done" @click="emit('close')">Done</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import Pv2WheelColumn from './Pv2WheelColumn.vue'

const props = defineProps<{
  month: number // 0-11
  year: number
}>()

const emit = defineEmits<{
  select: [payload: { month: number; year: number }]
  close: []
}>()

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const BASE_YEAR = 2020
const YEAR_COUNT = 21

// Wheel items carry indices, not display values: the month column's value is 0-11 and the
// year column's is an offset from BASE_YEAR, so a selection maps straight back onto both refs.
const monthItems = MONTHS_SHORT.map((label, value) => ({ value, label }))
const yearItems = computed(() => Array.from({ length: YEAR_COUNT }, (_, i) => ({ value: i, label: String(BASE_YEAR + i) })))

const monthIdx = ref(props.month)
const yearIdx = ref(props.year - BASE_YEAR)

function onSelect(m: number, y: number): void {
  monthIdx.value = m
  yearIdx.value = y
  emit('select', { month: m, year: BASE_YEAR + y })
}

// TODAY：兩欄轉回今天所在的月/年並直接 emit。
// 不倚賴捲動觸發 onScroll——目標與現值相同時不會有 scroll 事件，那樣就不會 emit 了。
// 寫 monthIdx/yearIdx 會讓 Pv2WheelColumn 的 watcher 把兩欄轉過去，它自己擋掉回授。
function onToday(): void {
  const now = new Date()
  onSelect(now.getMonth(), Math.max(0, Math.min(YEAR_COUNT - 1, now.getFullYear() - BASE_YEAR)))
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

/* 動作列：與輪盤之間用細線分隔（照設計稿），TODAY 左、DONE 右 */
.pv2-sheet__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid #e4e4e1;
}

/* 兩顆按鈕共用：藥丸、鎖死 line-height（button 預設 normal 會撐高），字距同 chip */
.pv2-sheet__today,
.pv2-sheet__done {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  cursor: pointer;
  font: 500 11px var(--cd-font-ui);
  letter-spacing: 0.12em;
  line-height: 1;
  text-transform: uppercase;
}

.pv2-sheet__today {
  gap: 6px;
  padding: 11px 18px;
  border: 1px solid #cdcdcd;
  background: transparent;
  color: #6e6e6e;
}

.pv2-sheet__today-icon {
  width: 14px;
  height: 14px;
  flex: none;
}

.pv2-sheet__done {
  padding: 11px 26px;
  border: 1px solid #1b1b1b;
  background: #1b1b1b;
  color: #fafaf9;
}

.pv2-sheet__today:active {
  background: #f0efec;
}

.pv2-sheet__done:active {
  opacity: 0.82;
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
