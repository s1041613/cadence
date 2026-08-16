<template>
  <!--
    One note. The body is edit-in-place: clicking it swaps the text for a textarea, and
    blurring or pressing Escape commits. There is no explicit save button — the note is the
    only content on the card, so leaving the field is an unambiguous "done".
  -->
  <article class="nbk">
    <div class="nbk__head">
      <span class="nbk__when">{{ label }}</span>
      <button class="nbk__delete" type="button" aria-label="Delete note" @click="emit('delete')">
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#c4c4c4"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M4 7 H20" />
          <path d="M9 7 V5 a1.5 1.5 0 0 1 1.5 -1.5 H13.5 A1.5 1.5 0 0 1 15 5 V7" />
          <path d="M6.5 7 L7.5 20 a1.5 1.5 0 0 0 1.5 1.4 H15 a1.5 1.5 0 0 0 1.5 -1.4 L17.5 7" />
        </svg>
      </button>
    </div>

    <textarea
      v-if="isEditing"
      ref="field"
      v-model="buffer"
      class="nbk__body nbk__body--editing"
      rows="1"
      aria-label="Edit note"
      @blur="commit"
      @keydown.esc.prevent="commit"
      @input="autoGrow"
    />
    <p v-else class="nbk__body" @click="startEditing">{{ note.body }}</p>
  </article>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef } from 'vue'
import type { Note } from '@/types/note'
import { relativeDayLabel } from '@/utils/relative-day'

const props = defineProps<{
  note: Note
  /** Shared ticking clock (see NotebookViewV2). A per-card new Date() would let labels in a
   *  single render disagree with each other, and would freeze at first paint. */
  now: Date
}>()

// Always the capture day, never the edit time: a note's timestamp answers "when did I write
// this", and editing deliberately leaves createdAt alone.
const label = computed(() => relativeDayLabel(props.note.createdAt, props.now))

const emit = defineEmits<{
  delete: []
  edit: [body: string]
}>()

const isEditing = ref(false)
const buffer = ref('')
const field = useTemplateRef<HTMLTextAreaElement>('field')

async function startEditing(): Promise<void> {
  buffer.value = props.note.body
  isEditing.value = true
  // Wait for the textarea to exist before focusing it, and size it to the text it already
  // holds so entering edit mode doesn't collapse a multi-line note to one row.
  await nextTick()
  field.value?.focus()
  autoGrow()
}

/** Grows the textarea to fit its content. Reset to auto first, or the height only ever
 *  ratchets upward as text is deleted. */
function autoGrow(): void {
  const el = field.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

function commit(): void {
  if (!isEditing.value) return
  isEditing.value = false
  // The store ignores an unchanged or emptied body; emitting unconditionally keeps that
  // single rule in one place rather than duplicating it here.
  emit('edit', buffer.value)
}
</script>

<style scoped>
.nbk {
  /* Stacks above the dotted-paper backdrop. */
  position: relative;
  z-index: 1;
  padding: 16px 18px;
  margin-bottom: 14px;
  border: 1px solid #e2e2e2;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.nbk__head {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 9px;
}

.nbk__when {
  flex: 1;
  font: 500 10px var(--cd-font-mono);
  color: #b2b2b2;
}

.nbk__delete {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
}

.nbk__body {
  margin: 0;
  font: 400 15px var(--cd-font-mono);
  line-height: 1.4;
  color: #1b1b1b;
  /* Not in the mock, but real data hits both: without pre-wrap multi-line text collapses to
     one line, and without overflow-wrap a long URL bursts the card's bounds. */
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  cursor: text;
}

/* Matches the paragraph exactly, so entering edit mode does not shift the text by a pixel. */
.nbk__body--editing {
  display: block;
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  resize: none;
  overflow: hidden;
  font-family: inherit;
}
</style>
