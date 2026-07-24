<template>
  <!-- 月曆海報標題：居中直排，Instrument Serif italic 大字 + mono 年份。點擊開月/年輪盤。 -->
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
.pv2-poster {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
}

.pv2-poster__month {
  text-align: center;
  font: italic 400 52px var(--cd-font-serif);
  letter-spacing: 0;
  line-height: 0.9;
  color: #1b1b1b;
  -webkit-text-stroke: 1px #1b1b1b;
}

.pv2-poster__year {
  display: flex;
  align-items: center;
  margin-top: 8px;
  font: 600 12px var(--cd-font-mono);
  letter-spacing: 0.16em;
  color: #6e6e6e;
}
</style>
