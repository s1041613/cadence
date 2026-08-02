<template>
  <!--
    週檢視標題（照設計稿）：Week N（Instrument Serif）+ 日期區間（Zen Kaku 副標）
    + 右側上/下週圓框箭頭 + 底部黑線。
  -->
  <div class="pv2-wh">
    <div class="pv2-wh__row">
      <div class="pv2-wh__text">
        <span class="pv2-wh__title">Week {{ weekNumber }}</span>
        <span class="pv2-wh__range">{{ rangeLabel }}</span>
      </div>
      <div class="pv2-wh__nav">
        <button type="button" class="pv2-wh__arrow" aria-label="上一週" @click="emit('prev')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1b1b1b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 6 L8 12 L14 18" />
          </svg>
        </button>
        <button type="button" class="pv2-wh__arrow" aria-label="下一週" @click="emit('next')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1b1b1b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10 6 L16 12 L10 18" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  weekNumber: number
  rangeLabel: string
}>()

const emit = defineEmits<{
  prev: []
  next: []
}>()
</script>

<style scoped>
.pv2-wh {
  border-bottom: 1.5px solid #1b1b1b;
  padding-bottom: 14px;
}

.pv2-wh__row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.pv2-wh__text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* 與 month 的 "July" 一致：Instrument Serif italic + 描邊 */
.pv2-wh__title {
  font: italic 400 40px var(--cd-font-serif);
  letter-spacing: 0;
  line-height: 1;
  color: #1b1b1b;
  -webkit-text-stroke: 1px #1b1b1b;
}

/* 日期區間副標：照片背景上 #9c9c9c 只有約 2.2:1，加深到 #6e6e6e，
   仍明顯次於上方 Week N 主標。
   Zen Kaku 比例字身，字距從 0.16em 收到 0.12em 才不鬆散；數字補 tabular-nums，
   換週時 "AUG 2 — 8" 的寬度才不會跳動。 */
.pv2-wh__range {
  font: 500 12px var(--cd-font-ui);
  font-variant-numeric: var(--cd-numeric-aligned);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #6e6e6e;
}

.pv2-wh__nav {
  display: flex;
  gap: 12px;
}

/* 白底圓框 + 淡陰影 + 深色 chevron，照設計稿 */
.pv2-wh__arrow {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid #ececec;
  background: #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
  cursor: pointer;
}
</style>
