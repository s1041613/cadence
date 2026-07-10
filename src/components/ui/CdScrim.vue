<template>
  <div class="cd-scrim" :style="{ background: color }" @click="emit('click', $event)" />
</template>

<script setup lang="ts">
// CdScrim — backdrop for drawers/sheets/modals/popovers. design-research-report.md §4.11.
// Fades in via cd-scrimIn (opacity 0->1, .2s ease). Opacity varies by context (.28/.3/.32/.34/.4);
// caller passes the exact rgba via `color`.
withDefaults(
  defineProps<{
    color?: string
  }>(),
  { color: 'var(--cd-scrim)' }
)

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()
</script>

<style scoped>
.cd-scrim {
  position: absolute;
  inset: 0;
  animation: cd-scrimIn var(--cd-duration-scrim) ease;
}
</style>
