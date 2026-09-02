<template>
  <!--
    v2 週檢視頁殼。結構同 MonthPageV2：共用桌布層（Pv2PageBackdrop）、
    data-poster-root（overlay 定位）、桌面手機 frame 置中；手機與平板滿版。
  -->
  <div class="wp2" :class="{ 'wp2--desktop': layout === 'desktop' }">
    <div class="wp2__frame" data-poster-root>
      <Pv2PageBackdrop />

      <div v-if="tasksStore.isLoading" class="wp2__loading">載入中…</div>
      <WeekViewV2 v-else />

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
import WeekViewV2 from '@/components/v2/week/WeekViewV2.vue'
import QuickAddPopover from '@/components/shell/QuickAddPopover.vue'
import EventPreviewPopoverV2 from '@/components/v2/event/EventPreviewPopoverV2.vue'
import EventComposerOverlay from '@/components/shell/EventComposerOverlay.vue'

const ui = useUiStore()
const tasksStore = useTasksStore()
const { layout } = useBreakpoint()

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
  height: 100%;
  overflow: hidden;
}

.wp2__frame {
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
  /* min(), not a flat 852px: the page clips its overflow, so on any viewport shorter
     than 852 + the shell's 52px of padding — a laptop window, a browser with devtools
     docked — the frame's bottom (and with it the nav pill) was simply cut off. */
  height: min(852px, 100%);
  flex: none;
  border-radius: 44px;
  box-shadow: 0 30px 70px rgba(0, 0, 0, 0.28);
  isolation: isolate;
  --pv2-safe-top: 44px;
  padding-top: var(--pv2-safe-top);
}

.wp2__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--cd-ink-muted);
  font: 500 14px var(--cd-font-ui);
}
</style>
