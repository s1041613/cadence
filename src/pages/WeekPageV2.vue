<template>
  <!--
    v2 週檢視頁殼。結構同 MonthPageV2：背景圖 + 白紗遮罩（共用 v2-appearance-store）、
    data-poster-root（overlay 定位）、桌面手機 frame 置中。
  -->
  <div class="wp2" :class="{ 'wp2--desktop': isDesktop }">
    <div class="wp2__frame" data-poster-root>
      <img
        v-if="appearance.backgroundImage"
        :src="appearance.backgroundImage"
        alt=""
        class="wp2__bg"
      />
      <div
        v-if="appearance.backgroundImage"
        class="wp2__scrim"
        :style="{ opacity: appearance.scrimOpacity }"
      />

      <div v-if="tasksStore.isLoading" class="wp2__loading">載入中…</div>
      <WeekViewV2 v-else />

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
import WeekViewV2 from '@/components/v2/week/WeekViewV2.vue'
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
.wp2 {
  width: 100%;
  height: 100dvh;
  overflow: hidden;
}

.wp2__frame {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #F1EFE9;
  isolation: isolate;
  padding-top: max(env(safe-area-inset-top), 40px);
}

.wp2__bg {
  position: absolute;
  inset: 0;
  z-index: -1;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
}

.wp2__scrim {
  position: absolute;
  inset: 0;
  z-index: -1;
  background: #F1EFE9;
  pointer-events: none;
  transition: opacity 0.25s ease;
}

@media (prefers-reduced-motion: reduce) {
  .wp2__scrim {
    transition: none;
  }
}

.wp2--desktop {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 26px 18px;
  background: #d9d9d9;
  box-sizing: border-box;
}

.wp2--desktop .wp2__frame {
  width: 393px;
  height: 852px;
  flex: none;
  border-radius: 44px;
  box-shadow: 0 30px 70px rgba(0, 0, 0, 0.28);
  isolation: isolate;
  padding-top: 44px;
}

.wp2__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #9c9e94;
  font: 500 14px var(--cd-font-ui);
}
</style>
