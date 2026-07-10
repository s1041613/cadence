<template>
  <div class="cd-dropdown-field" :class="{ 'cd-dropdown-field--open': open }">
    <button type="button" class="cd-dropdown-field__trigger" @click="toggle">
      <CdIcon v-if="icon" :name="icon" :size="20" color="var(--cd-olive)" />
      <span class="cd-dropdown-field__value">{{ selectedLabel }}</span>
      <span class="cd-dropdown-field__chevron" :class="{ 'cd-dropdown-field__chevron--open': open }">
        <CdIcon name="chevron-down" :size="14" />
      </span>
    </button>
    <div v-if="open" class="cd-dropdown-field__menu">
      <button
        v-for="opt in options"
        :key="opt.value"
        type="button"
        class="cd-dropdown-field__item"
        :class="{
          'cd-dropdown-field__item--selected': opt.value === modelValue,
          'cd-dropdown-field__item--disabled': opt.disabled
        }"
        :disabled="opt.disabled"
        @click="select(opt)"
      >
        <span>{{ opt.label }}</span>
        <CdIcon v-if="opt.value === modelValue" name="check" :size="15" color="var(--cd-olive)" :stroke-width="2.4" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import CdIcon from './CdIcon.vue'
import type { IconName } from './icons'

// CdDropdownField — settings dropdown (Time Format / First Day / Timezone). CADENCE Handoff
// §_settingsDrawer `dropdown()` helper (full file, no longer truncated): trigger bg #FBFAF7
// (var(--cd-surface)), border 1px solid var(--cd-line) (open state olive #B3AC91), radius 13px,
// padding 13px 15px, optional leading icon (20px, olive #B3AC91), value text 500 15px title font,
// chevron 14px rotating ∓90deg (.18s). Menu opens DOWNWARD: top calc(100% + 6px), bg #fff, border
// 1px solid var(--cd-line), radius 13px, shadow 0 12px 32px -12px rgba(40,38,30,.4), padding 5px;
// options padding 11px 13px, radius 9px, font 500 14px (selected 700), selected bg
// rgba(179,172,145,.16) + trailing 15px olive check, hover rgba(86,88,94,.05). Per-option
// `disabled` renders color #BEBBB0, opacity .75, cursor not-allowed, and is not selectable —
// used by the Timezone field (only Asia/Taipei enabled in this beta).
export interface DropdownFieldOption {
  value: string
  label: string
  disabled?: boolean
}

const props = defineProps<{
  modelValue: string
  options: DropdownFieldOption[]
  label?: string
  icon?: IconName
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const open = ref(false)

const selectedLabel = computed(() => props.options.find((o) => o.value === props.modelValue)?.label ?? '')

function toggle(): void {
  open.value = !open.value
}

function select(opt: DropdownFieldOption): void {
  if (opt.disabled) return
  emit('update:modelValue', opt.value)
  open.value = false
}
</script>

<style scoped>
.cd-dropdown-field {
  position: relative;
}

.cd-dropdown-field__trigger {
  display: flex;
  align-items: center;
  gap: 11px;
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--cd-line);
  background: var(--cd-surface);
  border-radius: 13px;
  padding: 13px 15px;
  cursor: pointer;
  transition: border-color var(--cd-duration-micro-4);
}

.cd-dropdown-field--open .cd-dropdown-field__trigger {
  border-color: var(--cd-olive);
}

.cd-dropdown-field__value {
  flex: 1;
  min-width: 0;
  text-align: left;
  font: 500 15px var(--cd-font-title);
  color: var(--cd-ink);
}

.cd-dropdown-field__chevron {
  display: flex;
  flex: none;
  color: var(--cd-muted);
  transform: rotate(90deg);
  transition: transform var(--cd-duration-micro-4);
}

.cd-dropdown-field__chevron--open {
  transform: rotate(-90deg);
}

.cd-dropdown-field__menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid var(--cd-line);
  border-radius: 13px;
  box-shadow: 0 12px 32px -12px rgba(40, 38, 30, 0.4);
  padding: 5px;
  z-index: 30;
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
}

.cd-dropdown-field__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: none;
  background: transparent;
  border-radius: 9px;
  padding: 11px 13px;
  font: 500 14px var(--cd-font-ui);
  color: var(--cd-ink);
  cursor: pointer;
  text-align: left;
}

.cd-dropdown-field__item:hover {
  background: rgba(86, 88, 94, 0.05);
}

.cd-dropdown-field__item--selected {
  background: rgba(179, 172, 145, 0.16);
  font-weight: 700;
}

.cd-dropdown-field__item--selected:hover {
  background: rgba(179, 172, 145, 0.16);
}

.cd-dropdown-field__item--disabled {
  color: #bebbb0;
  opacity: 0.75;
  cursor: not-allowed;
}

.cd-dropdown-field__item--disabled:hover {
  background: transparent;
}
</style>
