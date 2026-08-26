<template>
  <CdSheet scrim-color="var(--cd-scrim-heavy)" @scrim-click="emit('close')" @dismiss="emit('close')">
    <form class="nbc" @submit.prevent="emit('submit')">
      <textarea
        ref="field"
        :value="modelValue"
        class="nbc__input"
        rows="2"
        placeholder="What would you like to do?"
        aria-label="New note"
        @input="onInput"
        @keydown.meta.enter.prevent="emit('submit')"
        @keydown.ctrl.enter.prevent="emit('submit')"
      />

      <!-- Per the design the list row is disclosed by the footer toggle, not always on: the sheet
           opens as text + toggle + send, and only reveals the add button and the tags on tap. -->
      <div v-if="isListRowOpen" id="nbc-lists" class="nbc__tags" aria-label="Note list">
        <form v-if="isAddingTag" class="nbc__tag-form" @submit.prevent="commitTag">
          <input
            ref="tagField"
            v-model="tagDraft"
            class="nbc__tag-input"
            type="text"
            placeholder="list name"
            aria-label="New list"
            @blur="commitTag"
            @keydown.esc.prevent="cancelTag"
          />
        </form>
        <button v-else class="nbc__tag-add" type="button" aria-label="New list" @click="startTag">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9c9c9c" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <path d="M12 5 V19 M5 12 H19" />
          </svg>
        </button>
        <button
          v-for="tag in tags"
          :key="tag.id"
          class="nbc__tag"
          :class="{ 'nbc__tag--active': selectedTagId === tag.id }"
          type="button"
          @click="toggleTag(tag.id)"
        >
          {{ tag.name }}
        </button>
      </div>

      <div class="nbc__footer">
        <button
          class="nbc__lists"
          :class="{ 'nbc__lists--active': isListRowOpen }"
          type="button"
          aria-label="Lists"
          aria-controls="nbc-lists"
          :aria-expanded="isListRowOpen"
          @click="toggleListRow"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <path d="M4 7 H20 M4 12 H14 M4 17 H17" />
          </svg>
        </button>
        <button class="nbc__send" type="submit" aria-label="Add note">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#8f8f8f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 19 V5" />
            <path d="M5.5 11.5 L12 5 L18.5 11.5" />
          </svg>
        </button>
      </div>
    </form>
  </CdSheet>
</template>

<script setup lang="ts">
import { nextTick, ref, useTemplateRef } from 'vue'
import type { NoteTag } from '@/types/note'
import CdSheet from '@/components/ui/CdSheet.vue'

const props = defineProps<{
  modelValue: string
  selectedTagId: string | null
  tags: NoteTag[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'update:selectedTagId': [value: string | null]
  submit: []
  close: []
  addTag: [name: string]
}>()

const field = useTemplateRef<HTMLTextAreaElement>('field')
const tagField = useTemplateRef<HTMLInputElement>('tagField')
const isListRowOpen = ref(false)
const isAddingTag = ref(false)
const tagDraft = ref('')

// Focus is NOT taken on mount. The page wraps this sheet in <Transition name="cd-sheet">, whose
// enter starts the panel at translateY(100%) (CdSheet.vue), so at mount the textarea still sits a
// full sheet-height below the viewport. iOS runs its scroll-into-view against the rect it has at
// focus time and never recomputes it, which threw the whole page upward — the notes list ended up
// under the status bar and the composer's footer under the keyboard.
//
// NotebookPageV2 calls this from the Transition's @after-enter instead, once the panel has landed.
function focusField(): void {
  field.value?.focus()
}

defineExpose({ focusField })

function onInput(event: Event): void {
  emit('update:modelValue', (event.target as HTMLTextAreaElement).value)
}

function toggleListRow(): void {
  isListRowOpen.value = !isListRowOpen.value
  // Collapsing takes the tag input with it, so a half-typed name can't linger invisibly and
  // then commit the next time the row is opened.
  if (!isListRowOpen.value) cancelTag()
}

// The design's row has no All chip, so re-tapping the selected list is what clears it — without
// this an untagged note would be unreachable once a list is picked.
function toggleTag(id: string): void {
  emit('update:selectedTagId', props.selectedTagId === id ? null : id)
}

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
  if (name.trim() !== '') emit('addTag', name)
  cancelTag()
}
</script>

<style scoped>
.nbc {
  display: flex;
  flex-direction: column;
  /* 22px, not 26: .nbh, .nbv__tags and .nbv__feed are all on a 22px column, so the composer was the
     one block hanging 4px off Notebook's own edge (68640cb aligned the page titles for the same
     reason and missed this one). Kept in sync with .nbc__tags' bleed below. */
  padding: 18px 22px 0;
  /* Deliberately no background: the panel's paper belongs to .cd-sheet, and the handle zone above
     this form plus the sheet's home-indicator padding below it are OUTSIDE the slot. A background
     here that differs from the sheet's paints those two strips a different colour — which is
     exactly what #fff did, and it showed as bands top and bottom over a dark wallpaper. Every
     other sheet body (Pv2EventEditCard, Pv2MonthSheet, Pv2DaySheet) sits on the same paper.
     Inheriting rather than restating #fafaf9 so this cannot drift from the sheet's default. */
}

.nbc__input {
  width: 100%;
  min-height: 60px;
  border: none;
  outline: none;
  resize: none;
  background: transparent;
  font: 400 19px var(--cd-font-mono);
  line-height: 1.32;
  color: #1b1b1b;
}

.nbc__input::placeholder {
  color: #777;
}

.nbc__tags {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
  /* Full-bleed scroller: the negative margin and the padding must equal .nbc's horizontal padding,
     or the row's first chip stops sitting on the column. */
  margin: 14px -22px 0;
  padding: 0 22px 12px;
  scrollbar-width: none;
}

.nbc__tags::-webkit-scrollbar {
  display: none;
}

.nbc__tag,
.nbc__tag-add,
.nbc__tag-form {
  flex: none;
  height: 34px;
  border: 1px solid #e2e2e2;
  border-radius: 999px;
  background: #fff;
}

.nbc__tag {
  min-width: 64px;
  padding: 0 15px;
  font: 600 12px var(--cd-font-mono);
  color: #4f4f4f;
  cursor: pointer;
}

.nbc__tag--active {
  border-color: #1b1b1b;
  background: #1b1b1b;
  color: #fafaf9;
}

.nbc__tag-add {
  width: 34px;
  display: grid;
  place-items: center;
  padding: 0;
  border-radius: 50%;
  cursor: pointer;
}

.nbc__tag-form {
  width: 150px;
  display: flex;
  align-items: center;
  padding: 0 14px;
}

.nbc__tag-input {
  width: 100%;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font: 600 12px var(--cd-font-mono);
  color: #1b1b1b;
}

.nbc__tag-input::placeholder {
  color: #9c9c9c;
}

.nbc__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding-top: 10px;
}

.nbc__lists {
  flex: none;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border: none;
  border-radius: 14px;
  background: transparent;
  color: #9c9c9c;
  cursor: pointer;
}

.nbc__lists--active {
  background: var(--cd-accent-subtle);
  color: var(--cd-accent-strong);
}

.nbc__send {
  flex: none;
  display: grid;
  place-items: center;
  /* 50, not 62: at 62 the ring rivalled Pv2Fab's 64px black circle — the one primary action on the
     screen — while carrying a far quieter treatment. The glyph goes 26 -> 19 with it, holding the
     icon at ~38% of the circle instead of 42%. */
  width: 50px;
  height: 50px;
  padding: 0;
  border: 1.5px solid #e0e0dd;
  border-radius: 50%;
  background: #fff;
  cursor: pointer;
}

.nbc__send:active {
  transform: scale(0.96);
}
</style>
