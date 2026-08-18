<template>
  <!-- 星期表頭：小寫 3 字母、mono 9px，依 firstDay 重排，底部黑線。 -->
  <div class="pv2-wd">
    <span v-for="w in labels" :key="w" class="pv2-wd__cell">{{ w }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FirstDay } from '@/stores/settings-store'

const props = defineProps<{
  firstDay: FirstDay
}>()

// 小寫 3 字母，索引 0=Sun..6=Sat（對齊 convert-date-time 的 WD 慣例）
const WD_LOWER = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

const startIdx = computed(() => {
  switch (props.firstDay) {
    case 'Monday':
      return 1
    case 'Saturday':
      return 6
    default:
      return 0 // Sunday
  }
})

const labels = computed(() =>
  Array.from({ length: 7 }, (_, i) => WD_LOWER[(startIdx.value + i) % 7]!)
)
</script>

<style scoped>
.pv2-wd {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  padding-bottom: 6px;
}

/* 置中：欄寬 ~54px、日期藥丸只佔前 22px，靠左的話每欄右側都空一截，整排數字的重心
   會比框中心偏左約 16px（空月份最明顯）。置中後表頭字也與日期數字對齊。 */
.pv2-wd__cell {
  text-align: center;
  font: 600 10px var(--cd-font-mono);
  letter-spacing: 0.03em;
  color: #6e6e6e;
}
</style>
