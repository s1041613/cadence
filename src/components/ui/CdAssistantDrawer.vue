<template>
  <CdDrawer width="min(440px, 46%)" scrim-color="var(--cd-scrim-strong)" @scrim-click="emit('close')">
    <div class="cd-assistant">
      <div class="cd-assistant__header">
        <span class="cd-assistant__icon">
          <CdIcon name="spark-mono" :size="20" color="#3A6EA5" />
        </span>
        <span class="cd-assistant__title">Assistant</span>
        <button type="button" class="cd-assistant__close" aria-label="Close" @click="emit('close')">✕</button>
      </div>

      <div class="cd-assistant__greeting">
        <p>{{ greeting }}</p>
      </div>

      <div class="cd-assistant__chips">
        <button v-for="chip in suggestionChips" :key="chip" type="button" class="cd-assistant__chip" @click="emit('chipClick', chip)">
          {{ chip }}
        </button>
      </div>

      <div class="cd-assistant__input-bar">
        <span class="cd-assistant__input-icon">
          <CdIcon name="image" :size="22" color="#9C9E94" />
        </span>
        <input class="cd-assistant__input" placeholder="Ask, or attach an image…" :value="inputValue" @input="emit('update:inputValue', ($event.target as HTMLInputElement).value)" />
        <button type="button" class="cd-assistant__send" aria-label="Send" @click="emit('send')">
          <CdIcon name="arrow-up" :size="18" color="#fff" />
        </button>
      </div>
    </div>
  </CdDrawer>
</template>

<script setup lang="ts">
// CdAssistantDrawer — static demo assistant panel. design-research-report.md §3.13.
// All-static demo per the prototype: chips and send button have no real handlers upstream; this
// component still emits so a consumer *could* wire them up, but the reference design leaves them inert.
//
// CADENCE Handoff: desktop assistant is a MODAL right drawer (scrim rgba(40,38,30,.34), i.e.
// var(--cd-scrim-strong)) — not the non-modal/Gmail-Notion side-panel treatment an earlier v2 draft
// used. Clicking the scrim closes the drawer like Task Editor / Draft. Send button background
// changed from #3A3833 to #3A6EA5.
import CdDrawer from './CdDrawer.vue'
import CdIcon from './CdIcon.vue'

withDefaults(
  defineProps<{
    greeting?: string
    inputValue?: string
    suggestionChips?: string[]
  }>(),
  {
    greeting: "Morning, Chloe. You've got 4 items in your Inbox and open time today — want me to plan them in?",
    inputValue: '',
    suggestionChips: () => ['Plan my day', 'Protect focus time', 'Summarize today']
  }
)

const emit = defineEmits<{
  close: []
  chipClick: [chip: string]
  'update:inputValue': [value: string]
  send: []
}>()
</script>

<style scoped>
.cd-assistant {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--cd-editor-card);
}

.cd-assistant__header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 20px;
  border-bottom: 1px solid var(--cd-line);
  flex: none;
}

.cd-assistant__icon {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  background: var(--cd-topbar);
  display: grid;
  place-items: center;
}

.cd-assistant__title {
  flex: 1;
  font: 700 20px var(--cd-font-title);
  color: var(--cd-ink);
}

.cd-assistant__close {
  width: 34px;
  height: 34px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--cd-muted);
  font-size: 18px;
  border-radius: var(--cd-radius-pill);
  transition: background var(--cd-duration-micro-3);
}

.cd-assistant__close:hover {
  background: rgba(86, 88, 94, 0.06);
}

.cd-assistant__greeting {
  flex: 1;
  padding: 24px 22px;
  overflow-y: auto;
}

.cd-assistant__greeting p {
  margin: 0;
  font: 500 19px var(--cd-font-title);
  color: var(--cd-ink-2);
  line-height: 1.5;
}

.cd-assistant__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 0 20px 14px;
  flex: none;
}

.cd-assistant__chip {
  border: 1px solid var(--cd-line);
  background: var(--cd-surface);
  border-radius: var(--cd-radius-pill);
  padding: 11px 18px;
  font: 600 14px var(--cd-font-title);
  color: var(--cd-ink);
  cursor: pointer;
  transition: background var(--cd-duration-micro-3);
}

.cd-assistant__chip:hover {
  background: rgba(179, 172, 145, 0.12);
}

.cd-assistant__input-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 16px 18px;
  padding: 10px 10px 10px 16px;
  background: var(--cd-surface);
  border: 1px solid var(--cd-line);
  border-radius: 18px;
  flex: none;
}

.cd-assistant__input-icon {
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
}

.cd-assistant__input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font: 500 15px var(--cd-font-title);
  color: var(--cd-ink);
}

.cd-assistant__send {
  width: 38px;
  height: 38px;
  flex: none;
  border: none;
  background: #3a6ea5;
  border-radius: 50%;
  cursor: pointer;
  display: grid;
  place-items: center;
}
</style>
