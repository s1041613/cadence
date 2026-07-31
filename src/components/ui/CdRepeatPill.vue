<template>
  <button type="button" class="cd-repeat-pill" @click="emit('cycle')">
    {{ label }}
  </button>
</template>

<script setup lang="ts">
// CdRepeatPill — repeat cycle pill. CADENCE Handoff §3.9 / §4.5:
// click cycles through 4 options (Does not repeat -> Every day -> Every week -> Every month), no dropdown.
defineProps<{
  label: string
}>()

const emit = defineEmits<{
  cycle: []
}>()
</script>

<style scoped>
.cd-repeat-pill {
  border: 1px solid var(--cd-line);
  background: #fff;
  border-radius: var(--cd-radius-pill);
  padding: 7px 12px;
  font: 600 13px var(--cd-font-ui);
  color: var(--cd-ink);
  cursor: pointer;
  transition: background var(--cd-duration-micro-3);
}

.cd-repeat-pill:hover {
  background: rgba(86, 88, 94, 0.05);
}
</style>
