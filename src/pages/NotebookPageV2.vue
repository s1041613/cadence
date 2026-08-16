<template>
  <!--
    v2 notebook page shell. A content page, so it carries the shared wallpaper
    (Pv2PageBackdrop) exactly as Month/Day/Week do — only Settings, the tool page, stays
    on the bare canvas. No overlays. Desktop centres the 393px phone frame.
    The bottom nav sits outside the v-if/v-else so it is present while loading too —
    otherwise the loading state strands the user on a screen with no way out.
  -->
  <div class="nb2" :class="{ 'nb2--desktop': isDesktop }">
    <div class="nb2__frame">
      <Pv2PageBackdrop />

      <div class="nb2__content">
        <div v-if="!store.isLoaded" class="nb2__loading">載入中…</div>
        <NotebookViewV2 v-else />
      </div>
      <Pv2BottomNav active="notes" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useBreakpoint } from '@/composables/use-breakpoint'
import { useNotebookStore } from '@/stores/notebook-store'
import NotebookViewV2 from '@/components/v2/notebook/NotebookViewV2.vue'
import Pv2BottomNav from '@/components/v2/ui/Pv2BottomNav.vue'
import Pv2PageBackdrop from '@/components/v2/ui/Pv2PageBackdrop.vue'

const { isDesktop } = useBreakpoint()
const store = useNotebookStore()
</script>

<style scoped>
.nb2 {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.nb2__frame {
  /* --pv2-safe-top 供 Pv2PageBackdrop 抵銷 padding 用（見該元件的負 top）。
     手機是 0，桌面 device frame 另有覆寫。 */
  --pv2-safe-top: 0px;
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--cd-surface-canvas);
  isolation: isolate; /* 建立堆疊脈絡，讓背景層的負 z-index 只落在 frame 內 */
  padding-top: var(--pv2-safe-top);
}

.nb2__content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.nb2__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--cd-ink-muted);
  font: 500 14px var(--cd-font-ui);
}

/* Desktop: centre the 393px phone frame, matching SettingsPageV2. */
.nb2--desktop {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 26px 18px;
  background: #d9d9d9;
  box-sizing: border-box;
}

.nb2--desktop .nb2__frame {
  width: 393px;
  height: 852px;
  flex: none;
  border-radius: 44px;
  box-shadow: 0 30px 70px rgba(0, 0, 0, 0.28);
  isolation: isolate;
  --pv2-safe-top: 44px;
  padding-top: var(--pv2-safe-top);
}
</style>
