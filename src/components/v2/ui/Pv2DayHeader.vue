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
      <Pv2HeaderNav
        prev-label="前一天"
        next-label="後一天"
        today-label="回到今天"
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
  dayNum: number
  dow: string // "FRI"
  monthYear: string // "JUL 2026"
}>()

const emit = defineEmits<{
  prev: []
  next: []
  today: []
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

/* Weekday and month-year read as one metadata cluster beside the serif day number, so they
   share a colour rather than splitting into a dark/light pair. Both sit at the day number's
   ink: #9c9c9c was ~2.6:1 over the photo background and read as washed out. */
.pv2-dh__dow {
  font: 700 14px var(--cd-font-ui);
  letter-spacing: 0.12em;
  color: #1b1b1b;
}

.pv2-dh__my {
  font: 500 11px var(--cd-font-ui);
  letter-spacing: 0.12em;
  color: #1b1b1b;
}
</style>
