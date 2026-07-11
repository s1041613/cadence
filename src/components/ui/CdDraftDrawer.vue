<template>
  <div class="cd-draft">
    <div class="cd-draft__holes">
      <div v-for="i in 7" :key="i" class="cd-draft__hole" />
    </div>

    <div
      class="cd-draft__header"
      :class="{ 'cd-draft__header--sheet': swipeEnabled }"
      v-touch-swipe.down.mouse="onHeaderSwipeDown"
    >
      <span class="cd-draft__title">Draft</span>
      <button type="button" class="cd-draft__icon-btn" aria-label="Search" @click="searchOpen = !searchOpen">
        <CdIcon name="search" :size="17" color="#8A8A80" />
      </button>
      <!-- Zoe's 2026-07-11 correction: mobile-first — no close button on phone sheets, header
           swipe-down dismisses instead. swipeEnabled is already phone-only (shell passes !isDesktop),
           so it doubles as the sheet-mode flag here rather than adding a redundant prop. -->
      <button v-if="!swipeEnabled" type="button" class="cd-draft__icon-btn" aria-label="Close" @click="emit('close')">
        <CdIcon name="close" :size="17" color="#8A8A80" />
      </button>
    </div>

    <div v-if="searchOpen" class="cd-draft__search">
      <input
        class="cd-draft__search-input"
        :value="searchQuery"
        placeholder="Search drafts…"
        @input="emit('update:searchQuery', ($event.target as HTMLInputElement).value)"
      />
    </div>

    <div class="cd-draft__composer" :class="{ 'cd-draft__composer--bottom': swipeEnabled }">
      <button type="button" class="cd-draft__composer-plus" :class="{ 'cd-draft__composer-plus--active': composerText.trim().length > 0 }" @click="emit('submitComposer')">+</button>
      <input
        class="cd-draft__composer-input"
        :value="composerText"
        placeholder="Just jot a quick idea…"
        @input="emit('update:composerText', ($event.target as HTMLInputElement).value)"
        @keydown.enter.prevent="emit('submitComposer')"
      />
    </div>

    <div class="cd-draft__list" :class="{ 'cd-draft__list--composer-bottom': swipeEnabled }">
      <template v-if="filteredGroups.length">
        <div v-for="group in filteredGroups" :key="group.label" class="cd-draft__group">
          <div class="cd-draft__group-label">{{ group.label }}</div>

          <template v-if="swipeEnabled">
            <div v-for="item in group.items" :key="item.id" class="cd-draft__swipe-wrap">
              <div
                class="cd-draft__row cd-draft__row--swipe"
                @pointerdown="onSwipeStart(item.id, $event)"
                @pointermove="onSwipeMove(item.id, $event)"
                @pointerup="onSwipeEnd(item.id)"
                @pointercancel="onSwipeEnd(item.id)"
              >
                <CdCheckCircle :model-value="item.done" @update:model-value="emit('toggleDone', item.id)" />
                <span class="cd-draft__row-text" :class="{ 'cd-draft__row-text--done': item.done }" v-html="highlight(item.text)" />
                <div v-if="item.scheduled" class="cd-draft__sched-tag" :style="{ background: `${item.scheduled.color}1E` }">
                  <span class="cd-draft__sched-dot" :style="{ background: item.scheduled.color, borderRadius: item.scheduled.type === 'event' ? '50%' : '2px' }" />
                  <span class="cd-draft__sched-label" :style="{ color: item.scheduled.color }">{{ item.scheduled.tag }}</span>
                </div>
                <button v-else-if="item.aiSuggestion" type="button" class="cd-draft__ai-chip" :style="{ borderColor: `${item.aiSuggestion.color}66`, background: `${item.aiSuggestion.color}16` }" @click="emit('acceptAiSuggestion', item.id)">
                  <span class="cd-draft__ai-chip-label" :style="{ color: item.aiSuggestion.color }">{{ item.aiSuggestion.tag }}</span>
                </button>
              </div>
              <div
                class="cd-draft__swipe-actions"
                :style="{ width: `${Math.abs(swipeOffset(item.id))}px`, transition: draggingId === item.id ? 'none' : undefined }"
              >
                <button type="button" class="cd-draft__swipe-btn cd-draft__swipe-btn--schedule" aria-label="Schedule" @click="emit('openSchedule', item.id)">
                  <CdIcon name="calendar" :size="18" color="#fff" />
                </button>
                <button type="button" class="cd-draft__swipe-btn cd-draft__swipe-btn--remove" aria-label="Remove" @click="emit('removeItem', item.id)">
                  <CdIcon name="x-small" :size="16" color="#fff" />
                </button>
              </div>
            </div>
          </template>

          <template v-else>
            <div
              v-for="item in group.items"
              :key="item.id"
              class="cd-draft__row"
            >
              <CdCheckCircle :model-value="item.done" @update:model-value="emit('toggleDone', item.id)" />
              <span class="cd-draft__row-text" :class="{ 'cd-draft__row-text--done': item.done }" v-html="highlight(item.text)" />
              <div class="cd-draft__row-controls">
                <div v-if="item.scheduled" class="cd-draft__sched-tag" :style="{ background: `${item.scheduled.color}1E` }">
                  <span class="cd-draft__sched-dot" :style="{ background: item.scheduled.color, borderRadius: item.scheduled.type === 'event' ? '50%' : '2px' }" />
                  <span class="cd-draft__sched-label" :style="{ color: item.scheduled.color }">{{ item.scheduled.tag }}</span>
                </div>
                <template v-else>
                  <button v-if="item.aiSuggestion" type="button" class="cd-draft__ai-chip" :style="{ borderColor: `${item.aiSuggestion.color}66`, background: `${item.aiSuggestion.color}16` }" @click="emit('acceptAiSuggestion', item.id)">
                    <span class="cd-draft__ai-chip-label" :style="{ color: item.aiSuggestion.color }">{{ item.aiSuggestion.tag }}</span>
                  </button>
                  <button type="button" class="cd-draft__row-btn" aria-label="Schedule" @click="emit('openSchedule', item.id)">
                    <CdIcon name="calendar" :size="16" color="#8F8A6E" />
                  </button>
                  <button type="button" class="cd-draft__row-btn" aria-label="Remove" @click="emit('removeItem', item.id)">
                    <CdIcon name="x-small" :size="12" color="#8F8C7E" />
                  </button>
                </template>
              </div>
            </div>
          </template>
        </div>
      </template>
      <div v-else class="cd-draft__empty">
        <CdIcon name="search" :size="28" color="#B0AD9F" :stroke-width="1.6" />
        <span>No drafts found</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import CdCheckCircle from './CdCheckCircle.vue'
import CdIcon from './CdIcon.vue'

// CdDraftDrawer — Inbox/Draft drawer CONTENT: composer, grouped rows, search, and schedule sheet.
// design-research-report.md §3.12. Paper texture bg #EEEBE1 + dot-grid, top binding holes,
// composer 46px pill, schedule sheet's AVAILABILITY bar (8AM-8PM, 45deg stripe busy blocks,
// solid proposal block green=free/red=conflict).
//
// Pure content only — no CdDrawer/CdDrawerOrSheet wrapper (design.md "Pure presentational ui layer
// with feature-layer composition" + "Overlays follow the drawer-or-sheet convention"), matching
// the pure UI precedent: the feature-layer DraftDrawer.vue wraps this in CdDrawerOrSheet so
// the same content renders as a side drawer on desktop and a bottom sheet on phone.
export interface DraftItem {
  id: string
  text: string
  done: boolean
  scheduled?: { type: 'task' | 'event'; color: string; tag: string }
  aiSuggestion?: { color: string; tag: string }
}

export interface DraftGroup {
  label: string
  items: DraftItem[]
}

const props = withDefaults(
  defineProps<{
    groups: DraftGroup[]
    composerText: string
    searchQuery: string
    swipeEnabled?: boolean
  }>(),
  { swipeEnabled: false }
)

const emit = defineEmits<{
  close: []
  'update:composerText': [value: string]
  submitComposer: []
  'update:searchQuery': [value: string]
  toggleDone: [id: string]
  removeItem: [id: string]
  openSchedule: [id: string]
  acceptAiSuggestion: [id: string]
}>()

const searchOpen = ref(false)

// Swipe-down on the header is the only close affordance when swipeEnabled (phone sheet mode),
// since the X button is hidden there (Zoe's 2026-07-11 correction). The directive is always bound
// (Quasar's TouchSwipe invokes whatever handler is currently attached with no type guard, so
// conditionally passing `undefined` would throw on a stray gesture) — this guard is what actually
// gates the behavior to sheet mode; on desktop the swipe is a no-op.
function onHeaderSwipeDown(): void {
  if (!props.swipeEnabled) return
  emit('close')
}

// Swipe-to-reveal row actions (CADENCE Handoff mkSwipeRow, phone/pad only) — drag clamps to
// [-140, 0], releasing past -70 snaps open to -132 (revealing the 140px Schedule/Remove action
// strip), otherwise snaps closed. Desktop keeps the hover-reveal row instead (swipeEnabled=false).
const SWIPE_MAX = 140
const SWIPE_OPEN = 132
const SWIPE_SNAP_THRESHOLD = 70

const swipeOffsets = ref<Record<string, number>>({})
const draggingId = ref<string | null>(null)
let dragStartX = 0
let dragStartOffset = 0

function swipeOffset(id: string): number {
  return swipeOffsets.value[id] ?? 0
}

// Touch/pen only — mouse pointerdown+drag is desktop hover-drag, not the phone swipe gesture
// this reveal is meant for (Zoe's 2026-07-11 correction: real phones have no hover, so a mouse
// dragging the row on a resized desktop browser must not trigger the same reveal).
function isSwipePointer(e: PointerEvent): boolean {
  return e.pointerType === 'touch' || e.pointerType === 'pen'
}

function onSwipeStart(id: string, e: PointerEvent): void {
  if (!isSwipePointer(e)) return
  draggingId.value = id
  dragStartX = e.clientX
  dragStartOffset = swipeOffset(id)
}

function onSwipeMove(id: string, e: PointerEvent): void {
  if (draggingId.value !== id) return
  const dx = e.clientX - dragStartX
  swipeOffsets.value = { ...swipeOffsets.value, [id]: Math.max(-SWIPE_MAX, Math.min(0, dragStartOffset + dx)) }
}

function onSwipeEnd(id: string): void {
  if (draggingId.value !== id) return
  draggingId.value = null
  const current = swipeOffset(id)
  swipeOffsets.value = { ...swipeOffsets.value, [id]: current < -SWIPE_SNAP_THRESHOLD ? -SWIPE_OPEN : 0 }
}

const quadOptions = [
  { key: 'plan' as const, label: 'Plan', color: '#6E839B' },
  { key: 'do' as const, label: 'Do Now', color: '#C56A5E' },
  { key: 'quick' as const, label: 'Quick', color: '#BFA86A' },
  { key: 'later' as const, label: 'Later', color: '#9A988F' }
]

const filteredGroups = computed(() => {
  const q = props.searchQuery.trim().toLowerCase()
  if (!q) return props.groups
  return props.groups
    .map((g) => ({ label: g.label, items: g.items.filter((i) => i.text.toLowerCase().includes(q)) }))
    .filter((g) => g.items.length > 0)
})

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c] as string)
}

// Draft text is free-form user input rendered via v-html for the <mark> highlight — every
// candidate must be HTML-escaped before insertion (escape first, then locate the match on the
// escaped string so `<mark>` wraps the right slice) or a draft containing e.g. `<img onerror=...>`
// executes as markup.
function highlight(text: string): string {
  const escaped = escapeHtml(text)
  const q = props.searchQuery.trim().toLowerCase()
  if (!q) return escaped
  const idx = escaped.toLowerCase().indexOf(escapeHtml(q))
  if (idx < 0) return escaped
  const matchLen = escapeHtml(q).length
  return `${escaped.slice(0, idx)}<mark style="background:#DFE2A0;color:inherit;border-radius:3px;padding:0 1px">${escaped.slice(idx, idx + matchLen)}</mark>${escaped.slice(idx + matchLen)}`
}

</script>

<style scoped>
.cd-draft {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--cd-draft-paper);
  background-image: radial-gradient(#c9c6b8 1.2px, transparent 1.2px);
  background-size: 22px 22px;
  background-position: 11px 11px;
  overflow: hidden;
}

.cd-draft__holes {
  display: flex;
  justify-content: space-between;
  padding: 15px 26px 3px;
  flex: none;
}

.cd-draft__hole {
  width: 13px;
  height: 23px;
  border-radius: 999px;
  background: var(--cd-topbar);
  box-shadow: inset 0 2.5px 3px rgba(74, 70, 52, 0.3), inset 0 -1.5px 1.5px rgba(255, 255, 255, 0.55);
  flex: none;
}

.cd-draft__header {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 22px;
  /* border-bottom: 0.5px solid rgba(120, 116, 100, 0.18); */
  flex: none;
}

/* Sheet mode's header carries the only close gesture (swipe down), so it needs touch-action:none
   to be a reliable v-touch-swipe target — same reasoning as CdSheet's .cd-sheet__handle-zone.
   Scoped to sheet mode only so desktop hover/click on the header (incl. the search button) is
   unaffected. */
.cd-draft__header--sheet {
  touch-action: none;
}

.cd-draft__header-icon {
  width: 38px;
  height: 38px;
  flex: none;
  border-radius: 11px;
  display: grid;
  place-items: center;
}

.cd-draft__title {
  flex: 1;
  font: 800 20px var(--cd-font-title);
  letter-spacing: -0.01em;
  color: #3a3833;
}

.cd-draft__icon-btn {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #8a8a80;
  display: grid;
  place-items: center;
  transition: background var(--cd-duration-micro-3);
}

.cd-draft__icon-btn:hover {
  background: rgba(74, 70, 52, 0.1);
}

.cd-draft__search {
  padding: 12px 22px;
  flex: none;
}

.cd-draft__search-input {
  width: 100%;
  box-sizing: border-box;
  border: none;
  outline: none;
  background: #e4e1d7;
  border-radius: 999px;
  padding: 10px 16px;
  font: 500 14px var(--cd-font-ui);
  color: #3a3833;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.06);
}

.cd-draft__composer {
  margin: 16px 22px 0;
  height: 46px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 2px solid var(--cd-line-5);
  background: #f4f2ea;
  border-radius: 999px;
  padding: 0 20px 0 14px;
  box-shadow: 0 3px 10px -5px rgba(60, 58, 48, 0.22);
  transition: border-color var(--cd-duration-micro-4), background var(--cd-duration-micro-4);
  flex: none;
}

/* CADENCE Handoff mkDraft: on phone/pad (swipe presentation) the composer moves below the list
   instead of above it — `order` re-sequences the two existing flex children of .cd-draft rather
   than duplicating the composer markup in two places. */
.cd-draft__composer--bottom {
  order: 10;
  margin: 10px 24px 16px;
}

.cd-draft__list--composer-bottom {
  order: 5;
}

.cd-draft__composer-plus {
  flex: none;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 22px;
  line-height: 1;
  color: #c9c6bb;
  transition: color var(--cd-duration-micro-4);
}

.cd-draft__composer-plus--active {
  color: #8f8a6e;
  font-weight: 500;
}

.cd-draft__composer-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font: 500 15px var(--cd-font-title);
  color: #3a3a34;
}

.cd-draft__list {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 16px;
}

.cd-draft__group-label {
  position: sticky;
  top: 0;
  font: 700 11px var(--cd-font-ui);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #a29f93;
  padding: 14px 26px 6px;
}

.cd-draft__row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  box-sizing: border-box;
  margin: 3px 24px;
  padding: 10px 16px;
  border-radius: var(--cd-radius-field);
  transition: background var(--cd-duration-micro-4);
}

.cd-draft__row:hover {
  background: rgba(74, 70, 52, 0.022);
}

.cd-draft__swipe-wrap {
  display: flex;
  align-items: stretch;
  margin: 3px 24px;
  border-radius: var(--cd-radius-field);
  overflow: hidden;
}

.cd-draft__swipe-actions {
  flex: none;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding-right: 10px;
  transition: width 0.22s cubic-bezier(0.22, 1, 0.36, 1);
}

.cd-draft__swipe-btn {
  width: 44px;
  height: 44px;
  flex: none;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: grid;
  place-items: center;
}

.cd-draft__swipe-btn--schedule {
  background: #8f8a6e;
}

.cd-draft__swipe-btn--remove {
  background: #d9483c;
}

.cd-draft__row--swipe {
  flex: 1;
  min-width: 0;
  margin: 0;
  touch-action: pan-y;
  cursor: grab;
}

.cd-draft__row-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font: 900 15px var(--cd-font-draft);
  letter-spacing: -0.01em;
  color: #5c5c52;
  line-height: 1.3;
}

.cd-draft__row-text--done {
  color: #a7a59b;
  text-decoration: line-through;
}

.cd-draft__row-controls {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: none;
}

.cd-draft__sched-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  padding: 3px 10px;
}

.cd-draft__sched-dot {
  width: 7px;
  height: 7px;
  flex: none;
}

.cd-draft__sched-label {
  font: 700 11px var(--cd-font-ui);
  white-space: nowrap;
}

.cd-draft__ai-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  border: 1px solid;
  border-radius: 999px;
  padding: 3px 9px 3px 7px;
  cursor: pointer;
}

.cd-draft__ai-chip-label {
  font: 700 11px var(--cd-font-ui);
  white-space: nowrap;
}

.cd-draft__row-btn {
  width: 26px;
  height: 26px;
  flex: none;
  border-radius: 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: background var(--cd-duration-micro-4), opacity var(--cd-duration-micro-3);
}

.cd-draft__row-btn:hover {
  background: rgba(74, 70, 52, 0.1);
}

.cd-draft__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 60px 20px;
  color: #b0ad9f;
  font: 500 13px var(--cd-font-ui);
}

</style>
