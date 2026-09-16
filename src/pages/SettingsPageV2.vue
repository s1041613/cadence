<template>
  <!--
    v2 settings shell. On desktop the 393px phone frame is centred (as in MonthPageV2).
    Panes: root menu + Customization / Notifications, with Tab bar nested under
    Customization. Switching is local state; the bottom nav is the shared component.
  -->
  <div class="sp2" :class="{ 'sp2--desktop': isDesktop }">
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

const { isDesktop } = useBreakpoint()

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
  /* ---- Settings palette ----
     The Settings UI spec asks this page for a warmer, softer set of values than the v2 ramp
     carries: an off-white page instead of #fff, a near-black ink instead of black, and a
     pink-tinted hairline. They live here, on the page frame, rather than in cadence-tokens.css
     because they are this page's deviation from the global ramp — promoting them would read as
     a palette-wide change of mind about black ink, which the tokens file is explicit is the
     design's call and not a reviewer's. Every settings pane inherits them from this element.

     The pink accent is NOT restated: the spec says reuse Month's, so anything tinted here
     composes from --pv2-accent-rgb and re-tints with it. */
  --pv2-set-canvas: #fdfbfa;      /* warm off-white; the spec rules out a cold pure white */
  --pv2-set-ink: #2f2f2f;         /* primary text — dark grey, not dead black */
  --pv2-set-ink-2: #9a9a9a;       /* email, section labels, version line */
  --pv2-set-line: #ece8e9;        /* card borders and row dividers */
  --pv2-set-line-pink: #f4e7ea;   /* the profile card's border, on its pink surface */
  --pv2-set-surface-pink: #fff7f8;
  --pv2-set-chev: #c7c2c3;        /* chevrons: present, deliberately quiet */
  --pv2-set-danger: #c56a5e;      /* Log out's coral accent — an accent, not an alarm */
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--pv2-set-canvas);
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
