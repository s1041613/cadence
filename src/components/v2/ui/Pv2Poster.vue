<template>
  <!-- 月曆海報標題：居中直排，粗體大字。點擊開月/年輪盤。
       年份只在「不是今年」時出現：設計稿沒有它，而它要回答的問題一年只有一次。 -->
  <button type="button" class="pv2-poster" @click="emit('openSheet')">
    <span class="pv2-poster__month">{{ monthName }}</span>
    <span v-if="year" class="pv2-poster__year">{{ year }}</span>
  </button>
</template>

<script setup lang="ts">
defineProps<{
  monthName: string
  /** Null on the current year — see the template. */
  year: string | null
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
  /* The space above the title is the design's, and it is a lot: the month opens the page from
     roughly a sixth of the way down rather than from its top edge. Measured off the reference
     at 17% of the frame's width, which is 66px on the 393px frame.
     Nothing below it: the gap to the cards is theirs to set (.mv2__todos). */
  padding: 66px 0 0;
  border: none;
  background: none;
  cursor: pointer;
  /* The month name is sized off THIS box, not the viewport: on desktop the page centres a 393px
     phone frame inside a window that may be three times wider, so a vw-based title would be
     sized by a width the title never gets to use. Safe as a container because the parent sets
     this element's width (.mv2__poster-title is width:100%). */
  container-type: inline-size;
}

/* 月份名稱是這個檢視的封面，不是它的標題列：字級與字重扛住份量，顏色就交給墨色。
   曾經是粉紅的（--pv2-poster-ink 現在指回 --pv2-ink）——標題一粉，底下整排粉紅 chip
   就沒有東西可以對比，兩邊一起變糊。
   刻意不是 italic，也刻意不是第二套字體：設計稿的月份是一個平的粗體 grotesque。 */
.pv2-poster__month {
  text-align: center;
  /* Poster scale, sized so the LONGEST month name fits — one size for all twelve, not a size
     per month: at a constant size the months are comparable. Sized off the reference, where
     the month word spans 48% of the frame — 'September' is the widest of the twelve and
     renders 5.367x its font-size in this face, so 0.48 / 5.367 is 9cqw. The 44px ceiling only
     engages above a 489px container, i.e. never on a phone frame. The plain px declaration is
     the fallback without container units.
     800, not 900: the UI face is loaded at 400–800 (fonts.css), and a call site asking for 900
     renders at 800 anyway — with the weight written down, that is a decision instead of a
     silent fallback. */
  font-family: var(--cd-font-poster);
  font-weight: 800;
  font-size: 36px;
  font-size: min(44px, 9cqw);
  letter-spacing: -0.01em;
  line-height: 0.9;
  color: var(--pv2-poster-ink);
}

/* 年份同樣吃虧在照片底：var(--pv2-ink-2) 對背景亮處只有 ~3:1，看起來是褪色而不是次級。
   改用與月份同一個墨色，層級交給字級與字距撐（同 Pv2DayHeader 的 meta 處理）。 */
.pv2-poster__year {
  display: flex;
  align-items: center;
  margin-top: 8px;
  font: 600 12px var(--cd-font-ui);
  letter-spacing: 0.16em;
  color: var(--pv2-ink);
}
</style>
