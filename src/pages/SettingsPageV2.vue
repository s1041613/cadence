<template>
  <!--
    v2 settings shell. On desktop the 393px phone frame is centred (as in MonthPageV2);
    phone and tablet run full-bleed.
    Panes: root menu + Customization / Notifications, with Tab bar nested under
    Customization. Switching is local state; the bottom nav is the shared component.
  -->
  <div class="sp2" :class="{ 'sp2--desktop': layout === 'desktop' }">
    <div class="sp2__frame">
      <div class="sp2__content">
        <Pv2SettingsRoot v-if="pane === 'root'" @open="pane = $event" />
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
import Pv2SettingsCustomization from '@/components/v2/settings/Pv2SettingsCustomization.vue'
import Pv2SettingsTabBar from '@/components/v2/settings/Pv2SettingsTabBar.vue'
import Pv2SettingsNotifications from '@/components/v2/settings/Pv2SettingsNotifications.vue'

const { layout } = useBreakpoint()

// root, customization, tabs, notifications; the remaining sub-pages are unimplemented
const pane = ref<'root' | 'customization' | 'tabs' | 'notifications'>('root')
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
  /* min(), not a flat 852px: the page clips its overflow, so on any viewport shorter
     than 852 + the shell's 52px of padding — a laptop window, a browser with devtools
     docked — the frame's bottom (and with it the nav pill) was simply cut off. */
  height: min(852px, 100%);
  flex: none;
  border-radius: 44px;
  box-shadow: 0 30px 70px rgba(0, 0, 0, 0.28);
  isolation: isolate;
  padding-top: 44px;
}
</style>
