<template>
  <div>
    <div class="viewhead">
      <div>
        <h1 style="margin-top: 10px">
          {{ weekStart.getMonth() + 1 }}/{{ weekStart.getDate() }} – {{ weekEnd.getMonth() + 1 }}/{{ weekEnd.getDate() }}
        </h1>
        <p class="lede">一週的任務怎麼分佈，密集在哪幾天，哪裡還空著，一眼看完。</p>
      </div>
      <div class="navset">
        <button class="iconbtn" @click="ui.selectedDate = iso(addDays(weekStart, -7))">‹</button>
        <button class="iconbtn wide" @click="ui.selectedDate = iso(new Date())">本週</button>
        <button class="iconbtn" @click="ui.selectedDate = iso(addDays(weekStart, 7))">›</button>
      </div>
    </div>
    <div class="week-scroll">
      <div class="week">
        <div class="week-head">
          <div class="wh-cell" />
          <div
            v-for="(d, i) in days"
            :key="i"
            class="wh-cell"
            :class="{ today: iso(d) === today, sat: d.getDay() === 6, sun: d.getDay() === 0 }"
          >
            <div class="wd">{{ WD_EN[d.getDay()] }}</div>
            <div class="dn mono">{{ d.getDate() }}</div>
          </div>
        </div>
        <div class="week-body">
          <div class="wtime">
            <div v-for="h in hours" :key="h" class="wt-h mono">{{ pad(h) }}</div>
          </div>
          <div v-for="(d, di) in days" :key="di" class="wcol" style="position: relative">
            <div v-for="h in hours" :key="h" class="wt-h" />
            <div class="wcol-lane addable" style="position: absolute; inset: 0" title="點空白處新增任務" @click="(e) => addAt(e, iso(d))">
              <button
                v-for="(task, i) in allDayTasks(iso(d))"
                :key="task.id"
                type="button"
                class="week-all-day"
                :class="{ done: task.done, 'has-tex': themeOf(task).texture !== 'none' }"
                :style="{
                  '--all-day-offset': `${i * 5}px`,
                  '--task-bg': themeOf(task).backgroundColor,
                  '--task-ink': themeOf(task).textColor,
                  '--tl-tex': textureBackgroundForCard(themeOf(task).texture, themeOf(task).backgroundColor)
                }"
                :title="task.title"
                @click.stop="ui.previewTaskId = task.id"
              >
                <span v-if="themeOf(task).texture !== 'none'" class="week-all-day-tex" />
                <span class="week-all-day-card">
                  <span
                    class="week-all-day-check"
                    :title="task.done ? '標為待進行' : '標為完成'"
                    @click.stop="tasksStore.toggleDone(task.id)"
                  >
                    <svg viewBox="0 0 16 16"><polyline points="3.5,8.5 6.5,11.5 12.5,4.5" /></svg>
                  </span>
                  <span class="week-all-day-copy">
                    <span v-if="themeOf(task).icon" class="week-all-day-glyph" v-html="themeOf(task).icon" />
                    <span class="week-all-day-title">{{ task.title || '未命名任務' }}</span>
                    <span class="week-all-day-kicker">整天</span>
                  </span>
                  <span class="week-all-day-pom" title="開始番茄鐘專注" @click.stop="ui.focusTaskId = task.id">
                    <svg viewBox="0 0 24 24" v-html="TOMATO_SVG" />
                  </span>
                </span>
              </button>
              <WeekBlock
                v-for="entry in dayTasks(iso(d))"
                :key="entry.task.id"
                :task="entry.task"
                :top="entry.top"
                :height="entry.height"
                :active="entry.active"
                :progress-pct="entry.progressPct"
                @open="(taskId) => (ui.previewTaskId = taskId)"
                @toggle-done="(taskId) => tasksStore.toggleDone(taskId)"
              />
              <div v-if="showNow(iso(d))" class="week-now-line" :style="{ top: `${top(nowMin)}px` }">
                <span class="week-now-dot" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="legend">
      <div v-for="q in QUADRANTS" :key="q.key" class="lg">
        <span class="sw" :style="{ background: q.backgroundColor, border: 'none' }" />{{ q.name }}
      </div>
      <div class="lg"><span class="sw now-sw" />現在時間</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import WeekBlock from './WeekBlock.vue'
import { useUiStore } from '@/stores/ui-store'
import { useTasksStore } from '@/stores/tasks-store'
import { useCurrentTime } from '@/composables/use-current-time'
import { QUADRANTS, themeOf, textureBackgroundForCard } from '@/composables/use-theme'
import type { Task } from '@/types/task'
import { addDays, iso, minutes, pad, parseISO, startOfWeek, toHM, WD_EN } from '@/utils/convert-date-time'
import { TOMATO_SVG } from '@/utils/tomato-icon'

const START_H = 6
const END_H = 23
const WH = 46

const ui = useUiStore()
const tasksStore = useTasksStore()
const now = useCurrentTime()

const today = iso(new Date())
const weekStart = computed(() => startOfWeek(parseISO(ui.selectedDate)))
const weekEnd = computed(() => addDays(weekStart.value, 6))
const days = computed(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart.value, i)))
const hours = computed(() => {
  const r: number[] = []
  for (let h = START_H; h <= END_H; h++) r.push(h)
  return r
})

function top(m: number): number {
  return ((m - START_H * 60) / 60) * WH
}

const nowMin = computed(() => now.value.getHours() * 60 + now.value.getMinutes() + now.value.getSeconds() / 60)

function showNow(dt: string): boolean {
  return dt === today && nowMin.value >= START_H * 60 && nowMin.value <= END_H * 60 + 30
}

function dayTasks(dt: string): Array<{ task: Task; top: number; height: number; active: boolean; progressPct: number }> {
  const tasks = tasksStore.tasks.filter((t) => t.date === dt && !t.allDay && t.start)
  const active_ = showNow(dt)
  return tasks.map((task) => {
    const startMin = minutes(task.start)
    const endMin = minutes(task.end)
    const height = Math.max(22, ((endMin - startMin) / 60) * WH - 2)
    const active = active_ && nowMin.value >= startMin && nowMin.value < endMin && !task.done
    const progressPct = active ? Math.min(100, ((nowMin.value - startMin) / (endMin - startMin)) * 100) : 0
    return { task, top: top(startMin), height, active, progressPct }
  })
}

function allDayTasks(dt: string): Task[] {
  return tasksStore.tasks
    .filter((t) => t.date === dt && t.allDay)
    .sort((a, b) => Number(a.done) - Number(b.done) || a.title.localeCompare(b.title, 'zh-Hant'))
}

function addAt(e: MouseEvent, dt: string): void {
  if (e.target !== e.currentTarget) return
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const y = e.clientY - rect.top
  let m = START_H * 60 + (y / WH) * 60
  m = Math.round(m / 15) * 15
  m = Math.max(START_H * 60, Math.min(END_H * 60 + 30, m))
  ui.taskEditorInitialValues = { date: dt, start: toHM(m), end: toHM(Math.min(24 * 60 - 1, m + 30)) }
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

  h1
    margin: 0
    font-weight: 700
    font-size: 30px
    letter-spacing: -.02em
    line-height: 1

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

.week-scroll
  overflow-x: auto

.week
  min-width: 780px
  border-radius: 14px
  overflow: hidden
  border: 1px solid $line

.week-head
  display: grid
  grid-template-columns: 52px repeat(7, 1fr)
  background: $surface
  border-bottom: 1px solid $line

.wh-cell
  padding: 12px 8px
  text-align: center
  border-left: 1px solid $line

  &:first-child
    border-left: none

  .wd
    font-size: 10px
    letter-spacing: .14em
    text-transform: uppercase
    color: $ink-3
    font-weight: 600

  .dn
    font-family: 'JetBrains Mono', ui-monospace, monospace
    font-size: 18px
    font-weight: 700
    margin-top: 3px

  &.today .dn
    background: $ink
    color: $paper
    border-radius: 7px
    padding: 0 6px
    display: inline-block

  &.sat .wd
    color: $sat
  &.sun .wd
    color: $sun

.week-body
  display: grid
  grid-template-columns: 52px repeat(7, 1fr)
  background: $surface
  position: relative

.wtime
  display: flex
  flex-direction: column

  .wt-h
    height: 46px
    font-family: 'JetBrains Mono', ui-monospace, monospace
    font-size: 9.5px
    color: $ink-3
    text-align: right
    padding: 2px 6px 0 0
    border-top: 1px solid $line

.wcol
  border-left: 1px solid $line
  position: relative

  .wt-h
    height: 46px
    border-top: 1px solid $line

.wcol-lane
  &.addable
    cursor: copy

.week-all-day
  position: absolute
  inset: var(--all-day-offset, 0)
  border: 1px solid color-mix(in srgb, var(--task-bg, #{$ink}) 26%, #{$line})
  border-radius: 7px
  background: color-mix(in srgb, var(--task-bg, #{$ink}) 7%, transparent)
  color: $ink
  padding: 0
  display: block
  overflow: hidden
  cursor: pointer
  z-index: 1
  transition: .12s

  &:hover
    border-color: color-mix(in srgb, var(--task-bg, #{$ink}) 46%, #{$line})
    background: color-mix(in srgb, var(--task-bg, #{$ink}) 10%, transparent)

  &.done
    opacity: .48

    .week-all-day-title
      text-decoration: line-through

.week-all-day-tex
  position: absolute
  inset: 0
  background: var(--tl-tex, none)
  opacity: .62
  pointer-events: none

.week-all-day-check,
.week-all-day-copy,
.week-all-day-pom
  position: relative
  z-index: 2

.week-all-day-card
  position: absolute
  top: 8px
  left: 8px
  right: 8px
  min-height: 28px
  border-radius: 6px
  border: 1px solid color-mix(in srgb, var(--task-bg, #{$ink}) 34%, #{$line})
  background: color-mix(in srgb, #{$surface} 88%, var(--task-bg, #{$ink}))
  box-shadow: inset 4px 0 0 var(--task-bg, #{$ink})
  display: grid
  grid-template-columns: 15px minmax(0, 1fr) 20px
  align-items: center
  gap: 6px
  padding: 4px 5px 4px 9px
  z-index: 2

.week-all-day-check
  width: 13px
  height: 13px
  border-radius: 50%
  border: 1.8px solid var(--task-bg, #{$ink})
  background: none
  display: grid
  place-items: center
  padding: 0
  cursor: pointer
  line-height: 0

  svg
    width: 8px
    height: 8px
    stroke: #fff
    stroke-width: 2.8
    fill: none
    opacity: 0

.week-all-day.done .week-all-day-check
  background: $green
  border-color: $green

  svg
    opacity: 1

.week-all-day-copy
  min-width: 0
  display: flex
  align-items: center
  flex-direction: row
  justify-content: flex-start
  gap: 5px
  overflow: hidden
  line-height: 1

.week-all-day-kicker
  flex: none
  font-size: 8px
  line-height: 1
  color: color-mix(in srgb, var(--task-bg, #{$ink}) 50%, #{$ink-3})
  font-weight: 800
  letter-spacing: .08em

.week-all-day-title
  min-width: 0
  font-size: 10.5px
  font-weight: 800
  line-height: 1.2
  color: $ink
  white-space: nowrap
  overflow: hidden
  text-overflow: ellipsis

.week-all-day-glyph
  display: inline-flex
  align-items: center
  flex: none

  :deep(svg)
    display: block
    width: 11px
    height: 11px

.week-all-day-pom
  width: 20px
  height: 20px
  display: grid
  place-items: center
  opacity: .76
  transition: .15s

  svg
    display: block
    width: 18px
    height: 18px

  &:hover
    opacity: 1
    transform: scale(1.1) rotate(-4deg)

.wblock
  z-index: 3

.week-now-line
  position: absolute
  left: 0
  right: 0
  height: 0
  border-top: 1.5px solid $now
  z-index: 5
  transition: top 1s linear
  pointer-events: none

.week-now-dot
  position: absolute
  left: -4px
  top: -3.5px
  width: 7px
  height: 7px
  border-radius: 50%
  background: $now

.legend
  display: flex
  gap: 22px
  margin-top: 16px
  flex-wrap: wrap

  .lg
    display: flex
    align-items: center
    gap: 9px
    font-size: 12.5px
    color: $ink-2

  .sw
    width: 16px
    height: 16px
    border-radius: 4px
    border: 1px solid $line-2
    flex: none

    &.now-sw
      background: $now
      border: none
      height: 2px
      border-radius: 0
      width: 18px
</style>
