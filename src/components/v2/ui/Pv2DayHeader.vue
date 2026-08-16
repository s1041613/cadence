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

/* 與 month「August」一致：UI face 的斜體，字級放到日期海報比例。
   68→48px：UI face 是等寬字，同 px 下比原本的 Instrument Serif 寬約 1.8 倍（高度幾乎一樣），
   維持 68 會讓數字整個橫向撐開、份量過重。描邊也一併拿掉——那是為了替纖細的襯線加粗，
   等寬字本身筆畫就夠厚。全站大標題統一乘 0.7，層級關係不變。
   月/週的主標題後來也收斂到這裡的 48px：三者字重同為 400，字級一有落差就會被讀成
   粗細不同（見 Pv2Poster）。0.7 的比例仍適用於面板類標題（如 Pv2DaySheet）。 */
.pv2-dh__num {
  font: italic 400 48px var(--cd-font-serif);
  line-height: 0.8;
  color: #1b1b1b;
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
