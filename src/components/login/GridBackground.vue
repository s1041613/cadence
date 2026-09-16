<template>
  <div class="login-grid" aria-hidden="true"></div>
</template>

<style scoped>
/*
 * The stitch paper behind the wordmark. Drawn rather than baked into the hero artwork so
 * it re-tiles at every viewport instead of stretching with a fixed-size image, and so the
 * logo asset stays transparent and reusable.
 *
 * Two 1px gradients at a 24px tile: the second colour stop at 1px is what keeps the rule
 * hairline-thin at any tile size, since background-size scales the tile, not the stop.
 */
.login-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(to right, var(--login-grid-line) 0 1px, transparent 1px),
    linear-gradient(to bottom, var(--login-grid-line) 0 1px, transparent 1px);
  background-size: 24px 24px;
  opacity: 0.16;
  /* Fades the paper out before it reaches an edge, so the grid reads as a texture under the
     mark rather than as a panel with a visible boundary. */
  -webkit-mask-image: radial-gradient(ellipse 76% 60% at 50% 46%, black 34%, transparent 100%);
  mask-image: radial-gradient(ellipse 76% 60% at 50% 46%, black 34%, transparent 100%);
}
</style>
