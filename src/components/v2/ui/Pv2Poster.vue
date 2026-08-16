<template>
  <!-- 月曆海報標題：居中直排，italic 大字 + 年份，皆為 UI face。點擊開月/年輪盤。 -->
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
  padding: 25px 0;
  border: none;
  background: none;
  cursor: pointer;
}

/* 與日檢視的大日期數字同規格（Pv2DayHeader 的 italic 400 48px）。
   月份不明顯的原因不在字重——三個檢視的主標題本來就都是 400——而在字級：
   同一個字重下 36px 的筆畫就是比 48px 細，疊在照片底上更被背景紋理吃掉。
   所以份量加回在字級，字重維持 400，月/週/日三個主標題的筆畫粗細因此一致。 */
.pv2-poster__month {
  text-align: center;
  font: italic 400 48px var(--cd-font-ui);
  letter-spacing: 0;
  line-height: 0.9;
  color: #1b1b1b;
}

/* 年份同樣吃虧在照片底：#6e6e6e 對背景亮處只有 ~3:1，看起來是褪色而不是次級。
   改用與月份同一個墨色，層級交給字級與字距撐（同 Pv2DayHeader 的 meta 處理）。 */
.pv2-poster__year {
  display: flex;
  align-items: center;
  margin-top: 8px;
  font: 600 12px var(--cd-font-ui);
  letter-spacing: 0.16em;
  color: #1b1b1b;
}
</style>
