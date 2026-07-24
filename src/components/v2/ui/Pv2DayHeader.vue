<template>
  <!--
    日檢視標題（照設計稿）：超大日期數字（serif）+ DOW/月年疊放（mono 副標）+ 右側前/後日圓框箭頭 + 底部黑線。
  -->
  <div class="pv2-dh">
    <div class="pv2-dh__row">
      <div class="pv2-dh__lead">
        <span class="pv2-dh__num">{{ dayNum }}</span>
        <span class="pv2-dh__meta">
          <span class="pv2-dh__dow">{{ dow }}</span>
          <span class="pv2-dh__my">{{ monthYear }}</span>
        </span>
      </div>
      <div class="pv2-dh__nav">
        <button type="button" class="pv2-dh__arrow" aria-label="前一天" @click="emit('prev')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1b1b1b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 6 L8 12 L14 18" />
          </svg>
        </button>
        <button type="button" class="pv2-dh__arrow" aria-label="後一天" @click="emit('next')">
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
  dayNum: number
  dow: string // "FRI"
  monthYear: string // "JUL 2026"
}>()

const emit = defineEmits<{
  prev: []
  next: []
}>()
</script>

<style scoped>
.pv2-dh {
  border-bottom: 1.5px solid #1b1b1b;
  padding-bottom: 14px;
}

.pv2-dh__row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
}

/* 大數字 + 右側 DOW/月年 疊放，底線對齊 */
.pv2-dh__lead {
  display: flex;
  align-items: flex-end;
  gap: 14px;
  min-width: 0;
}

/* 與 month「July」一致：Instrument Serif italic + 描邊，字級放到日期海報比例 */
.pv2-dh__num {
  font: italic 400 68px var(--cd-font-serif);
  line-height: 0.8;
  color: #1b1b1b;
  -webkit-text-stroke: 1px #1b1b1b;
}

.pv2-dh__meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-bottom: 6px;
}

.pv2-dh__dow {
  font: 700 14px var(--cd-font-mono);
  letter-spacing: 0.16em;
  color: #1b1b1b;
}

.pv2-dh__my {
  font: 600 11px var(--cd-font-mono);
  letter-spacing: 0.16em;
  color: #9c9c9c;
}

.pv2-dh__nav {
  display: flex;
  gap: 12px;
  padding-bottom: 6px;
}

/* 白底圓框 + 淡陰影 + 深色 chevron（抄週檢視 header 箭頭） */
.pv2-dh__arrow {
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
