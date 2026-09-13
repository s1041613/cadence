<template>
  <!--
    One note, as a row in a plain list — not a card. The page canvas is pure white
    (--pv2-canvas), so a card's own white fill has nothing to sit on: the border and the
    0.04-alpha shadow were the only things separating one note from the next, and neither
    reads on white. Rows separated by a rule need no fill, no border and no shadow, which
    is also the one shape that satisfies both elevation rules in cadence-tokens.css at
    once (nothing here floats, and nothing here is told apart by a tint).

    Body first, metadata under it: the note is what the row is about, and the date is what
    you check after reading it. Copy and delete ride on that same metadata line rather than
    above the text, so the chrome sits on the quiet line instead of the loud one.

    The body is edit-in-place: clicking it swaps the text for a textarea, and blurring or
    pressing Escape commits. There is no explicit save button — the note is the only content
    in the row, so leaving the field is an unambiguous "done".
  -->
  <article class="nbk">
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

    <div class="nbk__meta">
      <span class="nbk__when">{{ label }}</span>
      <button
        class="nbk__copy"
        type="button"
        :aria-label="justCopied ? 'Copied!' : 'Copy note'"
        @click="copyBody"
      >
        <svg
          v-if="!justCopied"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--pv2-ink-3)"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <rect x="8" y="8" width="12" height="13" rx="2" />
          <path d="M16 8 V5.5 A1.5 1.5 0 0 0 14.5 4 H5.5 A1.5 1.5 0 0 0 4 5.5 V16.5 A1.5 1.5 0 0 0 5.5 18 H8" />
        </svg>
        <svg
          v-else
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--pv2-ink-3)"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M4 12.5 L9.5 18 L20 6" />
        </svg>
      </button>
      <button class="nbk__delete" type="button" aria-label="Delete note" @click="emit('delete')">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--pv2-ink-3)"
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

const justCopied = ref(false)
let copiedTimeout: ReturnType<typeof setTimeout> | undefined

async function copyBody(): Promise<void> {
  await navigator.clipboard.writeText(props.note.body)
  justCopied.value = true
  clearTimeout(copiedTimeout)
  copiedTimeout = setTimeout(() => {
    justCopied.value = false
  }, 1200)
}

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
/* No fill, no border, no radius, no shadow — see the template comment. The row's only
   horizontal inset comes from the feed, so the rule below runs the full content width. */
.nbk {
  position: relative;
  padding: 13px 0 14px;
}

/* The separator belongs BETWEEN rows, so it hangs off the second one of each pair: a
   border-bottom on every row would also draw one under the last note, closing the list
   with a line that has nothing after it. --pv2-line is the "cell rules" role, which is
   exactly what this is. */
.nbk + .nbk::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--pv2-line);
}

.nbk__body {
  margin: 0;
  /* iOS Body, 17/22 — widened to 1.45 because the notes are mostly Chinese, whose glyphs
     need more leading than the Latin metrics that ratio was set for. The previous 15px was
     below the platform's body size at a size where CJK loses stroke detail first. */
  font: 400 17px var(--cd-font-ui);
  line-height: 1.45;
  color: var(--pv2-ink);
  /* Not in the mock, but real data hits both: without pre-wrap multi-line text collapses to
     one line, and without overflow-wrap a long URL bursts the row's bounds. */
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

.nbk__meta {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 5px;
}

/* iOS Footnote, 13/18. Was 10px in --pv2-ink-4, which measures 2.0:1 — a size and a
   contrast that together made the one piece of metadata on the row the hardest thing on
   the page to read. --pv2-ink-2 is the AA role for secondary text. */
.nbk__when {
  flex: 1;
  font: 400 13px var(--cd-font-ui);
  line-height: 18px;
  color: var(--pv2-ink-2);
}

/* Padding grows the tap target to 32px while the equal negative margin keeps the row's
   height driven by the text, not by the buttons. */
.nbk__copy,
.nbk__delete {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: -8px;
  padding: 8px;
  border: none;
  background: none;
  cursor: pointer;
}
</style>
