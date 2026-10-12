<template>
  <!-- 星期表頭：3 字母首字大寫、依 firstDay 重排。週日與國定假日同一個色。 -->
  <div class="pv2-wd" :class="{ 'pv2-wd--cute': mode.cute.value }">
    <span
      v-for="w in labels"
      :key="w.label"
      class="pv2-wd__cell"
      :class="{ 'pv2-wd__cell--sunday': w.sunday }"
    >{{ w.label }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FirstDay } from '@/stores/settings-store'
import { useBackdropMode } from '@/composables/use-backdrop-mode'

const props = defineProps<{
  firstDay: FirstDay
}>()

const mode = useBackdropMode()

// 3 字母首字大寫，索引 0=Sun..6=Sat（對齊 convert-date-time 的 WD 慣例）
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

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

// Carries the weekday index, not just the word: which column is Sunday moves with firstDay,
// and a template matching on the string would break the moment the labels are translated.
const labels = computed(() =>
  Array.from({ length: 7 }, (_, i) => {
    const idx = (startIdx.value + i) % 7
    return { label: WD[idx]!, sunday: idx === 0 }
  })
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
  font: 600 11px var(--cd-font-ui);
  letter-spacing: 0.02em;
  color: var(--pv2-ink-3);
}

/* 週日與國定假日共用 --pv2-holiday：兩個講的是同一件事——這天不用上班。 */
.pv2-wd__cell--sunday {
  color: var(--pv2-holiday);
}
/* 照片上：退一步，讓日期數字領頭。 */
.pv2-wd--cute .pv2-wd__cell {
  font-size: 10px;
  letter-spacing: 0.06em;
  color: rgba(255, 255, 255, 0.75);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
}

.pv2-wd--cute .pv2-wd__cell--sunday {
  color: #ffc2d8;
}
</style>
