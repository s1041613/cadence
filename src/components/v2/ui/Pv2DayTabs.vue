<template>
  <!--
    SCHEDULE / MY DAY 兩段切換（照設計稿）：淺灰底軌道，active 白底 pill + 深字 + 淡陰影。
  -->
  <div class="pv2-dt" role="tablist">
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      role="tab"
      class="pv2-dt__seg"
      :class="{ 'pv2-dt__seg--on': modelValue === opt.value }"
      :aria-selected="modelValue === opt.value"
      @click="emit('update:modelValue', opt.value)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
export type DayTab = 'schedule' | 'myday'

defineProps<{
  modelValue: DayTab
}>()

const emit = defineEmits<{
  'update:modelValue': [value: DayTab]
}>()

const options: Array<{ value: DayTab; label: string }> = [
  { value: 'schedule', label: 'SCHEDULE' },
  { value: 'myday', label: 'MY DAY' }
]
</script>

<style scoped>
.pv2-dt {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 4px;
  padding: 5px;
  border-radius: 14px;
  /* 極淡半透明底：讓背景圖隱約透出、與海報融合，不搶白 goal 卡（方案 A） */
  background: rgba(27, 27, 27, 0.06);
}

.pv2-dt__seg {
  padding: 12px 0;
  border: none;
  border-radius: 10px;
  background: transparent;
  font: 600 12px var(--cd-font-mono);
  letter-spacing: 0.1em;
  color: #6e6e6e;
  cursor: pointer;
  transition: all 0.2s ease;
}

.pv2-dt__seg--on {
  background: #fff;
  color: #1b1b1b;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

@media (prefers-reduced-motion: reduce) {
  .pv2-dt__seg {
    transition: none;
  }
}
</style>
