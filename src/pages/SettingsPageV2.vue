<template>
  <!--
    v2 設定頁殼。桌面把 393px 手機 frame 置中（同 MonthPageV2）。
    目前只有 root 主選單 + Customization 子頁；其他子頁尚未實作。
    pane 用本地狀態切換（root ↔ customization）；底部 nav 共用元件，setting active。
  -->
  <div class="sp2" :class="{ 'sp2--desktop': isDesktop }">
    <div class="sp2__frame">
      <div class="sp2__content">
        <Pv2SettingsRoot v-if="pane === 'root'" @open="pane = $event" />
        <Pv2SettingsCustomization v-else-if="pane === 'customization'" @back="pane = 'root'" />
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
import Pv2SettingsNotifications from '@/components/v2/settings/Pv2SettingsNotifications.vue'

const { isDesktop } = useBreakpoint()

// root、customization、notifications；其餘子頁尚未實作
const pane = ref<'root' | 'customization' | 'notifications'>('root')
</script>

<style scoped>
.sp2 {
  width: 100%;
  height: 100dvh;
  overflow: hidden;
}

.sp2__frame {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #F1EFE9;
  padding-top: max(env(safe-area-inset-top), 40px);
  /* 底部不留 frame padding：safe-area 由白色底部 nav 的 padding-bottom 自行吃滿，
     讓白底一路連續到螢幕底，不露出 frame 背景塗鴉/底色帶。 */
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
