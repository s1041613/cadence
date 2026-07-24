<template>
  <!--
    v2 設定 · Notifications 子頁。骨架照 Customization：header(back)+scroll+card。
    MVP 只接「Event reminders」開關到 Web Push 訂閱（push-service）；
    Daily agenda / Assistant nudges 先顯示但停用（尚無後端排程，見 web-push plan MVP 排除項）。
    開關真相來源是瀏覽器本機訂閱（hasActiveSubscription），不進 store，避免雙狀態不同步。
  -->
  <div class="pv2-notif">
    <header class="pv2-notif__head">
      <button type="button" class="pv2-notif__back" aria-label="返回" @click="emit('back')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1b1b1b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 5 L8 12 L15 19" />
        </svg>
      </button>
      <h1 class="pv2-notif__title">Notifications</h1>
    </header>

    <div class="pv2-notif__scroll">
      <p class="pv2-notif__group-label">Reminders</p>
      <div class="pv2-notif__card">
        <div class="pv2-notif__row">
          <div class="pv2-notif__row-text">
            <div class="pv2-notif__row-label">Event reminders</div>
            <div class="pv2-notif__row-sub">Notify before scheduled events</div>
          </div>
          <CdSwitch size="46x28" :model-value="eventReminders" @update:model-value="onToggleEventReminders" />
        </div>

        <div class="pv2-notif__row pv2-notif__row--divided pv2-notif__row--muted">
          <div class="pv2-notif__row-text">
            <div class="pv2-notif__row-label">Daily agenda</div>
            <div class="pv2-notif__row-sub">Morning summary at 8:00 · coming soon</div>
          </div>
          <CdSwitch size="46x28" :model-value="false" @update:model-value="noopComingSoon" />
        </div>

        <div class="pv2-notif__row pv2-notif__row--divided pv2-notif__row--muted">
          <div class="pv2-notif__row-text">
            <div class="pv2-notif__row-label">Assistant nudges</div>
            <div class="pv2-notif__row-sub">Suggestions to plan open time · coming soon</div>
          </div>
          <CdSwitch size="46x28" :model-value="false" @update:model-value="noopComingSoon" />
        </div>
      </div>

      <p v-if="unsupported" class="pv2-notif__caption">
        This device or browser doesn't support push notifications.
      </p>
      <p v-else class="pv2-notif__caption">
        Reminders arrive as system notifications even when Cadence is closed. On iPhone, add Cadence to your Home Screen first.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import CdSwitch from '@/components/ui/CdSwitch.vue'
import { useAuthStore } from '@/stores/auth-store'
import { notifySyncError } from '@/lib/notify'
import {
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
  hasActiveSubscription
} from '@/services/push-service'

const emit = defineEmits<{
  back: []
}>()

const auth = useAuthStore()

// Local UI state; the source of truth is the browser's own push subscription
// (per-device), reconciled on mount. No pinia store — nothing else reads this.
const eventReminders = ref(false)
const unsupported = ref(false)
// Guards against re-entrant toggles while an async subscribe/unsubscribe runs.
const busy = ref(false)

onMounted(async () => {
  if (!isPushSupported()) {
    unsupported.value = true
    return
  }
  const uid = auth.user?.id
  if (!uid) return
  eventReminders.value = await hasActiveSubscription(uid).catch(() => false)
})

async function onToggleEventReminders(next: boolean): Promise<void> {
  const uid = auth.user?.id
  if (!uid || busy.value) return
  busy.value = true

  if (next) {
    try {
      const result = await subscribeToPush(uid)
      if (result.status === 'subscribed') {
        eventReminders.value = true
      } else {
        eventReminders.value = false // bounce back
        notifySyncError(
          result.status === 'denied'
            ? 'Notification permission was blocked. Enable it in your browser settings.'
            : "This device doesn't support push notifications.",
          () => void onToggleEventReminders(true)
        )
      }
    } catch {
      eventReminders.value = false
      notifySyncError('Could not turn on reminders.', () => void onToggleEventReminders(true))
    } finally {
      busy.value = false
    }
  } else {
    try {
      await unsubscribeFromPush(uid)
      eventReminders.value = false
    } catch {
      notifySyncError('Could not turn off reminders.', () => void onToggleEventReminders(false))
    } finally {
      busy.value = false
    }
  }
}

// Daily agenda / Assistant nudges have no backend yet — the switch stays off.
function noopComingSoon(): void {
  notifySyncError('This notification type is coming soon.', () => {})
}
</script>

<style scoped>
.pv2-notif {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  background: #efefef;
}

.pv2-notif__head {
  flex: none;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px 16px;
  border-bottom: 1px solid #e2e2e2;
}

.pv2-notif__back {
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

.pv2-notif__title {
  margin: 0;
  font: 400 30px var(--cd-font-serif);
  line-height: 1;
  color: #1b1b1b;
}

.pv2-notif__scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 20px 22px 24px;
}

.pv2-notif__group-label {
  margin: 0 0 10px 4px;
  font: 600 10px var(--cd-font-mono);
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: #9c9c9c;
}

.pv2-notif__card {
  border: 1px solid #e2e2e2;
  border-radius: 16px;
  background: #fff;
  overflow: hidden;
}

.pv2-notif__row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
}

.pv2-notif__row--divided::before {
  content: '';
  position: absolute;
  top: 0;
  left: 18px;
  right: 0;
  height: 1px;
  background: #e2e2e2;
}

.pv2-notif__row--muted {
  opacity: 0.55;
}

.pv2-notif__row-text {
  flex: 1;
  min-width: 0;
}

.pv2-notif__row-label {
  font: 600 13px var(--cd-font-mono);
  letter-spacing: 0.06em;
  color: #1b1b1b;
}

.pv2-notif__row-sub {
  margin-top: 3px;
  font: 400 12px var(--cd-font-ui);
  color: #9c9c9c;
}

.pv2-notif__caption {
  margin: 14px 4px 0;
  font: 400 11px var(--cd-font-ui);
  color: #9c9c9c;
  line-height: 1.5;
}
</style>
