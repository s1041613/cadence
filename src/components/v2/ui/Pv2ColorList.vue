<template>
  <!--
    Inline colour list: a vertical rounded colour bar, the colour's name, and a radio
    indicator per row. A radiogroup rather than a set of toggles — the colours are mutually
    exclusive alternatives, which is what a radio group means to a screen reader, and it
    lets arrow keys move the selection the way they do in a native radio group.
  -->
  <div
    class="pv2-color-list"
    role="radiogroup"
    :aria-label="ariaLabel"
    @keydown="onKeydown"
  >
    <button
      v-for="(c, i) in EVENT_COLORS"
      :key="c.hex"
      :ref="(el) => setOptionEl(el, i)"
      type="button"
      role="radio"
      class="pv2-color-list__row"
      :class="{ 'pv2-color-list__row--on': isSelected(c.hex) }"
      :aria-checked="isSelected(c.hex)"
      :tabindex="tabIndexOf(i)"
      @click="emit('pick', c.hex)"
      @keydown.enter.prevent="emit('pick', c.hex)"
      @keydown.space.prevent="emit('pick', c.hex)"
    >
      <span class="pv2-color-list__bar" :style="{ background: c.hex }" />
      <span class="pv2-color-list__name">{{ c.name }}</span>
      <span class="pv2-color-list__radio" aria-hidden="true" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, type ComponentPublicInstance } from 'vue'
import { EVENT_COLORS } from './event-colors'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    ariaLabel?: string
  }>(),
  { modelValue: '', ariaLabel: 'Colour' }
)

// `pick` is a commit (click / Enter / Space) and the host closes on it; `preview` is the
// arrow-key traversal, which selects but must NOT dismiss — a radiogroup that closed on
// every arrow press would be unusable by keyboard.
const emit = defineEmits<{
  pick: [value: string]
  preview: [value: string]
}>()

// Indexed by row so arrow-key traversal can move focus to the row it just selected.
const optionEls = ref<Array<HTMLButtonElement | null>>([])

function setOptionEl(el: Element | ComponentPublicInstance | null, i: number): void {
  optionEls.value[i] = el as HTMLButtonElement | null
}

function isSelected(hex: string): boolean {
  return hex.toLowerCase() === props.modelValue.toLowerCase()
}

// A radiogroup exposes exactly one tab stop. When the stored colour isn't in the palette
// (an older event, a calendar's own colour) nothing is checked, so the first row takes the
// stop rather than leaving the group unreachable by keyboard.
const selectedIndex = computed(() => EVENT_COLORS.findIndex((c) => isSelected(c.hex)))

function tabIndexOf(i: number): number {
  const active = selectedIndex.value === -1 ? 0 : selectedIndex.value
  return i === active ? 0 : -1
}

// Arrow keys move focus *and* selection together, which is the native radio-group
// behaviour — but they emit `preview`, not `pick`, so the host keeps the list open while
// the user walks it. Enter/Space on a row is the commit.
function onKeydown(e: KeyboardEvent): void {
  const delta = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0
  if (delta === 0) return
  e.preventDefault()
  const from = selectedIndex.value === -1 ? 0 : selectedIndex.value
  const next = (from + delta + EVENT_COLORS.length) % EVENT_COLORS.length
  emit('preview', EVENT_COLORS[next]!.hex)
  // The tab stop follows the selection, so focus must move with it or the group would
  // strand focus on a row that is now tabindex -1.
  void nextTick(() => optionEls.value[next]?.focus())
}
</script>

<style scoped>
.pv2-color-list {
  /* Falls back to the v2 card palette when this list is used outside a host that defines
     the locals, so it never renders unstyled on a bare surface. */
  --pv2-cl-ink: var(--pv2-ink, #1b1b1b);
  --pv2-cl-ink-3: var(--pv2-ink-3, #b2b2b2);
  --pv2-cl-line: var(--pv2-line, #e2e2e2);
  --pv2-cl-fill: var(--pv2-fill, #f3f3f1);
  --pv2-cl-fill-hover: var(--pv2-fill-hover, #ececea);

  display: flex;
  flex-direction: column;
  gap: 2px;
  /* The card is height-capped at 640px and 15 rows are far taller than the space left
     under the STYLE row, so the list scrolls inside itself rather than pushing the footer
     out of reach. ~5.5 rows deep, so the cut row signals there is more below. */
  max-height: 240px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  margin: 4px 0 12px;
  padding: 4px;
  border: 1px solid var(--pv2-cl-line);
  border-radius: var(--cd-radius-sm);
  background: #fff;
}

.pv2-color-list__row {
  display: grid;
  grid-template-columns: 6px minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  width: 100%;
  min-height: 42px;
  padding: 8px 12px;
  border: none;
  border-radius: var(--cd-radius-sm);
  background: transparent;
  color: var(--pv2-cl-ink);
  cursor: pointer;
  text-align: left;
  transition: background var(--cd-duration-micro-3);
}

.pv2-color-list__row:hover {
  background: var(--pv2-cl-fill-hover);
}

/* Selected reads as a subtly lighter/held row rather than filled ink: the colour bar is
   the row's accent, and an ink fill would fight it. */
.pv2-color-list__row--on {
  background: var(--pv2-cl-fill);
}

.pv2-color-list__row:focus-visible {
  outline: 2px solid var(--pv2-cl-ink);
  outline-offset: -2px;
}

.pv2-color-list__bar {
  width: 6px;
  height: 24px;
  border-radius: 3px;
}

.pv2-color-list__name {
  font: 500 14px var(--cd-font-ui);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pv2-color-list__radio {
  width: 18px;
  height: 18px;
  border: 1.5px solid var(--pv2-cl-ink-3);
  border-radius: 50%;
  /* The inner dot is drawn as a large inset ring so only one element is needed per row;
     it collapses to nothing while unselected. */
  box-shadow: inset 0 0 0 9px #fff;
  transition:
    box-shadow var(--cd-duration-micro-3),
    border-color var(--cd-duration-micro-3);
}

.pv2-color-list__row--on .pv2-color-list__radio {
  border-color: var(--pv2-cl-ink);
  box-shadow: inset 0 0 0 3px #fff;
  background: var(--pv2-cl-ink);
}
</style>
