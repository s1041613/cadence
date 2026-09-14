<template>
  <!--
    日檢視標題：超大日期數字（serif）+ DOW/月年疊放（mono 副標）+ 右側 TODAY 鈕。
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
      <Pv2HeaderNav today-label="回到今天" @today="emit('today')" />
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
  today: []
}>()
</script>

<style scoped>
.pv2-dh {
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

/* 與 month 的「September」同一個處理：不斜體、800、-0.01em（見 Pv2Poster）。
   這段以前寫的是 italic 400，註解卻宣稱「與 month 一致」——那句是錯的：Pv2Poster 的註解
   明寫「刻意不是 italic」，設計稿的月份是一個平的粗體 grotesque。字體從來沒有分家過
   （--cd-font-serif 與 --cd-font-poster 都指回 Inter，見 cadence-tokens.css），差的一直
   只有字重與斜度，現在補上。

   字級維持 48px，不跟著 month 的 min(44px, 9cqw)（在手機寬度上算出來約 34px）：那是為了
   讓十二個月名中最長的 September 塞得下而推導出來的比例，兩個數字的日期沒有那個約束。

   line-height 0.9 也照 month。改這兩項時量過：數字的視覺頂端只移動 0.21px——它在
   .pv2-dh__row 裡是靠下對齊（align-items: flex-end），line box 長高會從上面長，底線不動，
   所以 DayViewV2 裡那段量出來的 padding-top 不需要跟著改。 */
.pv2-dh__num {
  font: 800 48px var(--cd-font-ui);
  letter-spacing: -0.01em;
  line-height: 0.9;
  color: var(--pv2-ink);
}

.pv2-dh__meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-bottom: 6px;
}

/* Weekday and month-year read as one metadata cluster beside the serif day number, so they
   share a colour rather than splitting into a dark/light pair. Both sit at the day number's
   ink: var(--pv2-ink-3) was ~2.6:1 over the photo background and read as washed out. */
.pv2-dh__dow {
  font: 700 14px var(--cd-font-ui);
  letter-spacing: 0.12em;
  color: var(--pv2-ink);
}

.pv2-dh__my {
  font: 500 11px var(--cd-font-ui);
  letter-spacing: 0.12em;
  color: var(--pv2-ink);
}
</style>
