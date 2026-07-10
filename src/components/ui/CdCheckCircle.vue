<template>
  <button
    type="button"
    class="cd-check-circle"
    :class="{ 'cd-check-circle--done': modelValue }"
    aria-label="Toggle done"
    @click="emit('update:modelValue', !modelValue)"
  >
    <CdIcon v-if="modelValue" name="check" :size="12" color="#fff" :stroke-width="3.4" />
  </button>
</template>

<script setup lang="ts">
// CdCheckCircle — draft/inbox row checkbox. CADENCE Handoff §3.12.
// undone: border-color #C4C1B4. done: solid #B3AC91 fill + white checkmark (stroke-width 3.4).
// hover: border-color #8F8C7E + 4px ring rgba(107,107,96,.12).
import CdIcon from './CdIcon.vue'

defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()
</script>

<style scoped>
.cd-check-circle {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1.5px solid #c4c1b4;
  background: transparent;
  cursor: pointer;
  padding: 0;
  display: grid;
  place-items: center;
  flex: none;
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
}

.cd-check-circle:hover {
  border-color: #8f8c7e;
  box-shadow: 0 0 0 4px rgba(107, 107, 96, 0.12);
}

.cd-check-circle--done {
  background: var(--cd-olive);
  border-color: var(--cd-olive);
}
</style>
