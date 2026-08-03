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
.pv2-time-chip {
  /* Width hugs the content instead of a fixed 5ch cap: `ch` measures the digit zero, so five
     of them under-measure "23:25" by the colon's width and clip the last digit at this
     weight. */
  width: auto;
  min-width: 5.9ch;
  padding: 9px 14px;
  border: 1px solid var(--pv2-line-strong);
  border-radius: var(--cd-radius-sm);
  outline: none;
  background: #fff;
  color: var(--pv2-ink);
  font: 700 15.5px var(--cd-font-ui);
  font-variant-numeric: var(--cd-numeric-aligned);
  text-align: center;
  transition: border-color var(--cd-duration-micro-3);
}

.pv2-time-chip:hover {
  background: var(--pv2-fill);
}

.pv2-time-chip--open {
  border-color: var(--pv2-ink);
}
</style>
