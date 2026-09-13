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
  /* Lit from above, so the disc reads as a sphere rather than a filled circle. The highlight
     is the canvas colour rather than a literal white, and it has to be a gradient: a flat fill
     gives the eye no gradient to infer curvature from, which is most of why this button read
     as a sticker on the page. It sits at -10% so the brightest point falls just off the top
     edge, where a light source above the screen would actually put it. */
  background:
    radial-gradient(126% 126% at 50% -10%, rgba(var(--pv2-canvas-rgb), 0.26), rgba(var(--pv2-canvas-rgb), 0) 52%),
    var(--pv2-ink);
  /* Three cast layers, not one. A single wide blur is the shape a sticker's drop shadow has;
     a real object at this height casts a tight, dark CONTACT shadow directly under itself and
     a wide, faint AMBIENT one around it, and it is the contact layer that grounds it. Plus a
     rim: the nav pill beside it already carries an inset top highlight, so a FAB without one
     reads as a different material from the only other floating thing on the screen.
     There is deliberately no bottom inner shade — --pv2-ink is #000000, so shading it darker
     is invisible, and the curvature has to come from the top highlight alone.
     Cast in the ink rather than in black: a neutral shadow on the pink page greys the pixels
     around the disc's edge and it reads as dirty rather than lifted. */
  box-shadow:
    0 1px 2px rgba(var(--pv2-ink-rgb), 0.24),
    0 6px 14px -3px rgba(var(--pv2-ink-rgb), 0.26),
    0 16px 30px -10px rgba(var(--pv2-ink-rgb), 0.20),
    inset 0 1px 0 rgba(var(--pv2-canvas-rgb), 0.22);
  cursor: pointer;
  /* --cd-ease-glass is the overshoot curve the nav's pill settles on, so the two floating
     elements move with the same physics. `0.12s ease` was the browser's default curve, which
     is nobody's decision. */
  transition:
    transform var(--cd-duration-micro-5) var(--cd-ease-glass),
    box-shadow var(--cd-duration-micro-5) var(--cd-ease-standard);
}

/* The shadow collapses WITH the press. Scaling alone says "this element got smaller"; pulling
   the cast layers in and letting the contact layer darken says "this object moved toward the
   surface", which is the whole of what a press is. Faster going down than coming back up —
   a press is driven, a release is sprung. */
.pv2-fab:active {
  transform: scale(0.93) translateY(1px);
  box-shadow:
    0 1px 1px rgba(var(--pv2-ink-rgb), 0.30),
    0 2px 5px -1px rgba(var(--pv2-ink-rgb), 0.22),
    0 5px 10px -6px rgba(var(--pv2-ink-rgb), 0.16),
    inset 0 1px 0 rgba(var(--pv2-canvas-rgb), 0.16);
  transition-duration: var(--cd-duration-micro-1);
}

@media (prefers-reduced-motion: reduce) {
  .pv2-fab {
    transition: none;
  }
}
</style>
