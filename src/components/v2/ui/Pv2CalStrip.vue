<template>
  <!-- 日曆過濾條：橫向捲動的 chip 列，右緣淡出提示「還有更多」。 -->
  <div class="pv2-strip">
    <div class="pv2-strip__row">
      <Pv2Chip
        v-for="c in chips"
        :key="c.id"
        :label="c.label"
        :active="c.active"
        @toggle="emit('toggle', c.id)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import Pv2Chip from './Pv2Chip.vue'

export interface Pv2ChipItem {
  id: string
  label: string
  active: boolean
}

defineProps<{
  chips: Pv2ChipItem[]
}>()

const emit = defineEmits<{
  toggle: [id: string]
}>()
</script>

<style scoped>
.pv2-strip {
  position: relative;
}

/* 右緣淡出用 mask 而不是疊一層漸層方塊：這一頁可能鋪使用者的背景圖，
   實色漸層會在圖上留一條看得見的白帶。mask 淡的是 chip 自己，底下是什麼都不影響。 */
.pv2-strip__row {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 0 0 6px;
  scrollbar-width: none;
  mask-image: linear-gradient(90deg, #000 calc(100% - 40px), transparent);
  -webkit-mask-image: linear-gradient(90deg, #000 calc(100% - 40px), transparent);
}

.pv2-strip__row::-webkit-scrollbar {
  display: none;
}
</style>
