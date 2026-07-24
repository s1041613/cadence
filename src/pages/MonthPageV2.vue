<template>
  <!--
    v2 月曆頁殼。重用既有 store 驅動的 overlay（quick-add / event-preview / focus），
    外觀之後再換皮；月曆主畫面 MonthViewV2 照設計稿。
    - data-poster-root：anchorFromEvent / CdPopover 的 clamp 根，overlay 定位需要它。
    - 桌面寬度把 393px 手機 frame 置中（像設計稿的 device frame）；手機寬度滿版。
  -->
  <div class="mp2" :class="{ 'mp2--desktop': isDesktop }">
    <div id="mp2-root" class="mp2__frame" data-poster-root>
      <!-- v2 背景圖 + 白紗遮罩：Customization 設定，讀 v2-appearance-store。遮罩越強文字越清楚。 -->
      <img
        v-if="appearance.backgroundImage"
        :src="appearance.backgroundImage"
        alt=""
        class="mp2__bg"
      />
      <div
        v-if="appearance.backgroundImage"
        class="mp2__scrim"
        :style="{ opacity: appearance.scrimOpacity }"
      />

      <div v-if="tasksStore.isLoading" class="mp2__loading">載入中…</div>
      <MonthViewV2 v-else />

      <!-- overlay：暫用舊皮，能用就好。loading 時關 quick-add（defaultCalendarId 才不會為 null）。 -->
      <QuickAddPopover v-if="ui.qaPop && !tasksStore.isLoading" variant="v2" />
      <EventPreviewPopoverV2 v-if="ui.eventPreview" />
    </div>

    <!-- 新建事件 overlay：FAB 的 ui.createOpen 由它消費（暫用舊皮，能用就好） -->
    <EventComposerOverlay v-if="ui.eventComposerInitialValues || ui.createOpen" variant="v2" />

    <!-- focus session：event-preview 的 start-focus 會設 ui.focusTaskId，這裡要接住才有反應 -->
    <FocusSession v-if="ui.focusTaskId" />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount } from 'vue'
import { useUiStore } from '@/stores/ui-store'
import { useTasksStore } from '@/stores/tasks-store'
import { useBreakpoint } from '@/composables/use-breakpoint'
import { useV2AppearanceStore } from '@/stores/v2-appearance-store'
import MonthViewV2 from '@/components/v2/month/MonthViewV2.vue'
import QuickAddPopover from '@/components/shell/QuickAddPopover.vue'
import EventPreviewPopoverV2 from '@/components/v2/event/EventPreviewPopoverV2.vue'
import EventComposerOverlay from '@/components/shell/EventComposerOverlay.vue'
import FocusSession from '@/components/focus/FocusSession.vue'

const ui = useUiStore()
const tasksStore = useTasksStore()
const appearance = useV2AppearanceStore()
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
  height: 100dvh;
  overflow: hidden;
}

.mp2__frame {
  /* --mp2-safe-top 供背景層抵銷 padding 用（見 __bg / __scrim 的負 top）。 */
  --mp2-safe-top: max(env(safe-area-inset-top), 40px);
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #fafaf9; /* 海報底（無背景圖時的底色，對齊設計稿頁面底色） */
  isolation: isolate; /* 建立堆疊脈絡，讓背景層的負 z-index 只落在 frame 內 */
  /* 頂部 safe-area：真機讓開系統 status bar；至少留一點空白，chip 列不貼到最上方。
     不畫假的 9:41/電量（真機自有系統 status bar），只保留其佔位。 */
  padding-top: var(--mp2-safe-top);
  /* 底部 safe-area：把內容欄（含白色底部 nav）推到 home indicator 之上，
     讓 frame 的底色填滿 safe-area，與頁面連續、不露 body 底色帶。 */
  padding-bottom: env(safe-area-inset-bottom);
}

/* 背景圖鋪滿整個 frame（含 safe-area 區），浮在底色上、月曆內容下。
   absolute 的 inset 錨定 padding-box 內緣，所以要用負 top 抵回 padding-top，
   否則背景層會從 safe-area 之後才開始、頂部露出一條底色（白帶）。 */
.mp2__bg {
  position: absolute;
  top: calc(-1 * var(--mp2-safe-top));
  left: 0;
  right: 0;
  bottom: 0;
  z-index: -1;
  width: 100%;
  /* Explicit height so the <img> fills frame + negated safe-area; width:100% alone
     leaves it at intrinsic (auto) height and the picture stops partway down. */
  height: calc(100% + var(--mp2-safe-top));
  object-fit: cover;
  pointer-events: none;
}

/* 白紗遮罩：opacity 由 store 的 scrimOpacity 控制，越強背景越淡、文字越清楚 */
.mp2__scrim {
  position: absolute;
  top: calc(-1 * var(--mp2-safe-top));
  left: 0;
  right: 0;
  bottom: 0;
  z-index: -1;
  background: #fafaf9;
  pointer-events: none;
  transition: opacity 0.25s ease;
}

@media (prefers-reduced-motion: reduce) {
  .mp2__scrim {
    transition: none;
  }
}

/* 桌面 device frame 沒有系統 safe-area，用固定 status bar 高度佔位維持設計稿比例 */
.mp2--desktop .mp2__frame {
  --mp2-safe-top: 44px;
  padding-top: var(--mp2-safe-top);
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
  color: #9c9e94;
  font: 500 14px var(--cd-font-ui);
}
</style>
