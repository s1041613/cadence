<template>
  <div class="cd-preview-card">
    <div class="cd-preview-card__top">
      <span class="cd-preview-card__eyebrow">{{ eyebrowLabel }}</span>
      <div class="cd-preview-card__actions">
        <template v-if="mine">
          <CdIconButton class="cd-preview-card__action-btn" :size="30" ariaLabel="Copy" @click="emit('copy')">
            <CdIcon name="copy" :size="16" color="#6E7176" />
          </CdIconButton>
          <CdIconButton class="cd-preview-card__action-btn" :size="30" ariaLabel="Edit" @click="emit('edit')">
            <CdIcon name="pencil" :size="16" color="#6E7176" />
          </CdIconButton>
          <CdIconButton class="cd-preview-card__action-btn" :size="30" danger ariaLabel="Delete" @click="emit('delete')">
            <CdIcon name="trash" :size="16" color="#C0564B" />
          </CdIconButton>
        </template>
        <!-- <button type="button" class="cd-preview-card__close" aria-label="Close" @click="emit('close')">✕</button> -->
      </div>
    </div>

    <div class="cd-preview-card__title-row">
      <span class="cd-preview-card__swatch" :style="{ background: color }" />
      <div class="cd-preview-card__title-block">
        <span class="cd-preview-card__title">{{ title }}</span>
        <span class="cd-preview-card__when">{{ whenLabel }}</span>
      </div>
    </div>

    <div class="cd-preview-card__divider" />

    <div class="cd-preview-card__info">
      <div class="cd-preview-card__info-row">
        <CdIcon name="bell" :size="18" color="#9C9E94" />
        <span>{{ alertLabel }}</span>
      </div>
      <div class="cd-preview-card__info-row">
        <CdIcon name="target" :size="18" color="#9C9E94" />
        <span>{{ quadLabel }}</span>
      </div>
      <div v-if="isTask" class="cd-preview-card__info-row">
        <CdIcon name="tomato" :size="18" />
        <span>{{ estimatedPomodoros }} pomodoro{{ estimatedPomodoros === 1 ? '' : 's' }}</span>
        <span class="cd-preview-card__info-meta">{{ completedPomodoros }}/{{ estimatedPomodoros }} done</span>
      </div>
      <div class="cd-preview-card__info-row cd-preview-card__info-row--muted">
        <CdIcon name="info" :size="18" color="#9C9E94" />
        <span class="cd-preview-card__info-text">Add context to get better suggestions</span>
        <button type="button" class="cd-preview-card__info-edit" aria-label="Add context">
          <CdIcon name="pencil" :size="15" color="#9C9E94" />
        </button>
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
          <div class="cd-preview-card__pomodoro">
            <CdIcon name="tomato" :size="16" />
            {{ completedPomodoros }} / {{ estimatedPomodoros }} focus sessions logged
          </div>
          <p class="cd-preview-card__managed-note">Cadence auto-schedules this around your priorities and defends the time when your week gets busy.</p>
        </template>
      </div>
    </div>

    <!-- Focus sessions write completed_pomodoros back to the event row, which RLS only allows for
         the author — hidden alongside the other write actions on foreign events. -->
    <div v-if="isTask && mine" class="cd-preview-card__focus-wrap">
      <button type="button" class="cd-preview-card__focus-start" @click="emit('startFocus')">
        <CdIcon name="tomato" :size="19" />
        Start focus session
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import CdIconButton from './CdIconButton.vue'
import CdMemberStack from './CdMemberStack.vue'
import CdIcon from './CdIcon.vue'

// CdEventPreviewCard — anchored preview popover (inside CdPopover). CADENCE Handoff.dc.html _eventPreview.
// desk width 370px. eyebrow: event="Calendar event", task="Auto-scheduled", shared="{owner} · read-only"
// (800 12px mono uppercase #B3AC91).
// Title row: 13x13 quadrant-color swatch (v2: circular, border-radius 50% — was 4px square-ish in v1)
// + 800 18px Zen Kaku title + when line (600 13px #6E7176).
// mine=false (shared/read-only calendar) hides copy/edit/delete actions, keeps close button.
// "Managed by Cadence AI" collapsible: chevron rotates 90deg on expand (.2s ease); event shows guest
// member stack, task shows "🍅🍅 N/M focus sessions logged" + muted explanatory text.
const props = withDefaults(
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
    mine?: boolean
    owner?: string
  }>(),
  { mine: true }
)

const emit = defineEmits<{
  copy: []
  edit: []
  delete: []
  close: []
  startFocus: []
}>()

const expanded = ref(false)

const eyebrowLabel = computed(() => {
  if (!props.mine) return `${props.owner || 'Shared'} · read-only`
  return props.isTask ? 'Auto-scheduled' : 'Calendar event'
})
</script>

<style scoped>
.cd-preview-card {
  width: 370px;
  background: #fff;
  border: 1px solid var(--cd-line-4);
  border-radius: var(--cd-radius-preview);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

@media (max-width: 899px) {
  .cd-preview-card {
    width: 100%;
    border: none;
    border-radius: 0;
    box-sizing: border-box;
    padding-bottom: 35px;
  }
}

.cd-preview-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px 12px 8px 16px;
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

.cd-preview-card__action-btn {
  border-radius: 8px;
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
  gap: 11px;
  padding: 0 16px 12px;
}

.cd-preview-card__swatch {
  width: 13px;
  height: 13px;
  border-radius: 50%;
  flex: none;
  margin-top: 5px;
}

.cd-preview-card__title-block {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.cd-preview-card__title {
  font: 800 18px var(--cd-font-title);
  color: var(--cd-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cd-preview-card__when {
  font: 600 13px var(--cd-font-ui);
  color: var(--cd-ink-2);
}

.cd-preview-card__divider {
  height: 1px;
  margin: 0 16px;
  background: var(--cd-line);
  flex: none;
}

.cd-preview-card__info {
  display: flex;
  flex-direction: column;
  padding: 6px 0;
}

.cd-preview-card__info-row {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 9px 16px;
  font: 600 13.5px var(--cd-font-ui);
  color: var(--cd-ink);
}

.cd-preview-card__info-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cd-preview-card__info-edit {
  flex: none;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 4px;
  display: grid;
  place-items: center;
}

.cd-preview-card__info-meta {
  margin-left: auto;
  font: 600 12px var(--cd-font-mono);
  color: var(--cd-muted);
}

.cd-preview-card__info-row--muted {
  color: var(--cd-muted);
}

.cd-preview-card__managed {
  border-top: 1px solid var(--cd-line-4);
}

.cd-preview-card__managed-head {
  display: flex;
  align-items: center;
  gap: 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 13px 16px;
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
  padding: 0 16px 14px 47px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cd-preview-card__pomodoro {
  display: flex;
  align-items: center;
  gap: 5px;
  font: 600 13px var(--cd-font-ui);
  color: var(--cd-ink);
}

.cd-preview-card__focus-start {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  border: none;
  background: #3a4130;
  border-radius: 12px;
  padding: 12px;
  font: 700 14px var(--cd-font-ui);
  color: #fbfaf7;
  cursor: pointer;
  transition: background var(--cd-duration-micro-3);
}

.cd-preview-card__focus-start:hover {
  background: #2e3427;
}

.cd-preview-card__focus-wrap {
  padding: 10px 16px 0px;
}

.cd-preview-card__managed-note {
  margin: 0;
  font: 500 12px var(--cd-font-ui);
  color: var(--cd-muted);
}
</style>
