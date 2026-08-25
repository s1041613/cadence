<template>
  <!--
    Notebook composition root: owns the store, the shared clock and the draft, and splits
    the surface into header / composer / feed.
  -->
  <div class="nbv">
    <Pv2NotebookHeader />

    <div class="nbv__tags" aria-label="Note tags">
      <button class="nbv__tag" :class="{ 'nbv__tag--active': store.activeTagId === null }" type="button" @click="store.selectTag(null)">
        All
      </button>
      <button
        v-for="tag in store.tags"
        :key="tag.id"
        class="nbv__tag"
        :class="{ 'nbv__tag--active': store.activeTagId === tag.id }"
        type="button"
        @click="store.selectTag(tag.id)"
      >
        {{ tag.name }}
      </button>
      <form v-if="isAddingTag" class="nbv__tag-form" @submit.prevent="commitTag">
        <input
          ref="tagField"
          v-model="tagDraft"
          class="nbv__tag-input"
          type="text"
          aria-label="New tag"
          @blur="commitTag"
          @keydown.esc.prevent="cancelTag"
        />
      </form>
      <button v-else class="nbv__tag-add" type="button" aria-label="New tag" @click="startTag">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#9c9c9c" stroke-width="2" stroke-linecap="round" aria-hidden="true">
          <path d="M12 5 V19 M5 12 H19" />
        </svg>
      </button>
    </div>

    <label class="nbv__search">
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#9c9c9c" stroke-width="2" stroke-linecap="round" aria-hidden="true">
        <circle cx="11" cy="11" r="6.5" />
        <path d="M16 16 L21 21" />
      </svg>
      <input v-model="store.query" class="nbv__search-input" type="search" placeholder="Search" aria-label="Search notes" />
    </label>

    <div class="nbv__feed" v-touch-swipe.horizontal.mouse="onSwipe">
      <p v-if="store.visibleNotes.length === 0" class="nbv__empty">Nothing yet.</p>
      <Pv2NoteCard
        v-for="note in store.visibleNotes"
        :key="note.id"
        :note="note"
        :now="now"
        @edit="store.editNote(note.id, $event)"
        @delete="store.removeNote(note.id)"
      />
    </div>

    <Pv2Fab class="nbv__fab" @click="store.openComposer" />
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref, useTemplateRef } from 'vue'
import { useNotebookStore } from '@/stores/notebook-store'
import { useCurrentTime } from '@/composables/use-current-time'
import type { SwipeDetails } from '@/composables/use-date-swipe'
import Pv2NotebookHeader from './Pv2NotebookHeader.vue'
import Pv2NoteCard from './Pv2NoteCard.vue'
import Pv2Fab from '@/components/v2/ui/Pv2Fab.vue'

const store = useNotebookStore()

// Shared module-level ticking singleton, so Today/Yesterday roll over at midnight on their
// own. A local ref(new Date()) would be static and freeze every label at first render.
const now = useCurrentTime()
const isAddingTag = ref(false)
const tagDraft = ref('')
const tagField = useTemplateRef<HTMLInputElement>('tagField')

async function startTag(): Promise<void> {
  tagDraft.value = ''
  isAddingTag.value = true
  await nextTick()
  tagField.value?.focus()
}

function cancelTag(): void {
  tagDraft.value = ''
  isAddingTag.value = false
}

function commitTag(): void {
  const name = tagDraft.value
  if (name.trim() !== '') store.addTag(name)
  cancelTag()
}

function onSwipe(details: SwipeDetails): void {
  if (store.isComposerOpen) return
  if (details.direction === 'left') store.stepTag(1)
  if (details.direction === 'right') store.stepTag(-1)
}
</script>

<style scoped>
.nbv {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.nbv__tags {
  flex: none;
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
  padding: 14px 22px 8px;
  scrollbar-width: none;
}

.nbv__tags::-webkit-scrollbar {
  display: none;
}

.nbv__tag,
.nbv__tag-add,
.nbv__tag-form {
  flex: none;
  height: 34px;
  border: 1px solid #e2e2e2;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.74);
}

.nbv__tag {
  min-width: 64px;
  padding: 0 14px;
  font: 600 12px var(--cd-font-mono);
  color: #4f4f4f;
  cursor: pointer;
}

.nbv__tag--active {
  border-color: #1b1b1b;
  background: #1b1b1b;
  color: #fafaf9;
}

.nbv__tag-add {
  width: 34px;
  display: grid;
  place-items: center;
  padding: 0;
  border-style: dashed;
  cursor: pointer;
}

.nbv__tag-form {
  width: 118px;
  display: flex;
  align-items: center;
  padding: 0 10px;
}

.nbv__tag-input {
  width: 100%;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font: 600 12px var(--cd-font-mono);
  color: #1b1b1b;
}

.nbv__search {
  flex: none;
  display: flex;
  align-items: center;
  gap: 11px;
  height: 60px;
  margin: 12px 22px 14px;
  padding: 0 18px;
  border: 1px solid #e2e2e2;
  border-radius: 17px;
  background: rgba(255, 255, 255, 0.86);
}

.nbv__search-input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font: 400 17px var(--cd-font-mono);
  color: #1b1b1b;
}

.nbv__search-input::placeholder {
  color: #777;
}

.nbv__feed {
  flex: 1;
  /* Load-bearing: without it the flex child refuses to shrink and the whole frame scrolls. */
  min-height: 0;
  overflow-y: auto;
  padding: 10px 22px 96px;
  touch-action: pan-y;
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

.nbv__fab {
  bottom: 16px;
}
</style>
