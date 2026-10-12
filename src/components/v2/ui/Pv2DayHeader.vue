<template>
  <!--
    日檢視標題：超大日期數字（serif）+ DOW/月年疊放（mono 副標）+ 右側控制叢集。
    控制叢集＝膠囊（桌布切換｜代辦｜逾期任務，最後一個有逾期時才畫）+ TODAY 鈕。
  -->
  <div class="pv2-dh" :class="{ 'pv2-dh--cute': mode.cute.value }">
    <div class="pv2-dh__row">
      <div class="pv2-dh__lead">
        <span class="pv2-dh__num">{{ dayNum }}</span>
        <span class="pv2-dh__meta">
          <span class="pv2-dh__dow">{{ dow }}</span>
          <span class="pv2-dh__my">{{ monthYear }}</span>
        </span>
      </div>
      <div class="pv2-dh__controls">
        <!-- 一顆膠囊收三個「看這一天的東西」：桌布切換、代辦、逾期任務。只有 icon、不放數字——
             數字讓膠囊忽長忽短，而且點開就看得到。TODAY 是「跳去別天」，所以分開放。 -->
        <div class="pv2-dh__cap">
          <Pv2BackdropToggle bare class="pv2-dh__seg" />
          <button
            type="button"
            class="pv2-dh__seg pv2-dh__btn"
            :class="{ 'pv2-dh__btn--on': todoOpen }"
            :aria-pressed="todoOpen"
            :aria-label="todoOpen ? '隱藏這天的代辦' : '顯示這天的代辦'"
            @click="emit('toggleTodo')"
          >
            <svg class="pv2-dh__icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6.5 3h8.5l4 4v12.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19.5v-15A1.5 1.5 0 0 1 6.5 3Z" />
              <path d="M8.5 11l2 2 3.5-4" />
              <path d="M8.5 16.5h7" />
            </svg>
          </button>
          <!-- 只有真的有逾期時才存在。一顆永遠只會說「沒有」的鈕是噪音。 -->
          <button
            v-if="unfinishedCount > 0"
            type="button"
            class="pv2-dh__seg pv2-dh__btn"
            :class="{ 'pv2-dh__btn--on': unfinishedOpen }"
            :aria-pressed="unfinishedOpen"
            :aria-label="`${unfinishedOpen ? '隱藏' : '顯示'} ${unfinishedCount} 筆未完成待辦`"
            @click="emit('toggleUnfinished')"
          >
            <svg class="pv2-dh__icon" viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3" y="4" width="7.5" height="7.5" rx="2.2" />
              <rect x="3" y="14" width="7.5" height="7.5" rx="2.2" />
              <path d="M14.5 7.75H21M14.5 17.75H21" />
            </svg>
          </button>
        </div>
        <Pv2HeaderNav today-label="回到今天" @today="emit('today')" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Pv2HeaderNav from '@/components/v2/ui/Pv2HeaderNav.vue'
import Pv2BackdropToggle from '@/components/v2/ui/Pv2BackdropToggle.vue'
import { useBackdropMode } from '@/composables/use-backdrop-mode'

defineProps<{
  dayNum: number
  dow: string // "FRI"
  monthYear: string // "JUL 2026"
  /** Tasks dated before this day and still unticked. 0 hides the control entirely. */
  unfinishedCount: number
  unfinishedOpen: boolean
  /** Whether the day's to-do sheet is open — the todo segment wears the open tint. */
  todoOpen: boolean
}>()

const emit = defineEmits<{
  today: []
  toggleUnfinished: []
  toggleTodo: []
}>()

const mode = useBackdropMode()
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

/* The pill sits level with TODAY rather than with the numeral's baseline: the two are one
   control cluster, and .pv2-dh__row aligns on flex-end for the numeral's sake. */
.pv2-dh__controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
  padding-bottom: 2px;
}

/* Same capsule as Pv2HeaderNav's TODAY — height, radius and shadow all match, because the
   header already has a pill vocabulary and this is another pill in it. Not the month view's
   glass segmented switch: that one picks between two sets of contents, these open things. */
.pv2-dh__cap {
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 2px;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
}

/* A hairline between neighbours, drawn by whichever segment follows — so a segment that is not
   there (no wallpaper, nothing overdue) takes its divider with it. */
.pv2-dh__seg + .pv2-dh__seg {
  margin-left: 1px;
}

.pv2-dh__seg + .pv2-dh__seg::before {
  content: '';
  position: absolute;
  left: -1px;
  top: 50%;
  width: 1px;
  height: 14px;
  transform: translateY(-50%);
  background: var(--pv2-line);
}

.pv2-dh__btn {
  position: relative;
  flex: none;
  display: inline-grid;
  place-items: center;
  width: 32px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--pv2-ink-2);
  cursor: pointer;
}

/* The 44px touch target, taken outside the layout box so the capsule stays 28 tall — same
   construction as .pv2-typeswitch__seg. */
.pv2-dh__btn::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 44px;
  height: 44px;
  transform: translate(-50%, -50%);
}

/* Open: a tint, and --pv2-accent-ink rather than the accent proper, which is 3.1:1 on white. */
.pv2-dh__btn--on {
  background: rgba(var(--pv2-accent-rgb), 0.12);
  color: var(--pv2-accent-ink);
}

.pv2-dh__icon {
  width: 15px;
  height: 15px;
  flex: none;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
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

/* Cute mode: the header sits on the photo, so its ink goes light. */
.pv2-dh--cute .pv2-dh__num,
.pv2-dh--cute .pv2-dh__dow,
.pv2-dh--cute .pv2-dh__my {
  color: #fff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}
</style>
