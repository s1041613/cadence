<template>
  <div class="app">
    <!--
      Every view is rebuilt against the new design (design.md "Replacement proceeds
      shell-first, then views by dependency"). AppShellChrome mounts unconditionally.
    -->
    <AppShellChrome />
    <div class="main" data-poster-root>
      <div v-if="tasksStore.isLoading" class="loading-state">載入中…</div>
      <template v-else>
        <DayView v-if="ui.activeView === 'day'" />
        <WeekView v-else-if="ui.activeView === 'week'" />
        <MonthView v-else-if="ui.activeView === 'month'" />
      </template>
      <!-- Defensive gate: ui.qaPop is only ever set by Month/Day/Week click handlers, which already
           live inside the v-else block above — this guard covers the case where isLoading flips
           back to true (a retried load) while qaPop is still set from before. -->
      <QuickAddPopover v-if="ui.qaPop && !tasksStore.isLoading" />
      <EventPreviewPopover v-if="ui.eventPreview" />
    </div>

    <DraftDrawer />
    <EventComposerOverlay v-if="ui.eventComposerInitialValues || ui.createOpen" />
    <SettingsDrawer />
    <AssistantDrawer />
    <FocusSession v-if="ui.focusTaskId" />
  </div>
</template>

<script setup lang="ts">
import { useUiStore } from '@/stores/ui-store'
import { useTasksStore } from '@/stores/tasks-store'
import AppShellChrome from '@/components/shell/AppShellChrome.vue'
import QuickAddPopover from '@/components/shell/QuickAddPopover.vue'
import EventPreviewPopover from '@/components/shell/EventPreviewPopover.vue'
import EventComposerOverlay from '@/components/shell/EventComposerOverlay.vue'
import DraftDrawer from '@/components/shell/DraftDrawer.vue'
import SettingsDrawer from '@/components/shell/SettingsDrawer.vue'
import AssistantDrawer from '@/components/shell/AssistantDrawer.vue'
import DayView from '@/components/day/DayView.vue'
import WeekView from '@/components/week/WeekView.vue'
import MonthView from '@/components/month/MonthView.vue'
import FocusSession from '@/components/focus/FocusSession.vue'

const ui = useUiStore()
const tasksStore = useTasksStore()
</script>

<style scoped lang="sass">
.app
  position: relative
  width: 100%
  height: 100dvh
  display: flex
  flex-direction: column
  background: $bg
  overflow: hidden

.main
  position: relative
  flex: 1
  min-height: 0
  width: 100%
  min-width: 0
  display: flex
  flex-direction: column
  overflow: hidden
  background: $surface

  @media (max-width: 899px)
    // Clears AppShellChrome's fixed bottom nav (task 3.1) so phone-viewport content
    // never renders underneath it. 899px mirrors $cd-bp-desktop - 1px from breakpoints.sass;
    // duplicated as a literal because Sass @import ordering here would pull the whole
    // token partial into a page-scoped stylesheet for one value. 86px matches CdFab's own
    // `bottom: 86px` clearance (AppShellChrome.vue), the value this codebase already uses
    // as the bottom nav's occupied height.
    padding-bottom: 86px

.loading-state
  display: flex
  align-items: center
  justify-content: center
  height: 100%
  color: $ink-2
</style>
