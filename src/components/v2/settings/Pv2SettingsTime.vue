<template>
  <!--
    v2 設定 · Time 子頁。從 v1 的 CdSettingsDrawer `time` pane 搬過來，外觀換成 v2 色系
    （--pv2-* / 白卡 + hairline，與 Notifications、Customization 同一套骨架）。

    First Day of The Week 接 settings-store.firstDay —— v2 的月/週/日檢視都讀同一份
    （MonthViewV2、WeekViewV2、Pv2WeekdayHeader），所以這裡改了三個檢視會立刻重排。
    Timezone 則與 v1 一樣仍是靜態外殼：beta 只開 Asia/Taipei，其餘選項列出但不可選，
    因此值住在本地 ref，不進 store（沒有第二個讀者，放 store 只會多一份假狀態）。
  -->
  <div class="pv2-time">
    <header class="pv2-time__head">
      <button type="button" class="pv2-time__back" aria-label="返回" @click="emit('back')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--pv2-ink)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 5 L8 12 L15 19" />
        </svg>
      </button>
      <h1 class="pv2-time__title">Time</h1>
    </header>

    <div class="pv2-time__scroll">
      <p class="pv2-time__group-label">Week</p>
      <div class="pv2-time__card">
        <div class="pv2-time__field">
          <div class="pv2-time__label">First Day of The Week</div>
          <Pv2SelectField
            class="pv2-time__select"
            :model-value="settings.firstDay"
            :options="FIRST_DAY_OPTIONS"
            ariaLabel="First day of the week"
            @update:model-value="onFirstDayChange"
          />
        </div>
        <p class="pv2-time__caption">Month, Week and Day all re-anchor to this day.</p>
      </div>

      <p class="pv2-time__group-label">Zone</p>
      <div class="pv2-time__card">
        <div class="pv2-time__field">
          <div class="pv2-time__label">Timezone</div>
          <Pv2SelectField
            class="pv2-time__select"
            v-model="timezone"
            :options="TIMEZONE_OPTIONS"
            ariaLabel="Timezone"
          />
        </div>
        <p class="pv2-time__caption">
          Only Asia/Taipei is available in this beta — more timezones coming soon.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Pv2SelectField, { type Pv2SelectOption } from '@/components/v2/ui/Pv2SelectField.vue'
import { useSettingsStore, type FirstDay } from '@/stores/settings-store'

const emit = defineEmits<{
  back: []
}>()

const settings = useSettingsStore()

const FIRST_DAY_OPTIONS: Pv2SelectOption[] = (
  ['Sunday', 'Monday', 'Saturday'] satisfies FirstDay[]
).map((v) => ({ value: v, label: v }))

// The <select> hands back a plain string; FIRST_DAY_OPTIONS is the only source of its
// values, so narrowing here is a cast at the boundary rather than a guess.
function onFirstDayChange(value: string): void {
  settings.firstDay = value as FirstDay
}

// Same list (and same beta restriction) as the v1 pane: everything but Taipei is shown
// so the shape of the setting is visible, and disabled so it cannot be chosen.
const TIMEZONE_OPTIONS: Pv2SelectOption[] = [
  { value: 'Asia/Taipei (+08:00)', label: 'Asia/Taipei (+08:00)' },
  { value: 'Asia/Tokyo (+09:00)', label: 'Asia/Tokyo (+09:00)', disabled: true },
  { value: 'America/Los_Angeles (−08:00)', label: 'America/Los_Angeles (−08:00)', disabled: true },
  { value: 'America/New_York (−05:00)', label: 'America/New_York (−05:00)', disabled: true },
  { value: 'Europe/London (+00:00)', label: 'Europe/London (+00:00)', disabled: true },
  { value: 'UTC', label: 'UTC', disabled: true }
]

const timezone = ref('Asia/Taipei (+08:00)')
</script>

<style scoped>
.pv2-time {
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
.pv2-time__head {
  flex: none;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 22px 16px;
  border-bottom: 1px solid var(--pv2-line-soft);
}

.pv2-time__back {
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

.pv2-time__title {
  margin: 0;
  font: 400 30px var(--cd-font-serif);
  line-height: 1;
  color: var(--pv2-ink);
}

.pv2-time__scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  /* Bottom clears the floating Pv2BottomNav pill. */
  padding: 20px 22px var(--pv2-nav-h);
}

.pv2-time__group-label {
  margin: 0 0 10px 4px;
  font: 600 10px var(--cd-font-mono);
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--pv2-ink-3);
}

.pv2-time__group-label:not(:first-child) {
  margin-top: 24px;
}

.pv2-time__card {
  border: 1px solid var(--pv2-line-soft);
  border-radius: 16px;
  background: #fff;
  padding: 16px;
}

.pv2-time__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pv2-time__label {
  font: 600 11px var(--cd-font-mono);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--pv2-ink-2);
}

/* Pv2SelectField is an inline-flex pill sized by --pv2-control-* from the event card.
   Outside that card it falls back to a 156px pill, so the width is set here instead of
   reaching into the child's internals. */
.pv2-time__select {
  --pv2-pill-w: 100%;
  width: 100%;
  --pv2-control-h: 44px;
  --pv2-control-r: 12px;
  --pv2-control-px: 14px;
}

.pv2-time__caption {
  margin: 12px 0 0;
  font: 400 11px var(--cd-font-ui);
  color: var(--pv2-ink-3);
  line-height: 1.5;
}
</style>
