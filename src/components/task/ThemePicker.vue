<template>
  <div class="picker-overlay" @mousedown="(e) => e.target === e.currentTarget && emit('close')">
    <div class="picker" :style="{ '--pick': color }" @mousedown.stop>
      <div class="picker-tabs">
        <span v-for="t in TABS" :key="t.key" class="pt" :class="{ on: tab === t.key }" @click="tab = t.key">
          {{ t.label }}
        </span>
        <span class="pt-grow" />
        <span class="pt-rm" @click="update({ icon: null })">Remove</span>
      </div>

      <div v-if="tab === 'emoji'" class="picker-panel">
        <div class="pk-search"><span class="pk-si">⌕</span><input placeholder="Search emoji" /></div>
        <div class="pk-grp">Frequently Used</div>
        <div class="pk-emojis">
          <span
            v-for="e in EMOJIS"
            :key="e"
            class="pk-em"
            :class="{ on: modelValue.icon === e }"
            @click="update({ icon: e })"
            >{{ e }}</span
          >
        </div>
      </div>

      <div v-else-if="tab === 'icons'" class="picker-panel">
        <div class="pk-search"><span class="pk-si">⌕</span><input placeholder="Search icons" /></div>
        <div class="pk-grp">Recently Used</div>
        <div class="pk-icons">
          <span
            v-for="(s, i) in ICON_SVGS"
            :key="i"
            class="pk-ic"
            :class="{ on: modelValue.icon === s }"
            v-html="s"
            @click="update({ icon: s })"
          />
        </div>
      </div>

      <div v-else class="picker-panel">
        <div class="pk-grp">Color</div>
        <div class="pk-colors">
          <span
            v-for="c in EVENT_COLORS"
            :key="c"
            class="pk-pc"
            :class="{ on: color === c }"
            :style="{ background: c, color: c }"
            @click="update({ backgroundColor: c })"
          />
        </div>
        <div class="pk-grp">Pattern</div>
        <div class="pk-tex">
          <span
            v-for="k in TEXTURES"
            :key="k"
            class="pk-tx"
            :class="[`pk-tx-${k}`, { on: modelValue.texture === k }]"
            :style="{ '--tc': color, backgroundImage: texPreview(k, color), backgroundColor: '#fff' }"
            @click="update({ texture: k })"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Appearance } from '@/composables/use-theme'
import type { Texture } from '@/types/task'

const EMOJIS = ['🎉', '🍻', '🎬', '🎮', '🏸', '🎨', '📸', '🎂', '🍜', '☕️', '🏖️', '✈️', '🦷', '💇', '🛒', '🐶', '📚', '🎧', '⚽️', '🏃', '🌸', '🍰', '🍕', '🎵']

const ICON_SVGS = [
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3v7a2 2 0 002 2 2 2 0 002-2V3M8 12v9M18 3c-2 0-3 3-3 6h3v12"/></svg>',
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 8h13v4a4 4 0 01-4 4H8a4 4 0 01-4-4zM17 9h2a2 2 0 010 4h-2M4 20h13"/></svg>',
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 4a4 4 0 014 4c0 3-4 3-4 6M12 4a4 4 0 00-4 4c0 3 4 3 4 6"/></svg>',
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v2M5 21l7-4 7 4M4 5h16v8H4z"/></svg>',
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12h20M6 12V7a6 6 0 0112 0v5"/></svg>',
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12h16v3a4 4 0 01-4 4H8a4 4 0 01-4-4zM8 12V6M12 12V6M16 12V6"/></svg>',
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>',
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 10l9-6 9 6M5 9v11h14V9"/></svg>',
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21C7 17 3 13 3 9a4 4 0 018-1 4 4 0 018 1c0 4-4 8-9 12z"/></svg>',
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 3v3M17 3v3"/></svg>',
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M8 15c1 1 2.5 1.5 4 1.5s3-.5 4-1.5M9 10h.01M15 10h.01"/></svg>'
]

const EVENT_COLORS = ['#C56A5E', '#DFC06B', '#7BA05B', '#5B9AA0', '#6E839B', '#3F5E80', '#9C6FA6', '#B5793F', '#5A5C62']
const TEXTURES: Texture[] = ['none', 'dot', 'cute']
const TABS: Array<{ key: 'emoji' | 'icons' | 'color'; label: string }> = [
  { key: 'emoji', label: 'Emoji' },
  { key: 'icons', label: 'Icons' },
  { key: 'color', label: 'Color' }
]

const props = defineProps<{
  modelValue: Appearance
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Appearance]
  close: []
}>()

const tab = ref<'emoji' | 'icons' | 'color'>('emoji')
const color = computed(() => props.modelValue.backgroundColor)

function update(patch: Partial<Appearance>): void {
  emit('update:modelValue', { ...props.modelValue, ...patch })
}

// Small preview swatch background: a darkened mix of the current color, one pattern per texture.
function texPreview(kind: Texture, c: string): string {
  const mix = `color-mix(in srgb, ${c} 90%, #333)`
  switch (kind) {
    case 'none':
      return 'linear-gradient(135deg,transparent calc(50% - 1px),var(--color-line-2) calc(50% - 1px) calc(50% + 1px),transparent calc(50% + 1px))'
    case 'dot':
      return `radial-gradient(${mix} 1.4px,transparent 1.6px) 0 0/7px 7px`
    case 'cute':
      return cuteSVG(mix)
    default:
      return 'none'
  }
}

function cuteSVG(stroke: string): string {
  const paths = [
    `<path d="M8 30c-2-2-2-4 0-5 2 1 2 3 0 5z M8 30c2-2 2-4 0-5-2 1-2 3 0 5z" fill="${stroke}"/>`,
    `<path d="M40 8c1 3 2 4 5 5-3 1-4 2-5 5-1-3-2-4-5-5 3-1 4-2 5-5z" fill="${stroke}"/>`,
    `<path d="M20 46c-3-2-5-4-5-6a2.2 2.2 0 014-1 2.2 2.2 0 014 1c0 2-2 4-3 6z" fill="${stroke}"/>`,
    `<path d="M48 40l3 3-3 3-3-3z" fill="${stroke}"/>`,
    `<path d="M30 20v6M27 23h6" stroke="${stroke}" stroke-width="1.6" stroke-linecap="round"/>`,
    `<circle cx="12" cy="16" r="2.2" fill="none" stroke="${stroke}" stroke-width="1.6"/>`,
    `<circle cx="44" cy="24" r="1.4" fill="${stroke}"/>`,
    `<circle cx="24" cy="34" r="1.2" fill="${stroke}"/>`
  ].join('')
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='56' height='56' viewBox='0 0 56 56'>${paths}</svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}
</script>

<style scoped lang="sass">
.picker-overlay
  position: fixed
  inset: 0
  background: rgba(40, 38, 32, .32)
  z-index: 120
  display: flex
  align-items: flex-start
  justify-content: center
  padding-top: 8vh

.picker
  width: 360px
  max-height: 80vh
  overflow-y: auto
  background: $surface
  border-radius: 20px
  box-shadow: 0 30px 80px -30px rgba(20, 19, 15, .5)

.picker-tabs
  display: flex
  align-items: center
  gap: 20px
  padding: 16px 20px 0
  border-bottom: 1px solid $line

  .pt
    font-size: 15px
    font-weight: 600
    color: $ink-3
    padding: 6px 0 12px
    cursor: pointer
    border-bottom: 2.5px solid transparent
    margin-bottom: -1px

    &.on
      color: #3f4147
      border-color: #3f4147

  .pt-grow
    flex: 1

  .pt-rm
    font-size: 13.5px
    color: $ink-3
    cursor: pointer
    padding-bottom: 12px

    &:hover
      color: #C56A5E

.picker-panel
  padding: 16px 20px 20px

.pk-search
  display: flex
  align-items: center
  gap: 10px
  border: 1.5px solid $line-2
  border-radius: 12px
  padding: 10px 14px
  margin-bottom: 14px
  color: $ink-3

  input
    border: none
    outline: none
    background: none
    font-size: 14.5px
    flex: 1
    color: $ink

.pk-si
  font-size: 16px

.pk-grp
  font-size: 12px
  color: $ink-3
  font-weight: 700
  letter-spacing: .06em
  margin: 4px 2px 10px

.pk-emojis
  display: grid
  grid-template-columns: repeat(8, 1fr)
  gap: 4px

.pk-em
  aspect-ratio: 1
  border-radius: 9px
  display: grid
  place-items: center
  cursor: pointer
  font-size: 22px
  line-height: 1

  &:hover
    background: #EDEBE3

  &.on
    background: #E1E5EC

.pk-icons
  display: grid
  grid-template-columns: repeat(6, 1fr)
  gap: 11px

.pk-ic
  aspect-ratio: 1
  border-radius: 50%
  background: #fff
  border: 1px solid $line
  display: grid
  place-items: center
  cursor: pointer
  color: #3f4147

  :deep(svg)
    width: 20px
    height: 20px

  &:hover
    border-color: $btn

  &.on
    background: var(--pick, #6E839B)
    color: #fff
    border-color: transparent

.pk-colors
  display: flex
  gap: 11px
  flex-wrap: wrap
  background: #F4F2EC
  border-radius: 16px
  padding: 14px
  margin-bottom: 18px

.pk-pc
  width: 36px
  height: 36px
  border-radius: 50%
  cursor: pointer
  border: 3px solid transparent
  box-shadow: 0 0 0 1px rgba(0, 0, 0, .05)

  &.on
    border-color: #fff
    box-shadow: 0 0 0 2px currentColor
    transform: scale(1.06)

.pk-tex
  display: flex
  gap: 10px
  flex-wrap: wrap
  background: #F4F2EC
  border-radius: 16px
  padding: 13px

.pk-tx
  width: 44px
  height: 44px
  border-radius: 12px
  cursor: pointer
  background: #fff
  border: 1.5px solid $line-2
  overflow: hidden
  position: relative

  &.on
    border-color: var(--tc, #6E839B)
    box-shadow: 0 0 0 2px var(--tc, #6E839B)
</style>
