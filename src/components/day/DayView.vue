<template>
  <div>
    <div class="viewhead">
      <div class="dayhead-row">
        <div class="dayhead-left">
          <h1>{{ label }}</h1>
          <div v-if="isToday" class="liveclock">
            <span class="tnow mono">
              {{ pad(now.getHours()) }}:{{ pad(now.getMinutes()) }}<span class="sec">:{{ pad(now.getSeconds()) }}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
    <WeekStrip />
    <div class="day-grid solo">
      <Timeline
        :date="ui.selectedDate"
        :tasks="tasksStore.tasks"
        :now="now"
        @open="(taskId) => (ui.previewTaskId = taskId)"
        @toggle-done="(taskId) => tasksStore.toggleDone(taskId)"
        @focus="(taskId) => (ui.focusTaskId = taskId)"
        @new="(initialValues) => (ui.taskEditorInitialValues = initialValues)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import WeekStrip from './WeekStrip.vue'
import Timeline from './Timeline.vue'
import { useUiStore } from '@/stores/ui-store'
import { useTasksStore } from '@/stores/tasks-store'
import { useCurrentTime } from '@/composables/use-current-time'
import { pad, parseISO, iso } from '@/utils/convert-date-time'

const ui = useUiStore()
const tasksStore = useTasksStore()
// 共享的 singleton 時鐘（見 use-current-time.ts），每秒更新一次，往下透過 props 傳給 Timeline
const now = useCurrentTime()

const isToday = computed(() => ui.selectedDate === iso(new Date()))
const label = computed(() => {
  const d = parseISO(ui.selectedDate)
  return `${d.getFullYear()}年 ${d.getMonth() + 1}月${d.getDate()}日`
})
</script>

<style scoped lang="sass">
.viewhead
  display: flex
  align-items: flex-end
  justify-content: space-between
  margin-bottom: 22px
  gap: 20px
  flex-wrap: wrap

  h1
    margin: 0
    font-weight: 700
    font-size: 30px
    letter-spacing: -.02em
    line-height: 1

.dayhead-row
  display: flex
  align-items: center
  gap: 18px
  flex-wrap: wrap
  margin-top: 10px

  h1
    margin: 0

  .liveclock
    margin-top: 0

.dayhead-left
  display: flex
  align-items: center
  gap: 18px
  flex-wrap: wrap
  min-width: 0

.liveclock
  display: flex
  align-items: baseline
  gap: 9px
  margin-top: 14px

  .tnow
    font-family: 'JetBrains Mono', ui-monospace, monospace
    font-weight: 700
    font-size: 21px
    letter-spacing: .02em
    line-height: 1
    font-variant-numeric: tabular-nums

    .sec
      color: $ink-3

.day-grid
  display: grid
  grid-template-columns: minmax(360px, 1fr) minmax(420px, 1.05fr)
  gap: 20px
  align-items: start

  &.solo
    grid-template-columns: 1fr

@media (max-width: 980px)
  .day-grid
    grid-template-columns: 1fr
</style>
