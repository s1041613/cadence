<template>
  <!--
    v2 設定 · Calendars 子頁。從 v1 的 CdSettingsDrawer `calendars` pane 搬過來，外觀換成
    v2 色系（--pv2-* / 白卡 + hairline），骨架與 Notifications / Tab bar 同一套。

    兩種列的樣貌互斥，照 v1：平時是「點進細節 + 顯示開關」，Arrange 之後換成「拖曳把手」。
    差別只有一處，而且是刻意的：v1 用 HTML5 draggable，在手機上完全不會觸發；v2 是手機優先，
    所以改用 Pv2SettingsTabBar 已經在用的 pointer 拖曳，行為一樣但觸控真的能動。
    排序一放手就直接進 store（同 v1），沒有草稿狀態。
  -->
  <div class="pv2-cals">
    <header class="pv2-cals__head">
      <button type="button" class="pv2-cals__back" aria-label="返回" @click="emit('back')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--pv2-ink)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 5 L8 12 L15 19" />
        </svg>
      </button>
      <h1 class="pv2-cals__title">Calendars</h1>
      <button
        v-if="sortedCalendars.length > 1"
        type="button"
        class="pv2-cals__arrange"
        :class="{ 'pv2-cals__arrange--on': arrange }"
        @click="arrange = !arrange"
      >
        {{ arrange ? 'Done' : 'Arrange' }}
      </button>
    </header>

    <div class="pv2-cals__scroll">
      <p class="pv2-cals__group-label">{{ arrange ? 'Order · 拖曳排序' : 'Your calendars' }}</p>

      <div class="pv2-cals__card">
        <!-- A div, not a button: the row carries a CdSwitch, and a button inside a button is
             invalid HTML that browsers resolve by dropping the inner control. role/tabindex
             plus the keydown below give it the keyboard behaviour a button would have. -->
        <div
          v-for="(cal, i) in sortedCalendars"
          :key="cal.id"
          class="pv2-cals__row"
          :class="{ 'pv2-cals__row--divided': i > 0, 'pv2-cals__row--tappable': !arrange }"
          :style="rowStyle(i)"
          :role="arrange ? undefined : 'button'"
          :tabindex="arrange ? undefined : 0"
          @click="!arrange && emit('openDetail', cal.id)"
          @keydown.enter.prevent="!arrange && emit('openDetail', cal.id)"
          @keydown.space.prevent="!arrange && emit('openDetail', cal.id)"
        >
          <span v-if="cal.cover && !brokenCoverIds.has(cal.id)" class="pv2-cals__thumb">
            <img :src="cal.cover" alt="" class="pv2-cals__thumb-img" @error="onCoverError(cal.id)" />
          </span>
          <span v-else class="pv2-cals__tile" :style="{ background: calTint(cal.color) }">
            <CdIcon :name="iconOf(cal)" :size="20" :color="calIconColor(cal.color)" />
          </span>

          <span class="pv2-cals__name">{{ cal.name }}</span>

          <!-- Arrange swaps the switch for the handle: the two affordances are mutually
               exclusive, so the row never asks to be both reordered and toggled. -->
          <span
            v-if="arrange"
            class="pv2-cals__handle"
            role="button"
            :aria-label="`拖曳排序 ${cal.name}`"
            @pointerdown="onHandleDown(i, $event)"
            @pointermove="onHandleMove($event)"
            @pointerup="onHandleUp"
            @pointercancel="onHandleUp"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--pv2-line-strong)" stroke-width="1.8" stroke-linecap="round">
              <path d="M4 9 H20 M4 15 H20" />
            </svg>
          </span>
          <CdSwitch
            v-else
            size="34x19"
            :model-value="calendars.isVisible(cal.id)"
            :aria-label="`顯示 ${cal.name}`"
            @update:model-value="calendars.toggleEnabled(cal.id)"
            @click.stop
          />
        </div>

        <div v-if="!sortedCalendars.length" class="pv2-cals__empty">還沒有日曆</div>
      </div>

      <p class="pv2-cals__hint">
        {{ arrange ? '順序也決定月曆篩選列的排列。' : '關掉的日曆會從所有檢視裡隱藏，事件不會被刪除。' }}
      </p>

      <button v-if="!arrange" type="button" class="pv2-cals__add" @click="emit('openDetail', null)">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--pv2-canvas)" stroke-width="2.4" stroke-linecap="round">
          <path d="M12 5 V19 M5 12 H19" />
        </svg>
        Add calendar
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import CdIcon from '@/components/ui/CdIcon.vue'
import CdSwitch from '@/components/ui/CdSwitch.vue'
import { ICONS, type IconName } from '@/components/ui/icons'
import { useCalendarsStore } from '@/stores/calendars-store'
import type { Calendar } from '@/types/calendar'

const emit = defineEmits<{
  back: []
  /** null opens the detail pane in "add calendar" mode — same contract as v1's openAddCalendar. */
  openDetail: [id: string | null]
}>()

const calendars = useCalendarsStore()

// The store's own comment says both this pane and the filter strip render by `order`, not
// array position, so sort here rather than trusting insertion order.
const sortedCalendars = computed(() => [...calendars.calendars].sort((a, b) => a.order - b.order))

const arrange = ref(false)

// cal.icon is a free-form string in the DB, so an unknown name would throw inside CdIcon's
// ICONS lookup. Fall back to 'calendar' instead of trusting the row.
function iconOf(cal: Calendar): IconName {
  const name = cal.icon
  return name !== null && name in ICONS ? (name as IconName) : 'calendar'
}

// Same tint formula as v1, with the v2 fill standing in for --cd-surface-inset.
function calTint(color: string): string {
  return `color-mix(in srgb, ${color} 18%, var(--pv2-fill))`
}

function calIconColor(color: string): string {
  return `color-mix(in srgb, ${color} 60%, var(--pv2-ink-2))`
}

// A cover that 404s (or is a stale data URL) must not leave a blank square where the tile
// should be — remember the failure and fall through to the coloured tile.
const brokenCoverIds = ref(new Set<string>())

function onCoverError(id: string): void {
  brokenCoverIds.value = new Set([...brokenCoverIds.value, id])
}

// ── Drag to reorder ────────────────────────────────────────
// Must equal .pv2-cals__row { height: 62px } in the CSS below (border-box absorbs the
// divider). The offset maths depends on it entirely — change one, change both.
const ROW_H = 62

const drag = ref<{ from: number; y0: number; dy: number; over: number } | null>(null)

function onHandleDown(i: number, e: PointerEvent): void {
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  drag.value = { from: i, y0: e.clientY, dy: 0, over: i }
}

function onHandleMove(e: PointerEvent): void {
  const d = drag.value
  if (!d) return
  const dy = e.clientY - d.y0
  const over = Math.max(0, Math.min(sortedCalendars.value.length - 1, d.from + Math.round(dy / ROW_H)))
  drag.value = { ...d, dy, over }
}

// pointercancel binds here too: an incoming call or a system gesture breaks pointer capture,
// and without this the drag state stays non-null and the row sticks.
function onHandleUp(): void {
  const d = drag.value
  if (!d) return
  drag.value = null
  if (d.over === d.from) return
  const ids = sortedCalendars.value.map((c) => c.id)
  const [moved] = ids.splice(d.from, 1)
  if (moved === undefined) return
  ids.splice(d.over, 0, moved)
  // Committed straight away, as in v1's drop handler — the store re-derives `order` from
  // position and rolls back on a failed write, so there is nothing for a draft to protect.
  calendars.reorderCalendars(ids)
}

function rowStyle(i: number): Record<string, string> {
  const d = drag.value
  if (!d) return {}
  if (i === d.from) {
    return { transform: `translateY(${d.dy}px)`, opacity: '0.6', transition: 'none', zIndex: '2' }
  }
  if (d.from < i && i <= d.over) return { transform: `translateY(${-ROW_H}px)` }
  if (d.over <= i && i < d.from) return { transform: `translateY(${ROW_H}px)` }
  return {}
}
</script>

<style scoped>
.pv2-cals {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  /* Same as the other settings panes: inherit the frame's paper so the safe-area band
     above the header matches the content, no lighter stripe. */
  background: transparent;
}

/* Same 22px column as Pv2SettingsRoot's title, so the header does not shift sideways when
   the pane switches. */
.pv2-cals__head {
  flex: none;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 22px 16px;
  border-bottom: 1px solid var(--pv2-line-soft);
}

.pv2-cals__back {
  flex: none;
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid var(--pv2-line);
  background: #fff;
  cursor: pointer;
}

/* flex:1 pushes Arrange to the right edge without a second layout mode */
.pv2-cals__title {
  flex: 1;
  margin: 0;
  font: 400 30px var(--cd-font-serif);
  line-height: 1;
  color: var(--pv2-ink);
}

.pv2-cals__arrange {
  flex: none;
  padding: 7px 12px;
  border: none;
  border-radius: 999px;
  background: var(--pv2-fill);
  color: var(--pv2-ink-2);
  font: 600 10px var(--cd-font-mono);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.pv2-cals__arrange--on {
  background: var(--pv2-ink);
  color: #fff;
}

.pv2-cals__scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  /* Bottom clears the floating Pv2BottomNav pill. */
  padding: 20px 22px var(--pv2-nav-h);
}

.pv2-cals__group-label {
  margin: 0 0 10px 4px;
  font: 600 10px var(--cd-font-mono);
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--pv2-ink-3);
}

/* Bordered, no shadow; rows run edge to edge so the dividers read correctly */
.pv2-cals__card {
  border: 1px solid var(--pv2-line-soft);
  border-radius: 16px;
  background: #fff;
  overflow: hidden;
}

/* Height must equal ROW_H in the script; border-box absorbs the divider so the spacing
   between rows really is 62 and not 63 — Math.round(dy / ROW_H) needs that. */
.pv2-cals__row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  height: 62px;
  padding: 0 16px;
  box-sizing: border-box;
  border: none;
  background: #fff;
  text-align: left;
  transition: transform 0.18s ease;
}

.pv2-cals__row--divided {
  border-top: 1px solid var(--pv2-line-soft);
}

.pv2-cals__row--tappable {
  cursor: pointer;
}

.pv2-cals__tile,
.pv2-cals__thumb {
  flex: none;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  overflow: hidden;
}

.pv2-cals__thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.pv2-cals__name {
  flex: 1;
  min-width: 0;
  font: 600 13px var(--cd-font-mono);
  letter-spacing: 0.06em;
  color: var(--pv2-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* touch-action only on the handle — putting it on the row or the scroll container would
   stop the pane from scrolling. */
.pv2-cals__handle {
  flex: none;
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  cursor: grab;
  touch-action: none;
}

.pv2-cals__empty {
  padding: 18px 16px;
  text-align: center;
  font: 400 12px var(--cd-font-ui);
  color: var(--pv2-line-strong);
}

.pv2-cals__hint {
  margin: 10px 4px 0;
  font: 400 11px var(--cd-font-mono);
  color: var(--pv2-ink-3);
  line-height: 1.5;
}

.pv2-cals__add {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  margin-top: 20px;
  padding: 13px;
  border: none;
  border-radius: 12px;
  background: var(--pv2-ink);
  color: #fff;
  font: 600 12px var(--cd-font-mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
}
</style>
