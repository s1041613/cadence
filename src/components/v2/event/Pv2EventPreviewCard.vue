<template>
  <div class="pv2-preview-card">
    <div class="pv2-preview-card__top">
      <div class="pv2-preview-card__eyebrow">
        <span class="pv2-preview-card__dot" :style="{ background: color }" />
        <span>{{ eyebrow }}</span>
      </div>
      <div v-if="mine" class="pv2-preview-card__actions">
        <CdIconButton :size="30" ariaLabel="Copy" @click="emit('copy')">
          <CdIcon name="copy" :size="15" color="#1b1b1b" />
        </CdIconButton>
        <CdIconButton :size="30" ariaLabel="Edit" @click="emit('edit')">
          <CdIcon name="pencil" :size="15" color="#1b1b1b" />
        </CdIconButton>
        <CdIconButton :size="30" danger ariaLabel="Delete" @click="emit('delete')">
          <CdIcon name="trash" :size="15" color="#9f3e36" />
        </CdIconButton>
      </div>
    </div>

    <div class="pv2-preview-card__title-block">
      <h2 class="pv2-preview-card__title">{{ title }}</h2>
      <p class="pv2-preview-card__when">{{ whenLabel }}</p>
    </div>

    <div class="pv2-preview-card__rows">
      <div class="pv2-preview-card__row">
        <span class="pv2-preview-card__row-label">REMINDER</span>
        <span class="pv2-preview-card__row-value">{{ reminderLabel }}</span>
        <span class="pv2-preview-card__chevron">›</span>
      </div>
      <div v-if="isTask" class="pv2-preview-card__row">
        <span class="pv2-preview-card__row-label">POMODOROS</span>
        <span class="pv2-preview-card__row-value">{{ estimatedPomodoros }} session{{ estimatedPomodoros === 1 ? '' : 's' }}</span>
        <span class="pv2-preview-card__meta">{{ completedPomodoros }}/{{ estimatedPomodoros }}</span>
      </div>

      <!-- Sits between POMODOROS and NOTES: the rows run from most settled to least, and a
           growing checklist belongs between a single-value setting and free text. Above NOTES
           specifically because NOTES is the one row of unbounded height — below it, adding a
           subtask would push the focus button down and make its position unstable. -->
      <button
        type="button"
        class="pv2-subtasks__head"
        :aria-expanded="expanded"
        aria-controls="pv2-subtasks-body"
        @click="expanded = !expanded"
      >
        <span class="pv2-subtasks__label">
          <span class="pv2-subtasks__caret">▶</span>SUBTASKS
        </span>
        <span class="pv2-subtasks__count">{{ countLabel }}</span>
      </button>

      <div v-show="expanded" id="pv2-subtasks-body">
        <ul v-if="subtasks.length" class="pv2-subtasks__list">
          <li
            v-for="subtask in subtasks"
            :key="subtask.id"
            class="pv2-subtasks__row"
            :data-done="subtask.done"
          >
            <!-- Always live, even on a checked row: uncheck → correct → re-check is the only
                 path back from settling an item too early, so it must never be a dead end. -->
            <button
              type="button"
              class="pv2-subtasks__check"
              :data-on="subtask.done"
              :disabled="!mine"
              :aria-label="`${subtask.done ? 'Uncheck' : 'Check'} ${subtask.title}`"
              @click="emit('toggleSubtask', subtask.id)"
            >
              <CdIcon v-if="subtask.done" name="check" :size="11" :stroke-width="3.4" color="#fff" />
            </button>

            <input
              v-if="editingId === subtask.id"
              ref="editInput"
              class="pv2-subtasks__edit"
              :value="draftTitle"
              @input="draftTitle = ($event.target as HTMLInputElement).value"
              @keydown.enter.prevent="commitEdit"
              @keydown.esc.prevent="cancelEdit"
              @blur="commitEdit"
            />
            <!-- Checked is settled: the title stops responding to clicks, which is what makes
                 the strike-through honest rather than decorative. -->
            <button
              v-else
              type="button"
              class="pv2-subtasks__name"
              :disabled="subtask.done || !mine"
              @click="startEdit(subtask.id, subtask.title)"
            >
              {{ subtask.title }}
            </button>

            <button
              v-if="mine"
              type="button"
              class="pv2-subtasks__del"
              :aria-label="`Delete ${subtask.title}`"
              @click="emit('deleteSubtask', subtask.id)"
            >
              <CdIcon name="close" :size="12" color="#b2b2b2" />
            </button>
          </li>
        </ul>

        <!-- A row rather than a button, so "add" reads as the next line of the list instead of
             something to open first. Stays focused after submit: typing three in a row is the
             common path. -->
        <div v-if="mine" class="pv2-subtasks__add">
          <span class="pv2-subtasks__plus" :data-armed="composerDraft.trim().length > 0">+</span>
          <input
            v-model="composerDraft"
            class="pv2-subtasks__add-input"
            placeholder="Add subtask…"
            autocomplete="off"
            @keydown.enter.prevent="submitComposer"
          />
          <span class="pv2-subtasks__ent" :data-show="composerDraft.trim().length > 0">ENTER</span>
        </div>
      </div>

      <div class="pv2-preview-card__row pv2-preview-card__row--notes">
        <span class="pv2-preview-card__row-label">NOTES</span>
        <span class="pv2-preview-card__row-value" :class="{ 'pv2-preview-card__row-value--placeholder': !notes }">
          {{ notes || 'No notes' }}
        </span>
        <span class="pv2-preview-card__chevron">›</span>
      </div>
    </div>

    <!-- All-day tasks have no bounded slot for a pomodoro to measure against, so no focus entry. -->
    <button v-if="isTask && mine && !allDay" type="button" class="pv2-preview-card__focus" @click="emit('startFocus')">
      <CdIcon name="tomato" :size="18" color="#fff" />
      <span>Start focus session</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import CdIcon from '@/components/ui/CdIcon.vue'
import CdIconButton from '@/components/ui/CdIconButton.vue'
import type { Subtask } from '@/types/subtask'

const props = withDefaults(
  defineProps<{
    title: string
    color: string
    eyebrow: string
    whenLabel: string
    isTask: boolean
    allDay?: boolean
    reminderLabel: string
    notes: string
    completedPomodoros?: number
    estimatedPomodoros?: number
    mine?: boolean
    subtasks?: Subtask[]
  }>(),
  { mine: true, allDay: false, completedPomodoros: 0, estimatedPomodoros: 1, subtasks: () => [] }
)

const emit = defineEmits<{
  copy: []
  edit: []
  delete: []
  startFocus: []
  addSubtask: [title: string]
  toggleSubtask: [id: string]
  renameSubtask: [id: string, title: string]
  deleteSubtask: [id: string]
}>()

// Expanded when there is something to show, collapsed when the only thing inside would be the
// composer. Deliberately not persisted: it resets each time the card opens.
const expanded = ref(props.subtasks.length > 0)

// Re-seeds only when the card switches to a different event, keyed on the parent the rows
// belong to. Deliberately NOT recomputed on every subtask change: deleting the last row would
// otherwise collapse the section under the user, and changing the layout when they did not ask
// loses their place.
watch(
  () => props.subtasks[0]?.parentId ?? null,
  () => {
    expanded.value = props.subtasks.length > 0
  }
)

// The only information the row carries once collapsed, so it stays visible in both states —
// and always as a ratio, so the format does not change under the user as rows come and go.
const countLabel = computed(
  () => `${props.subtasks.filter((s) => s.done).length}/${props.subtasks.length}`
)

const composerDraft = ref('')

function submitComposer(): void {
  const title = composerDraft.value.trim()
  if (title === '') return
  emit('addSubtask', title)
  composerDraft.value = ''
  // Adding the first subtask has to reveal it: the section may have opened collapsed.
  expanded.value = true
}

const editingId = ref<string | null>(null)
const draftTitle = ref('')
const editInput = useTemplateRef<HTMLInputElement[]>('editInput')

function startEdit(id: string, title: string): void {
  editingId.value = id
  draftTitle.value = title
  void nextTick(() => {
    const input = editInput.value?.[0]
    input?.focus()
    input?.select()
  })
}

// Enter and blur both commit; Escape restores. An empty title is refused rather than saved,
// so the row keeps the name it had — the store enforces this too, but bailing here keeps a
// pointless write off the queue.
function commitEdit(): void {
  const id = editingId.value
  if (id === null) return
  const next = draftTitle.value.trim()
  editingId.value = null
  if (next === '') return
  emit('renameSubtask', id, next)
}

function cancelEdit(): void {
  editingId.value = null
}
</script>

<style scoped>
.pv2-preview-card {
  width: 370px;
  background: #fafaf9;
  border: 1px solid #e2e2e2;
  border-radius: 8px;
  padding: 18px;
  color: #1b1b1b;
}

@media (max-width: 899px) {
  .pv2-preview-card {
    width: 100%;
    border: none;
    border-radius: 0;
    padding: 18px 18px 32px;
  }
}

.pv2-preview-card__top,
.pv2-preview-card__eyebrow,
.pv2-preview-card__actions,
.pv2-preview-card__focus {
  display: flex;
  align-items: center;
}

.pv2-preview-card__top {
  justify-content: space-between;
  gap: 12px;
}

.pv2-preview-card__eyebrow {
  min-width: 0;
  gap: 8px;
  font: 800 11px var(--cd-font-mono);
  text-transform: uppercase;
  color: #3a3a3a;
}

.pv2-preview-card__dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex: none;
}

.pv2-preview-card__actions {
  gap: 2px;
  flex: none;
}

.pv2-preview-card__title-block {
  padding: 19px 0 17px;
  border-bottom: 1.5px solid #1b1b1b;
}

.pv2-preview-card__title {
  margin: 0;
  overflow-wrap: anywhere;
  font: 500 30px/1.04 var(--cd-font-serif);
  color: #1b1b1b;
}

.pv2-preview-card__when {
  margin: 8px 0 0;
  font: 700 12px var(--cd-font-mono);
  color: #6e6e6e;
}

.pv2-preview-card__rows {
  display: grid;
  gap: 0;
}

.pv2-preview-card__row {
  display: grid;
  grid-template-columns: 100px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  border-bottom: 1px solid #e2e2e2;
}

.pv2-preview-card__row--notes {
  align-items: start;
  padding: 13px 0;
}

.pv2-preview-card__row-label {
  font: 800 10px var(--cd-font-mono);
  color: #6e6e6e;
}

.pv2-preview-card__row-value {
  min-width: 0;
  overflow-wrap: anywhere;
  font: 600 14px/1.35 var(--cd-font-ui);
  color: #1b1b1b;
}

.pv2-preview-card__row-value--placeholder {
  color: #b2b2b2;
  font-style: italic;
  font-weight: 500;
}

.pv2-preview-card__chevron,
.pv2-preview-card__meta {
  font: 800 13px var(--cd-font-mono);
  color: #6e6e6e;
}

/* The subtask block sits inside the same rows stack, so it inherits the 1px rules and the
   100px label gutter rather than introducing a second visual system. */
.pv2-subtasks__head {
  display: grid;
  grid-template-columns: 100px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 48px;
  padding: 0;
  border: 0;
  border-bottom: 1px solid #e2e2e2;
  background: transparent;
  cursor: pointer;
  text-align: left;
  font: inherit;
}

/* The whole 100px label is the target rather than a small caret: bigger to hit, and the
   hover feedback covers the row so it needs no aiming. */
.pv2-subtasks__label {
  display: flex;
  align-items: center;
  gap: 6px;
  font: 800 10px var(--cd-font-mono);
  color: #6e6e6e;
  transition: color 0.12s;
}

.pv2-subtasks__head:hover .pv2-subtasks__label {
  color: #1b1b1b;
}

/* Rotates rather than swapping glyphs, so the control reads as one object in two states. */
.pv2-subtasks__caret {
  display: inline-block;
  font-size: 9px;
  line-height: 1;
  color: #9c9c9c;
  transform: rotate(90deg);
  transition: transform 0.18s ease;
}

.pv2-subtasks__head[aria-expanded='false'] .pv2-subtasks__caret {
  transform: rotate(0deg);
}

.pv2-subtasks__count {
  grid-column: 3;
  font: 800 13px var(--cd-font-mono);
  color: #6e6e6e;
}

/* Caps the card's height so the popover's positioning stays predictable and the focus
   button below never moves as the list grows. */
.pv2-subtasks__list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 196px;
  overflow-y: auto;
}

/* 22px checkbox instead of the 100px label gutter, and 44px instead of 48px: a list wants to
   be tighter than the settings rows above it. */
.pv2-subtasks__row {
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  min-height: 44px;
  border-bottom: 1px solid #e2e2e2;
}

.pv2-subtasks__check {
  width: 20px;
  height: 20px;
  flex: none;
  border: 1.5px solid #b2b2b2;
  border-radius: 5px;
  background: transparent;
  cursor: pointer;
  padding: 0;
  display: grid;
  place-items: center;
}

.pv2-subtasks__check:hover {
  border-color: #1b1b1b;
}

.pv2-subtasks__check[data-on='true'] {
  background: #1b1b1b;
  border-color: #1b1b1b;
}

.pv2-subtasks__check:disabled {
  cursor: default;
}

.pv2-subtasks__name {
  min-width: 0;
  overflow-wrap: anywhere;
  border: 0;
  background: transparent;
  padding: 0;
  text-align: left;
  font: 600 14px/1.35 var(--cd-font-ui);
  color: #1b1b1b;
  cursor: text;
}

/* Struck text is not editable text: checked greys the title and stops it responding. */
.pv2-subtasks__row[data-done='true'] .pv2-subtasks__name {
  color: #b2b2b2;
  text-decoration: line-through;
  font-weight: 500;
  cursor: default;
}

/* Same metrics as the button it replaces, so nothing shifts on entering or leaving edit. */
.pv2-subtasks__edit {
  min-width: 0;
  border: 0;
  border-bottom: 1.5px solid #1b1b1b;
  background: transparent;
  padding: 0;
  font: 600 14px/1.35 var(--cd-font-ui);
  color: #1b1b1b;
  outline: none;
}

/* Hidden until hover or keyboard focus, so a resting list stays clean. Touch has no hover:
   a swipe or long-press equivalent is deliberately unresolved and out of scope. */
.pv2-subtasks__del {
  border: 0;
  background: transparent;
  cursor: pointer;
  width: 26px;
  height: 26px;
  border-radius: 5px;
  display: grid;
  place-items: center;
  opacity: 0;
  transition: opacity 0.12s;
}

.pv2-subtasks__row:hover .pv2-subtasks__del,
.pv2-subtasks__del:focus-visible {
  opacity: 1;
}

.pv2-subtasks__del:hover {
  background: #f0e7e6;
}

.pv2-subtasks__add {
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  min-height: 44px;
  border-bottom: 1px solid #e2e2e2;
}

/* Dashed until there is something to submit, so it reads as "not yet a row". */
.pv2-subtasks__plus {
  width: 20px;
  height: 20px;
  border: 1.5px dashed #b2b2b2;
  border-radius: 5px;
  color: #b2b2b2;
  display: grid;
  place-items: center;
  font: 700 13px/1 var(--cd-font-ui);
}

.pv2-subtasks__plus[data-armed='true'] {
  border-style: solid;
  border-color: #1b1b1b;
  color: #1b1b1b;
}

.pv2-subtasks__add-input {
  min-width: 0;
  border: 0;
  background: transparent;
  padding: 0;
  outline: none;
  font: 600 14px var(--cd-font-ui);
  color: #1b1b1b;
}

.pv2-subtasks__add-input::placeholder {
  color: #b2b2b2;
  font-weight: 500;
  font-style: italic;
}

.pv2-subtasks__ent {
  font: 800 10px var(--cd-font-mono);
  color: #6e6e6e;
  border: 1px solid #e2e2e2;
  border-radius: 4px;
  padding: 3px 6px;
  opacity: 0;
  transition: opacity 0.12s;
}

.pv2-subtasks__ent[data-show='true'] {
  opacity: 1;
}

.pv2-preview-card__focus {
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 44px;
  margin-top: 18px;
  border: none;
  border-radius: 6px;
  background: #1b1b1b;
  color: #fff;
  cursor: pointer;
  font: 800 13px var(--cd-font-ui);
}

.pv2-preview-card__focus:active {
  transform: translateY(1px);
}
</style>
