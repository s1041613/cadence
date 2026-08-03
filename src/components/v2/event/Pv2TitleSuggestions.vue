<template>
  <Teleport to="body">
    <ul
      v-if="suggestions.length > 0"
      :id="listboxId"
      ref="menuEl"
      class="pv2-title-suggestions"
      :style="menuStyle"
      role="listbox"
      aria-label="Past events"
    >
      <li
        v-for="(suggestion, index) in suggestions"
        :id="optionId(index)"
        :key="suggestion.key"
        class="pv2-title-suggestions__row"
        :class="{ 'pv2-title-suggestions__row--active': index === activeIndex }"
        role="option"
        :aria-selected="index === activeIndex"
      >
        <!-- mousedown, not click: the input's blur would otherwise tear the list down before
             click lands, so the row would never fire. -->
        <div
          class="pv2-title-suggestions__pick"
          @mousedown.prevent="emit('select', suggestion)"
          @mouseenter="emit('update:activeIndex', index)"
        >
          <span
            class="pv2-title-suggestions__bar"
            :style="{ background: suggestion.backgroundColor ?? 'var(--pv2s-ink-3)' }"
            aria-hidden="true"
          />
          <span class="pv2-title-suggestions__title">{{ suggestion.title }}</span>
          <span class="pv2-title-suggestions__time">{{ timeLabel(suggestion) }}</span>
        </div>
        <!-- mousedown fires before the input's blur tears the list down; click and keydown keep it
             operable without a pointer, since focus never leaves the input (Delete on the active
             row is handled there). -->
        <button
          type="button"
          class="pv2-title-suggestions__dismiss"
          :aria-label="`Stop suggesting ${suggestion.title}`"
          @mousedown.prevent.stop="emit('dismiss', suggestion)"
          @click.prevent.stop="emit('dismiss', suggestion)"
        >
          ✕
        </button>
      </li>
    </ul>
  </Teleport>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import type { TitleSuggestion } from '@/utils/title-suggestions'

// Past events offered while naming a new one. Teleported to <body> with fixed coordinates measured
// from the anchor, matching CdTimeDropdown: the edit card clips overflow (`.pv2-edit-card` is
// `overflow: hidden`), so an in-flow list would be cut off instead of floating above the card.
const props = defineProps<{
  suggestions: TitleSuggestion[]
  activeIndex: number
  /** The title input, used to anchor and size the list. */
  anchor: HTMLElement | null
  listboxId: string
}>()

const emit = defineEmits<{
  select: [suggestion: TitleSuggestion]
  dismiss: [suggestion: TitleSuggestion]
  /** Close the whole list — an interaction landed outside it that blur alone wouldn't catch. */
  dismissList: []
  'update:activeIndex': [index: number]
}>()

const menuEl = ref<HTMLElement | null>(null)
const menuStyle = ref<Record<string, string>>({ position: 'fixed', left: '0px', top: '0px', width: '0px' })

function optionId(index: number): string {
  return `${props.listboxId}-option-${index}`
}

// Height is bounded by the visual viewport, not the layout viewport: on mobile the on-screen
// keyboard shrinks the former only, and a list sized to the latter would sit behind the keyboard.
function updatePosition(): void {
  const anchor = props.anchor
  if (!anchor) return

  const rect = anchor.getBoundingClientRect()
  // getBoundingClientRect is in layout-viewport coordinates; the visual viewport's bottom edge in
  // those same coordinates is offsetTop + height. With the keyboard up these diverge, and only the
  // visual viewport describes what the user can actually see.
  const visualBottom = (window.visualViewport?.offsetTop ?? 0) + (window.visualViewport?.height ?? window.innerHeight)
  const visualTop = window.visualViewport?.offsetTop ?? 0

  const spaceBelow = visualBottom - rect.bottom - GAP_PX - EDGE_PADDING_PX
  const spaceAbove = rect.top - visualTop - GAP_PX - EDGE_PADDING_PX

  // Flip above the field when the keyboard leaves too little room beneath it. Without this the
  // list renders under the keyboard — exactly the case the anchoring exists to avoid.
  const flip = spaceBelow < MIN_HEIGHT_PX && spaceAbove > spaceBelow

  menuStyle.value = flip
    ? {
        position: 'fixed',
        left: `${rect.left}px`,
        bottom: `${window.innerHeight - rect.top + GAP_PX}px`,
        width: `${rect.width}px`,
        maxHeight: `${Math.max(spaceAbove, MIN_HEIGHT_PX)}px`
      }
    : {
        position: 'fixed',
        left: `${rect.left}px`,
        top: `${rect.bottom + GAP_PX}px`,
        width: `${rect.width}px`,
        maxHeight: `${Math.max(spaceBelow, MIN_HEIGHT_PX)}px`
      }
}

const GAP_PX = 6
const EDGE_PADDING_PX = 8
// Floor for either direction; below this the list is too short to be useful, so it stays scrollable
// rather than collapsing to nothing.
const MIN_HEIGHT_PX = 120

// Watches a boolean, not the row count: the count changes on every keystroke, which would re-run
// the attach branch constantly and leave listener bookkeeping resting on addEventListener's
// dedupe. Same shape as CdTimeDropdown's `open` watcher.
watch(
  () => props.suggestions.length > 0,
  (visible) => {
    if (visible) {
      updatePosition()
      window.addEventListener('scroll', updatePosition, true)
      window.addEventListener('resize', updatePosition)
      window.visualViewport?.addEventListener('resize', updatePosition)
      window.visualViewport?.addEventListener('scroll', updatePosition)
      document.addEventListener('mousedown', onOutsideInteraction)
    } else {
      teardown()
    }
  },
  { immediate: true }
)

// Reposition when the anchor itself moves or is swapped in, without touching listener state.
watch(() => props.anchor, updatePosition)

// The input's blur covers most dismissals, but not every one: tapping a sheet scrim or a
// non-focusable region can leave the teleported list floating above the card at z-index 80.
function onOutsideInteraction(e: Event): void {
  const target = e.target as Node
  if (props.anchor?.contains(target) || menuEl.value?.contains(target)) return
  emit('dismissList')
}

// Keep the active row visible when arrow keys walk past the edge of the scroll box.
watch(
  () => props.activeIndex,
  (index) => {
    if (index < 0) return
    document.getElementById(optionId(index))?.scrollIntoView({ block: 'nearest' })
  }
)

function teardown(): void {
  document.removeEventListener('mousedown', onOutsideInteraction)
  window.removeEventListener('scroll', updatePosition, true)
  window.removeEventListener('resize', updatePosition)
  window.visualViewport?.removeEventListener('resize', updatePosition)
  window.visualViewport?.removeEventListener('scroll', updatePosition)
}

function timeLabel(suggestion: TitleSuggestion): string {
  return suggestion.allDay ? 'All-day' : `${suggestion.start} - ${suggestion.end}`
}

onBeforeUnmount(teardown)
</script>

<style scoped>
.pv2-title-suggestions {
  /* v2 neutral palette, matching Pv2EventEditCard — not the app-wide warm cd-* tokens. */
  --pv2s-ink: #1b1b1b;
  --pv2s-ink-2: #6e6e6e;
  --pv2s-ink-3: #b2b2b2;
  --pv2s-line: #e2e2e2;
  --pv2s-fill-hover: #ececea;
  --pv2s-paper: #fafaf9;

  margin: 0;
  padding: 4px;
  list-style: none;
  overflow-y: auto;
  background: var(--pv2s-paper);
  border: 1px solid var(--pv2s-line);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgb(0 0 0 / 12%);
  /* Teleported to <body>, so it stacks beside CdPopover (50) and CdDrawer (70) rather than
     inside them — must outrank both, same as CdTimeDropdown's menu. */
  z-index: 80;
}

.pv2-title-suggestions__row {
  display: flex;
  align-items: center;
  gap: 4px;
  border-radius: 6px;
}

.pv2-title-suggestions__row--active {
  background: var(--pv2s-fill-hover);
}

.pv2-title-suggestions__pick {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 6px;
  cursor: pointer;
}

.pv2-title-suggestions__bar {
  flex: none;
  width: 3px;
  height: 14px;
  border-radius: 2px;
}

.pv2-title-suggestions__title {
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  font-weight: 500;
  color: var(--pv2s-ink);
}

.pv2-title-suggestions__time {
  flex: none;
  margin-left: auto;
  font-size: 12px;
  color: var(--pv2s-ink-2);
  font-variant-numeric: tabular-nums;
}

.pv2-title-suggestions__dismiss {
  flex: none;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 50%;
  color: var(--pv2s-ink-3);
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
}

.pv2-title-suggestions__dismiss:hover {
  background: var(--pv2s-line);
  color: var(--pv2s-ink);
}
</style>
