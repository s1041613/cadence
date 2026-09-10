<template>
  <!--
    星期表頭：Sun / Mon… 三字母首字大寫，依 firstDay 重排。
    週日那一欄用 rose 標示——它是這一排唯一帶意義的顏色，其餘皆為次級灰。
  -->
  <div class="pv2-wd">
    <span
      v-for="w in labels"
      :key="w.label"
      class="pv2-wd__cell"
      :class="{ 'pv2-wd__cell--sun': w.sunday }"
    >{{ w.label }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FirstDay } from '@/stores/settings-store'
import { WD_CAP } from '@/utils/convert-date-time'

const props = defineProps<{
  firstDay: FirstDay
}>()

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

// 週日的標記跟著索引走而不是跟著位置：firstDay 改成 Monday 時，rose 要跟著移到最後一欄。
const labels = computed(() =>
  Array.from({ length: 7 }, (_, i) => {
    const idx = (startIdx.value + i) % 7
    return { label: WD_CAP[idx]!, sunday: idx === 0 }
  })
)
</script>

<style scoped>
.pv2-wd {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  padding-bottom: 8px;
}

/* 置中：日期數字也置中，兩排的重心才對得上。 */
.pv2-wd__cell {
  text-align: center;
  font: 500 12px var(--cd-font-ui);
  letter-spacing: 0.01em;
  color: var(--pv2-ink-2);
}

.pv2-wd__cell--sun {
  color: var(--pv2-rose);
}
</style>
