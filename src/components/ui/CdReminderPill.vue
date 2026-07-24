<template>
  <label class="cd-reminder-pill">
    <span class="cd-reminder-pill__text">{{ label }}</span>
    <select
      class="cd-reminder-pill__select"
      :value="modelValue ?? NONE_VALUE"
      aria-label="Reminder"
      @change="emit('update:modelValue', fromSelectValue(($event.target as HTMLSelectElement).value))"
    >
      <option v-for="option in REMINDER_OPTIONS" :key="option.value ?? NONE_VALUE" :value="option.value ?? NONE_VALUE">
        {{ option.label }}
      </option>
    </select>
  </label>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ReminderPreset } from '@/types/task'
import { REMINDER_OPTIONS, reminderLabel } from '@/utils/event-panel'

const NONE_VALUE = '__none__'

const props = defineProps<{
  modelValue: ReminderPreset | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: ReminderPreset | null]
}>()

const label = computed(() => reminderLabel(props.modelValue))

function fromSelectValue(value: string): ReminderPreset | null {
  return value === NONE_VALUE ? null : (value as ReminderPreset)
}
</script>

<style scoped>
.cd-reminder-pill {
  position: relative;
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  max-width: 100%;
  border: 1px solid var(--cd-line-4);
  border-radius: 999px;
  background: #fff;
  color: var(--cd-ink);
  cursor: pointer;
  transition:
    background var(--cd-duration-micro-3),
    border-color var(--cd-duration-micro-3);
}

.cd-reminder-pill:hover {
  background: var(--cd-topbar);
  border-color: rgba(179, 172, 145, 0.46);
}

.cd-reminder-pill__text {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 6px 30px 7px 12px;
  font: 700 12.5px var(--cd-font-ui);
}

.cd-reminder-pill::after {
  content: "";
  position: absolute;
  right: 11px;
  top: 50%;
  width: 7px;
  height: 7px;
  border-right: 1.5px solid currentColor;
  border-bottom: 1.5px solid currentColor;
  transform: translateY(-65%) rotate(45deg);
  pointer-events: none;
  opacity: 0.55;
}

.cd-reminder-pill__select {
  position: absolute;
  inset: 0;
  width: 100%;
  opacity: 0;
  cursor: pointer;
}

.cd-reminder-pill:focus-within {
  outline: 2px solid rgba(31, 41, 51, 0.18);
  outline-offset: 2px;
}
</style>
