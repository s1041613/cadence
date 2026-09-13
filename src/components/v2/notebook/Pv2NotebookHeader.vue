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
   matching Day, Week and Settings. A line-height below the face's natural one pulls the glyphs
   above their line box, so the landing point is capTop = paddingTop + fontSize × (lineHeight/2
   − 0.37). It held at 34px/0.92 (17 + 3.06) and it still holds at the poster's 36px/0.9
   (17 + 2.88), so the 17 carries over unchanged rather than by luck.
   Horizontal padding drops 26 → 22 to sit on the same column as the composer and the feed. */
.nbh {
  flex: none;
  padding: 17px 22px 14px;
}

/* The month view's title treatment, borrowed whole: --cd-font-poster at 800 with the same
   negative tracking and leading (see Pv2Poster's .pv2-poster__month). Notebook is the only
   other page whose title is the first thing on the screen rather than a bar above content,
   so the two should carry the page the same way — on size and weight, not on a second face.
   What is NOT borrowed is the poster's container-query size (min(44px, 9cqw)): that exists to
   fit the longest of twelve month names at one constant size, and a fixed word has nothing to
   solve for. 36px is the poster's own no-container fallback.
   Colour stays --pv2-ink, not --pv2-poster-ink: this is a page title, not a poster. */
.nbh__title {
  margin: 0;
  font: 800 36px var(--cd-font-poster);
  letter-spacing: -0.01em;
  line-height: 0.9;
  color: var(--pv2-ink);
}

/* text-transform rather than literal capitals: presentation stays in CSS, and the DOM and
   accessibility tree keep normal casing. */
.nbh__eyebrow {
  margin: 8px 0 0;
  font: 500 10px var(--cd-font-ui);
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--pv2-ink-3);
}
</style>
