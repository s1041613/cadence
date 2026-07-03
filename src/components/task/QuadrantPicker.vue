<template>
  <div class="quad-pick">
    <button
      v-for="q in QUADRANTS"
      :key="q.key"
      type="button"
      class="qp"
      :class="[`qp-${q.key}`, { on: isSelected(q) }]"
      :style="isSelected(q) ? { borderColor: q.backgroundColor, background: q.backgroundColor } : {}"
      @click="emit('update:modelValue', { important: q.important, urgent: q.urgent })"
    >
      <div class="qn">{{ q.name }}</div>
      {{ q.description }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { QUADRANTS, type Quadrant } from '@/composables/use-theme'

const props = defineProps<{
  modelValue: { important: boolean; urgent: boolean }
}>()

const emit = defineEmits<{
  'update:modelValue': [value: { important: boolean; urgent: boolean }]
}>()

function isSelected(q: Quadrant): boolean {
  return q.important === props.modelValue.important && q.urgent === props.modelValue.urgent
}
</script>

<style scoped lang="sass">
.quad-pick
  display: grid
  grid-template-columns: 1fr 1fr
  gap: 8px

.qp
  border: 1px solid $line-2
  border-radius: 10px
  padding: 10px 11px
  font-size: 12px
  color: $ink-2
  text-align: left
  line-height: 1.3
  background: none
  cursor: pointer
  transition: .15s

  .qn
    font-weight: 700
    color: $ink
    font-size: 12.5px

  &.on
    color: $ink

    .qn
      color: $ink
</style>
