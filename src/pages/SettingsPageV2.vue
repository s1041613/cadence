<template>
  <!--
    v2 settings shell. On desktop the 393px phone frame is centred (as in MonthPageV2).
    Panes: root menu + Calendars / Time / Customization / Notifications, with Tab bar
    nested under Customization and Calendar detail nested under Calendars.
    Switching is local state; the bottom nav is the shared component.
  -->
  <div class="sp2" :class="{ 'sp2--desktop': isDesktop }">
    <div class="sp2__frame">
      <div class="sp2__content">
        <Pv2SettingsRoot v-if="pane === 'root'" @open="pane = $event" />
        <Pv2SettingsCalendars
          v-else-if="pane === 'calendars'"
          @back="pane = 'root'"
          @open-detail="openCalendarDetail"
        />
        <!-- Calendar detail is entered from Calendars, so Back returns there, not to root.
             `key` forces a fresh component (and so a fresh draft + member fetch) when the
             same pane is re-entered for a different calendar. -->
        <Pv2SettingsCalendarDetail
          v-else-if="pane === 'calendarDetail'"
          :key="detailCalendarId ?? 'new'"
          :calendar-id="detailCalendarId"
          @back="pane = 'calendars'"
        />
        <Pv2SettingsTime v-else-if="pane === 'time'" @back="pane = 'root'" />
        <Pv2SettingsCustomization
          v-else-if="pane === 'customization'"
          @back="pane = 'root'"
          @open-tabs="pane = 'tabs'"
        />
        <!-- Tab bar is entered from Customization, so Back returns there, not to root -->
        <Pv2SettingsTabBar v-else-if="pane === 'tabs'" @back="pane = 'customization'" />
        <Pv2SettingsNotifications v-else-if="pane === 'notifications'" @back="pane = 'root'" />
      </div>
      <Pv2BottomNav active="setting" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useBreakpoint } from '@/composables/use-breakpoint'
import Pv2BottomNav from '@/components/v2/ui/Pv2BottomNav.vue'
import Pv2SettingsRoot from '@/components/v2/settings/Pv2SettingsRoot.vue'
import Pv2SettingsCalendars from '@/components/v2/settings/Pv2SettingsCalendars.vue'
import Pv2SettingsCalendarDetail from '@/components/v2/settings/Pv2SettingsCalendarDetail.vue'
import Pv2SettingsTime from '@/components/v2/settings/Pv2SettingsTime.vue'
import Pv2SettingsCustomization from '@/components/v2/settings/Pv2SettingsCustomization.vue'
import Pv2SettingsTabBar from '@/components/v2/settings/Pv2SettingsTabBar.vue'
import Pv2SettingsNotifications from '@/components/v2/settings/Pv2SettingsNotifications.vue'

const { isDesktop } = useBreakpoint()

// Every pane but Privacy, which is still a placeholder row on the root menu
const pane = ref<
  'root' | 'calendars' | 'calendarDetail' | 'time' | 'customization' | 'tabs' | 'notifications'
>('root')

// Which calendar the detail pane is editing; null is the "add calendar" flow.
const detailCalendarId = ref<string | null>(null)

function openCalendarDetail(id: string | null): void {
  detailCalendarId.value = id
  pane.value = 'calendarDetail'
}
</script>

<style scoped>
.sp2 {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

/* No Pv2PageBackdrop here on purpose: Settings is a tool page, and the bare canvas is
   the rule, not an omission. The wallpaper belongs to the content pages (Month / Day /
   Week / Notes) — see the comment on Pv2PageBackdrop. */
.sp2__frame {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--cd-surface-canvas);
}

.sp2__content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 桌面：置中 393px 手機 frame（同 MonthPageV2） */
.sp2--desktop {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 26px 18px;
  background: #d9d9d9;
  box-sizing: border-box;
}

.sp2--desktop .sp2__frame {
  width: 393px;
  height: 852px;
  flex: none;
  border-radius: 44px;
  box-shadow: 0 30px 70px rgba(0, 0, 0, 0.28);
  isolation: isolate;
  padding-top: 44px;
}
</style>
