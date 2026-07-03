<template>
  <button type="button" class="iconbtn" :aria-label="ariaLabel" :title="ariaLabel" @click="$emit('click')">
    <slot>{{ icon }}</slot>
  </button>
</template>

<script setup lang="ts">
defineProps<{
  icon: string
  ariaLabel: string
}>()

defineEmits<{
  click: []
}>()
</script>

<style scoped lang="sass">
.iconbtn
  width: 34px
  height: 34px
  border-radius: 9px
  border: 1px solid $line-2
  background: $surface
  color: $ink
  font-size: 15px
  display: grid
  place-items: center
  transition: .15s
  cursor: pointer

  &:hover
    border-color: $ink
    background: $surface
</style>
