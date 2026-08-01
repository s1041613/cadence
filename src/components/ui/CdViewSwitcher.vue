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
  border: 1px solid var(--cd-line);
  border-radius: var(--cd-radius-pill);
  padding: 4px;
}

.cd-view-switcher__btn {
  border: none;
  background: transparent;
  border-radius: var(--cd-radius-pill);
  padding: 6px 14px;
  cursor: pointer;
  font: 700 13px var(--cd-font-ui);
  color: var(--cd-ink-muted);
}

/* Level 1 (flat): no shadow. The accent fill already carries the selected state against
   a transparent track; a lift on a control that sits flat on the page competes with the
   overlay shadow, which is the only real elevation signal in the app. */
.cd-view-switcher__btn--active {
  background: var(--cd-accent);
  font-weight: 700;
  color: var(--cd-on-accent);
}
</style>
