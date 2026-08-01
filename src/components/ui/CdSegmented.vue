<template>
  <div class="cd-segmented">
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      class="cd-segmented__btn"
      :class="{ 'cd-segmented__btn--active': modelValue === opt.value }"
      @click="emit('update:modelValue', opt.value)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
// CdSegmented — generic 2-3 option segmented control (Event|Task, Shared|Public, Name|Time|Dots…).
// design-research-report.md §3.9: base #F1EFE8, radius 11px, pad 3px; active #fff + shadow 0 1px 2px var(--cd-ink-wash-strong), 700 weight.
defineProps<{
  modelValue: string
  options: Array<{ value: string; label: string }>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<style scoped>
.cd-segmented {
  display: flex;
  background: var(--cd-surface-inset);
  border-radius: var(--cd-radius-matrix);
  padding: 3px;
  gap: 2px;
}

.cd-segmented__btn {
  flex: 1;
  border: none;
  background: transparent;
  border-radius: 8px;
  padding: 7px 14px;
  cursor: pointer;
  font: 700 13px var(--cd-font-ui);
  color: var(--cd-ink-secondary);
  transition: background var(--cd-duration-micro-3);
}

.cd-segmented__btn--active {
  background: #fff;
  font-weight: 700;
  color: var(--cd-ink);
}
</style>
