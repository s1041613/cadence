<template>
  <!-- 日曆過濾條：橫向捲動的 chip 列，右側漸層淡出（照設計稿）。 -->
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
    <div class="pv2-strip__fade" />
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

.pv2-strip__row {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding: 0 0 6px;
  scrollbar-width: none;
}

.pv2-strip__row::-webkit-scrollbar {
  display: none;
}

.pv2-strip__fade {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 6px;
  width: 40px;
  background: linear-gradient(90deg, rgba(241, 239, 233, 0), #F1EFE9);
  pointer-events: none;
}
</style>
