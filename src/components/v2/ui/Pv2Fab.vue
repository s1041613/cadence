<template>
  <!-- 新增按鈕（FAB）：深李子色圓 + 淡粉加號，浮在格線上、底部 nav 之上。 -->
  <button type="button" class="pv2-fab" aria-label="新增" @click="emit('click')">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--pv2-canvas)" stroke-width="2.4" stroke-linecap="round">
      <path d="M12 5 V19 M5 12 H19" />
    </svg>
  </button>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  click: []
}>()
</script>

<style scoped>
.pv2-fab {
  position: absolute;
  right: 22px;
  /* Floats --pv2-fab-gap above the bottom nav's top edge, and follows it: --pv2-nav-h
     already carries the pill's height, its floating inset and the home-indicator inset.
     Lives here rather than in each view — Day, Week and Notebook all carried the same
     override, so all three had to be found and edited whenever the nav's box moved. */
  bottom: calc(var(--pv2-nav-h) + var(--pv2-fab-gap));
  z-index: 10;
  width: 64px;
  height: 64px;
  display: grid;
  place-items: center;
  border: none;
  border-radius: 50%;
  /* Ink, not the accent: the accent is reserved for today's date pill, and a hot-pink disc
     floating over a grid of pink chips competes with them instead of sitting above them. */
  background: var(--pv2-ink);
  /* Cast in the ink rather than in black: a neutral shadow on the pink page greys the pixels
     around the disc's edge and it reads as dirty rather than lifted. */
  box-shadow: 0 8px 22px rgba(var(--pv2-ink-rgb), 0.28);
  cursor: pointer;
  transition: transform 0.12s ease;
}

.pv2-fab:active {
  transform: scale(0.94);
}

@media (prefers-reduced-motion: reduce) {
  .pv2-fab {
    transition: none;
  }
}
</style>
