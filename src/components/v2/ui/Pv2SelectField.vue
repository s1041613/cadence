<template>
  <label class="pv2-select-field">
    <span class="pv2-select-field__value">{{ selectedLabel }}</span>
    <Pv2Chevron class="pv2-select-field__chevron" />
    <select
      class="pv2-select-field__native"
      :value="modelValue"
      :aria-label="ariaLabel"
      @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <option v-for="option in options" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>
  </label>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Pv2Chevron from './Pv2Chevron.vue'

// Pv2SelectField — the v2 card's dropdown row (CALENDAR, REMINDER).
//
// A REAL <select>, stretched invisibly over a shell we style ourselves. The
// technique is CdReminderPill's; what's new here is that it now also covers
// CALENDAR, which shipped as a bare <select> with no `appearance: none` — so its
// height, font metrics and chevron were all drawn by the UA, and it could never
// line up with the controls beside it however carefully they were specced.
//
// Why not a custom menu (CdDropdownField): the card's scroll area sets
// `overflow-y: auto`, which clips an absolutely-positioned menu. Escaping it
// means the teleport-to-body + fixed-positioning dance CdTimeDropdown and
// CdDatePicker do — and doing that would still lose the native wheel picker that
// makes this control good on a phone. A native <select> has neither problem.
//
// Geometry comes from the --pv2-control-* custom properties the host declares
// (see Pv2EventEditCard.vue). Each is written with a fallback so the component
// still renders correctly outside that card, the way Pv2ColorList guards its own.

export interface Pv2SelectOption {
  value: string
  label: string
}

const props = defineProps<{
  modelValue: string
  options: Pv2SelectOption[]
  ariaLabel: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

// Falls back to the raw value rather than an empty string: if the model ever holds
// an id that has dropped out of `options` (a calendar the user just deleted), an
// empty pill would read as "no calendar" when a calendar is in fact still set.
const selectedLabel = computed(
  () => props.options.find((o) => o.value === props.modelValue)?.label ?? props.modelValue
)
</script>

<style scoped>
.pv2-select-field {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  box-sizing: border-box;
  height: var(--pv2-control-h, 40px);
  min-width: var(--pv2-pill-w, 156px);
  max-width: 100%;
  padding: 0 var(--pv2-control-px, 12px);
  /* Transparent rather than absent: the border box is kept so a future palette can
     turn the outline back on by setting a colour, without every control shifting
     1px. */
  border: 1px solid transparent;
  border-radius: var(--pv2-control-r, 9px);
  background: var(--pv2-control-bg, #f0f0ed);
  color: var(--pv2-ink, #1b1b1b);
  cursor: pointer;
  /* The global rule in app.css grants these to button/a/[role=button] only, and
     this control's root is a <label> — so it has to ask for them itself. */
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
  transition: background var(--cd-duration-micro-3);
}

.pv2-select-field:hover {
  background: var(--pv2-control-bg-hover, #e8e8e4);
}

.pv2-select-field:active {
  background: var(--pv2-control-bg-open, #e2e2de);
}

/* The native <select> is the focusable node, so the ring has to be drawn by the
   shell around it. :focus-within (not :focus-visible) because the shell itself is
   never focused; the `:has()` guard keeps the ring off pointer interactions, so a
   click doesn't leave a keyboard-looking outline behind. */
.pv2-select-field:has(.pv2-select-field__native:focus-visible) {
  outline: 2px solid var(--pv2-ink, #1b1b1b);
  outline-offset: 2px;
}

.pv2-select-field__value {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
  font: var(--pv2-control-fw, 500) var(--pv2-control-fs, 14px) var(--cd-font-ui);
}

.pv2-select-field__chevron {
  color: var(--pv2-ink-3, #b2b2b2);
}

/* Invisible, but a real control: it keeps the native picker (the wheel on iOS, the
   OS menu on desktop), full keyboard support and the accessibility tree. Only the
   painting is ours. `appearance: none` is not about looks here — it stops the UA's
   own metrics from sizing the hit area differently from the shell. */
.pv2-select-field__native {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  border: none;
  opacity: 0;
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
}

@media (prefers-reduced-motion: reduce) {
  .pv2-select-field {
    transition: none;
  }
}
</style>
