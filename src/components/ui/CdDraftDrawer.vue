<template>
  <CdDrawer width="min(440px, 46%)" scrim-color="var(--cd-scrim-strong)" @scrim-click="emit('close')">
    <div class="cd-draft">
      <div class="cd-draft__holes">
        <div v-for="i in 7" :key="i" class="cd-draft__hole" />
      </div>

      <div class="cd-draft__header">
        <span class="cd-draft__header-icon">
          <CdIcon name="journal-plain" :size="21" color="#6E6A54" />
        </span>
        <span class="cd-draft__title">Draft</span>
        <button type="button" class="cd-draft__icon-btn" aria-label="Search" @click="searchOpen = !searchOpen">
          <CdIcon name="search" :size="17" color="#8A8A80" />
        </button>
        <button type="button" class="cd-draft__icon-btn" aria-label="Close" @click="emit('close')">✕</button>
      </div>

      <div v-if="searchOpen" class="cd-draft__search">
        <input
          class="cd-draft__search-input"
          :value="searchQuery"
          placeholder="Search drafts…"
          @input="emit('update:searchQuery', ($event.target as HTMLInputElement).value)"
        />
      </div>

      <div class="cd-draft__composer">
        <button type="button" class="cd-draft__composer-plus" :class="{ 'cd-draft__composer-plus--active': composerText.trim().length > 0 }" @click="emit('submitComposer')">+</button>
        <input
          class="cd-draft__composer-input"
          :value="composerText"
          placeholder="Just jot a quick idea…"
          @input="emit('update:composerText', ($event.target as HTMLInputElement).value)"
          @keydown.enter.prevent="emit('submitComposer')"
        />
      </div>

      <div class="cd-draft__list">
        <template v-if="filteredGroups.length">
          <div v-for="group in filteredGroups" :key="group.label" class="cd-draft__group">
            <div class="cd-draft__group-label">{{ group.label }}</div>
            <div
              v-for="item in group.items"
              :key="item.id"
              class="cd-draft__row"
            >
              <CdCheckCircle :model-value="item.done" @update:model-value="emit('toggleDone', item.id)" />
              <span class="cd-draft__row-text" :class="{ 'cd-draft__row-text--done': item.done }" v-html="highlight(item.text)" />
              <div class="cd-draft__row-controls">
                <div v-if="item.scheduled" class="cd-draft__sched-tag" :style="{ background: `${item.scheduled.color}1E` }">
                  <span class="cd-draft__sched-dot" :style="{ background: item.scheduled.color, borderRadius: item.scheduled.type === 'event' ? '50%' : '2px' }" />
                  <span class="cd-draft__sched-label" :style="{ color: item.scheduled.color }">{{ item.scheduled.tag }}</span>
                </div>
                <template v-else>
                  <button v-if="item.aiSuggestion" type="button" class="cd-draft__ai-chip" :style="{ borderColor: `${item.aiSuggestion.color}66`, background: `${item.aiSuggestion.color}16` }" @click="emit('acceptAiSuggestion', item.id)">
                    <span class="cd-draft__ai-chip-label" :style="{ color: item.aiSuggestion.color }">{{ item.aiSuggestion.tag }}</span>
                  </button>
                  <button type="button" class="cd-draft__row-btn" aria-label="Schedule" @click="emit('openSchedule', item.id)">
                    <CdIcon name="calendar" :size="16" color="#8F8A6E" />
                  </button>
                  <button type="button" class="cd-draft__row-btn" aria-label="Remove" @click="emit('removeItem', item.id)">
                    <CdIcon name="x-small" :size="12" color="#8F8C7E" />
                  </button>
                </template>
              </div>
            </div>
          </div>
        </template>
        <div v-else class="cd-draft__empty">
          <CdIcon name="search" :size="28" color="#B0AD9F" :stroke-width="1.6" />
          <span>No drafts found</span>
        </div>
      </div>
    </div>

    <div v-if="scheduleItem" class="cd-draft__conv-overlay">
      <CdScrim color="var(--cd-scrim-light)" @click="emit('closeSchedule')" />
      <div class="cd-draft__conv-card">
        <div class="cd-draft__conv-head">
          <span class="cd-draft__conv-eyebrow">SCHEDULE DRAFT</span>
          <button type="button" class="cd-draft__conv-close" @click="emit('closeSchedule')">✕</button>
        </div>
        <input
          class="cd-draft__conv-title"
          :value="scheduleItem.title"
          placeholder="Draft title"
          @input="patchSchedule({ title: ($event.target as HTMLInputElement).value })"
        />
        <CdSegmented
          :model-value="scheduleItem.type"
          :options="[{ value: 'task', label: 'Task' }, { value: 'event', label: 'Event' }]"
          @update:model-value="(v) => patchSchedule({ type: v as 'task' | 'event' })"
        />
        <div v-if="scheduleItem.type === 'task'" class="cd-draft__quad-row">
          <button
            v-for="q in quadOptions"
            :key="q.key"
            type="button"
            class="cd-draft__quad-pill"
            :style="scheduleItem.quad === q.key ? { background: q.color, borderColor: q.color, color: '#fff' } : { borderColor: 'var(--cd-line-5)', color: '#6E6A5E' }"
            @click="patchSchedule({ quad: q.key })"
          >
            <span class="cd-draft__quad-dot" :style="{ background: scheduleItem.quad === q.key ? '#fff' : q.color }" />
            {{ q.label }}
          </button>
        </div>
        <div class="cd-draft__when-row">
          <button type="button" class="cd-draft__when-pill" @click="emit('cycleWhen')">
            <CdIcon name="calendar" :size="15" color="#8F8A6E" />
            {{ scheduleItem.when }}
          </button>
          <button type="button" class="cd-draft__allday-toggle" @click="patchSchedule({ allDay: !scheduleItem.allDay })">
            <CdSwitch :model-value="scheduleItem.allDay" size="34x19" @update:model-value="(v) => patchSchedule({ allDay: v })" />
            All-day
          </button>
        </div>
        <div v-if="!scheduleItem.allDay" class="cd-draft__time-row">
          <CdTimeDropdown :model-value="scheduleItem.start" @update:model-value="(v) => patchSchedule({ start: v })" />
          <span>–</span>
          <CdTimeDropdown :model-value="scheduleItem.end" @update:model-value="(v) => patchSchedule({ end: v })" />
        </div>

        <div class="cd-draft__availability">
          <div class="cd-draft__availability-head">
            <span class="cd-draft__availability-label">AVAILABILITY</span>
            <span class="cd-draft__availability-when">{{ scheduleItem.when }}</span>
          </div>
          <div class="cd-draft__availability-bar">
            <div
              v-for="(busy, i) in busySlots"
              :key="i"
              class="cd-draft__busy-block"
              :style="{
                left: `${pctOf(busy.startMin)}%`,
                width: `${pctOf(busy.endMin) - pctOf(busy.startMin)}%`,
                background: `repeating-linear-gradient(45deg, ${busy.color}2b, ${busy.color}2b 4px, transparent 4px, transparent 8px)`,
                borderLeft: `2px solid ${busy.color}77`
              }"
            />
            <div
              v-if="!scheduleItem.allDay && scheduleItem.type === 'event'"
              class="cd-draft__proposal-block"
              :style="{
                left: `${pctOf(startMinutes)}%`,
                width: `${Math.max(3, pctOf(endMinutes) - pctOf(startMinutes))}%`,
                background: hasConflict ? '#C0564B' : '#7BA05B'
              }"
            />
          </div>
          <div class="cd-draft__availability-axis">
            <span>8 AM</span><span>2 PM</span><span>8 PM</span>
          </div>
          <div class="cd-draft__verdict" :style="verdictStyle">
            <span class="cd-draft__verdict-dot" :style="{ background: verdictDotColor }" />
            {{ verdictText }}
          </div>
        </div>

        <div class="cd-draft__conv-footer">
          <button type="button" class="cd-draft__conv-cancel" @click="emit('closeSchedule')">Cancel</button>
          <button type="button" class="cd-draft__conv-add" @click="emit('confirmSchedule')">Add to calendar</button>
        </div>
      </div>
    </div>
  </CdDrawer>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import CdDrawer from './CdDrawer.vue'
import CdScrim from './CdScrim.vue'
import CdCheckCircle from './CdCheckCircle.vue'
import CdSegmented from './CdSegmented.vue'
import CdSwitch from './CdSwitch.vue'
import CdTimeDropdown from './CdTimeDropdown.vue'
import CdIcon from './CdIcon.vue'

// CdDraftDrawer — Inbox/Draft drawer with composer, grouped rows, search, and schedule sheet.
// design-research-report.md §3.12. Paper texture bg #EEEBE1 + dot-grid, top binding holes,
// composer 46px pill, schedule sheet's AVAILABILITY bar (8AM-8PM, 45deg stripe busy blocks,
// solid proposal block green=free/red=conflict).
//
// CADENCE Handoff §_jDrawer: desk wrapper scrim is rgba(40,38,30,.34) (--cd-scrim-strong), not the
// lighter --cd-scrim-light used elsewhere. Width min(440px,46%) confirmed correct.
export interface DraftItem {
  id: string
  text: string
  done: boolean
  scheduled?: { type: 'task' | 'event'; color: string; tag: string }
  aiSuggestion?: { color: string; tag: string }
}

export interface DraftGroup {
  label: string
  items: DraftItem[]
}

export interface ScheduleDraft {
  title: string
  type: 'task' | 'event'
  quad: 'do' | 'plan' | 'quick' | 'later'
  allDay: boolean
  start: string
  end: string
  when: string
}

export interface BusySlot {
  startMin: number
  endMin: number
  label: string
  color: string
}

const props = defineProps<{
  groups: DraftGroup[]
  composerText: string
  searchQuery: string
  scheduleItem: ScheduleDraft | null
  busySlots: BusySlot[]
}>()

const emit = defineEmits<{
  close: []
  'update:composerText': [value: string]
  submitComposer: []
  'update:searchQuery': [value: string]
  toggleDone: [id: string]
  removeItem: [id: string]
  openSchedule: [id: string]
  closeSchedule: []
  updateSchedule: [value: ScheduleDraft]
  confirmSchedule: []
  cycleWhen: []
  acceptAiSuggestion: [id: string]
}>()

const searchOpen = ref(false)

const quadOptions = [
  { key: 'plan' as const, label: 'Plan', color: '#6E839B' },
  { key: 'do' as const, label: 'Do Now', color: '#C56A5E' },
  { key: 'quick' as const, label: 'Quick', color: '#BFA86A' },
  { key: 'later' as const, label: 'Later', color: '#9A988F' }
]

const filteredGroups = computed(() => {
  const q = props.searchQuery.trim().toLowerCase()
  if (!q) return props.groups
  return props.groups
    .map((g) => ({ label: g.label, items: g.items.filter((i) => i.text.toLowerCase().includes(q)) }))
    .filter((g) => g.items.length > 0)
})

// Small helper so template call sites don't need to spread `scheduleItem` (typed `ScheduleDraft | null`)
// directly, which vue-tsc's template type-checker doesn't narrow across nested arrow-function emits.
function patchSchedule(patch: Partial<ScheduleDraft>): void {
  if (!props.scheduleItem) return
  emit('updateSchedule', { ...props.scheduleItem, ...patch })
}

function highlight(text: string): string {
  const q = props.searchQuery.trim().toLowerCase()
  if (!q) return text
  const idx = text.toLowerCase().indexOf(q)
  if (idx < 0) return text
  return `${text.slice(0, idx)}<mark style="background:#DFE2A0;color:inherit;border-radius:3px;padding:0 1px">${text.slice(idx, idx + q.length)}</mark>${text.slice(idx + q.length)}`
}

const DAY_START = 8 * 60
const DAY_END = 20 * 60
const SPAN = DAY_END - DAY_START

function pctOf(min: number): number {
  return Math.max(0, Math.min(100, ((min - DAY_START) / SPAN) * 100))
}

function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

const startMinutes = computed(() => toMinutes(props.scheduleItem?.start ?? '09:00'))
const endMinutes = computed(() => toMinutes(props.scheduleItem?.end ?? '10:00'))

const conflictSlot = computed(() => {
  if (!props.scheduleItem || props.scheduleItem.allDay || props.scheduleItem.type !== 'event') return null
  return props.busySlots.find((b) => startMinutes.value < b.endMin && endMinutes.value > b.startMin) ?? null
})

const hasConflict = computed(() => !!conflictSlot.value)

const freeHours = computed(() => {
  const busyMin = props.busySlots.reduce((acc, b) => acc + (b.endMin - b.startMin), 0)
  return Math.round(((SPAN - busyMin) / 60) * 10) / 10
})

const timed = computed(() => !!props.scheduleItem && !props.scheduleItem.allDay && props.scheduleItem.type === 'event')

const verdictText = computed(() => {
  if (!props.scheduleItem) return ''
  if (timed.value) {
    return conflictSlot.value ? `Overlaps "${conflictSlot.value.label}"` : "You're free at this time"
  }
  return `${freeHours.value} hrs free that day · room to schedule`
})

const verdictDotColor = computed(() => {
  if (!timed.value) return 'var(--cd-olive)'
  return conflictSlot.value ? 'var(--cd-danger)' : '#7BA05B'
})

const verdictStyle = computed(() => {
  if (!timed.value) return { background: '#EDEAE0', color: '#7A776C' }
  return conflictSlot.value ? { background: '#C0564B15', color: '#B0463C' } : { background: '#7BA05B1c', color: '#5C7A46' }
})
</script>

<style scoped>
.cd-draft {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--cd-draft-paper);
  background-image: radial-gradient(#c9c6b8 1.2px, transparent 1.2px);
  background-size: 22px 22px;
  background-position: 11px 11px;
  overflow: hidden;
}

.cd-draft__holes {
  display: flex;
  justify-content: space-between;
  padding: 15px 26px 3px;
  flex: none;
}

.cd-draft__hole {
  width: 13px;
  height: 23px;
  border-radius: 999px;
  background: var(--cd-topbar);
  box-shadow: inset 0 2.5px 3px rgba(74, 70, 52, 0.3), inset 0 -1.5px 1.5px rgba(255, 255, 255, 0.55);
  flex: none;
}

.cd-draft__header {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 22px;
  border-bottom: 1px solid rgba(120, 116, 100, 0.18);
  flex: none;
}

.cd-draft__header-icon {
  width: 38px;
  height: 38px;
  flex: none;
  border-radius: 11px;
  display: grid;
  place-items: center;
}

.cd-draft__title {
  flex: 1;
  font: 800 20px var(--cd-font-title);
  letter-spacing: -0.01em;
  color: #3a3833;
}

.cd-draft__icon-btn {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #8a8a80;
  display: grid;
  place-items: center;
  transition: background var(--cd-duration-micro-3);
}

.cd-draft__icon-btn:hover {
  background: rgba(74, 70, 52, 0.1);
}

.cd-draft__search {
  padding: 8px 22px;
  flex: none;
}

.cd-draft__search-input {
  width: 100%;
  box-sizing: border-box;
  border: none;
  outline: none;
  background: #e4e1d7;
  border-radius: 999px;
  padding: 10px 16px;
  font: 500 14px var(--cd-font-ui);
  color: #3a3833;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.06);
}

.cd-draft__composer {
  margin: 16px 22px 0;
  height: 46px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 2px solid var(--cd-line-5);
  background: #f4f2ea;
  border-radius: 999px;
  padding: 0 20px 0 14px;
  box-shadow: 0 3px 10px -5px rgba(60, 58, 48, 0.22);
  transition: border-color var(--cd-duration-micro-4), background var(--cd-duration-micro-4);
  flex: none;
}

.cd-draft__composer-plus {
  flex: none;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 22px;
  line-height: 1;
  color: #c9c6bb;
  transition: color var(--cd-duration-micro-4);
}

.cd-draft__composer-plus--active {
  color: #8f8a6e;
  font-weight: 500;
}

.cd-draft__composer-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font: 500 15px var(--cd-font-title);
  color: #3a3a34;
}

.cd-draft__list {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 16px;
}

.cd-draft__group-label {
  position: sticky;
  top: 0;
  font: 700 11px var(--cd-font-ui);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #a29f93;
  padding: 14px 26px 6px;
}

.cd-draft__row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 3px 24px;
  padding: 10px 16px;
  border-radius: var(--cd-radius-field);
  transition: background var(--cd-duration-micro-4);
}

.cd-draft__row:hover {
  background: rgba(74, 70, 52, 0.022);
}

.cd-draft__row-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font: 900 15px var(--cd-font-draft);
  letter-spacing: -0.01em;
  color: #5c5c52;
  line-height: 1.3;
}

.cd-draft__row-text--done {
  color: #a7a59b;
  text-decoration: line-through;
}

.cd-draft__row-controls {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: none;
}

.cd-draft__sched-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  padding: 3px 10px;
}

.cd-draft__sched-dot {
  width: 7px;
  height: 7px;
  flex: none;
}

.cd-draft__sched-label {
  font: 700 11px var(--cd-font-ui);
  white-space: nowrap;
}

.cd-draft__ai-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  border: 1px solid;
  border-radius: 999px;
  padding: 3px 9px 3px 7px;
  cursor: pointer;
}

.cd-draft__ai-chip-label {
  font: 700 11px var(--cd-font-ui);
  white-space: nowrap;
}

.cd-draft__row-btn {
  width: 26px;
  height: 26px;
  flex: none;
  border-radius: 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: background var(--cd-duration-micro-4), opacity var(--cd-duration-micro-3);
}

.cd-draft__row-btn:hover {
  background: rgba(74, 70, 52, 0.1);
}

.cd-draft__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 60px 20px;
  color: #b0ad9f;
  font: 500 13px var(--cd-font-ui);
}

.cd-draft__conv-overlay {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: flex-end;
}

.cd-draft__conv-card {
  position: relative;
  width: 100%;
  background: var(--cd-editor-card);
  border-radius: 22px 22px 0 0;
  border-top: 1px solid #e2dfd3;
  box-shadow: 0 -18px 40px -20px rgba(40, 38, 30, 0.4);
  padding: 16px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 13px;
  animation: cd-sheetUp var(--cd-duration-sheet-draft) var(--cd-ease-standard);
}

.cd-draft__conv-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.cd-draft__conv-eyebrow {
  font: 800 12px var(--cd-font-mono);
  letter-spacing: 0.08em;
  color: #8f8a6e;
}

.cd-draft__conv-close {
  width: 26px;
  height: 26px;
  border: none;
  background: #e7e4da;
  border-radius: 50%;
  cursor: pointer;
  color: #8a8a80;
  font-size: 13px;
}

.cd-draft__conv-title {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--cd-line-5);
  border-radius: var(--cd-radius-matrix);
  background: #fbfaf6;
  padding: 12px 14px;
  font: 700 15px var(--cd-font-title);
  color: #3a3833;
  outline: none;
}

.cd-draft__quad-row {
  display: flex;
  gap: 7px;
  flex-wrap: wrap;
}

.cd-draft__quad-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid;
  border-radius: 999px;
  padding: 7px 12px;
  cursor: pointer;
  font: 600 12px var(--cd-font-ui);
  background: #fbfaf6;
}

.cd-draft__quad-dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
}

.cd-draft__when-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.cd-draft__when-pill,
.cd-draft__allday-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--cd-line-5);
  background: #fbfaf6;
  border-radius: 10px;
  padding: 9px 13px;
  cursor: pointer;
  font: 600 13px var(--cd-font-ui);
  color: #4a473e;
}

.cd-draft__time-row {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--cd-muted);
}

.cd-draft__availability {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.cd-draft__availability-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.cd-draft__availability-label {
  font: 800 10px var(--cd-font-mono);
  letter-spacing: 0.1em;
  color: #9a988f;
}

.cd-draft__availability-when {
  font: 600 11px var(--cd-font-ui);
  color: #b0ad9f;
}

.cd-draft__availability-bar {
  position: relative;
  height: 30px;
  border-radius: 8px;
  background: #efede4;
  overflow: hidden;
  border: 1px solid var(--cd-line-5);
}

.cd-draft__busy-block {
  position: absolute;
  top: 0;
  bottom: 0;
}

.cd-draft__proposal-block {
  position: absolute;
  top: 3px;
  bottom: 3px;
  border-radius: 5px;
  box-shadow: 0 2px 6px -2px rgba(0, 0, 0, 0.35);
}

.cd-draft__availability-axis {
  display: flex;
  justify-content: space-between;
  font: 600 8.5px var(--cd-font-mono);
  color: #c2bfb3;
  margin-top: -2px;
}

.cd-draft__verdict {
  display: flex;
  align-items: center;
  gap: 7px;
  border-radius: 9px;
  padding: 8px 11px;
  font: 700 12px var(--cd-font-ui);
}

.cd-draft__verdict-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex: none;
}

.cd-draft__conv-footer {
  display: flex;
  gap: 10px;
  margin-top: 4px;
}

.cd-draft__conv-cancel {
  flex: none;
  border: 1px solid var(--cd-line-5);
  background: transparent;
  cursor: pointer;
  font: 700 13px var(--cd-font-ui);
  color: #8a8779;
  border-radius: 11px;
  padding: 11px 18px;
}

.cd-draft__conv-add {
  flex: 1;
  border: none;
  background: #8f8a6e;
  color: #fff;
  cursor: pointer;
  font: 700 13.5px var(--cd-font-ui);
  border-radius: 11px;
  padding: 11px 0;
}
</style>
