<template>
  <button type="button" class="cd-switch-btn" @click="emit('update:modelValue', !modelValue)">
    <span class="cd-switch-track" :class="{ 'cd-switch-track--on': modelValue }" :style="trackStyle">
      <span class="cd-switch-thumb" :style="thumbStyle" />
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

// CdSwitch — three sizes per CADENCE Handoff:
//  - 30x17 (mini — quick-add & conversion sheet): thumb 13px, padding 2, .15s, no knob shadow
//  - 34x19 (medium — All-day switch in the edit popover): thumb 15px, padding 2, .15s, no knob shadow
//  - 46x28 (large — Show Photo toggle in Advanced settings): thumb 22px, padding 3, .18s, knob shadow 0 1px 2px rgba(0,0,0,.18)
const props = withDefaults(
  defineProps<{
    modelValue: boolean
    size?: '30x17' | '34x19' | '46x28'
  }>(),
  { size: '34x19' }
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const DIMS = {
  '30x17': { w: 30, h: 17, thumb: 13, padding: 2, duration: '.15s' },
  '34x19': { w: 34, h: 19, thumb: 15, padding: 2, duration: '.15s' },
  '46x28': { w: 46, h: 28, thumb: 22, padding: 3, duration: '.18s' }
} as const

const dims = computed(() => DIMS[props.size])

const trackStyle = computed(() => ({
  width: `${dims.value.w}px`,
  height: `${dims.value.h}px`,
  background: props.modelValue ? 'var(--cd-olive)' : '#D7D4CB',
  transition: `background ${dims.value.duration}`
}))

const thumbStyle = computed(() => {
  const travel = dims.value.w - dims.value.thumb - dims.value.padding
  return {
    width: `${dims.value.thumb}px`,
    height: `${dims.value.thumb}px`,
    top: `${dims.value.padding}px`,
    left: props.modelValue ? `${travel}px` : `${dims.value.padding}px`,
    // Handoff only defines a thumb box-shadow on the 46x28 (large / Show Photo) switch; the
    // 30x17 (mini) and 34x19 (medium) switches' thumbs have none. Preserved here rather than harmonized.
    boxShadow: props.size === '46x28' ? '0 1px 2px rgba(0,0,0,.18)' : 'none',
    transition: `left ${dims.value.duration}`
  }
})
</script>

<style scoped>
.cd-switch-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
  display: inline-flex;
}

.cd-switch-track {
  display: block;
  border-radius: var(--cd-radius-pill);
  position: relative;
}

.cd-switch-thumb {
  position: absolute;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.18);
}
</style>
