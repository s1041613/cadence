<template>
  <div class="cd-time-dropdown">
    <button type="button" class="cd-time-dropdown__trigger" :class="{ 'cd-time-dropdown__trigger--open': open }" @click="toggle">
      <span>{{ label(modelValue) }}</span>
      <span class="cd-time-dropdown__chevron" :class="{ 'cd-time-dropdown__chevron--open': open }">
        <CdIcon name="chevron-down" :size="12" />
      </span>
    </button>
    <div v-if="open" ref="menuEl" class="cd-time-dropdown__menu">
      <button
        v-for="slot in slots"
        :key="slot"
        :ref="(el) => setItemRef(slot, el)"
        type="button"
        class="cd-time-dropdown__item"
        :class="{ 'cd-time-dropdown__item--selected': slot === modelValue }"
        @click="select(slot)"
      >
        {{ label(slot) }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import CdIcon from './CdIcon.vue'

// CdTimeDropdown — 15-minute-increment time picker dropdown. CADENCE Handoff §5.2:
// trigger 86px wide, menu 104px wide, opens upward (anchored above the trigger), max-height 208px
// scrollable, 96 entries (full 24h at 15-minute steps), selected row background
// rgba(179,172,145,.16) + font-weight 800; opening auto-scrolls so the selected item is centered
// (`scrollTop = offsetTop - 84`).
const props = defineProps<{
  modelValue: string // 'HH:MM'
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const slots: string[] = []
for (let m = 0; m < 24 * 60; m += 15) {
  const h = Math.floor(m / 60)
  const mm = m % 60
  slots.push(`${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`)
}

function label(t: string): string {
  const [hStr, mStr] = t.split(':')
  const h = Number(hStr)
  const period = h < 12 ? 'AM' : 'PM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${mStr} ${period}`
}

const open = ref(false)
const menuEl = ref<HTMLElement | null>(null)
const itemRefs = new Map<string, HTMLElement>()

function setItemRef(slot: string, el: unknown): void {
  if (el) itemRefs.set(slot, el as HTMLElement)
}

function scrollToSelected(): void {
  const item = itemRefs.get(props.modelValue)
  if (item && menuEl.value) {
    menuEl.value.scrollTop = item.offsetTop - 84
  }
}

function toggle(): void {
  open.value = !open.value
  if (open.value) {
    nextTick(scrollToSelected)
  }
}

function select(slot: string): void {
  emit('update:modelValue', slot)
  open.value = false
}

watch(open, (v) => {
  if (v) nextTick(scrollToSelected)
})
</script>

<style scoped>
.cd-time-dropdown {
  position: relative;
}

.cd-time-dropdown__trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 86px;
  border: 1px solid var(--cd-line-2);
  background: var(--cd-surface);
  border-radius: 10px;
  padding: 8px 10px;
  font: 700 12.5px var(--cd-font-mono);
  color: var(--cd-ink);
  cursor: pointer;
  transition: border-color var(--cd-duration-micro-3);
}

.cd-time-dropdown__trigger--open {
  border-color: var(--cd-olive);
}

.cd-time-dropdown__chevron {
  display: flex;
  color: var(--cd-muted);
  transform: rotate(90deg);
  transition: transform var(--cd-duration-micro-3);
}

.cd-time-dropdown__chevron--open {
  transform: rotate(-90deg);
}

.cd-time-dropdown__menu {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 0;
  width: 104px;
  max-height: 208px;
  overflow-y: auto;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 -16px 34px -16px rgba(40, 38, 30, 0.42);
  padding: 4px;
  z-index: 30;
  display: flex;
  flex-direction: column;
}

.cd-time-dropdown__item {
  border: none;
  background: transparent;
  border-radius: 8px;
  padding: 7px 10px;
  font: 500 12.5px var(--cd-font-mono);
  color: var(--cd-ink);
  cursor: pointer;
  text-align: left;
}

.cd-time-dropdown__item:hover {
  background: rgba(86, 88, 94, 0.05);
}

.cd-time-dropdown__item--selected {
  background: rgba(179, 172, 145, 0.16);
  font-weight: 800;
}
</style>
