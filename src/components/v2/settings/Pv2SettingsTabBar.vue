<template>
  <!--
    v2 settings · Tab bar pane. Drag to reorder, remove from or add back to the
    bottom nav, capped at 4. Edits are staged: Back discards them, the header
    check button is what commits to v2-tabs-store.
  -->
  <div class="pv2-tabs">
    <header class="pv2-tabs__head">
      <button type="button" class="pv2-tabs__back" aria-label="返回" @click="emit('back')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1b1b1b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 5 L8 12 L15 19" />
        </svg>
      </button>
      <h1 class="pv2-tabs__title">Tab bar</h1>
      <button
        type="button"
        class="pv2-tabs__save"
        :class="{ 'pv2-tabs__save--dirty': isDirty }"
        :aria-label="isDirty ? '儲存' : '完成'"
        @click="onCommit"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 12.5 9.5 18 20 6.5" />
        </svg>
      </button>
    </header>

    <div class="pv2-tabs__scroll">
      <div class="pv2-tabs__section-head">
        <p class="pv2-tabs__group-label">Shown · 拖曳排序</p>
        <span class="pv2-tabs__counter" :class="{ 'pv2-tabs__counter--full': draftIsFull }">
          {{ draft.length }} / {{ MAX_SHOWN_TABS }}
        </span>
      </div>

      <div class="pv2-tabs__card">
        <div
          v-for="(tab, i) in draftTabs"
          :key="tab.key"
          class="pv2-tabs__row"
          :class="{ 'pv2-tabs__row--divided': i > 0 }"
          :style="rowStyle(i)"
        >
          <button
            type="button"
            class="pv2-tabs__circle pv2-tabs__circle--minus"
            :class="{ 'pv2-tabs__circle--off': !canRemove(tab.key) }"
            :disabled="!canRemove(tab.key)"
            :aria-disabled="!canRemove(tab.key)"
            :aria-label="removeLabel(tab)"
            @click="removeTab(tab.key)"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round">
              <path d="M6 12 H18" />
            </svg>
          </button>

          <span class="pv2-tabs__disc">{{ tab.glyph }}</span>

          <div class="pv2-tabs__text">
            <div class="pv2-tabs__name">{{ tab.title }}</div>
            <div class="pv2-tabs__desc">{{ tab.description }}</div>
          </div>

          <span
            class="pv2-tabs__handle"
            role="button"
            :aria-label="`拖曳排序 ${tab.title}`"
            @pointerdown="onHandleDown(i, $event)"
            @pointermove="onHandleMove($event)"
            @pointerup="onHandleUp"
            @pointercancel="onHandleUp"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#c4c4c4" stroke-width="1.8" stroke-linecap="round">
              <path d="M4 9 H20 M4 15 H20" />
            </svg>
          </span>
        </div>
      </div>

      <p class="pv2-tabs__hint">最多 {{ MAX_SHOWN_TABS }} 個 · Setting 無法移除</p>

      <p class="pv2-tabs__group-label">Hidden</p>
      <div class="pv2-tabs__card">
        <div
          v-for="(tab, i) in hiddenTabs"
          :key="tab.key"
          class="pv2-tabs__row"
          :class="{ 'pv2-tabs__row--divided': i > 0 }"
        >
          <button
            type="button"
            class="pv2-tabs__circle pv2-tabs__circle--plus"
            :class="{ 'pv2-tabs__circle--off': draftIsFull }"
            :disabled="draftIsFull"
            :aria-disabled="draftIsFull"
            :aria-label="draftIsFull ? `導覽列已滿，無法加入 ${tab.title}` : `加入 ${tab.title}`"
            @click="addTab(tab.key)"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round">
              <path d="M12 6 V18 M6 12 H18" />
            </svg>
          </button>

          <span class="pv2-tabs__disc pv2-tabs__disc--off">{{ tab.glyph }}</span>

          <div class="pv2-tabs__text">
            <div class="pv2-tabs__name" :class="{ 'pv2-tabs__name--off': draftIsFull }">{{ tab.title }}</div>
            <div class="pv2-tabs__desc pv2-tabs__desc--off">{{ tab.description }}</div>
          </div>
        </div>

        <!-- Unreachable while the catalogue holds 5 and the cap is 4, but correct the
             day the catalogue shrinks to 4. Not dead code — don't delete it. -->
        <div v-if="!hiddenTabs.length" class="pv2-tabs__empty">全部都在導覽列上</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  useV2TabsStore,
  canRemoveFrom,
  isFullList,
  V2_TAB_CATALOGUE,
  MAX_SHOWN_TABS,
  type NavKey,
  type V2Tab
} from '@/stores/v2-tabs-store'

const emit = defineEmits<{
  back: []
}>()

const store = useV2TabsStore()

// Staged edits. The component's lifetime IS the edit session — SettingsPageV2
// creates and destroys the pane with v-if — so the draft lives here and dies with
// the component on Back. No begin/discard protocol needed on the store side.
const draft = ref<NavKey[]>([...store.shownKeys])

const isDirty = computed(
  () =>
    draft.value.length !== store.shownKeys.length ||
    draft.value.some((k, i) => k !== store.shownKeys[i])
)

const findTab = (key: NavKey): V2Tab | undefined => V2_TAB_CATALOGUE.find((t) => t.key === key)

const draftTabs = computed<V2Tab[]>(() =>
  draft.value.map(findTab).filter((t): t is V2Tab => t !== undefined)
)

const hiddenTabs = computed<V2Tab[]>(() =>
  V2_TAB_CATALOGUE.filter((t) => !draft.value.includes(t.key))
)

// Rules applied to the in-progress draft. The store's same-named getters read
// committed state, which would answer the wrong question mid-edit.
const draftIsFull = computed(() => isFullList(draft.value))
const canRemove = (key: NavKey): boolean => canRemoveFrom(draft.value, key)

const removeLabel = (tab: V2Tab): string =>
  canRemove(tab.key) ? `移出 ${tab.title}` : `${tab.title} 無法從導覽列移除`

function addTab(key: NavKey): void {
  if (draftIsFull.value || draft.value.includes(key)) return
  draft.value = [...draft.value, key]
}

function removeTab(key: NavKey): void {
  if (!canRemove(key)) return
  draft.value = draft.value.filter((k) => k !== key)
}

function onCommit(): void {
  store.setShownKeys([...draft.value])
  emit('back')
}

// ── Drag to reorder ────────────────────────────────────────
// Must equal .pv2-tabs__row { height: 60px } in the CSS below (border-box absorbs
// the divider). The offset maths depends on it entirely — change one, change both.
const ROW_H = 60

const drag = ref<{ from: number; y0: number; dy: number; over: number } | null>(null)

function onHandleDown(i: number, e: PointerEvent): void {
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  drag.value = { from: i, y0: e.clientY, dy: 0, over: i }
}

function onHandleMove(e: PointerEvent): void {
  const d = drag.value
  if (!d) return
  const dy = e.clientY - d.y0
  const over = Math.max(0, Math.min(draft.value.length - 1, d.from + Math.round(dy / ROW_H)))
  drag.value = { ...d, dy, over }
}

// pointercancel binds here too: an incoming call or a system gesture breaks pointer
// capture, and without this the drag state stays non-null and the row sticks.
function onHandleUp(): void {
  const d = drag.value
  if (!d) return
  if (d.over !== d.from) {
    const next = [...draft.value]
    const [moved] = next.splice(d.from, 1)
    if (moved !== undefined) next.splice(d.over, 0, moved)
    draft.value = next
  }
  drag.value = null
}

function rowStyle(i: number): Record<string, string> {
  const d = drag.value
  if (!d) return {}
  if (i === d.from) {
    return {
      transform: `translateY(${d.dy}px)`,
      opacity: '0.6',
      transition: 'none',
      zIndex: '2'
    }
  }
  if (d.from < i && i <= d.over) return { transform: `translateY(${-ROW_H}px)` }
  if (d.over <= i && i < d.from) return { transform: `translateY(${ROW_H}px)` }
  return {}
}
</script>

<style scoped>
.pv2-tabs {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  /* Same as the other settings panes: inherit the frame's paper so the safe-area band
     above the header matches the content, no lighter stripe. */
  background: transparent;
}

.pv2-tabs__head {
  flex: none;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  border-bottom: 1px solid #e2e2e2;
}

.pv2-tabs__back {
  flex: none;
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid #d6d6d0;
  background: #fff;
  cursor: pointer;
}

/* flex:1 pushes the check button to the right edge without a second layout mode */
.pv2-tabs__title {
  flex: 1;
  margin: 0;
  font: 400 30px var(--cd-font-serif);
  line-height: 1;
  color: #1b1b1b;
}

.pv2-tabs__save {
  flex: none;
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: #efefef;
  color: #9c9c9c;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.pv2-tabs__save--dirty {
  background: #1b1b1b;
  color: #fff;
}

.pv2-tabs__scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 20px 22px 24px;
}

.pv2-tabs__section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.pv2-tabs__group-label {
  margin: 0 0 10px 4px;
  font: 600 10px var(--cd-font-mono);
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: #9c9c9c;
}

.pv2-tabs__scroll > .pv2-tabs__group-label {
  margin-top: 24px;
}

.pv2-tabs__counter {
  margin-right: 4px;
  font: 600 10px var(--cd-font-mono);
  letter-spacing: 0.1em;
  color: #9c9c9c;
  /* Tabular figures so the count doesn't shift the layout as it changes */
  font-variant-numeric: tabular-nums;
}

.pv2-tabs__counter--full {
  color: #1b1b1b;
}

/* Bordered, no shadow; rows run edge to edge so the dividers read correctly */
.pv2-tabs__card {
  border: 1px solid #e2e2e2;
  border-radius: 16px;
  background: #fff;
  overflow: hidden;
}

/* Height must equal ROW_H in the script; border-box absorbs the divider so the
   spacing between rows really is 60 and not 61 — Math.round(dy / ROW_H) needs that. */
.pv2-tabs__row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  height: 60px;
  padding: 0 16px;
  box-sizing: border-box;
  background: #fff;
  transition: transform 0.18s ease;
}

.pv2-tabs__row--divided {
  border-top: 1px solid #e2e2e2;
}

.pv2-tabs__circle {
  flex: none;
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: 50%;
  cursor: pointer;
}

.pv2-tabs__circle--minus {
  background: #c56a5e;
}

.pv2-tabs__circle--plus {
  background: #7c9b72;
}

.pv2-tabs__circle--off {
  background: #e2e2e2;
  cursor: not-allowed;
}

.pv2-tabs__disc {
  flex: none;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #1b1b1b;
  font: 400 17px var(--cd-font-display);
  line-height: 1;
  color: #fff;
}

.pv2-tabs__disc--off {
  background: #efefef;
  color: #9c9c9c;
}

.pv2-tabs__text {
  flex: 1;
  min-width: 0;
}

.pv2-tabs__name {
  font: 600 13px var(--cd-font-mono);
  letter-spacing: 0.06em;
  color: #1b1b1b;
}

.pv2-tabs__name--off {
  color: #9c9c9c;
}

/* nowrap + ellipsis is insurance: a long description truncates instead of growing
   the row and silently breaking the ROW_H assumption the drag maths makes. */
.pv2-tabs__desc {
  margin-top: 2px;
  font: 400 11px var(--cd-font-mono);
  color: #9c9c9c;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pv2-tabs__desc--off {
  color: #c4c4c4;
}

/* touch-action only on the handle — putting it on the row or the scroll container
   would stop the pane from scrolling. */
.pv2-tabs__handle {
  flex: none;
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  cursor: grab;
  touch-action: none;
}

.pv2-tabs__hint {
  margin: 10px 4px 0;
  font: 400 11px var(--cd-font-mono);
  color: #9c9c9c;
  line-height: 1.5;
}

.pv2-tabs__empty {
  padding: 18px 16px;
  text-align: center;
  font: 400 12px var(--cd-font-ui);
  color: #c4c4c4;
}
</style>
