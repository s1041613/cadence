<template>
  <div class="cd-appearance-subview">
    <div class="cd-appearance-subview__head">
      <button type="button" class="cd-appearance-subview__back" aria-label="Back" @click="emit('close')">
        <CdIcon name="chevron-left" :size="17" color="var(--cd-ink-2)" />
      </button>
      <div class="cd-appearance-subview__tabs">
        <button
          v-for="t in TABS"
          :key="t.key"
          type="button"
          class="cd-appearance-subview__tab"
          :class="{ 'cd-appearance-subview__tab--on': tab === t.key }"
          @click="tab = t.key"
        >
          {{ t.label }}
        </button>
      </div>
      <button type="button" class="cd-appearance-subview__remove" :disabled="!canRemove" @click="canRemove && emit('remove')">Remove</button>
    </div>

    <div v-if="tab === 'color'" class="cd-appearance-subview__body">
      <div class="cd-appearance-subview__label">Color</div>
      <div class="cd-appearance-subview__color-tray">
        <button
          v-for="c in COLOR_SWATCHES"
          :key="c"
          type="button"
          class="cd-appearance-subview__swatch"
          :aria-label="c"
          :style="{ background: c, boxShadow: color === c ? `0 0 0 3px #F1EFE8, 0 0 0 5px ${c}` : 'none' }"
          @click="emit('pickColor', c)"
        />
      </div>
    </div>

    <div v-else class="cd-appearance-subview__body cd-appearance-subview__body--icons">
      <label class="cd-appearance-subview__search">
        <CdIcon name="search" :size="18" color="#9C9E94" />
        <input v-model="query" placeholder="Search Icons" />
      </label>

      <div class="cd-appearance-subview__category-tabs">
        <button
          v-for="cat in CATEGORIES"
          :key="cat.key"
          type="button"
          class="cd-appearance-subview__category"
          :class="{ 'cd-appearance-subview__category--on': activeCategory === cat.key && !query.trim() }"
          :aria-label="cat.label"
          @click="activeCategory = cat.key; query = ''"
        >
          <CdIcon :name="cat.icon" :size="22" :color="activeCategory === cat.key && !query.trim() ? '#8F7A3E' : '#9C9E94'" />
        </button>
      </div>

      <template v-if="query.trim()">
        <div v-if="filteredIcons.length" class="cd-appearance-subview__icon-grid">
          <IconTile v-for="n in filteredIcons" :key="n" :name="n" :selected="icon === n" :color="color" @pick="emit('pickIcon', n)" />
        </div>
        <div v-else class="cd-appearance-subview__empty">No icons match “{{ query.trim() }}”</div>
      </template>

      <template v-else>
        <template v-if="recentIcons.length">
          <div class="cd-appearance-subview__section">
            <CdIcon name="clock" :size="17" color="#9C9E94" />
            <span>Recently Used</span>
          </div>
          <div class="cd-appearance-subview__icon-row">
            <IconTile v-for="n in recentIcons" :key="n" :name="n" :selected="icon === n" :color="color" @pick="emit('pickIcon', n)" />
          </div>
        </template>

        <div class="cd-appearance-subview__section">
          <CdIcon :name="activeCategoryInfo.icon" :size="17" color="#9C9E94" />
          <span>{{ activeCategoryInfo.label }}</span>
        </div>
        <div class="cd-appearance-subview__icon-grid">
          <IconTile v-for="n in activeCategoryInfo.icons" :key="n" :name="n" :selected="icon === n" :color="color" @pick="emit('pickIcon', n)" />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, ref } from 'vue'
import CdIcon from './CdIcon.vue'
import type { IconName } from './icons'

const props = defineProps<{
  icon: string | null
  color: string
  recent?: IconName[]
}>()

const emit = defineEmits<{
  close: []
  remove: []
  pickIcon: [value: IconName]
  pickColor: [value: string]
}>()

const tab = ref<'color' | 'icon'>('color')
const query = ref('')
const activeCategory = ref<'general' | 'life' | 'work'>('general')

const TABS = [
  { key: 'color' as const, label: 'Color' },
  { key: 'icon' as const, label: 'Icon' }
]

const COLOR_SWATCHES = ['#4A8B85', '#63996B', '#6863B0', '#8E6FB0', '#A56D91', '#4C4E57']

const CATEGORIES: Array<{ key: 'general' | 'life' | 'work'; label: string; icon: IconName; icons: IconName[] }> = [
  { key: 'general', label: 'General', icon: 'star', icons: ['calendar', 'star', 'bell', 'clock', 'note', 'info', 'eye', 'layers', 'image', 'copy'] },
  { key: 'life', label: 'Home & Life', icon: 'home', icons: ['home', 'heart', 'lock', 'bulb'] },
  { key: 'work', label: 'Work & Study', icon: 'work', icons: ['work', 'target', 'school', 'users', 'globe'] }
]

const allIcons = computed(() => [...new Set(CATEGORIES.flatMap((c) => c.icons))])
const activeCategoryInfo = computed(() => CATEGORIES.find((c) => c.key === activeCategory.value) ?? CATEGORIES[0]!)
const filteredIcons = computed(() => {
  const q = query.value.trim().toLowerCase()
  return q ? allIcons.value.filter((n) => n.includes(q)) : []
})
// Default recents use spark-mono, not spark: the picker tints icons to the calendar's color, and
// two-tone brand glyphs (spark, journal, view-*) are img-mode with fixed design colors that ignore
// the tint. spark-mono is the mask-mode, tintable variant. (icons.ts hybrid-coloring ruling.)
const recentIcons = computed(() => (props.recent ?? ['calendar', 'spark-mono', 'clock', 'notes']).filter((n) => n !== props.icon).slice(0, 4))
const canRemove = computed(() => props.icon !== null)

const IconTile = defineComponent({
  props: {
    name: { type: String, required: true },
    selected: { type: Boolean, required: true },
    color: { type: String, required: true }
  },
  emits: ['pick'],
  setup(tileProps, { emit: tileEmit }) {
    return () =>
      h(
        'button',
        {
          type: 'button',
          class: ['cd-appearance-subview__icon-tile', { 'cd-appearance-subview__icon-tile--on': tileProps.selected }],
          style: tileProps.selected ? { borderColor: tileProps.color, background: tileProps.color } : undefined,
          onClick: () => tileEmit('pick')
        },
        [h(CdIcon, { name: tileProps.name as IconName, size: 24, color: tileProps.selected ? '#fff' : '#56585E' })]
      )
  }
})
</script>

<style scoped>
.cd-appearance-subview {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: #fff;
  animation: cd-appearance-in 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}

.cd-appearance-subview__head {
  flex: none;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 11px 14px 9px 8px;
  border-bottom: 1px solid var(--cd-line);
}

.cd-appearance-subview__back {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--cd-ink-2);
  cursor: pointer;
  font-size: 24px;
  line-height: 1;
}

.cd-appearance-subview__tabs {
  display: flex;
  gap: 18px;
}

.cd-appearance-subview__tab {
  position: relative;
  border: none;
  background: transparent;
  cursor: pointer;
  font: 600 15px var(--cd-font-title);
  color: var(--cd-muted);
  padding: 6px 1px 8px;
}

.cd-appearance-subview__tab--on {
  font-weight: 800;
  color: var(--cd-ink);
}

.cd-appearance-subview__tab--on::after {
  content: '';
  position: absolute;
  left: 1px;
  right: 1px;
  bottom: -1px;
  height: 2px;
  border-radius: 2px;
  background: var(--cd-ink);
}

.cd-appearance-subview__remove {
  margin-left: auto;
  border: none;
  background: transparent;
  cursor: pointer;
  font: 600 14px var(--cd-font-title);
  color: #8a8779;
  padding: 6px 4px;
}

.cd-appearance-subview__remove:disabled {
  cursor: default;
  color: #cbc8bc;
}

.cd-appearance-subview__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 26px 18px 18px;
}

.cd-appearance-subview__body--icons {
  padding-top: 14px;
}

.cd-appearance-subview__label {
  font: 700 14px var(--cd-font-title);
  color: var(--cd-muted);
  margin: 0 2px 14px;
}

.cd-appearance-subview__color-tray {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  align-items: center;
  background: #f1efe8;
  border-radius: 18px;
  padding: 18px;
}

.cd-appearance-subview__swatch {
  width: 38px;
  height: 38px;
  flex: none;
  border: none;
  border-radius: 50%;
  padding: 0;
  cursor: pointer;
}

.cd-appearance-subview__search {
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid var(--cd-line);
  border-radius: 14px;
  background: #fbfaf7;
  padding: 12px 14px;
}

.cd-appearance-subview__search input {
  min-width: 0;
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font: 700 15px var(--cd-font-title);
  color: var(--cd-ink);
}

.cd-appearance-subview__category-tabs {
  display: flex;
  gap: 3px;
  margin-top: 14px;
  border: 1px solid var(--cd-line);
  border-radius: 16px;
  padding: 4px;
}

.cd-appearance-subview__category {
  flex: 1 1 0;
  height: 38px;
  border: none;
  border-radius: 12px;
  background: transparent;
  cursor: pointer;
  display: grid;
  place-items: center;
}

.cd-appearance-subview__category--on {
  background: #f0eadb;
}

.cd-appearance-subview__section {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-top: 22px;
  font: 800 14px var(--cd-font-title);
  color: var(--cd-ink-2);
}

.cd-appearance-subview__icon-row,
.cd-appearance-subview__icon-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, 46px);
  justify-content: space-between;
  gap: 14px;
  margin-top: 12px;
}

:deep(.cd-appearance-subview__icon-tile) {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  border: 1.5px solid #eeece4;
  background: #fff;
  cursor: pointer;
  display: grid;
  place-items: center;
}

.cd-appearance-subview__empty {
  padding: 16px 2px;
  font: 600 13px var(--cd-font-title);
  color: var(--cd-muted);
}

@keyframes cd-appearance-in {
  from {
    transform: translateX(24px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
</style>
