<template>
  <div ref="rootEl" class="cd-time-dropdown">
    <button type="button" class="cd-time-dropdown__trigger" :class="{ 'cd-time-dropdown__trigger--open': open }" @click="toggle">
      <span>{{ label(modelValue) }}</span>
      <span class="cd-time-dropdown__chevron" :class="{ 'cd-time-dropdown__chevron--open': open }">
        <CdIcon name="chevron-down" :size="12" />
      </span>
    </button>
    <Teleport to="body">
      <div v-if="open" ref="menuEl" class="cd-time-dropdown__menu" :style="menuStyle">
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
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import CdIcon from './CdIcon.vue'
import { formatTime, type TimeFormatName } from '@/utils/convert-date-time'

// CdTimeDropdown — 15-minute-increment time picker dropdown. CADENCE Handoff §5.2:
// trigger 86px wide, menu 104px wide, opens upward (anchored above the trigger), max-height 208px
// scrollable, 96 entries (full 24h at 15-minute steps), selected row background
// rgba(179,172,145,.16) + font-weight 800; opening auto-scrolls so the selected item is centered
// (`scrollTop = offsetTop - 84`). Label format follows the `format` prop (user-settings spec "Time
// format applies to displayed times") — the underlying `modelValue`/slot values stay `HH:MM`
// regardless, only the rendered label switches between 12h and 24h.
// Menu is teleported to <body> and positioned with `fixed` coordinates measured from the trigger's
// own rect, rather than absolutely inside `.cd-time-dropdown` — the dropdown is used inside cards
// with `overflow: hidden`/`overflow-y: auto` (CdEventEditCard's scroll body), which otherwise clips
// the popped-open menu instead of letting it float above the card.
const props = withDefaults(
  defineProps<{
    modelValue: string // 'HH:MM'
    format?: TimeFormatName
  }>(),
  { format: '24-Hour' }
)

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
  return formatTime(t, props.format)
}

const open = ref(false)
const rootEl = ref<HTMLElement | null>(null)
const menuEl = ref<HTMLElement | null>(null)
const itemRefs = new Map<string, HTMLElement>()
const menuStyle = ref<{ position: 'fixed'; left: string; bottom: string; width: string }>({
  position: 'fixed',
  left: '0px',
  bottom: '0px',
  width: '104px'
})

function setItemRef(slot: string, el: unknown): void {
  if (el) itemRefs.set(slot, el as HTMLElement)
}

function scrollToSelected(): void {
  const item = itemRefs.get(props.modelValue)
  if (item && menuEl.value) {
    menuEl.value.scrollTop = item.offsetTop - 84
  }
}

function updateMenuPosition(): void {
  const trigger = rootEl.value
  if (!trigger) return
  const rect = trigger.getBoundingClientRect()
  menuStyle.value = {
    position: 'fixed',
    left: `${rect.left}px`,
    bottom: `${window.innerHeight - rect.top + 6}px`,
    width: '104px'
  }
}

function close(): void {
  open.value = false
}

function toggle(): void {
  open.value = !open.value
  if (open.value) {
    updateMenuPosition()
    nextTick(scrollToSelected)
  }
}

function select(slot: string): void {
  emit('update:modelValue', slot)
  open.value = false
}

function onOutsideInteraction(e: Event): void {
  const target = e.target as Node
  if (rootEl.value?.contains(target) || menuEl.value?.contains(target)) return
  close()
}

watch(open, (v) => {
  if (v) {
    nextTick(scrollToSelected)
    window.addEventListener('scroll', updateMenuPosition, true)
    window.addEventListener('resize', updateMenuPosition)
    document.addEventListener('mousedown', onOutsideInteraction)
  } else {
    window.removeEventListener('scroll', updateMenuPosition, true)
    window.removeEventListener('resize', updateMenuPosition)
    document.removeEventListener('mousedown', onOutsideInteraction)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', updateMenuPosition, true)
  window.removeEventListener('resize', updateMenuPosition)
  document.removeEventListener('mousedown', onOutsideInteraction)
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
  transition: transform var(--cd-duration-micro-3);
}

.cd-time-dropdown__chevron--open {
  transform: rotate(180deg);
}

.cd-time-dropdown__menu {
  max-height: 208px;
  overflow-y: auto;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 -16px 34px -16px rgba(40, 38, 30, 0.42);
  padding: 4px;
  /* Teleported to <body>, so this stacks as a sibling of CdPopover (z-index 50) and CdDrawer
     (z-index 70) rather than nesting inside them — must outrank both to stay visible. */
  z-index: 80;
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
