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

    At rest the row is a PREVIEW, not the note: a lead line over the first couple of lines of
    what follows, both clamped. Rendering every note in full at one size was the whole of the
    "wall of text" — a 40-line prompt and a two-word reminder arrived on the page as the same
    kind of object, with nothing to scan by and no way to tell where one ended. The split is
    presentational only (Note has no title field); tapping in still opens the raw body, one
    plain voice, exactly as typed.
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
    <div v-else class="nbk__body" @click="startEditing">
      <p class="nbk__lead">{{ lead }}</p>
      <p v-if="rest" class="nbk__rest">{{ rest }}</p>
    </div>

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

/** Splits the body at its first line break for display only — see the template comment.
 *  The store trims the body, so a leading blank line should not occur; findIndex covers it
 *  anyway rather than letting one empty line become the whole lead. A body with no break at
 *  all is all lead and no rest, which is the right answer: a pasted paragraph has no second
 *  part to preview, and the clamp below is what keeps it from taking the page. */
const parts = computed(() => {
  const lines = props.note.body.split('\n')
  const first = lines.findIndex((line) => line.trim() !== '')
  if (first === -1) return { lead: props.note.body, rest: '' }
  return { lead: lines[first]!.trim(), rest: lines.slice(first + 1).join('\n').trim() }
})
const lead = computed(() => parts.value.lead)
const rest = computed(() => parts.value.rest)

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
/* No fill, no border, no shadow at rest — see the template comment. The row's only horizontal
   inset comes from the feed, so the rule below runs the full content width. (The rounded press
   fill further down belongs to the tap target, not to the row: it exists only while held.) */
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

/* The tappable region, and the only thing on the row that reacts to a finger. The negative
   margin lets its press fill and its hit area run 10px wider and 6px taller than the text
   without moving a glyph: the text column stays exactly where the feed's 22px inset puts it.
   A row of unstyled text on a white page reads as text lying ON the page rather than as an
   object you can open — the press state is what says otherwise, and it costs no resting ink. */
.nbk__body {
  margin: -6px -10px 0;
  padding: 6px 10px;
  border-radius: var(--cd-radius-sm);
  cursor: text;
  -webkit-tap-highlight-color: transparent;
}

.nbk__body:active {
  background: var(--pv2-fill);
}

/* The lead line, at 15/500. Not 17/400: at 17 every note on the page was set in one voice at
   one size, so a page of notes had no ladder in it at all — and CJK fills its em where Inter's
   Latin leaves sidebearings, so the platform's 17pt Body renders visibly larger in Chinese than
   the metric it was calibrated on. Two steps down with the emphasis carried on weight instead
   keeps the lead the loudest thing in the row while taking the bulk out of it; 16/600 was tried
   first and reads as the same wall, because Noto Sans TC's 500 and 600 are near-identical in
   colour and the size is what was loud.
   Two lines, because a Chinese lead wraps where an English one would not; a third would put
   the wall back. */
.nbk__lead {
  margin: 0;
  font: 500 15px var(--cd-font-ui);
  line-height: 1.45;
  color: var(--pv2-ink);
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
}

/* What follows the lead, at 13.5 in the AA secondary role: quiet enough that the eye scans leads
   down the page and drops into a preview only where it means to. A whole step below the lead,
   not the half-step 14 would be — the two share a column and differ in nothing but size and
   grey, so the size has to do visible work.
   pre-wrap keeps the note's own line breaks (a preview of a list should look like a list) and
   overflow-wrap stops a long URL bursting the row — both still needed under the clamp. */
.nbk__rest {
  margin: 3px 0 0;
  font: 400 13.5px var(--cd-font-ui);
  line-height: 1.55;
  color: var(--pv2-ink-2);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
}

/* Editing drops the lead/rest split — that split is how the row PREVIEWS the note, and what
   you edit is the note. So the field is the raw body in one plain voice, sharing the body's box
   so the text column does not move when the row opens.
   16, not the lead's 15: iOS Safari zooms the page when a focused field is set below 16px, and
   index.html's maximum-scale=1 is a guard I would rather not be the only thing standing between
   a tapped note and the whole page jumping. One pixel of growth on tap is not visible; the page
   scaling under the keyboard is. */
.nbk__body--editing {
  display: block;
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  resize: none;
  overflow: hidden;
  font: 400 16px var(--cd-font-ui);
  line-height: 1.4;
  color: var(--pv2-ink);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

/* 0 rather than the old 5: the body's own 6px bottom padding now carries this gap. */
.nbk__meta {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 0;
}

/* iOS Caption 1, 12/16. It shares --pv2-ink-2 with the preview above it, so a 13 next to that
   13.5 read as one more line of note rather than as the row's footer; a whole step down is what
   separates them. Still nowhere near the 10px in --pv2-ink-4 this started as — that measured
   2.0:1 and made the one piece of metadata on the row the hardest thing on the page to read.
   --pv2-ink-2 is the AA role, and the date is information, not decoration. */
.nbk__when {
  flex: 1;
  font: 400 12px var(--cd-font-ui);
  line-height: 16px;
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
