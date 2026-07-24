<template>
  <div class="pv2-preview-card">
    <div class="pv2-preview-card__top">
      <div class="pv2-preview-card__eyebrow">
        <span class="pv2-preview-card__dot" :style="{ background: color }" />
        <span>{{ eyebrow }}</span>
      </div>
      <div v-if="mine" class="pv2-preview-card__actions">
        <CdIconButton :size="30" ariaLabel="Copy" @click="emit('copy')">
          <CdIcon name="copy" :size="15" color="#1b1b1b" />
        </CdIconButton>
        <CdIconButton :size="30" ariaLabel="Edit" @click="emit('edit')">
          <CdIcon name="pencil" :size="15" color="#1b1b1b" />
        </CdIconButton>
        <CdIconButton :size="30" danger ariaLabel="Delete" @click="emit('delete')">
          <CdIcon name="trash" :size="15" color="#9f3e36" />
        </CdIconButton>
      </div>
    </div>

    <div class="pv2-preview-card__title-block">
      <h2 class="pv2-preview-card__title">{{ title }}</h2>
      <p class="pv2-preview-card__when">{{ whenLabel }}</p>
    </div>

    <div class="pv2-preview-card__rows">
      <div class="pv2-preview-card__row">
        <span class="pv2-preview-card__row-label">REMINDER</span>
        <span class="pv2-preview-card__row-value">{{ reminderLabel }}</span>
        <span class="pv2-preview-card__chevron">›</span>
      </div>
      <div v-if="isTask" class="pv2-preview-card__row">
        <span class="pv2-preview-card__row-label">POMODOROS</span>
        <span class="pv2-preview-card__row-value">{{ estimatedPomodoros }} session{{ estimatedPomodoros === 1 ? '' : 's' }}</span>
        <span class="pv2-preview-card__meta">{{ completedPomodoros }}/{{ estimatedPomodoros }}</span>
      </div>
      <div class="pv2-preview-card__row pv2-preview-card__row--notes">
        <span class="pv2-preview-card__row-label">NOTES</span>
        <span class="pv2-preview-card__row-value" :class="{ 'pv2-preview-card__row-value--placeholder': !notes }">
          {{ notes || 'No notes' }}
        </span>
        <span class="pv2-preview-card__chevron">›</span>
      </div>
    </div>

    <button v-if="isTask && mine" type="button" class="pv2-preview-card__focus" @click="emit('startFocus')">
      <CdIcon name="tomato" :size="18" color="#fff" />
      <span>Start focus session</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import CdIcon from '@/components/ui/CdIcon.vue'
import CdIconButton from '@/components/ui/CdIconButton.vue'

withDefaults(
  defineProps<{
    title: string
    color: string
    eyebrow: string
    whenLabel: string
    isTask: boolean
    reminderLabel: string
    notes: string
    completedPomodoros?: number
    estimatedPomodoros?: number
    mine?: boolean
  }>(),
  { mine: true, completedPomodoros: 0, estimatedPomodoros: 1 }
)

const emit = defineEmits<{
  copy: []
  edit: []
  delete: []
  startFocus: []
}>()
</script>

<style scoped>
.pv2-preview-card {
  width: 370px;
  background: #fff;
  border: 1px solid #d8d2c5;
  border-radius: 8px;
  padding: 18px;
  color: #1b1b1b;
}

@media (max-width: 899px) {
  .pv2-preview-card {
    width: 100%;
    border: none;
    border-radius: 0;
    padding: 18px 18px 32px;
  }
}

.pv2-preview-card__top,
.pv2-preview-card__eyebrow,
.pv2-preview-card__actions,
.pv2-preview-card__focus {
  display: flex;
  align-items: center;
}

.pv2-preview-card__top {
  justify-content: space-between;
  gap: 12px;
}

.pv2-preview-card__eyebrow {
  min-width: 0;
  gap: 8px;
  font: 800 11px var(--cd-font-mono);
  text-transform: uppercase;
  color: #4b4943;
}

.pv2-preview-card__dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex: none;
}

.pv2-preview-card__actions {
  gap: 2px;
  flex: none;
}

.pv2-preview-card__title-block {
  padding: 19px 0 17px;
  border-bottom: 1.5px solid #1b1b1b;
}

.pv2-preview-card__title {
  margin: 0;
  overflow-wrap: anywhere;
  font: 500 30px/1.04 var(--cd-font-serif);
  color: #1b1b1b;
}

.pv2-preview-card__when {
  margin: 8px 0 0;
  font: 700 12px var(--cd-font-mono);
  color: #68645c;
}

.pv2-preview-card__rows {
  display: grid;
  gap: 0;
}

.pv2-preview-card__row {
  display: grid;
  grid-template-columns: 100px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  border-bottom: 1px solid #e3ded2;
}

.pv2-preview-card__row--notes {
  align-items: start;
  padding: 13px 0;
}

.pv2-preview-card__row-label {
  font: 800 10px var(--cd-font-mono);
  color: #777168;
}

.pv2-preview-card__row-value {
  min-width: 0;
  overflow-wrap: anywhere;
  font: 600 14px/1.35 var(--cd-font-ui);
  color: #1f1e1b;
}

.pv2-preview-card__row-value--placeholder {
  color: #9a9489;
  font-style: italic;
  font-weight: 500;
}

.pv2-preview-card__chevron,
.pv2-preview-card__meta {
  font: 800 13px var(--cd-font-mono);
  color: #777168;
}

.pv2-preview-card__focus {
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 44px;
  margin-top: 18px;
  border: none;
  border-radius: 6px;
  background: #1b1b1b;
  color: #fff;
  cursor: pointer;
  font: 800 13px var(--cd-font-ui);
}

.pv2-preview-card__focus:active {
  transform: translateY(1px);
}
</style>
