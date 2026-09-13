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
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--pv2-ink-3)" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
          <path d="M12 5 V19 M5 12 H19" />
        </svg>
      </button>
    </div>

    <label class="nbv__search">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--pv2-ink-3)" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
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

    <Pv2Fab @click="store.openComposer" />
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
  /* 12 here and on the search below, then 8 on the feed: the filter and the query are one
     group and sit a small step apart, and the larger step falls at the boundary between
     that group and the notes. The old 10/6/8/10 ladder had no such grouping in it. */
  padding: 12px 22px 0;
  scrollbar-width: none;
}

.nbv__tags::-webkit-scrollbar {
  display: none;
}

/* Filled capsules, no outline. On a pure-white canvas an outlined chip, an outlined search
   field and an outlined note card are three different jobs wearing one material, and the
   hierarchy flattens. --pv2-fill is the documented resting state for a control track, and
   it separates the chip from the page without drawing a line around it. */
.nbv__tag,
.nbv__tag-add,
.nbv__tag-form {
  flex: none;
  height: 32px;
  border: none;
  border-radius: var(--cd-radius-pill);
  background: var(--pv2-fill);
}

.nbv__tag {
  min-width: 0;
  padding: 0 14px;
  font: 400 15px var(--cd-font-ui);
  color: var(--pv2-ink);
  cursor: pointer;
}

/* The calendar chip's on-state, borrowed whole (see Pv2Chip's .pv2-chip-tab--on): a 12% wash
   of the accent under the accent itself. "You are filtered to this tag" and "you are on this
   calendar" are the same statement, so they wear the same colour — and the accent's documented
   consumers are exactly this kind of on-state mark.

   The weight is this call site's own addition, and it is load-bearing rather than decorative:
   --pv2-accent on its own 12% wash measures ~3:1, which is under AA for 15px text, and a wash
   against --pv2-fill is a faint difference on its own. Carrying the state on weight as well as
   on hue means the selected tag is never signalled by colour alone. Raising that ratio means
   deepening --pv2-accent for every consumer, not substituting a colour here — the tone is the
   design's (same note as Pv2Chip). */
.nbv__tag--active {
  background: rgba(var(--pv2-accent-rgb), 0.12);
  color: var(--pv2-accent);
  font-weight: 600;
}

.nbv__tag-add {
  width: 32px;
  display: grid;
  place-items: center;
  padding: 0;
  cursor: pointer;
}

.nbv__tag-form {
  width: 100px;
  display: flex;
  align-items: center;
  padding: 0 8px;
}

.nbv__tag-input {
  width: 100%;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font: 400 15px var(--cd-font-ui);
  color: var(--pv2-ink);
}

/* Same fill as the chips above it, because it belongs to the same group: both narrow the
   feed, neither is content. 36px and radius 9 are the iOS search field's own box. */
.nbv__search {
  flex: none;
  display: flex;
  align-items: center;
  gap: 7px;
  height: 36px;
  margin: 12px 22px 0;
  padding: 0 10px;
  border: none;
  border-radius: var(--cd-radius-sm);
  background: var(--pv2-fill);
}

.nbv__search-input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font: 400 17px var(--cd-font-ui);
  color: var(--pv2-ink);
}

.nbv__search-input::placeholder {
  color: var(--pv2-ink-3);
}

.nbv__feed {
  flex: 1;
  /* Load-bearing: without it the flex child refuses to shrink and the whole frame scrolls. */
  min-height: 0;
  overflow-y: auto;
  /* Bottom padding clears the floating Pv2BottomNav pill (var(--pv2-nav-h)), not a
     fixed guess — the feed is itself the scrolling element, so padding goes directly
     here rather than on a flex ancestor. */
  padding: 8px 22px var(--pv2-nav-h);
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
  font: 400 15px var(--cd-font-ui);
  color: var(--pv2-ink-3);
  text-align: center;
}
</style>
