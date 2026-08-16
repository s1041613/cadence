<template>
  <svg
    class="pv2-chevron"
    :class="{ 'pv2-chevron--open': open }"
    width="11"
    height="7"
    viewBox="0 0 11 7"
    fill="none"
    aria-hidden="true"
  >
    <path d="M1 1.5 L5.5 5.5 L10 1.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
</template>

<script setup lang="ts">
// Pv2Chevron — the one "this opens" affordance for the v2 event card.
//
// It replaced three separate chevrons that had drifted apart: the browser's own
// double-arrow on a bare <select>, this 11x7 SVG on the STYLE button, and a 7x7
// square rotated 45deg out of two borders in CdReminderPill. Only the SVG one
// rotated when its control opened, so two of the three gave no open-state signal
// at all — which is most of why the card's controls read as unfinished.
//
// Colour comes from `currentColor`, so the host sets the resting tone on the
// control and this follows. No size prop: one chevron, one size. A control that
// wants it visually lighter changes its own colour rather than its geometry.
withDefaults(defineProps<{ open?: boolean }>(), { open: false })
</script>

<style scoped>
.pv2-chevron {
  display: block;
  flex: none;
  transition: transform var(--cd-duration-micro-3);
}

.pv2-chevron--open {
  transform: rotate(180deg);
}

@media (prefers-reduced-motion: reduce) {
  .pv2-chevron {
    transition: none;
  }
}
</style>
