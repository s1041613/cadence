<template>
  <!--
    v2 設定 root 主選單（照設計稿）。Account 卡、PREFERENCES 列、Privacy/Log out、頁尾。
    子頁（Calendars/Time/…）尚未實作 → 列可見但不可點（Zoe：先只做 root）。
    Log out 重用 auth-store.signOut()。
  -->
  <div class="pv2-set">
    <h1 class="pv2-set__title">Settings</h1>

    <div class="pv2-set__scroll">
      <!-- Account 卡 -->
      <button type="button" class="pv2-set__account" disabled>
        <span class="pv2-set__avatar">{{ initials }}</span>
        <span class="pv2-set__account-text">
          <span class="pv2-set__name">{{ displayName }}</span>
          <span class="pv2-set__email">{{ email }}</span>
        </span>
        <span class="pv2-set__chev" aria-hidden="true">›</span>
      </button>

      <!-- PREFERENCES：Customization 已實作可點；其餘子頁尚未實作、不可點 -->
      <p class="pv2-set__group-label">Preferences</p>
      <div class="pv2-set__card">
        <button
          v-for="(row, i) in prefRows"
          :key="row.key"
          type="button"
          class="pv2-set__row"
          :class="{ 'pv2-set__row--divided': i > 0, 'pv2-set__row--enabled': row.enabled }"
          :disabled="!row.enabled"
          @click="row.pane && emit('open', row.pane)"
        >
          <span class="pv2-set__row-icon" v-html="row.icon" />
          <span class="pv2-set__row-label">{{ row.label }}</span>
          <span class="pv2-set__chev" aria-hidden="true">›</span>
        </button>
      </div>

      <!-- Privacy / Log out -->
      <div class="pv2-set__card">
        <button type="button" class="pv2-set__row" disabled>
          <span class="pv2-set__row-icon" v-html="ICON_PRIVACY" />
          <span class="pv2-set__row-label">Privacy</span>
          <span class="pv2-set__chev" aria-hidden="true">›</span>
        </button>
        <button type="button" class="pv2-set__row pv2-set__row--divided pv2-set__row--danger" @click="onLogout">
          <span class="pv2-set__row-icon" v-html="ICON_LOGOUT" />
          <span class="pv2-set__row-label">Log out</span>
        </button>
      </div>

      <p class="pv2-set__footer">Cadence · <span class="pv2-set__footer-ver">v2.0</span></p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth-store'

// Customization 與 Notifications 可導航；其餘子頁尚未實作
const emit = defineEmits<{
  open: [pane: 'customization' | 'notifications']
}>()

const auth = useAuthStore()

const displayName = computed(() => auth.displayName)
const email = computed(() => auth.user?.email ?? '')
const initials = computed(() => displayName.value.slice(0, 2))

async function onLogout(): Promise<void> {
  await auth.signOut()
}

// 線條 icon（照設計稿風格，stroke 1.7，深色）
const ICON_CAL =
  '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1b1b1b" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="16" rx="2.5"/><path d="M4 9.5 H20 M8 3 V6 M16 3 V6"/></svg>'
const ICON_TIME =
  '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1b1b1b" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7 V12 L15.5 14"/></svg>'
const ICON_CUSTOM =
  '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1b1b1b" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="8.5" cy="9" r="1.6"/><path d="M20 15 L15 10 L5 20"/></svg>'
const ICON_NOTIF =
  '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1b1b1b" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9 a6 6 0 0 1 12 0 c0 5 2 6 2 6 H4 s2-1 2-6"/><path d="M10 20 a2 2 0 0 0 4 0"/></svg>'
const ICON_PRIVACY =
  '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1b1b1b" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 L19 6 V11 c0 5-3 8-7 10 c-4-2-7-5-7-10 V6 Z"/></svg>'
const ICON_LOGOUT =
  '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c56a5e" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5 H5 a2 2 0 0 0-2 2 v10 a2 2 0 0 0 2 2 h4 M15 8 l4 4-4 4 M19 12 H9"/></svg>'

// enabled 的子頁才可點；目前 Customization 與 Notifications 已實作。
// key 用字面量聯集，讓可導航列 emit 出的型別對得上 emit('open', ...) 的簽章。
type NavPane = 'customization' | 'notifications'
interface PrefRow {
  key: string
  label: string
  icon: string
  enabled: boolean
  pane?: NavPane
}
const prefRows: PrefRow[] = [
  { key: 'calendars', label: 'Calendars', icon: ICON_CAL, enabled: false },
  { key: 'time', label: 'Time', icon: ICON_TIME, enabled: false },
  { key: 'customization', label: 'Customization', icon: ICON_CUSTOM, enabled: true, pane: 'customization' },
  { key: 'notifications', label: 'Notifications', icon: ICON_NOTIF, enabled: true, pane: 'notifications' }
]
</script>

<style scoped>
.pv2-set {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  /* Inherit the frame's paper (#fafaf9) rather than painting a slightly greyer
     #efefef here — the old mismatch left a lighter band above the title where the
     safe-area padding showed the frame colour through. One surface, top to bottom. */
  background: transparent;
}

.pv2-set__title {
  flex: none;
  margin: 0;
  padding: 16px 24px 16px;
  font: 400 30px var(--cd-font-serif);
  line-height: 1;
  color: #1b1b1b;
  border-bottom: 1px solid #e2e2e2;
}

.pv2-set__scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 20px 22px 24px;
}

/* Account 卡 */
.pv2-set__account {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
  padding: 16px 18px;
  border: 1px solid #e2e2e2;
  border-radius: 16px;
  background: #fff;
  cursor: default;
  text-align: left;
}

.pv2-set__avatar {
  flex: none;
  display: grid;
  place-items: center;
  width: 54px;
  height: 54px;
  border-radius: 50%;
  background: #6e839b;
  color: #fff;
  font: 700 18px var(--cd-font-ui);
}

.pv2-set__account-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.pv2-set__name {
  font: 600 16px var(--cd-font-mono);
  letter-spacing: 0.04em;
  color: #1b1b1b;
  line-height: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pv2-set__email {
  margin-top: 2px;
  font: 400 13px var(--cd-font-ui);
  color: #9c9c9c;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* group label */
.pv2-set__group-label {
  margin: 26px 0 10px 4px;
  font: 600 10px var(--cd-font-mono);
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: #9c9c9c;
}

/* 卡片群組：邊框無陰影，照設計稿 */
.pv2-set__card {
  border: 1px solid #e2e2e2;
  border-radius: 16px;
  background: #fff;
  overflow: hidden;
}

.pv2-set__card + .pv2-set__card {
  margin-top: 16px;
}

.pv2-set__row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 16px 18px;
  border: none;
  background: none;
  cursor: default;
  text-align: left;
}

/* 分隔線：用 ::before 畫，從文字起點開始（讓開 padding 18 + icon 22 + gap 14 = 54px），
   不縮排 row 本身，照設計稿 */
.pv2-set__row--divided::before {
  content: '';
  position: absolute;
  top: 0;
  left: 54px;
  right: 0;
  height: 1px;
  background: #e2e2e2;
}

.pv2-set__row-icon {
  flex: none;
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
}

.pv2-set__row-label {
  flex: 1;
  font: 600 13px var(--cd-font-mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #1b1b1b;
}

.pv2-set__row--enabled {
  cursor: pointer;
}

.pv2-set__row--danger {
  cursor: pointer;
}

.pv2-set__row--danger .pv2-set__row-label {
  color: #c56a5e;
}

.pv2-set__chev {
  flex: none;
  font-size: 18px;
  line-height: 1;
  color: #c4c4c4;
}

.pv2-set__footer {
  margin: 26px 0 0;
  text-align: center;
  font: 500 11px var(--cd-font-mono);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #b2b2b2;
}

.pv2-set__footer-ver {
  font: italic 400 15px var(--cd-font-serif);
  text-transform: none;
  letter-spacing: 0;
}
</style>
