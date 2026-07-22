<template>
  <div ref="rootEl" class="cd-time-dropdown">
    <div class="cd-time-dropdown__field" :class="{ 'cd-time-dropdown__field--open': open }">
      <input
        ref="inputEl"
        class="cd-time-dropdown__input"
        :value="draftText"
        aria-label="Time"
        :aria-expanded="open"
        @focus="openMenu"
        @click="openMenu"
        @input="onInput"
        @keydown.enter="onEnter"
        @keydown.esc="onEscape"
        @blur="onBlur"
      />
    </div>
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
import { formatTime, isTimeValue, type TimeFormatName } from '@/utils/convert-date-time'

// CdTimeDropdown — 30-minute-increment time picker dropdown, with an editable input for typing
// an arbitrary HH:MM directly. CADENCE Handoff §5.2:
// trigger 86px wide, menu 104px wide, opens upward (anchored above the trigger), max-height 208px
// scrollable, 48 entries (full 24h at 30-minute steps), selected row background
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
for (let m = 0; m < 24 * 60; m += 30) {
  const h = Math.floor(m / 60)
  const mm = m % 60
  slots.push(`${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`)
}

function label(t: string): string {
  return formatTime(t, props.format)
}

// draftText holds the input's live text, kept separate from modelValue so every keystroke
// doesn't emit — only a valid blur/Enter commits. The watcher below re-syncs draftText whenever
// modelValue changes from outside (parent writes, menu selection), so the input never goes stale.
// lastValid tracks the same committed value so an invalid blur reverts to the current model, not a
// stale earlier one (e.g. after a menu pick moved modelValue on).
const draftText = ref(props.modelValue)
const lastValid = ref(props.modelValue)

watch(
  () => props.modelValue,
  (v) => {
    draftText.value = v
    lastValid.value = v
  },
  { immediate: true }
)

function onInput(e: Event): void {
  draftText.value = (e.target as HTMLInputElement).value
}

function onEnter(e: Event): void {
  ;(e.target as HTMLInputElement).blur()
}

function onBlur(): void {
  if (isTimeValue(draftText.value)) {
    lastValid.value = draftText.value
    emit('update:modelValue', draftText.value)
  } else {
    draftText.value = lastValid.value
  }
}

function onEscape(): void {
  if (open.value) {
    close()
    return
  }
  draftText.value = lastValid.value
  ;(inputEl.value as HTMLInputElement | null)?.blur()
}

const open = ref(false)
const rootEl = ref<HTMLElement | null>(null)
const inputEl = ref<HTMLInputElement | null>(null)
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

// Chevron removed per Zoe's 2026-07-22 correction — focusing/clicking the input opens the quick-pick
// list instead. Idempotent (focus and click both fire) so it never toggles the freshly-opened menu shut.
function openMenu(): void {
  if (open.value) return
  open.value = true
  updateMenuPosition()
  nextTick(scrollToSelected)
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

function onMenuKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') close()
}

watch(open, (v) => {
  if (v) {
    nextTick(scrollToSelected)
    window.addEventListener('scroll', updateMenuPosition, true)
    window.addEventListener('resize', updateMenuPosition)
    document.addEventListener('mousedown', onOutsideInteraction)
    document.addEventListener('keydown', onMenuKeydown)
  } else {
    window.removeEventListener('scroll', updateMenuPosition, true)
    window.removeEventListener('resize', updateMenuPosition)
    document.removeEventListener('mousedown', onOutsideInteraction)
    document.removeEventListener('keydown', onMenuKeydown)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', updateMenuPosition, true)
  window.removeEventListener('resize', updateMenuPosition)
  document.removeEventListener('mousedown', onOutsideInteraction)
  document.removeEventListener('keydown', onMenuKeydown)
})
</script>

<style scoped>
.cd-time-dropdown {
  position: relative;
}

.cd-time-dropdown__field {
  display: flex;
  align-items: center;
  width: 72px;
  border: 1px solid var(--cd-line-2);
  background: var(--cd-surface);
  border-radius: 10px;
  padding: 8px 10px;
  transition: border-color var(--cd-duration-micro-3);
}

.cd-time-dropdown__field--open {
  border-color: var(--cd-olive);
}

.cd-time-dropdown__input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font: 700 12.5px var(--cd-font-mono);
  color: var(--cd-ink);
  padding: 0;
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
  color: var(--cd-olive-mix-1);
  font-weight: 800;
}
</style>
