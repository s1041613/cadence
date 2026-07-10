<template>
  <div class="cd-view-switcher">
    <button
      v-for="opt in options"
      :key="opt"
      type="button"
      class="cd-view-switcher__btn"
      :class="{ 'cd-view-switcher__btn--active': modelValue === opt }"
      @click="emit('update:modelValue', opt)"
    >
      {{ opt }}
    </button>
  </div>
</template>

<script setup lang="ts">
// CdViewSwitcher — Day/Week/Month pill segmented control. design-research-report.md §2.2 / §3.2.
// No hover style is defined in the prototype (only active/inactive states); switching is instant, no transition on the container.
withDefaults(
  defineProps<{
    modelValue: string
    options?: string[]
  }>(),
  { options: () => ['Day', 'Week', 'Month'] }
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<style scoped>
.cd-view-switcher {
  display: flex;
  background: rgba(251, 250, 247, 0.5);
  border: 1px solid #eeece4;
  border-radius: var(--cd-radius-pill);
  padding: 4px;
}

.cd-view-switcher__btn {
  border: none;
  background: transparent;
  border-radius: var(--cd-radius-pill);
  padding: 6px 14px;
  cursor: pointer;
  font: 500 13px var(--cd-font-ui);
  color: #9c9e94;
}

.cd-view-switcher__btn--active {
  background: var(--cd-olive);
  box-shadow: var(--cd-shadow-pill-active);
  font-weight: 700;
  color: #3f4136;
}
</style>
