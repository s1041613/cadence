<template>
  <button type="button" class="cd-fab" aria-label="Create" @click="emit('click', $event)">
    <CdIcon name="plus" :size="26" color="#6E6A52" />
  </button>
</template>

<script setup lang="ts">
// CdFab — pad/phone create entry point. CADENCE Handoff: "desktop: create lives in the top bar,
// not a FAB" — the FAB only exists on pad/phone, where there's no topbar Create button to tap.
// Ported from `_fabEl(S)`: 56x56 circle, border 1px rgba(179,172,145,.5), bg #E7E4D6, icon color
// #6E6A52 (26px plus svg via `_plusSvg`), shadow 0 6px 16px -8px rgba(40,38,30,.35), z-index 45,
// hover bg #DFDBCB. Offsets are the phone spec: right 18px, bottom 104px (floats above the bottom nav).
// No mount animation: in the handoff, `dockIn` belongs to the docked create card, not the FAB itself.
import CdIcon from './CdIcon.vue'

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()
</script>

<style scoped>
.cd-fab {
  position: absolute;
  right: 18px;
  bottom: 104px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 1px solid rgba(179, 172, 145, 0.5);
  background: #e7e4d6;
  color: #6e6a52;
  cursor: pointer;
  display: grid;
  place-items: center;
  box-shadow: 0 6px 16px -8px rgba(40, 38, 30, 0.35);
  z-index: 45;
  transition: background var(--cd-duration-micro-3);
}

.cd-fab:hover {
  background: #dfdbcb;
}
</style>
