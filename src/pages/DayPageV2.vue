<template>
  <!--
    v2 日檢視頁殼。結構同 WeekPageV2：背景圖 + 白紗遮罩（共用 v2-appearance-store）、
    data-poster-root（overlay 定位）、桌面手機 frame 置中。
  -->
  <div class="dp2" :class="{ 'dp2--desktop': isDesktop }">
    <div class="dp2__frame" data-poster-root>
      <img
        v-if="appearance.backgroundImage"
        :src="appearance.backgroundImage"
        alt=""
        class="dp2__bg"
      />
      <div
        v-if="appearance.backgroundImage"
        class="dp2__scrim"
        :style="{ opacity: appearance.scrimOpacity }"
      />

      <div v-if="tasksStore.isLoading" class="dp2__loading">載入中…</div>
      <DayViewV2 v-else />

      <QuickAddPopover v-if="ui.qaPop && !tasksStore.isLoading" variant="v2" />
      <EventPreviewPopoverV2 v-if="ui.eventPreview" />
    </div>

    <EventComposerOverlay v-if="ui.eventComposerInitialValues || ui.createOpen" variant="v2" />
    <FocusSession v-if="ui.focusTaskId" />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount } from 'vue'
import { useUiStore } from '@/stores/ui-store'
import { useTasksStore } from '@/stores/tasks-store'
import { useBreakpoint } from '@/composables/use-breakpoint'
import { useV2AppearanceStore } from '@/stores/v2-appearance-store'
import DayViewV2 from '@/components/v2/day/DayViewV2.vue'
import QuickAddPopover from '@/components/shell/QuickAddPopover.vue'
import EventPreviewPopoverV2 from '@/components/v2/event/EventPreviewPopoverV2.vue'
import EventComposerOverlay from '@/components/shell/EventComposerOverlay.vue'
import FocusSession from '@/components/focus/FocusSession.vue'

const ui = useUiStore()
const tasksStore = useTasksStore()
const appearance = useV2AppearanceStore()
const { isDesktop } = useBreakpoint()

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
.dp2 {
  width: 100%;
  height: 100dvh;
  overflow: hidden;
}

.dp2__frame {
  /* --dp2-safe-top 供背景層抵銷 padding 用（見 __bg / __scrim 的負 top）。 */
  --dp2-safe-top: max(env(safe-area-inset-top), 40px);
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #fafaf9;
  isolation: isolate;
  padding-top: var(--dp2-safe-top);
  /* 底部 safe-area：讓 frame 底色填滿 home indicator 區，不露 body 底色帶 */
  padding-bottom: env(safe-area-inset-bottom);
}

/* 背景層錨定 padding-box 內緣，用負 top 抵回 padding-top 讓圖鋪到 frame 頂，
   否則頂部 safe-area 會露出底色（白帶）。 */
.dp2__bg {
  position: absolute;
  top: calc(-1 * var(--dp2-safe-top));
  left: 0;
  right: 0;
  bottom: 0;
  z-index: -1;
  width: 100%;
  /* An <img> with only top/bottom insets falls back to its intrinsic (auto) height
     because width:100% is set, so it must get an explicit height to fill the frame
     plus the negated safe-area — otherwise object-fit:cover has nothing to cover and
     the picture stops partway down. */
  height: calc(100% + var(--dp2-safe-top));
  object-fit: cover;
  pointer-events: none;
}

.dp2__scrim {
  position: absolute;
  top: calc(-1 * var(--dp2-safe-top));
  left: 0;
  right: 0;
  bottom: 0;
  z-index: -1;
  background: #fafaf9;
  pointer-events: none;
  transition: opacity 0.25s ease;
}

@media (prefers-reduced-motion: reduce) {
  .dp2__scrim {
    transition: none;
  }
}

.dp2--desktop {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 26px 18px;
  background: #d9d9d9;
  box-sizing: border-box;
}

.dp2--desktop .dp2__frame {
  width: 393px;
  height: 852px;
  flex: none;
  border-radius: 44px;
  box-shadow: 0 30px 70px rgba(0, 0, 0, 0.28);
  isolation: isolate;
  --dp2-safe-top: 44px;
  padding-top: var(--dp2-safe-top);
}

.dp2__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #9c9e94;
  font: 500 14px var(--cd-font-ui);
}
</style>
