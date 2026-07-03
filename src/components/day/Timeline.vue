<template>
  <div class="card timeline">
    <div class="tl-head">
      <span class="d mono">{{ pad(dateObj.getDate()) }}</span>
      <span class="wd">{{ WD_EN[dateObj.getDay()] }} · 週{{ WD_SHORT[dateObj.getDay()] }}</span>
    </div>
    <div class="tl-body">
      <div style="position: relative">
        <div v-for="h in rows" :key="h" class="tl-row">
          <span class="hr mono">{{ pad(h) }}:00</span>
        </div>
        <!-- 現在時間紅線：top 每秒隨 nowMin 更新，靠 CSS transition 補間出平滑移動效果 -->
        <div v-if="showNow" class="now-rail" :style="{ top: `${top(nowMin)}px` }" />
        <!-- 沒有獨立的「+」按鈕：整條時間軸都是可點擊的新增區，卡片用 @click.stop 擋掉冒泡 -->
        <div
          class="tl-lane addable"
          :style="{ top: '0px', height: `${rows.length * HOUR_H}px` }"
          title="點空白處新增任務"
          @click="addAt"
        >
          <button
            v-for="(task, i) in allDayTasks"
            :key="task.id"
            type="button"
            class="all-day-span"
            :class="{ done: task.done, 'has-tex': themeOf(task).texture !== 'none' }"
            :style="{
              top: '0px',
              height: `${rows.length * HOUR_H}px`,
              '--all-day-offset': `${i * 9}px`,
              '--q': themeOf(task).backgroundColor,
              '--task-ink': themeOf(task).textColor,
              '--tl-tex': textureBackgroundForCard(themeOf(task).texture, themeOf(task).backgroundColor)
            }"
            @click.stop="emit('open', task.id)"
          >
            <span v-if="themeOf(task).texture !== 'none'" class="all-day-tex" />
            <span class="all-day-card" @click.stop="emit('open', task.id)">
              <span
                class="all-day-check"
                :title="task.done ? '標為待進行' : '標為完成'"
                @click.stop="emit('toggle-done', task.id)"
              >
                <svg viewBox="0 0 16 16"><polyline points="3.5,8.5 6.5,11.5 12.5,4.5" /></svg>
              </span>
              <span class="all-day-copy">
                <span class="all-day-title">
                  <span v-if="themeOf(task).icon" class="all-day-glyph" v-html="themeOf(task).icon" />
                  {{ task.title || '未命名任務' }}
                </span>
                <span v-if="task.location" class="all-day-meta">{{ task.location }}</span>
              </span>
              <span class="all-day-pom" title="開始番茄鐘專注" @click.stop="emit('focus', task.id)">
                <svg viewBox="0 0 24 24" v-html="TOMATO_SVG" />
              </span>
            </span>
          </button>
          <TimelineBlock
            v-for="entry in dayTasks"
            :key="entry.task.id"
            :task="entry.task"
            :top="top(minutes(entry.task.start))"
            :height="entry.height"
            :active="entry.active"
            :progress-pct="entry.progressPct"
            @open="(taskId) => emit('open', taskId)"
            @toggle-done="(taskId) => emit('toggle-done', taskId)"
            @focus="(taskId) => emit('focus', taskId)"
          />
        </div>
        <div v-if="showNow" class="now-tip" :style="{ top: `${top(nowMin)}px` }">
          <span class="now-tri" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import TimelineBlock from './TimelineBlock.vue'
import type { Task } from '@/types/task'
import { themeOf, textureBackgroundForCard } from '@/composables/use-theme'
import { pad, parseISO, minutes, toHM, WD_EN, WD_SHORT } from '@/utils/convert-date-time'
import { TOMATO_SVG } from '@/utils/tomato-icon'

const START_H = 6
const END_H = 23
const HOUR_H = 62

const props = defineProps<{
  date: string
  tasks: Task[]
  now: Date
}>()

const emit = defineEmits<{
  open: [taskId: string]
  'toggle-done': [taskId: string]
  focus: [taskId: string]
  new: [initialValues: Partial<Task>]
}>()

const dateObj = computed(() => parseISO(props.date))
const rows = computed(() => {
  const r: number[] = []
  for (let h = START_H; h <= END_H; h++) r.push(h)
  return r
})

// 分鐘數轉成 CSS top 像素值：減去起始時間再乘上每小時高度，新增任務的定位也共用這個函式
function top(m: number): number {
  return ((m - START_H * 60) / 60) * HOUR_H
}

// props.now 是父層傳入的共享時鐘（見 use-current-time.ts），這裡只負責換算成分鐘數，不自己讀系統時間
// 連秒數都折算進去（/60），讓 now-rail 每秒移動時是連續平滑而非整分鐘跳動
const nowMin = computed(() => props.now.getHours() * 60 + props.now.getMinutes() + props.now.getSeconds() / 60)
// 只有「顯示的日期是今天」且「現在時間落在時間軸範圍內」才畫出現在時間線
const showNow = computed(() => {
  const todayISO = `${props.now.getFullYear()}-${pad(props.now.getMonth() + 1)}-${pad(props.now.getDate())}`
  return props.date === todayISO && nowMin.value >= START_H * 60 && nowMin.value <= END_H * 60 + 30
})

const allDayTasks = computed(() =>
  props.tasks
    .filter((t) => t.date === props.date && t.allDay)
    .sort((a, b) => Number(a.done) - Number(b.done) || a.title.localeCompare(b.title, 'zh-Hant'))
)

const dayTasks = computed(() => {
  const sorted = props.tasks
    .filter((t) => t.date === props.date && !t.allDay && t.start)
    .sort((a, b) => minutes(a.start) - minutes(b.start))

  return sorted.map((task) => {
    const startMin = minutes(task.start)
    const endMin = minutes(task.end)
    const height = Math.max(52, ((endMin - startMin) / 60) * HOUR_H - 3)
    const active = showNow.value && nowMin.value >= startMin && nowMin.value < endMin && !task.done
    const progressPct = active ? Math.min(100, ((nowMin.value - startMin) / (endMin - startMin)) * 100) : 0
    return { task, height, active, progressPct }
  })
})

// 把滑鼠點擊的像素位置換算成時間：先用 target/currentTarget 排除任務卡片冒泡上來的點擊，
// 再依 HOUR_H 比例把 y 座標轉成分鐘數，四捨五入到最近 15 分鐘刻度，最後 clamp 在時間軸範圍內
function addAt(e: MouseEvent): void {
  if (e.target !== e.currentTarget) return
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const y = e.clientY - rect.top
  let m = START_H * 60 + (y / HOUR_H) * 60
  m = Math.round(m / 15) * 15
  m = Math.max(START_H * 60, Math.min(END_H * 60 + 30, m))
  emit('new', { date: props.date, start: toHM(m), end: toHM(Math.min(24 * 60 - 1, m + 30)) })
}
</script>

<style scoped lang="sass">
.card
  background: $surface
  border: 1px solid $line
  border-radius: 14px

.timeline
  padding: 8px 8px 8px 0
  overflow: hidden

.tl-head
  display: flex
  align-items: baseline
  gap: 12px
  padding: 14px 22px 16px

  .d
    font-family: 'JetBrains Mono', ui-monospace, monospace
    font-weight: 800
    font-size: 34px
    letter-spacing: -.03em

  .wd
    font-size: 11px
    letter-spacing: .2em
    text-transform: uppercase
    color: $ink-3
    font-weight: 600

.all-day-span
  position: absolute
  left: var(--all-day-offset, 0)
  right: var(--all-day-offset, 0)
  border: 0
  border-radius: 10px
  background: color-mix(in srgb, var(--q, #{$ink}) 6%, transparent)
  color: $ink
  display: block
  padding: 8px
  pointer-events: none
  overflow: hidden
  transition: .12s
  z-index: 1
  text-align: left

  &::before
    content: ""
    position: absolute
    inset: 0
    border: 1px solid color-mix(in srgb, var(--q, #{$ink}) 16%, transparent)
    border-radius: inherit
    background: linear-gradient(180deg, color-mix(in srgb, var(--q, #{$ink}) 9%, transparent), color-mix(in srgb, var(--q, #{$ink}) 3%, transparent))
    pointer-events: none

  &:hover
    background: color-mix(in srgb, var(--q, #{$ink}) 7%, transparent)

  &.done
    opacity: .52

    .all-day-title
      text-decoration: line-through

.all-day-tex
  position: absolute
  inset: 0
  pointer-events: none
  background: var(--tl-tex, none)
  opacity: .28

.all-day-card,
.all-day-check,
.all-day-copy,
.all-day-pom
  position: relative
  z-index: 1

.all-day-card
  width: min(300px, 44%)
  min-width: 170px
  min-height: 28px
  border-radius: 5px
  background: color-mix(in srgb, var(--q, #{$ink}) 76%, #{$ink-2})
  color: $surface
  display: grid
  grid-template-columns: 20px minmax(0, 1fr) 24px
  align-items: center
  gap: 7px
  padding: 5px 7px
  cursor: pointer
  pointer-events: auto
  box-shadow: 0 1px 0 color-mix(in srgb, var(--q, #{$ink}) 18%, transparent)

  &:hover
    background: color-mix(in srgb, var(--q, #{$ink}) 84%, #{$ink-2})

.all-day-check
  width: 17px
  height: 17px
  border-radius: 50%
  border: 2px solid color-mix(in srgb, #{$surface} 78%, var(--q, #{$ink}))
  background: color-mix(in srgb, #{$surface} 14%, transparent)
  display: grid
  place-items: center
  line-height: 0
  cursor: pointer

  svg
    width: 9px
    height: 9px
    stroke: #fff
    stroke-width: 2.7
    fill: none
    opacity: 0

.all-day-span.done .all-day-check
  background: $green
  border-color: $green

  svg
    opacity: 1

.all-day-copy
  min-width: 0
  display: flex
  flex-direction: column
  justify-content: center
  gap: 1px

.all-day-kicker
  font-size: 10px
  color: color-mix(in srgb, var(--q, #{$ink}) 62%, #{$ink-3})
  font-weight: 800
  letter-spacing: .16em

.all-day-title
  font-size: 11px
  font-weight: 800
  line-height: 1.1
  white-space: nowrap
  overflow: hidden
  text-overflow: ellipsis
  min-width: 0

.all-day-meta
  font-size: 9px
  line-height: 1.1
  color: color-mix(in srgb, #{$surface} 70%, var(--q, #{$ink}))
  white-space: nowrap
  overflow: hidden
  text-overflow: ellipsis

.all-day-glyph
  display: inline-flex
  vertical-align: -2px
  margin-right: 4px

  :deep(svg)
    width: 11px
    height: 11px

.all-day-pom
  width: 24px
  height: 24px
  display: grid
  place-items: center
  opacity: .88
  transition: .15s
  cursor: pointer

  svg
    width: 19px
    height: 19px

  &:hover
    opacity: 1
    transform: scale(1.1) rotate(-4deg)

.tl-block
  z-index: 3

.tl-body
  position: relative
  padding: 0 18px 18px

.tl-row
  position: relative
  height: 62px
  border-top: 1px solid $line

  .hr
    position: absolute
    left: 0
    top: -8px
    font-family: 'JetBrains Mono', ui-monospace, monospace
    font-size: 10.5px
    color: $ink-3
    width: 46px
    text-align: right
    letter-spacing: .03em

.tl-lane
  position: absolute
  left: 58px
  right: 8px
  top: 0
  bottom: 0
  z-index: 2

  &.addable
    cursor: copy

.now-rail
  position: absolute
  left: 18px
  right: 8px
  height: 0
  z-index: 1
  pointer-events: none
  transition: top 1s linear // 時鐘每 1s 才更新一次，靠這個 transition 補間成連續移動而非跳動

  &::before
    content: ""
    position: absolute
    left: 0
    right: 0
    top: 0
    height: 1.5px
    background: linear-gradient(90deg, rgba(232,139,156,.5), rgba(232,139,156,.28) 70%, rgba(232,139,156,0)) // 左濃右淡的漸層線

.now-tip
  position: absolute
  left: 0
  right: 8px
  height: 0
  z-index: 5
  pointer-events: none
  transition: top 1s linear

.now-tri
  position: absolute
  left: 0
  top: -5px
  width: 0
  height: 0
  border-top: 5px solid transparent // 上下透明、左邊實色的 border trick，畫出三角形箭頭
  border-bottom: 5px solid transparent
  border-left: 9px solid $now
  animation: breathe 2s ease-in-out infinite // 透明度在 1 和 .82 間循環，做出呼吸般的脈動效果

@keyframes breathe
  0%, 100%
    opacity: 1
  50%
    opacity: .82

@media (prefers-reduced-motion: reduce)
  .now-rail, .now-tip
    transition: none
  .now-tri
    animation: none
</style>
