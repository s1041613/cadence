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
  padding: 25px 0;
  border: none;
  background: none;
  cursor: pointer;
}

/* 月份名稱是這個檢視的封面，不是它的標題列：--cd-font-poster（M PLUS Rounded 1c 900）
   是全 app 唯一穿這個字體的地方，圓體 900 的筆畫在照片底上也不會被背景紋理吃掉——
   之前靠 48px 補回來的份量，現在由字重本身撐住。
   刻意不是 italic：這個字體的重心在圓，斜體會把圓角拉成橢圓，反而糊掉。
   字級維持 48px，與日檢視的大日期數字同一階。 */
.pv2-poster__month {
  text-align: center;
  font: 900 48px var(--cd-font-poster);
  letter-spacing: -0.01em;
  line-height: 0.9;
  color: var(--pv2-ink);
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
