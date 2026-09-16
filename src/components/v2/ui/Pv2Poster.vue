<template>
  <!-- 月曆海報標題：居中直排，粗體大字。點擊開月/年輪盤。
       年份只在「不是今年」時出現：設計稿沒有它，而它要回答的問題一年只有一次。 -->
  <button type="button" class="pv2-poster" @click="emit('openSheet')">
    <!-- 有畫好的月份字樣就用圖，沒有的月份仍然走原本的排版標題。alt 給的是月份名稱本身：
         這張圖說的就是那個字，不是裝飾。 -->
    <img
      v-if="wordmarkSrc"
      class="pv2-poster__wordmark"
      :src="wordmarkSrc"
      :alt="monthName"
      @error="onWordmarkError"
    />
    <span v-else class="pv2-poster__month">{{ monthName }}</span>
    <span v-if="year" class="pv2-poster__year">{{ year }}</span>
  </button>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { monthWordmarkPath } from '@/utils/public-assets'

const props = defineProps<{
  monthName: string
  /** 0 = January. Only used to pick the wordmark; the name itself is passed in already formatted. */
  monthIndex: number
  /** Null on the current year — see the template. */
  year: string | null
}>()

const emit = defineEmits<{
  openSheet: []
}>()

// The map in public-assets already says which months have art, so this only has to catch the
// file being missing at runtime (a bad deploy) — and it resets per month, because a month
// whose file failed says nothing about the next one's.
const wordmarkFailed = ref(false)
watch(() => props.monthIndex, () => { wordmarkFailed.value = false })

const wordmarkSrc = computed(() => (wordmarkFailed.value ? null : monthWordmarkPath(props.monthIndex)))

function onWordmarkError() {
  wordmarkFailed.value = true
}
</script>

<style scoped>
/* Width is assigned by the parent rather than claimed here, so the poster can be centred on
   whatever row it sits in. Horizontal padding is dropped for the same reason; vertical padding
   is what gives the title its breathing room. */
.pv2-poster {
  display: flex;
  flex-direction: column;
  align-items: center;
  /* The title now opens close to the top of the frame instead of a fifth of the way down:
     30px, asked for directly, replaces the 96px the reference poster used.
     It is a DEFAULT rather than a fixed value because the month view now floats a control row
     above the title (.mv2__topbar), which supplies the top gap itself — there the poster only
     owes its distance to that row. Nothing below it either way: the gap to the cards is theirs
     to set (.mv2__todos). */
  padding: var(--pv2-poster-pad-top, 30px) 0 0;
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

/* 畫好的月份字樣。以寬度定尺寸而不是高度：這是一個字樣，它與版面的關係是「橫向佔多寬」，
   高度就隨各月的字形長短自己去變。

   52cqw 是從它取代的那個排版標題量出來的：在 393px 的手機框上，'September' 以 9cqw 排出來是
   179.6px 寬、31.8px 高，橫跨版面 45.7%。這張字樣的筆畫細得多，同寬會顯得輕，所以往上帶到
   52% —— 204x68，比原本的標題高 36px。

   再大就要開始跟月曆格搶高度：header 目前多出來、格子用不到的空間約 33px（見 MonthViewV2 的
   .mv2__poster 註解），所以這 36px 幾乎剛好，超出的部分由 .pv2-grid 的 1fr 列自己吸收
   （六週各縮不到 1px，不是被切掉）。
   204px 是上限，與 .pv2-poster__month 的 min() 同一個寫法：框更寬時字樣不跟著無限放大。 */
.pv2-poster__wordmark {
  display: block;
  width: min(204px, 52cqw);
  height: auto;
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
