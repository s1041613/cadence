<template>
  <!--
    月曆頁標題：置中的大字月份，點擊開月/年輪盤。

    年份平常不畫。設計稿只有月份，而九成的使用情境就是「今年」——把年份常駐等於
    每個月都在複述同一個已知值。只有跳到別的年份時才補一行小字，那時它才帶資訊。
  -->
  <button type="button" class="pv2-poster" @click="emit('openSheet')">
    <span class="pv2-poster__month">{{ monthName }}</span>
    <span v-if="showYear" class="pv2-poster__year">{{ year }}</span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  monthName: string
  year: string
}>()

const emit = defineEmits<{
  openSheet: []
}>()

// 現在的年份在 mount 時算一次就好：跨年那一瞬間標題沒即時補上年份，比每分鐘重算划算。
const thisYear = String(new Date().getFullYear())
const showYear = computed(() => props.year !== thisYear)
</script>

<style scoped>
/* 寬度由 parent 指派（見 MonthViewV2 的 .mv2__poster-title），這裡不自己搶，
   標題才能在所在的列上置中。 */
.pv2-poster {
  display: flex;
  flex-direction: column;
  align-items: center;
  /* 上方留白是設計稿裡標題與狀態列之間那一段。frame 目前不為 safe-area 讓位
     （見 MonthPageV2 的 --pv2-safe-top），所以那段距離得由這裡自己撐出來。 */
  padding: 40px 0 12px;
  border: none;
  background: none;
  cursor: pointer;
}

/* 設計稿的份量來自「大 + 粗」，不是斜體：52px / 800，深藍墨。
   Inter 有 800（見 app.css 的 @fontsource import），不是瀏覽器合成的假粗。 */
.pv2-poster__month {
  text-align: center;
  font: 800 52px/1 var(--cd-font-ui);
  letter-spacing: -0.02em;
  color: var(--pv2-ink);
}

.pv2-poster__year {
  margin-top: 6px;
  font: 600 12px var(--cd-font-ui);
  letter-spacing: 0.16em;
  color: var(--pv2-ink-2);
}
</style>
