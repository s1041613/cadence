<template>
  <!--
    Notebook composition root: owns the store, the shared clock and the draft, and splits
    the surface into header / composer / feed.
  -->
  <div class="nbv">
    <Pv2NotebookHeader />
    <Pv2NoteComposer v-model="store.draft" @submit="onSubmit" />

    <div class="nbv__feed">
      <p v-if="store.notes.length === 0" class="nbv__empty">Nothing yet.</p>
      <Pv2NoteCard
        v-for="note in store.notes"
        :key="note.id"
        :note="note"
        :now="now"
        @edit="store.editNote(note.id, $event)"
        @settings="store.setNoteSettings(note.id, $event)"
        @delete="store.removeNote(note.id)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useNotebookStore } from '@/stores/notebook-store'
import { useCurrentTime } from '@/composables/use-current-time'
import Pv2NotebookHeader from './Pv2NotebookHeader.vue'
import Pv2NoteComposer from './Pv2NoteComposer.vue'
import Pv2NoteCard from './Pv2NoteCard.vue'

const store = useNotebookStore()

// Shared module-level ticking singleton, so Today/Yesterday roll over at midnight on their
// own. A local ref(new Date()) would be static and freeze every label at first render.
const now = useCurrentTime()

function onSubmit(): void {
  // The store silently refuses an empty draft (pressing + on an empty pill is not an error);
  // this guard exists only so the input isn't cleared on a no-op submit.
  const text = store.draft
  if (text.trim() === '') return
  store.addNote(text)
  store.draft = ''
}
</script>

<style scoped>
.nbv {
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.nbv__feed {
  flex: 1;
  /* Load-bearing: without it the flex child refuses to shrink and the whole frame scrolls. */
  min-height: 0;
  overflow-y: auto;
  padding: 12px 22px 24px;
  /* Repo idiom (see DayViewV2): hide the scrollbar while keeping the scroll. */
  scrollbar-width: none;
}

.nbv__feed::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}

.nbv__empty {
  margin: 24px 0 0;
  font: 500 12px var(--cd-font-mono);
  color: #b2b2b2;
  text-align: center;
}
</style>
