<template>
  <div class="seg">
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      :class="{ on: opt.value === modelValue }"
      @click="$emit('update:modelValue', opt.value)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string
  options: Array<{ value: string; label: string }>
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<style scoped lang="sass">
.seg
  display: flex
  border: 1px solid $line-2
  border-radius: 9px
  overflow: hidden

  button
    border: none
    background: $surface
    color: $ink-2
    font-size: 12.5px
    font-weight: 600
    padding: 7px 13px
    cursor: pointer
    transition: .15s

    &.on
      background: $btn
      color: $ink
</style>
