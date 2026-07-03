<template>
  <div class="app">
    <AppTopbar />
    <div class="main">
      <div v-if="tasksStore.isLoading" class="loading-state">載入中…</div>
      <template v-else>
        <DayView v-if="ui.activeView === 'day'" />
        <WeekView v-else-if="ui.activeView === 'week'" />
        <MonthView v-else-if="ui.activeView === 'month'" />
      </template>
    </div>

    <!--
      有這行才能「按下遮罩」關閉頁面
      同時用 mousedown 而非 click，是為了避免在 drawer 內拖曳選字、放開時滑到遮罩上，被誤判成點擊背景而關閉
    -->
    <div v-if="ui.inboxOpen" class="drawer-overlay" @mousedown="(e) => e.target === e.currentTarget && (ui.inboxOpen = false)">
      <div class="drawer">
        <button class="drawer-close" aria-label="關閉" @click="ui.inboxOpen = false">×</button>
        <InboxView />
      </div>
    </div>
    <TaskEditor v-if="ui.taskEditorInitialValues" />
    <TaskPreview v-if="ui.previewTaskId" />
    <FocusSession v-if="ui.focusTaskId" />
  </div>
</template>

<script setup lang="ts">
import { useUiStore } from '@/stores/ui-store'
import { useTasksStore } from '@/stores/tasks-store'
import AppTopbar from '@/components/shell/AppTopbar.vue'
import DayView from '@/components/day/DayView.vue'
import WeekView from '@/components/week/WeekView.vue'
import MonthView from '@/components/month/MonthView.vue'
import InboxView from '@/components/inbox/InboxView.vue'
import TaskEditor from '@/components/task/TaskEditor.vue'
import TaskPreview from '@/components/task/TaskPreview.vue'
import FocusSession from '@/components/focus/FocusSession.vue'

const ui = useUiStore()
const tasksStore = useTasksStore()
</script>

<style scoped lang="sass">
.app
  width: 100%
  min-height: 100dvh
  display: flex
  flex-direction: column
  background: $bg

.main
  flex: 1
  width: 100%
  min-width: 0
  padding: 22px 28px

.loading-state
  display: flex
  align-items: center
  justify-content: center
  height: 100%
  color: $ink-2

.drawer-overlay
  position: fixed
  inset: 0
  background: rgba(20, 19, 15, .28)
  backdrop-filter: blur(2px)
  z-index: 60
  display: flex
  justify-content: flex-end
  padding: 16px

.drawer
  position: relative
  width: min(430px, 92vw)
  height: 100%
  background: $bg
  border: 1px solid $line
  border-radius: 22px
  box-shadow: 0 30px 80px -30px rgba(20, 19, 15, .5)
  overflow-y: auto
  padding: 26px 26px 40px
  animation: drawerIn .28s cubic-bezier(.2, .7, .2, 1)

  :deep(.inbox-wrap)
    max-width: none

@keyframes drawerIn
  from
    transform: translateX(calc(100% + 16px))
  to
    transform: translateX(0)

@media (prefers-reduced-motion: reduce)
  .drawer
    animation: none

.drawer-close
  position: absolute
  top: 18px
  right: 18px
  width: 34px
  height: 34px
  border-radius: 50%
  border: 1px solid $line-2
  background: $surface
  color: $ink
  font-size: 18px
  line-height: 0
  display: grid
  place-items: center
  cursor: pointer
  transition: .15s
  z-index: 2

  &:hover
    border-color: $ink
    background: $ink
    color: $paper
</style>
