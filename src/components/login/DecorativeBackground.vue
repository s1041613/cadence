<template>
  <div class="login-decor" aria-hidden="true">
    <svg class="login-decor__mark login-decor__mark--star" viewBox="0 0 24 24">
      <path :d="SPARKLE" />
    </svg>
    <svg class="login-decor__mark login-decor__mark--cross" viewBox="0 0 24 24">
      <path :d="SPARKLE" />
    </svg>
    <svg class="login-decor__mark login-decor__mark--ink" viewBox="0 0 24 24">
      <path :d="SPARKLE" />
    </svg>
  </div>
</template>

<script setup lang="ts">
/*
 * The scatter marks to the wordmark's upper left in the brand artwork.
 *
 * Mounted inside the hero, not the page frame, and that is load-bearing: the hero holds 56%
 * of the frame on a tall screen but compresses on a short one, so a percentage measured
 * against the frame would walk these marks down into the wordmark as the screen shrinks.
 * Against the hero they keep their relation to the mark at every size — which is the drift
 * spec §6 wanted to avoid by merging them into the logo asset. They stay separate because
 * a mark inside that asset would widen its bounding box and push the wordmark off centre.
 */
const SPARKLE = 'M12 0c1 8 4 11 12 12-8 1-11 4-12 12-1-8-4-11-12-12 8-1 11-4 12-12z'
</script>

<style scoped>
.login-decor {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.login-decor__mark {
  position: absolute;
  fill: var(--login-pink);
}

.login-decor__mark--star {
  left: 3%;
  top: 30%;
  width: 36px;
  opacity: 0.5;
}

.login-decor__mark--cross {
  left: 12%;
  top: 12%;
  width: 16px;
  opacity: 0.66;
}

/* The one ink-coloured scatter mark. It belongs to the wordmark's palette rather than the
   pink decoration's, and it sits in the air above the C — clear of the logo box, so the
   wordmark stays optically centred. */
.login-decor__mark--ink {
  left: 16%;
  top: 25%;
  width: 13px;
  fill: var(--login-ink);
  opacity: 0.4;
}
</style>
