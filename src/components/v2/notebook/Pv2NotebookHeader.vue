<template>
  <!--
    Notebook header. Purely presentational, no props.
  -->
  <header class="nbh">
    <h1 class="nbh__title">Notebook</h1>
    <p class="nbh__eyebrow">A place for your thoughts</p>
  </header>
</template>

<script setup lang="ts"></script>

<style scoped>
/* padding-top is 17 rather than 14 so the title's *visual* top lands 20px below the frame,
   matching Day, Week and Settings. The face is JetBrains Mono (every --cd-font-* token
   aliases to it), whose normal line-height is 1.32em, so a line-height under that pulls the
   glyphs above their line box: capTop = paddingTop + fontSize × (lineHeight/2 − 0.37).
   Horizontal padding drops 26 → 22 to sit on the same column as the composer and the feed. */
.nbh {
  flex: none;
  padding: 17px 22px 14px;
}

.nbh__title {
  margin: 0;
  font: 400 34px var(--cd-font-mono);
  line-height: 0.92;
  color: #1b1b1b;
}

/* text-transform rather than literal capitals: presentation stays in CSS, and the DOM and
   accessibility tree keep normal casing. */
.nbh__eyebrow {
  margin: 8px 0 0;
  font: 500 10px var(--cd-font-mono);
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #9c9c9c;
}
</style>
