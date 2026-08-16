<template>
  <input
    ref="inputEl"
    class="pv2-time-chip"
    :class="{ 'pv2-time-chip--open': open }"
    :value="draftText"
    :aria-label="ariaLabel"
    :aria-expanded="open"
    inputmode="numeric"
    @focus="emit('open')"
    @click="emit('open')"
    @input="onInput"
    @keydown.enter="onEnter"
    @keydown.esc="onEscape"
    @blur="onBlur"
  />
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { isTimeValue } from '@/utils/convert-date-time'

const props = defineProps<{
  modelValue: string // 'HH:MM'
  open: boolean
  ariaLabel: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  open: []
}>()

// draftText holds the input's live text, kept separate from modelValue so every keystroke
// doesn't emit — only a valid blur/Enter commits. The watcher re-syncs it whenever
// modelValue changes from outside, which is what makes the wheel's scrolling show up in the
// chip. lastValid tracks the same committed value so an invalid blur reverts to the current
// model rather than a stale earlier one.
const inputEl = ref<HTMLInputElement | null>(null)
const draftText = ref(props.modelValue)
const lastValid = ref(props.modelValue)

watch(
  () => props.modelValue,
  (v) => {
    draftText.value = v
    lastValid.value = v
  },
  { immediate: true }
)

function onInput(e: Event): void {
  draftText.value = (e.target as HTMLInputElement).value
}

function onEnter(e: Event): void {
  ;(e.target as HTMLInputElement).blur()
}

// A typed time is committed exactly as written — deliberately NOT snapped to the wheel's
// minute grid. Typing is precise input and outranks the picker's granularity, so 09:07 stays
// 09:07 while the wheel merely renders at the nearest row.
function onBlur(): void {
  if (isTimeValue(draftText.value)) {
    lastValid.value = draftText.value
    emit('update:modelValue', draftText.value)
  } else {
    draftText.value = lastValid.value
  }
}

function onEscape(): void {
  draftText.value = lastValid.value
  inputEl.value?.blur()
}
</script>

<style scoped>
/* Geometry and colour come from the --pv2-control-* contract the host card declares
   (see Pv2EventEditCard.vue), so this chip cannot drift away from the CALENDAR /
   STYLE / REMINDER controls it sits beside — it used to be 42.67px tall against
   their 36px. Every var carries a fallback: the chip previously read
   --pv2-line-strong and --pv2-fill with none, so outside that card its border and
   hover silently resolved to nothing. */
.pv2-time-chip {
  /* Width hugs the content instead of a fixed 5ch cap: `ch` measures the digit zero, so five
     of them under-measure "23:25" by the colon's width and clip the last digit at this
     weight. */
  width: auto;
  min-width: 5.9ch;
  box-sizing: border-box;
  height: var(--pv2-control-h, 40px);
  padding: 0 var(--pv2-control-px, 12px);
  /* Transparent rather than absent, so the border box survives for a future palette
     that wants the outline back without shifting every control by 1px. */
  border: 1px solid transparent;
  border-radius: var(--pv2-control-r, 9px);
  background: var(--pv2-control-bg, #f0f0ed);
  color: var(--pv2-ink, #1b1b1b);
  font: var(--pv2-control-fw, 500) var(--pv2-control-fs, 14px) var(--cd-font-ui);
  font-variant-numeric: var(--cd-numeric-aligned);
  text-align: center;
  transition:
    background var(--cd-duration-micro-3),
    box-shadow var(--cd-duration-micro-3);
}

.pv2-time-chip:hover {
  background: var(--pv2-control-bg-hover, #e8e8e4);
}

/* Focusing the chip is what opens the wheel, so --open doubles as the focus
   indicator for pointer users. Keyboard users additionally get the standard ring,
   matching every other control on the card. */
.pv2-time-chip:focus-visible {
  outline: 2px solid var(--pv2-ink, #1b1b1b);
  outline-offset: 2px;
}

/* An inset ring rather than a border colour: with the outline gone there is no
   border to darken, and inset shadow paints inside the box so nothing reflows when
   the wheel opens. */
.pv2-time-chip--open {
  background: var(--pv2-control-bg-open, #e2e2de);
  box-shadow: inset 0 0 0 1.5px var(--pv2-ink, #1b1b1b);
}

@media (prefers-reduced-motion: reduce) {
  .pv2-time-chip {
    transition: none;
  }
}
</style>
