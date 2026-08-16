<template>
  <!--
    v2 日檢視頁殼。結構同 WeekPageV2：共用桌布層（Pv2PageBackdrop）、
    data-poster-root（overlay 定位）、桌面手機 frame 置中。
  -->
  <div class="dp2" :class="{ 'dp2--desktop': isDesktop }">
    <div class="dp2__frame" data-poster-root>
      <Pv2PageBackdrop />

      <div v-if="tasksStore.isLoading" class="dp2__loading">載入中…</div>
      <DayViewV2 v-else />

      <QuickAddPopover v-if="ui.qaPop && !tasksStore.isLoading" variant="v2" />
      <EventPreviewPopoverV2 v-if="ui.eventPreview" />
    </div>

    <EventComposerOverlay v-if="ui.eventComposerInitialValues || ui.createOpen" variant="v2" />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount } from 'vue'
import { useUiStore } from '@/stores/ui-store'
import { useTasksStore } from '@/stores/tasks-store'
import { useBreakpoint } from '@/composables/use-breakpoint'
import Pv2PageBackdrop from '@/components/v2/ui/Pv2PageBackdrop.vue'
import DayViewV2 from '@/components/v2/day/DayViewV2.vue'
import QuickAddPopover from '@/components/shell/QuickAddPopover.vue'
import EventPreviewPopoverV2 from '@/components/v2/event/EventPreviewPopoverV2.vue'
import EventComposerOverlay from '@/components/shell/EventComposerOverlay.vue'

const ui = useUiStore()
const tasksStore = useTasksStore()
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
  height: 100%;
  overflow: hidden;
}

.dp2__frame {
  /* --pv2-safe-top 供 Pv2PageBackdrop 抵銷 padding 用（見該元件的負 top）。
     手機是 0：safe-area 策略待重新設計，這裡不再自行讓位。桌面 device frame 另有覆寫。 */
  --pv2-safe-top: 0px;
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--cd-surface-canvas);
  isolation: isolate;
  padding-top: var(--pv2-safe-top);
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
  --pv2-safe-top: 44px;
  padding-top: var(--pv2-safe-top);
}

.dp2__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--cd-ink-muted);
  font: 500 14px var(--cd-font-ui);
}
</style>
