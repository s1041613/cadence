<template>
  <div class="cd-modal-root">
    <CdScrim :color="scrimColor" @click="emit('scrimClick')" />
    <div class="cd-modal" :style="{ width }">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
// CdModal — centered modal (global Create, Settings). CADENCE Handoff §4.3 / §4.11:
// animation popIn .26s cubic-bezier(.22,1,.36,1); shadow 0 34px 70px -26px rgba(40,38,30,.55);
// border-radius 20px (var(--cd-radius-picker)) — centered modals use r18-20, distinct from the
// 22px drawer radius.
// "Global create (no day context) -> centered modal ... the industry norm" (prototype comment).
import CdScrim from './CdScrim.vue'

withDefaults(
  defineProps<{
    width?: string
    scrimColor?: string
  }>(),
  { width: 'min(500px, 90%)', scrimColor: 'var(--cd-scrim-strong)' }
)

const emit = defineEmits<{
  scrimClick: []
}>()
</script>

<style scoped>
.cd-modal-root {
  position: absolute;
  inset: 0;
  z-index: 70;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cd-modal {
  position: relative;
  background: #fff;
  border-radius: var(--cd-radius-picker);
  box-shadow: var(--cd-shadow-modal);
  animation: cd-popIn var(--cd-duration-pop) var(--cd-ease-standard);
  overflow: hidden;
}
</style>
