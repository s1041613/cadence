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
      <Pv2HeaderNav
        class="pv2-wh__nav"
        prev-label="上一週"
        next-label="下一週"
        today-label="回到本週"
        @prev="emit('prev')"
        @next="emit('next')"
        @today="emit('today')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import Pv2HeaderNav from '@/components/v2/ui/Pv2HeaderNav.vue'

defineProps<{
  weekNumber: number
  rangeLabel: string
}>()

const emit = defineEmits<{
  prev: []
  next: []
  today: []
}>()
</script>

<style scoped>
.pv2-wh {
  border-bottom: 1.5px solid #1b1b1b;
  padding-bottom: 14px;
}

/* 導覽鈕靠下對齊：與日期區間副標齊平，而非貼齊 "Week N" 的頂緣。
   標題那欄有兩行、比導覽鈕高，靠上會讓鈕孤懸在右上角。 */
.pv2-wh__row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
}

.pv2-wh__text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* 略微抬離底線：靠下對齊後鈕的底緣會與副標基線同高，浮一點才不顯得沉在底部。 */
.pv2-wh__nav {
  margin-bottom: 2px;
}

/* 與 month 的 "August"、day 的大日期數字同規格：UI face 斜體 400 48px。
   28→48px：三個檢視各有一個主標題，字重相同時筆畫粗細只由字級決定，字級不同
   就會讀成粗細不同。"Week 52" 最寬 7 字，等寬字身約 202px，加上右側導覽鈕
   （約 132px）仍在 360px 寬的機身內。 */
.pv2-wh__title {
  font: italic 400 48px var(--cd-font-serif);
  letter-spacing: 0;
  line-height: 1;
  color: #1b1b1b;
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
</style>
