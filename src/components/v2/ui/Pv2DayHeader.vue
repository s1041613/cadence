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

/* 不斜體、平的 grotesque，這點與 month 的月份字樣同一個處理（見 Pv2Poster）。字體從來沒有
   分家過（--cd-font-serif 與 --cd-font-poster 都指回 Inter，見 cadence-tokens.css）。

   字重是 300，不是原本的 800。month 頁現在的封面是手繪字樣（.pv2-poster__wordmark），筆畫
   細；日期數字以 800 排出來在同一個 app 裡明顯比它重，兩頁擺在一起不像同一套東西。

   300 與 50px 都是從設計稿量出來的，不是憑感覺挑的。稿上手機框寬 861px 對應 393pt（2.19x）：
   數字高 78px ≈ 35.6 CSS px，直筆寬 8px ≈ 3.65 CSS px，筆畫/字高 = 0.103。把同一段 markup
   以真的 Inter 排出來量（見下），50px 的字高正好是 35.6 CSS px，而筆畫比例 800 是 0.232、
   400 是 0.127、300 是 0.089——稿上那個 0.103 落在 300 與 400 之間，靠 300 那側；截圖本身
   有縮放模糊，細筆畫只會被糊得更寬不會更窄，所以真值比 0.103 更低，取 300。

   300 需要 fonts.css 一併把該字重載進來（已加）：沒載的字重不會報錯，只會退回 400，數字就
   靜悄悄地變回偏重。

   字級 50px 比原本的 48px 大一點點，補回掉字重之後少掉的份量。仍然不跟 month 的
   min(44px, 9cqw)：那個比例是為了讓十二個月名中最長的 September 塞得下推出來的，兩位數的
   日期沒有那個約束。

   letter-spacing 拿掉（原本 -0.01em）：負字距是為了收束 800 的厚筆畫，Light 不需要，
   稿上的數字也是正常字距。

   line-height 0.9 照 month 不動。字級從 48 到 50 時量過：數字是 .pv2-dh__lead 裡最高的
   元素，line box 從上緣往下長，視覺頂端只移動 0.17px，所以 DayViewV2 裡那段量出來的
   padding-top 不需要跟著改。 */
.pv2-dh__num {
  font: 300 50px var(--cd-font-ui);
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
