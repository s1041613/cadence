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

    <!--
      The two per-note settings. Both are single-tap cycles rather than dropdowns: there are only
      four quadrants and the durations are a short preset list, so a menu would cost two taps to
      do what one does, and the current value stays legible the whole time.
    -->
    <div class="nbk__controls">
      <button
        class="nbk__quad"
        type="button"
        :style="{ background: quadTint, color: quad.backgroundColor }"
        :aria-label="`Quadrant: ${quad.enName}. Tap to change.`"
        @click="cycleQuadrant"
      >
        <span class="nbk__quad-dot" :style="{ background: quad.backgroundColor }" />
        <!-- aria-hidden for the same reason as the duration: the button's label carries it. -->
        <span class="nbk__quad-label" aria-hidden="true">{{ quad.enName }}</span>
      </button>

      <div class="nbk__len" role="group" aria-label="Planned length">
        <button
          class="nbk__len-step"
          type="button"
          aria-label="15 minutes shorter"
          :disabled="note.durationMin <= MIN_DURATION"
          @click="step(-1)"
        >
          −
        </button>

        <!-- The label states the current value, not just the action: a screen reader user
             tapping through presets needs to hear where they landed, and the visible text is
             the only other place that value appears. -->
        <button
          class="nbk__len-value"
          type="button"
          :aria-label="`Length: ${durationLabel}. Tap for the next preset.`"
          @click="cyclePreset"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#6e6e6e"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          <!-- aria-hidden: the button's own label already states this value, and without it
               the text is announced twice. -->
          <span aria-hidden="true">{{ durationLabel }}</span>
        </button>

        <button
          class="nbk__len-step"
          type="button"
          aria-label="15 minutes longer"
          :disabled="note.durationMin >= MAX_DURATION"
          @click="step(1)"
        >
          +
        </button>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef } from 'vue'
import type { Note } from '@/types/note'
import type { NoteSettings } from '@/services/notes-service'
import { relativeDayLabel } from '@/utils/relative-day'
import { quadrantOf, nextQuadrantAxes } from '@/composables/use-theme'
import {
  formatDuration,
  nextPreset,
  stepDuration,
  MIN_DURATION,
  MAX_DURATION
} from '@/utils/note-duration'

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
  settings: [settings: NoteSettings]
}>()

const quad = computed(() => quadrantOf(props.note))

// The pill's fill is the quadrant colour at low alpha, so the four read as one family against
// the white card while staying distinguishable. Derived from the same hex the dot and label use
// rather than a second stored value — there is exactly one source for a quadrant's colour.
const quadTint = computed(() => hexToRgba(quad.value.backgroundColor, 0.12))

const durationLabel = computed(() => formatDuration(props.note.durationMin))

function hexToRgba(hex: string, alpha: number): string {
  const value = Number.parseInt(hex.slice(1), 16)
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`
}

/** Every control emits the full settings triple — see notebook-store.setNoteSettings for why
 *  the resolved state travels rather than a patch. */
function emitSettings(patch: Partial<NoteSettings>): void {
  emit('settings', {
    important: props.note.important,
    urgent: props.note.urgent,
    durationMin: props.note.durationMin,
    ...patch
  })
}

function cycleQuadrant(): void {
  emitSettings(nextQuadrantAxes(props.note))
}

function step(direction: 1 | -1): void {
  emitSettings({ durationMin: stepDuration(props.note.durationMin, direction) })
}

function cyclePreset(): void {
  emitSettings({ durationMin: nextPreset(props.note.durationMin) })
}

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

.nbk__controls {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  /* The two pills are the card's widest fixed content; on a narrow frame they wrap rather than
     squeeze the labels, which would otherwise truncate the quadrant name. */
  flex-wrap: wrap;
}

/* Both pills are 44px tall — the iOS minimum touch target. The design draws them at that
   height already, so meeting the guideline costs nothing here. */
.nbk__quad,
.nbk__len {
  flex: none;
  height: 44px;
  border-radius: 999px;
}

.nbk__quad {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 14px 0 12px;
  border: none;
  cursor: pointer;
}

.nbk__quad-dot {
  flex: none;
  width: 9px;
  height: 9px;
  border-radius: 3px;
}

.nbk__quad-label {
  /* Fixed floor so the pill does not resize as the label cycles between quadrant names —
     a control that moves under your finger between taps is hard to tap twice. Sized for
     "Do Now", the longest of the four at 11px mono. */
  min-width: 52px;
  text-align: center;
  font: 600 11px var(--cd-font-mono);
  letter-spacing: 0.02em;
  color: inherit;
  white-space: nowrap;
}

.nbk__len {
  display: inline-flex;
  align-items: center;
  background: #f1f1ef;
}

.nbk__len-step {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: none;
  border-radius: inherit;
  background: none;
  font: 400 16px var(--cd-font-mono);
  line-height: 1;
  color: #1b1b1b;
  cursor: pointer;
}

/* Greyed at the range's ends rather than hidden: the control keeps its width, so the value
   between the two glyphs never shifts sideways when a limit is reached. */
.nbk__len-step:disabled {
  color: #c4c4c4;
  cursor: default;
}

.nbk__len-value {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  /* Wide enough for "1h 30m", so cycling presets never resizes the pill. */
  min-width: 72px;
  height: 44px;
  padding: 0;
  border: none;
  background: none;
  font: 600 11px var(--cd-font-mono);
  color: #1b1b1b;
  white-space: nowrap;
  cursor: pointer;
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
