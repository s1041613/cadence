<template>
  <!--
    當天的代辦清單：還沒決定時間的雛形，勾掉就好，不必變成任務。
    每天自動有一張（沒有「建立清單」這一步），沒勾的隔天自動延續到今天。
    往右滑露出任務 icon：排進時間，就從這裡移出去變成任務。
    高度固定 70%（見 .dt2），與內容多寡無關。
  -->
  <div class="dt2-scrim" @click="emit('close')">
    <div class="dt2" role="dialog" aria-label="To-do" @click.stop>
      <!-- Swipe-to-dismiss on the handle only: the list owns its own scroll, and the rows own
           a horizontal swipe of their own. Same split as DayUnfinishedSheet. -->
      <div class="dt2__handle-zone" v-touch-swipe.down.mouse="() => emit('close')">
        <div class="dt2__handle" />
      </div>

      <div class="dt2__head">
        <span class="dt2__head-text">
          <span class="dt2__title">TO-DO</span>
          <span class="dt2__date">{{ dateLabel }}</span>
        </span>
        <span v-if="list.length" class="dt2__count">{{ doneCount }}/{{ list.length }}</span>
      </div>

      <div class="dt2__list">
        <template v-for="section in sections" :key="section.key">
          <div v-if="sections.length > 1" class="dt2__group">{{ section.label }}</div>

          <div
            v-for="todo in section.items"
            :key="todo.id"
            class="dt2__swipe"
            :data-open="offsetOf(todo.id) > 0"
          >
            <!-- Sits under the row and is uncovered by the swipe. A circle, so it can never be
                 mistaken for the square checkbox it ends up beside. -->
            <button
              type="button"
              class="dt2__schedule"
              :tabindex="openId === todo.id ? 0 : -1"
              :aria-label="`Schedule ${todo.title} as a task`"
              @click="schedule(todo)"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="4" y="4" width="7" height="7" rx="2" />
                <rect x="13" y="4" width="7" height="7" rx="2" />
                <rect x="4" y="13" width="7" height="7" rx="2" />
                <rect x="13" y="13" width="7" height="7" rx="2" />
              </svg>
            </button>

            <div
              class="dt2__row"
              :data-done="todo.done"
              :data-dragging="drag?.id === todo.id && drag.horizontal"
              :style="{ transform: `translateX(${offsetOf(todo.id)}px)` }"
              @pointerdown="onPointerDown($event, todo.id)"
              @pointermove="onPointerMove"
              @pointerup="onPointerUp"
              @pointercancel="onPointerCancel"
            >
              <!-- Always live, even when ticked: uncheck is the only way back from ticking too
                   early. Same rule as the subtask checklist. -->
              <button
                type="button"
                class="dt2__check"
                :data-on="todo.done"
                :aria-label="`${todo.done ? 'Uncheck' : 'Check'} ${todo.title}`"
                @click="onRowTap(() => store.toggleDone(todo.id))"
              >
                <CdIcon v-if="todo.done" name="check" :size="11" :stroke-width="3.4" color="#fff" />
              </button>

              <input
                v-if="editingId === todo.id"
                ref="editInput"
                class="dt2__edit"
                :value="draftTitle"
                @input="draftTitle = ($event.target as HTMLInputElement).value"
                @compositionstart="ime.onCompositionStart"
                @compositionend="ime.onCompositionEnd"
                @keydown.enter="(e) => ime.onEnterKeydown(e, commitEdit)"
                @keydown.esc.prevent="cancelEdit"
                @blur="commitEdit"
              />
              <!-- Ticked is settled: the struck title stops responding to taps. -->
              <button
                v-else
                type="button"
                class="dt2__name"
                :disabled="todo.done"
                @click="onRowTap(() => startEdit(todo))"
              >
                <span class="dt2__name-text">{{ todo.title }}</span>
                <span v-if="todo.originDate !== todo.date" class="dt2__from">from {{ shortDate(todo.originDate) }}</span>
              </button>

              <button
                type="button"
                class="dt2__del"
                :aria-label="`Delete ${todo.title}`"
                @click="onRowTap(() => store.remove(todo.id))"
              >
                <CdIcon name="close" :size="12" color="var(--pv2-ink-4)" />
              </button>
            </div>
          </div>
        </template>

        <!-- One composer for one line or a pasted page: every non-blank line becomes a todo.
             It is the whole of an empty day, and the next line of a day that has some. -->
        <div class="dt2__add" :data-empty="list.length === 0">
          <span v-if="list.length" class="dt2__plus" :data-armed="pending > 0">+</span>
          <textarea
            ref="composer"
            v-model="draft"
            class="dt2__add-input"
            :rows="list.length ? 1 : 4"
            :placeholder="list.length ? 'Add…' : 'One per line — type or paste a list'"
            autocomplete="off"
            @input="autosize"
          />
        </div>
        <button v-if="pending > 0" type="button" class="dt2__add-btn" @click="submit">
          ADD {{ pending }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import CdIcon from '@/components/ui/CdIcon.vue'
import { useDayTodosStore } from '@/stores/day-todos-store'
import { useImeSafeEnter } from '@/composables/use-ime-safe-enter'
import { parseISO } from '@/utils/convert-date-time'
import { splitTodoLines } from '@/utils/day-todos'
import type { DayTodo } from '@/types/day-todo'

const props = defineProps<{
  /** The day whose list this is. */
  date: string
  isToday: boolean
}>()

const emit = defineEmits<{
  close: []
  /** Swiped and tapped: open the task composer seeded from this todo. */
  schedule: [todo: DayTodo]
}>()

const store = useDayTodosStore()
const ime = useImeSafeEnter()

const list = computed(() => store.todosFor(props.date))
const doneCount = computed(() => list.value.filter((t) => t.done).length)

const dateLabel = computed(() =>
  new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(parseISO(props.date)).toUpperCase()
)

function shortDate(iso: string): string {
  const d = parseISO(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

/** Carried todos first, under their own heading, so what has been waiting reads as such. With
 *  nothing carried there is one section and no heading at all. */
const sections = computed(() => {
  const carried = list.value.filter((t) => t.originDate < t.date)
  const fresh = list.value.filter((t) => t.originDate >= t.date)
  if (carried.length === 0) return [{ key: 'day', label: '', items: fresh }]
  return [
    { key: 'carried', label: 'CARRIED OVER', items: carried },
    { key: 'day', label: props.isToday ? 'TODAY' : dateLabel.value, items: fresh }
  ].filter((s) => s.items.length > 0)
})

// --- composer --------------------------------------------------------------

const draft = ref('')
const composer = useTemplateRef<HTMLTextAreaElement>('composer')
const pending = computed(() => splitTodoLines(draft.value).length)

function autosize(): void {
  const el = composer.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

function submit(): void {
  if (store.addLines(props.date, draft.value) === 0) return
  draft.value = ''
  void nextTick(autosize)
}

// A different day is a different list; a half-typed line belongs to the one it was typed on.
watch(
  () => props.date,
  () => {
    draft.value = ''
    openId.value = null
    editingId.value = null
    void nextTick(autosize)
  }
)

// --- editing a title ---------------------------------------------------------

const editingId = ref<string | null>(null)
const draftTitle = ref('')
const editInput = useTemplateRef<HTMLInputElement[]>('editInput')

function startEdit(todo: DayTodo): void {
  editingId.value = todo.id
  draftTitle.value = todo.title
  void nextTick(() => {
    const input = editInput.value?.[0]
    input?.focus()
    input?.select()
  })
}

// Enter and blur both commit; Escape restores. The store refuses a blank title, keeping the old.
function commitEdit(): void {
  const id = editingId.value
  if (id === null) return
  editingId.value = null
  store.rename(id, draftTitle.value)
}

function cancelEdit(): void {
  editingId.value = null
}

// --- swipe right to schedule -------------------------------------------------
// Pointer events rather than v-touch-swipe: the row has to follow the finger and settle open
// or shut, not just report a direction once the gesture is over.

/** How far the row slides to uncover the schedule button. */
const OPEN_X = 64
/** Past this on release the row stays open; short of it, it springs back. */
const SNAP_X = 32
/** Movement before a gesture is read as a swipe or a scroll rather than a tap. */
const SLOP = 8

const openId = ref<string | null>(null)
const drag = ref<{ id: string; x0: number; y0: number; dx: number; horizontal: boolean; decided: boolean } | null>(
  null
)
/** Set by a gesture that moved, so the tap that ends it does not also tick or edit. */
let suppressTap = false

function offsetOf(id: string): number {
  const d = drag.value
  if (d?.id === id && d.horizontal) return d.dx
  return openId.value === id ? OPEN_X : 0
}

function onPointerDown(e: PointerEvent, id: string): void {
  if (editingId.value === id) return
  suppressTap = false
  drag.value = { id, x0: e.clientX, y0: e.clientY, dx: openId.value === id ? OPEN_X : 0, horizontal: false, decided: false }
}

function onPointerMove(e: PointerEvent): void {
  const d = drag.value
  if (!d) return
  const mx = e.clientX - d.x0
  const my = e.clientY - d.y0
  if (!d.decided) {
    if (Math.abs(mx) < SLOP && Math.abs(my) < SLOP) return
    d.decided = true
    d.horizontal = Math.abs(mx) > Math.abs(my)
    if (!d.horizontal) {
      // A vertical gesture is the list scrolling; let it, and drop any row left open.
      drag.value = null
      openId.value = null
      return
    }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const base = openId.value === d.id ? OPEN_X : 0
  d.dx = Math.min(OPEN_X, Math.max(0, base + mx))
  suppressTap = true
}

function onPointerUp(): void {
  const d = drag.value
  drag.value = null
  if (!d?.horizontal) {
    // A plain tap on another row closes whichever one was open.
    if (openId.value !== null && openId.value !== d?.id) {
      openId.value = null
      suppressTap = true
    }
    return
  }
  openId.value = d.dx > SNAP_X ? d.id : null
}

function onPointerCancel(): void {
  drag.value = null
}

function onRowTap(action: () => void): void {
  if (suppressTap) {
    suppressTap = false
    return
  }
  // A tap on an open row's contents shuts it first; the next tap acts.
  if (openId.value !== null) {
    openId.value = null
    return
  }
  action()
}

function schedule(todo: DayTodo): void {
  openId.value = null
  emit('schedule', todo)
}

// A todo that leaves the list (deleted, or scheduled elsewhere) cannot stay the open one.
watch(list, (rows) => {
  if (openId.value !== null && !rows.some((t) => t.id === openId.value)) openId.value = null
})
</script>

<style scoped>
.dt2-scrim {
  position: absolute;
  inset: 0;
  z-index: 30;
  display: flex;
  align-items: flex-end;
}

/* Pseudo-element backdrop so the pv2-sheet transition (app.css) can fade it without fading the
   panel — same construction as DayUnfinishedSheet and Pv2DaySheet. */
.dt2-scrim::before {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(var(--pv2-ink-rgb), 0.32);
  pointer-events: none;
}

/* Fixed at 70% of the frame whatever the list holds — taller than the 50% the other day sheets
   use, on purpose: this one is for reading the whole day's list at once, and at 50% a phone
   shows five or six rows before it scrolls. A percentage, not vh: the frame is a fixed device
   shell on desktop, inside a much taller window. */
.dt2 {
  position: relative;
  width: 100%;
  height: 70%;
  display: flex;
  flex-direction: column;
  background: var(--pv2-canvas);
  border-radius: 24px 24px 0 0;
  box-shadow: 0 -12px 34px rgba(0, 0, 0, 0.22);
  overflow: hidden;
}

.dt2__handle-zone {
  flex: none;
  padding: 10px 0 8px;
  touch-action: none;
  cursor: grab;
}

.dt2__handle {
  width: 40px;
  height: 5px;
  border-radius: 3px;
  background: var(--pv2-line);
  margin: 0 auto;
}

.dt2__head {
  flex: none;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin: 0 18px;
  padding-bottom: 12px;
  /* The event card's heavy rule under its title — the same weight, so this reads as a card. */
  border-bottom: 1.5px solid var(--pv2-ink);
}

.dt2__head-text {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}

/* The same mono caps the event card uses for EVENT / REMINDER / SUBTASKS. */
.dt2__title {
  font: 800 13px var(--cd-font-mono);
  letter-spacing: 0.08em;
  color: var(--pv2-ink);
}

.dt2__date {
  font: 600 11px var(--cd-font-mono);
  letter-spacing: 0.08em;
  color: var(--pv2-ink-3);
}

.dt2__count {
  font: 800 13px var(--cd-font-mono);
  color: var(--pv2-ink-2);
}

.dt2__list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0 18px 28px;
  scrollbar-width: none;
}

.dt2__list::-webkit-scrollbar {
  display: none;
}

.dt2__group {
  padding: 16px 0 6px;
  font: 600 11px var(--cd-font-mono);
  letter-spacing: 0.1em;
  color: var(--pv2-ink-3);
}

/* The row slides over the schedule button; this clips both to the row's own box. */
.dt2__swipe {
  position: relative;
  overflow: hidden;
  border-bottom: 1px solid var(--pv2-line-soft);
}

/* Light rose rather than ink: the same tint DayUnfinishedSheet gives its "move" button, the
   app's mark for the main thing you can do to a row. A circle so it never reads as a second
   checkbox beside the square one. */
.dt2__schedule {
  position: absolute;
  top: 50%;
  left: 10px;
  width: 40px;
  height: 40px;
  transform: translateY(-50%);
  display: grid;
  place-items: center;
  border: none;
  border-radius: 50%;
  background: rgba(var(--pv2-accent-rgb), 0.12);
  color: var(--pv2-accent-ink);
  cursor: pointer;
}

.dt2__schedule svg {
  width: 19px;
  height: 19px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.9;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* 22px checkbox gutter and 48px rows, the subtask checklist's metrics. pan-y hands vertical
   movement to the list's scroll and keeps horizontal movement for the swipe. */
.dt2__row {
  position: relative;
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  min-height: 48px;
  background: var(--pv2-canvas);
  touch-action: pan-y;
  transition: transform 0.22s ease;
}

.dt2__row[data-dragging='true'] {
  transition: none;
}

.dt2__check {
  width: 20px;
  height: 20px;
  border: 1.5px solid var(--pv2-ink-4);
  border-radius: 5px;
  background: transparent;
  cursor: pointer;
  padding: 0;
  display: grid;
  place-items: center;
}

.dt2__check[data-on='true'] {
  background: var(--pv2-ink);
  border-color: var(--pv2-ink);
}

.dt2__name {
  min-width: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 8px;
  border: 0;
  background: transparent;
  padding: 12px 0;
  text-align: left;
  cursor: text;
}

.dt2__name-text {
  min-width: 0;
  overflow-wrap: anywhere;
  font: 600 15px/1.35 var(--cd-font-ui);
  color: var(--pv2-ink);
}

.dt2__row[data-done='true'] .dt2__name {
  cursor: default;
}

.dt2__row[data-done='true'] .dt2__name-text {
  color: var(--pv2-ink-4);
  text-decoration: line-through;
  font-weight: 500;
}

.dt2__from {
  flex: none;
  padding: 2px 6px;
  border-radius: 6px;
  background: rgba(var(--pv2-accent-rgb), 0.12);
  color: var(--pv2-accent-ink);
  font: 600 10.5px var(--cd-font-mono);
  letter-spacing: 0.02em;
}

/* Same metrics as the title it replaces, so nothing shifts entering or leaving edit. */
.dt2__edit {
  min-width: 0;
  margin: 12px 0;
  border: 0;
  border-bottom: 1.5px solid var(--pv2-ink);
  background: transparent;
  padding: 0;
  font: 600 15px/1.35 var(--cd-font-ui);
  color: var(--pv2-ink);
  outline: none;
}

/* Always shown, unlike the subtask list's hover-only ×: a phone has no hover, and deleting is
   one of the three things you do to a todo. Faint so a resting list stays quiet. */
.dt2__del {
  position: relative;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  display: grid;
  place-items: center;
  cursor: pointer;
}

.dt2__del::after {
  content: '';
  position: absolute;
  inset: 50% auto auto 50%;
  width: 44px;
  height: 44px;
  transform: translate(-50%, -50%);
}

.dt2__add {
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr);
  align-items: start;
  gap: 12px;
  padding: 13px 0;
  border-bottom: 1px solid var(--pv2-line-soft);
}

/* An empty day: the composer is the whole list, framed so it reads as the place to write. */
.dt2__add[data-empty='true'] {
  grid-template-columns: minmax(0, 1fr);
  margin-top: 14px;
  padding: 12px 14px;
  border: 1.5px solid var(--pv2-ink);
  border-radius: 14px;
}

/* Dashed until there is something to add, so it reads as "not yet a row". */
.dt2__plus {
  width: 20px;
  height: 20px;
  margin-top: 1px;
  border: 1.5px dashed var(--pv2-ink-4);
  border-radius: 5px;
  color: var(--pv2-ink-4);
  display: grid;
  place-items: center;
  font: 700 13px/1 var(--cd-font-ui);
}

.dt2__plus[data-armed='true'] {
  border-style: solid;
  border-color: var(--pv2-ink);
  color: var(--pv2-ink);
}

.dt2__add-input {
  min-width: 0;
  width: 100%;
  resize: none;
  overflow: hidden;
  border: 0;
  background: transparent;
  padding: 0;
  outline: none;
  font: 600 15px/1.5 var(--cd-font-ui);
  color: var(--pv2-ink);
}

.dt2__add-input::placeholder {
  color: var(--pv2-ink-4);
  font-weight: 500;
  font-style: italic;
}

.dt2__add-btn {
  display: block;
  width: 100%;
  height: 44px;
  margin-top: 12px;
  border: none;
  border-radius: 999px;
  background: var(--pv2-ink);
  color: var(--pv2-canvas);
  font: 700 12px var(--cd-font-mono);
  letter-spacing: 0.1em;
  cursor: pointer;
}

@media (prefers-reduced-motion: reduce) {
  .dt2__row {
    transition: none;
  }
}
</style>
