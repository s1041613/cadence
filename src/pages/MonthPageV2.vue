<template>
  <!--
    v2 月曆頁殼。重用既有 store 驅動的 overlay（quick-add / event-preview / focus），
    外觀之後再換皮；月曆主畫面 MonthViewV2 照設計稿。
    - data-poster-root：anchorFromEvent / CdPopover 的 clamp 根，overlay 定位需要它。
    - 桌面寬度把 393px 手機 frame 置中（像設計稿的 device frame）；手機寬度滿版。
  -->
  <div class="mp2" :class="{ 'mp2--desktop': isDesktop }">
    <div id="mp2-root" class="mp2__frame" data-poster-root>
      <!-- 共用桌布層：內容頁一律掛這個，Settings 不掛。設定在 Customization。 -->
      <Pv2PageBackdrop />

      <div v-if="tasksStore.isLoading" class="mp2__loading">載入中…</div>
      <MonthViewV2 v-else />

      <!-- overlay：暫用舊皮，能用就好。loading 時關 quick-add（defaultCalendarId 才不會為 null）。 -->
      <QuickAddPopover v-if="ui.qaPop && !tasksStore.isLoading" variant="v2" />
      <EventPreviewPopoverV2 v-if="ui.eventPreview" />
    </div>

    <!-- 新建事件 overlay：day sheet 新增的 ui.createOpen 由它消費（暫用舊皮，能用就好） -->
    <EventComposerOverlay v-if="ui.eventComposerInitialValues || ui.createOpen" variant="v2" />

  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount } from 'vue'
import { useUiStore } from '@/stores/ui-store'
import { useTasksStore } from '@/stores/tasks-store'
import { useBreakpoint } from '@/composables/use-breakpoint'
import Pv2PageBackdrop from '@/components/v2/ui/Pv2PageBackdrop.vue'
import MonthViewV2 from '@/components/v2/month/MonthViewV2.vue'
import QuickAddPopover from '@/components/shell/QuickAddPopover.vue'
import EventPreviewPopoverV2 from '@/components/v2/event/EventPreviewPopoverV2.vue'
import EventComposerOverlay from '@/components/shell/EventComposerOverlay.vue'

const ui = useUiStore()
const tasksStore = useTasksStore()
const { isDesktop } = useBreakpoint()

// 離開 v2 頁時清掉這頁開過的 global overlay state，避免殘留污染舊版 `/`（反之亦然）。
onBeforeUnmount(() => {
  ui.qaPop = null
  ui.eventPreview = null
  ui.monthSheet = false
  ui.dayList = null
  ui.createOpen = false
  ui.eventComposerInitialValues = null
})
</script>

<style scoped>
.mp2 {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.mp2__frame {
  /* --pv2-safe-top 供 Pv2PageBackdrop 抵銷 padding 用（見該元件的負 top）。
     手機是 0：safe-area 策略待重新設計，這裡不再自行讓位。桌面 device frame 另有覆寫。 */
  --pv2-safe-top: 0px;

  /* 月曆頁的配色只活在這個 frame 裡：custom property 往下繼承，所以覆寫在這裡等於
     「只有這一頁換皮」，Day / Week / Notes / Settings 仍是原本的暖色角色色。
     - --cd-surface-canvas 一起換掉，是因為 Pv2PageBackdrop 的白紗淡向這個 token；
       不換的話一旦使用者設了背景圖，底色會淡回暖白，跟頁面其他部分打架。
     - nav 的 accent 走 Pv2BottomNav 開的兩個 hook（見該元件），這裡把 active 態染成 rose。 */
  --cd-surface-canvas: var(--pv2-canvas);
  --pv2-nav-on: var(--pv2-rose);
  --pv2-nav-pill: var(--pv2-rose-soft);

  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  /* 無背景圖時的底色。上淺下深的極淡漸層，讓大標題那一帶比格線區亮一點——
     設計稿的頁面不是平塗的白。 */
  background: linear-gradient(180deg, var(--pv2-canvas-top) 0%, var(--pv2-canvas) 42%);
  isolation: isolate; /* 建立堆疊脈絡，讓背景層的負 z-index 只落在 frame 內 */
  padding-top: var(--pv2-safe-top);
}

/* 桌面 device frame 沒有系統 safe-area，用固定 status bar 高度佔位維持設計稿比例 */
.mp2--desktop .mp2__frame {
  --pv2-safe-top: 44px;
  padding-top: var(--pv2-safe-top);
}

/* 桌面：置中 393px 手機 frame（設計稿 device frame：圓角 44、陰影） */
.mp2--desktop {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 26px 18px;
  background: #e6e8ec;
  box-sizing: border-box;
}

.mp2--desktop .mp2__frame {
  width: 393px;
  height: 852px;
  flex: none;
  border-radius: 44px;
  box-shadow: 0 30px 70px rgba(0, 0, 0, 0.28);
  isolation: isolate;
}

.mp2__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--pv2-ink-2);
  font: 500 14px var(--cd-font-ui);
}
</style>
