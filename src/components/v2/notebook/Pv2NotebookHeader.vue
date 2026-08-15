<template>
  <!--
    Notebook header. Purely presentational, no props.
    The magnifier is decorative — search is not implemented — so it is an aria-hidden svg
    rather than a disabled button, which a screen reader would announce as a dead control.
  -->
  <header class="nbh">
    <div class="nbh__row">
      <div>
        <h1 class="nbh__title">Notebook</h1>
        <p class="nbh__eyebrow">A place for your thoughts</p>
      </div>
      <svg
        class="nbh__glass"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#6e6e6e"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20 L16 16" />
      </svg>
    </div>
  </header>
</template>

<script setup lang="ts"></script>

<style scoped>
.nbh {
  flex: none;
  padding: 14px 26px;
  /* The mock's 1.5px is a deliberate weight, set against the 34px title. */
  border-bottom: 1.5px solid #1b1b1b;
}

.nbh__row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
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

.nbh__glass {
  flex: none;
  margin-bottom: 4px;
}
</style>
