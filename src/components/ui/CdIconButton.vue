<template>
  <button
    type="button"
    class="cd-icon-btn"
    :class="{ 'cd-icon-btn--danger': danger }"
    :aria-label="ariaLabel"
    :title="ariaLabel"
    @click="emit('click', $event)"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
// CdIconButton — round 30x30/40x40 icon button used throughout topbar, preview card,
// and drawer headers. See design-research-report.md §2.2 / §3.8.
withDefaults(
  defineProps<{
    ariaLabel: string
    size?: number
    danger?: boolean
  }>(),
  { size: 40, danger: false }
)

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()
</script>

<style scoped>
.cd-icon-btn {
  width: v-bind('`${size}px`');
  height: v-bind('`${size}px`');
  border: none;
  background: transparent;
  border-radius: var(--cd-radius-pill);
  cursor: pointer;
  display: grid;
  place-items: center;
  color: var(--cd-ink);
  transition: background var(--cd-duration-micro-3);
}

.cd-icon-btn:hover {
  background: rgba(86, 88, 94, 0.07);
}

.cd-icon-btn--danger:hover {
  background: rgba(192, 86, 75, 0.1);
}
</style>
