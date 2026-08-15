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
  padding: 20px 0;
  border: none;
  background: none;
  cursor: pointer;
}

/* 字級維持 36px（全站大標題乘 0.7，見 Pv2DayHeader），但 400→700。
   月份是整頁唯一的標題，卻是最不明顯的元素：等寬字在 400 的筆畫本來就細，
   又疊在照片底上，36px 的細斜體被背景的紋理吃掉。把份量加在「粗細」而不是
   「字級」上，海報不必長高就重新站得住，日檢視 48px 的大數字也仍是層級上緣。
   700-italic 是真字檔（見 app.css），不是合成傾斜。 */
.pv2-poster__month {
  text-align: center;
  font: italic 700 36px var(--cd-font-ui);
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
