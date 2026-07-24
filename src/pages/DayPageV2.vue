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
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #F1EFE9;
  isolation: isolate;
  padding-top: max(env(safe-area-inset-top), 40px);
  /* 底部不留 frame padding：safe-area 由白色底部 nav 的 padding-bottom 自行吃滿，
     讓白底一路連續到螢幕底，不露出 frame 背景塗鴉/底色帶。 */
}

.dp2__bg {
  position: absolute;
  inset: 0;
  z-index: -1;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
}

.dp2__scrim {
  position: absolute;
  inset: 0;
  z-index: -1;
  background: #F1EFE9;
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
  padding-top: 44px;
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
