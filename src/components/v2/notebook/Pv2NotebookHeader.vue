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
.nbh {
  flex: none;
  padding: 14px 26px;
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
