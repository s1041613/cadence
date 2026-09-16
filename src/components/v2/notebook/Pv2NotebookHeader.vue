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

/* The month view's title treatment, borrowed in size and face: --cd-font-poster at 36px with
   the poster's leading (see Pv2Poster's .pv2-poster__month). Notebook is the only other page
   whose title is the first thing on the screen rather than a bar above content, so the two
   should carry the page the same way — on size, not on a second face.
   What is NOT borrowed is the poster's container-query size (min(44px, 9cqw)): that exists to
   fit the longest of twelve month names at one constant size, and a fixed word has nothing to
   solve for. 36px is the poster's own no-container fallback.
   Colour stays --pv2-ink, not --pv2-poster-ink: this is a page title, not a poster.

   500, not the poster's 800, and tracking neutral rather than −0.01em. Month no longer SHOWS
   its 800: it renders a drawn wordmark and only falls back to type when a month's art is
   missing, so matching that number matched a fallback rather than the page. Against the
   wordmark's thin, drawn strokes an 800 grotesque at tight tracking was the heaviest mark in
   the app, and a nine-letter word has none of the constraints that earn Day its 800 (two
   digits at 48px need the weight to hold a column) or the poster its −0.01em (that tracking
   buys back width so 'September' fits at one size for all twelve months — 'Notebook' has no
   such fit to make, and the negative value only closes up a word that is already short).
   500 rather than 400 or 600, picked against the reference render at all four: 400 goes
   fragile at 36px over a photo, 600 is back to reading as bold. The title stays the largest
   thing on the page and stops being the darkest.
   Neither change moves the glyphs vertically — cap height is a family metric, constant across
   weights, and tracking is horizontal — so the padding-top derivation above still holds. */
.nbh__title {
  margin: 0;
  font: 500 36px var(--cd-font-poster);
  letter-spacing: 0;
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
