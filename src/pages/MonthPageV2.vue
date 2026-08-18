<template>
  <!--
    v2 月曆頁殼。重用既有 store 驅動的 overlay（quick-add / event-preview / focus），
    外觀之後再換皮；月曆主畫面 MonthViewV2 照設計稿。
    - data-poster-root：anchorFromEvent / CdPopover 的 clamp 根，overlay 定位需要它。
    - 桌面寬度把 393px 手機 frame 置中（像設計稿的 device frame）；手機寬度滿版。
  -->
  <div class="mp2" :class="{ 'mp2--desktop': isDesktop }">
    <div id="mp2-root" class="mp2__frame" data-poster-root>
      <!-- 月檢視不掛共用桌布層：使用者的照片改由 MonthViewV2 自己收進頂部 header band，
           不再鋪滿全頁——見該元件的 .mv2__band。Day / Week / Notes 仍用 Pv2PageBackdrop。 -->

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
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--cd-surface-canvas); /* 無背景圖時的底色 */
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
  background: #d9d9d9;
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
  color: var(--cd-ink-muted);
  font: 500 14px var(--cd-font-ui);
}
</style>
