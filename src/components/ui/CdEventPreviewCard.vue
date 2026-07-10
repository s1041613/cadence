<template>
  <div class="cd-preview-card">
    <div class="cd-preview-card__top">
      <span class="cd-preview-card__eyebrow">{{ isTask ? 'Auto-scheduled' : 'Calendar event' }}</span>
      <div class="cd-preview-card__actions">
        <CdIconButton :size="30" ariaLabel="Copy" @click="emit('copy')">
          <CdIcon name="copy" :size="16" color="#6E7176" />
        </CdIconButton>
        <CdIconButton :size="30" ariaLabel="Edit" @click="emit('edit')">
          <CdIcon name="pencil" :size="16" color="#6E7176" />
        </CdIconButton>
        <CdIconButton :size="30" danger ariaLabel="Delete" @click="emit('delete')">
          <CdIcon name="trash" :size="16" color="#C0564B" />
        </CdIconButton>
        <button type="button" class="cd-preview-card__close" aria-label="Close" @click="emit('close')">✕</button>
      </div>
    </div>

    <div class="cd-preview-card__title-row">
      <span class="cd-preview-card__swatch" :style="{ background: color }" />
      <div class="cd-preview-card__title-block">
        <span class="cd-preview-card__title">{{ title }}</span>
        <span class="cd-preview-card__when">{{ whenLabel }}</span>
      </div>
    </div>

    <div class="cd-preview-card__info">
      <div class="cd-preview-card__info-row">
        <CdIcon name="bell" :size="18" color="#9C9E94" />
        <span>{{ alertLabel }}</span>
      </div>
      <div class="cd-preview-card__info-row">
        <CdIcon name="target" :size="18" color="#9C9E94" />
        <span>{{ quadLabel }}</span>
      </div>
      <div class="cd-preview-card__info-row cd-preview-card__info-row--muted">
        <CdIcon name="info" :size="18" color="#9C9E94" />
        <span>Add context to get better suggestions</span>
      </div>
    </div>

    <div class="cd-preview-card__managed">
      <button type="button" class="cd-preview-card__managed-head" @click="expanded = !expanded">
        <span class="cd-preview-card__managed-icon" />
        <span class="cd-preview-card__managed-label">Managed by Cadence AI</span>
        <span class="cd-preview-card__managed-chevron" :class="{ 'cd-preview-card__managed-chevron--open': expanded }">
          <CdIcon name="chevron-right" :size="14" color="#56585E" />
        </span>
      </button>
      <div v-if="expanded" class="cd-preview-card__managed-body">
        <CdMemberStack v-if="!isTask && guests" :members="guests" />
        <template v-else-if="isTask">
          <div class="cd-preview-card__pomodoro">🍅🍅 {{ completedPomodoros }} / {{ estimatedPomodoros }} focus sessions logged</div>
          <p class="cd-preview-card__managed-note">Cadence AI schedules this task automatically based on your open time and priority.</p>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import CdIconButton from './CdIconButton.vue'
import CdMemberStack from './CdMemberStack.vue'
import CdIcon from './CdIcon.vue'

// CdEventPreviewCard — anchored preview popover (inside CdPopover). design-research-report.md §3.8.
// desk width 370px. eyebrow: event="Calendar event", task="Auto-scheduled" (800 12px mono uppercase #B3AC91).
// Title row: 13x13 quadrant-color swatch (v2: circular, border-radius 50% — was 4px square-ish in v1)
// + 800 18px Zen Kaku title + when line (600 13px #6E7176).
// "Managed by Cadence AI" collapsible: chevron rotates 90deg on expand (.2s ease); event shows guest
// member stack, task shows "🍅🍅 N/M focus sessions logged" + muted explanatory text.
defineProps<{
  title: string
  color: string
  whenLabel: string
  isTask: boolean
  alertLabel: string
  quadLabel: string
  guests?: Array<{ id: string; name: string; avatar: string }>
  completedPomodoros?: number
  estimatedPomodoros?: number
}>()

const emit = defineEmits<{
  copy: []
  edit: []
  delete: []
  close: []
}>()

const expanded = ref(false)
</script>

<style scoped>
.cd-preview-card {
  width: 370px;
  background: #fff;
  border: 1px solid var(--cd-line-4);
  border-radius: var(--cd-radius-preview);
  padding: 18px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.cd-preview-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.cd-preview-card__eyebrow {
  font: 800 12px var(--cd-font-mono);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--cd-olive);
}

.cd-preview-card__actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.cd-preview-card__close {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: none;
  background: var(--cd-topbar);
  cursor: pointer;
  color: var(--cd-ink);
  transition: background var(--cd-duration-micro-3);
}

.cd-preview-card__close:hover {
  background: var(--cd-line-4);
}

.cd-preview-card__title-row {
  display: flex;
  gap: 10px;
}

.cd-preview-card__swatch {
  width: 13px;
  height: 13px;
  border-radius: 50%;
  flex: none;
  margin-top: 4px;
}

.cd-preview-card__title-block {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cd-preview-card__title {
  font: 800 18px var(--cd-font-title);
  color: var(--cd-ink);
}

.cd-preview-card__when {
  font: 600 13px var(--cd-font-ui);
  color: var(--cd-ink-2);
}

.cd-preview-card__info {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.cd-preview-card__info-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font: 600 13.5px var(--cd-font-ui);
  color: var(--cd-ink);
}

.cd-preview-card__info-row--muted {
  color: var(--cd-muted);
}

.cd-preview-card__managed {
  border-top: 1px solid var(--cd-line-4);
  padding-top: 12px;
}

.cd-preview-card__managed-head {
  display: flex;
  align-items: center;
  gap: 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
  width: 100%;
}

.cd-preview-card__managed-icon {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  background: var(--cd-olive);
  flex: none;
}

.cd-preview-card__managed-label {
  font: 700 13px var(--cd-font-ui);
  color: var(--cd-ink);
  flex: 1;
  text-align: left;
}

.cd-preview-card__managed-chevron {
  display: flex;
  transition: transform var(--cd-duration-micro-5) ease;
}

.cd-preview-card__managed-chevron--open {
  transform: rotate(90deg);
}

.cd-preview-card__managed-body {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cd-preview-card__pomodoro {
  font: 600 13px var(--cd-font-ui);
  color: var(--cd-ink);
}

.cd-preview-card__managed-note {
  margin: 0;
  font: 500 12px var(--cd-font-ui);
  color: var(--cd-muted);
}
</style>
