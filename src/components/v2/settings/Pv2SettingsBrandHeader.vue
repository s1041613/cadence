<template>
  <!--
    The Settings brand header: the drawn dot-matrix title (with its trailing swirl) standing in
    for a typeset h1. It is the page's heading, so it lives in an <h1> and the image carries the
    page name as its alt text — the same contract Pv2Poster's month wordmark has.

    Deliberately alone in here: the spec rules out adding characters, hearts, flowers or stars
    to this page, and a decorative sibling is exactly what this component would accumulate.
  -->
  <h1 class="pv2-set-brand">
    <img class="pv2-set-brand__mark" :src="src" alt="Settings" />
  </h1>
</template>

<script setup lang="ts">
import { pageWordmarkPath } from '@/utils/public-assets'

const src = pageWordmarkPath('settings')
</script>

<style scoped>
.pv2-set-brand {
  flex: none;
  /* Left-aligned on the page's own 24px column: the padding comes from the scroll container,
     so the mark starts where the cards below it start. */
  margin: 0;
  padding: 0;
  /* line-height 0 so the h1 box is the image's box — the mark's own whitespace is already
     drawn into the PNG, and a text line-height here would add a second, invisible gap. */
  line-height: 0;
}

/* Sized by width, height follows: the art is 550x203 and must not stretch (spec §2).
   270px sits mid-range of the spec's 260–280 and leaves the swirl clear of the card below.
   object-fit: contain is belt-and-braces — with height:auto the aspect ratio can't skew
   anyway, but it also protects the mark if a future layout ever constrains the height. */
.pv2-set-brand__mark {
  display: block;
  width: 270px;
  max-width: 100%;
  height: auto;
  object-fit: contain;
}
</style>
