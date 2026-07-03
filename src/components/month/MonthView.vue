<template>
  <div>
    <div class="viewhead">
      <div>
        <div class="month-top">
          <span class="yr mono">{{ cur.getFullYear() }}</span>
          <span class="mo mono">{{ pad(cur.getMonth() + 1) }}</span>
        </div>
        <p class="lede" style="margin-top: 2px">
          像店家的營業日曆——能用、休息、活動日一眼分得出來。點任一天可跳到當天細排。
        </p>
      </div>
      <div class="navset">
        <div class="fmt-seg" role="tablist">
          <button class="fmt-opt" :class="{ on: !showTime }" @click="showTime = false">名稱</button>
          <button class="fmt-opt" :class="{ on: showTime }" @click="showTime = true">時間＋名稱</button>
        </div>
        <button class="iconbtn" @click="ui.selectedDate = iso(new Date(cur.getFullYear(), cur.getMonth() - 1, 1))">‹</button>
        <button class="iconbtn wide" @click="ui.selectedDate = iso(new Date())">本月</button>
        <button class="iconbtn" @click="ui.selectedDate = iso(new Date(cur.getFullYear(), cur.getMonth() + 1, 1))">›</button>
      </div>
    </div>
    <div class="month">
      <div class="month-dow">
        <div v-for="(d, i) in ['M', 'T', 'W', 'T', 'F', 'S', 'S']" :key="i" :class="{ sat: i === 5, sun: i === 6 }">
          {{ d }}
        </div>
      </div>
      <div class="month-grid">
        <MonthCell
          v-for="(d, i) in cells"
          :key="i"
          :date="iso(d)"
          :tasks="byDay(iso(d))"
          :in-month="d.getMonth() === cur.getMonth()"
          :show-time="showTime"
          @add-task="(initialValues) => (ui.taskEditorInitialValues = initialValues)"
          @pick-day="pickDay"
          @open="(taskId) => (ui.previewTaskId = taskId)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import MonthCell from './MonthCell.vue'
import { useUiStore } from '@/stores/ui-store'
import { useTasksStore } from '@/stores/tasks-store'
import { addDays, iso, pad, parseISO, startOfWeek } from '@/utils/convert-date-time'
import type { Task } from '@/types/task'

const ui = useUiStore()
const tasksStore = useTasksStore()

const showTime = ref(true)

const cur = computed(() => parseISO(ui.selectedDate))
const cells = computed(() => {
  const first = new Date(cur.value.getFullYear(), cur.value.getMonth(), 1)
  const gridStart = startOfWeek(first)
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
})

function byDay(dt: string): Task[] {
  return tasksStore.tasks.filter((t) => t.date === dt)
}

function pickDay(date: string): void {
  ui.selectedDate = date
  ui.activeView = 'day'
}
</script>

<style scoped lang="sass">
.viewhead
  display: flex
  align-items: flex-end
  justify-content: space-between
  margin-bottom: 22px
  gap: 20px
  flex-wrap: wrap

.lede
  color: $ink-2
  font-size: 13.5px
  margin-top: 9px
  max-width: 42ch
  line-height: 1.5

.navset
  display: flex
  align-items: center
  gap: 6px

.fmt-seg
  display: inline-flex
  background: $paper
  border: 1px solid $line
  border-radius: 999px
  padding: 3px
  margin-right: 4px

.fmt-opt
  border: none
  background: none
  cursor: pointer
  font-size: 12px
  font-weight: 600
  color: $ink-3
  padding: 6px 12px
  border-radius: 999px
  transition: .15s

  &:hover
    color: $ink-2

  &.on
    background: $btn
    color: $ink

.iconbtn
  width: 34px
  height: 34px
  border-radius: 50%
  border: 1px solid $line-2
  background: none
  color: $ink-2
  cursor: pointer
  transition: .15s

  &:hover
    border-color: $ink
    background: $surface

  &.wide
    width: auto
    padding: 0 14px
    font-size: 13px
    font-weight: 600
    border-radius: 999px

.month-top
  display: flex
  align-items: flex-end
  gap: 16px
  margin-bottom: 18px

  .yr
    font-family: 'JetBrains Mono', ui-monospace, monospace
    font-size: 14px
    color: $ink-2
    font-weight: 500

  .mo
    font-family: 'JetBrains Mono', ui-monospace, monospace
    font-size: 48px
    font-weight: 800
    line-height: .9
    letter-spacing: -.04em

.month
  border: 1px solid $line
  border-radius: 14px
  overflow: hidden
  background: $surface

.month-dow
  display: grid
  grid-template-columns: repeat(7, 1fr)
  border-bottom: 1px solid $line

  div
    padding: 11px 0
    text-align: center
    font-size: 11px
    font-weight: 600
    letter-spacing: .1em
    color: $ink-3

    &.sat
      color: $sat
    &.sun
      color: $sun

.month-grid
  display: grid
  grid-template-columns: repeat(7, 1fr)

  :deep(.mcell:nth-child(7n+1))
    border-left: none
</style>
