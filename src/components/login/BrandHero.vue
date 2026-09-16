<template>
  <header class="brand-hero">
    <GridBackground />
    <DecorativeBackground />
    <h1 class="brand-hero__title">
      <CadenceLogo class="brand-hero__logo" />
    </h1>
  </header>
</template>

<script setup lang="ts">
import CadenceLogo from './CadenceLogo.vue'
import DecorativeBackground from './DecorativeBackground.vue'
import GridBackground from './GridBackground.vue'
</script>

<style scoped>
/*
 * flex-basis carries the hero's 56% share of the frame rather than a height, and shrink is
 * left on: on a short screen the slack has to come out of this block's whitespace before it
 * comes out of the panel, which holds the buttons (spec §7). The panel is the flex item that
 * grows, so on a tall screen this stays at its share instead of absorbing the extra.
 *
 * Percentage rather than dvh deliberately — see the note on .login in LoginPage.vue.
 */
.brand-hero {
  position: relative;
  flex: 0 1 56%;
  min-height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(env(safe-area-inset-top, 0px) + 16px) 24px 16px;
}

.brand-hero__title {
  /* The wordmark IS the page heading; the <h1> only carries it for the accessibility tree. */
  position: relative;
  margin: 0;
  /* 72vw tracks the phone, the 330px cap takes over once the 430px frame stops growing. */
  width: min(72vw, 330px);
  max-width: 100%;
  color: var(--login-ink);
}

.brand-hero__logo {
  width: 100%;
}
</style>
