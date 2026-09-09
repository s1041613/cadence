<template>
  <!-- 月曆海報標題：居中直排，圓體粗大字 + 年份小標。點擊開月/年輪盤。 -->
  <button type="button" class="pv2-poster" @click="emit('openSheet')">
    <span class="pv2-poster__month">{{ monthName }}</span>
    <span class="pv2-poster__year">{{ year }}</span>
  </button>
</template>

<script setup lang="ts">
defineProps<{
  monthName: string
  year: string
}>()

const emit = defineEmits<{
  openSheet: []
}>()
</script>

<style scoped>
/* Width is assigned by the parent rather than claimed here, so the poster can be centred on
   whatever row it sits in. Horizontal padding is dropped for the same reason; vertical padding
   is what gives the title its breathing room. */
.pv2-poster {
  display: flex;
  flex-direction: column;
  align-items: center;
  /* Tighter than the 25px it carried at 48px type: the title itself is the breathing room now,
     and the grid below is flex:1 — every px spent here is a px the month's rows do not get. */
  padding: 22px 0 14px;
  border: none;
  background: none;
  cursor: pointer;
  /* The month name is sized off THIS box, not the viewport: on desktop the page centres a 393px
     phone frame inside a window that may be three times wider, so a vw-based title would be
     sized by a width the title never gets to use. Safe as a container because the parent sets
     this element's width (.mv2__poster-title is width:100%). */
  container-type: inline-size;
}

/* 月份名稱是這個檢視的封面，不是它的標題列：--cd-font-poster（M PLUS Rounded 1c 900）
   是全 app 唯一穿這個字體的地方，圓體 900 的筆畫在照片底上也不會被背景紋理吃掉——
   之前靠 48px 補回來的份量，現在由字重本身撐住。
   刻意不是 italic：這個字體的重心在圓，斜體會把圓角拉成橢圓，反而糊掉。
   字級照參考圖放大成海報級（見下方 clamp 的計算）。
   顏色是 --pv2-poster-ink（比 accent 淡的粉紅，只夠 display 級字用）——月份名是封面，
   不是要讀的資訊，年份那行留在墨色才不會整塊糊成一片粉。 */
.pv2-poster__month {
  text-align: center;
  /* Poster scale, sized so the LONGEST month name fits — one size for all twelve, not a size
     per month: at a constant size the months are comparable. Measured in the running app at the
     shipped face, 'September' renders 5.494x its font-size wide, so 13.5cqw puts the longest
     month at about three quarters of the container and leaves the title reading as a cover
     rather than as a wall. The 62px ceiling only engages above a 459px container, i.e. never on
     a phone frame. The plain px declaration is the fallback without container units. */
  font-family: var(--cd-font-poster);
  font-weight: 900;
  font-size: 52px;
  font-size: min(62px, 13.5cqw);
  letter-spacing: -0.01em;
  line-height: 0.9;
  color: var(--pv2-poster-ink);
}

/* 年份同樣吃虧在照片底：var(--pv2-ink-2) 對背景亮處只有 ~3:1，看起來是褪色而不是次級。
   改用與月份同一個墨色，層級交給字級與字距撐（同 Pv2DayHeader 的 meta 處理）。 */
.pv2-poster__year {
  display: flex;
  align-items: center;
  margin-top: 6px;
  font: 600 12px var(--cd-font-ui);
  letter-spacing: 0.16em;
  color: var(--pv2-ink);
}
</style>
