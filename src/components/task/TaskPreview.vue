<template>
  <div v-if="task" class="drawer-overlay" @mousedown="(e) => e.target === e.currentTarget && close()">
    <div v-if="copyModeEnabled" class="drawer detail">
      <div class="head-band" :style="{ background: quad.backgroundColor, color: quad.textColor }">
        <div class="hb-topbtns">
          <button class="hb-close" aria-label="關閉" @click="close">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div class="hb-main">
          <div class="hb-eyebrow">Duplicate · 複製任務</div>
          <div class="hb-titlerow">
            <h2 class="hb-title"><span style="opacity: .75; font-weight: 600">「{{ copyTaskTitle.trim() || '未命名任務' }}」</span> 複製到…</h2>
          </div>
        </div>
      </div>
      <div class="cp-body">
        <div class="cp-backrow">
          <button class="cp-back" @click="copyModeEnabled = false">‹ 返回預覽</button>
          <span class="cp-hint">點日期選一天或多天</span>
        </div>
        <div class="cp-titlefield">
          <label>複製後的標題</label>
          <input v-model="copyTaskTitle" class="cp-title" placeholder="要叫什麼？" />
        </div>
        <div class="cp-monthbar">
          <div class="mo mono">{{ copyCalendarMonth.getFullYear() }} / {{ pad(copyCalendarMonth.getMonth() + 1) }}</div>
          <div class="cp-nav">
            <button @click="copyCalendarMonth = new Date(copyCalendarMonth.getFullYear(), copyCalendarMonth.getMonth() - 1, 1)">‹</button>
            <button @click="copyCalendarMonth = new Date(copyCalendarMonth.getFullYear(), copyCalendarMonth.getMonth() + 1, 1)">›</button>
          </div>
        </div>
        <div class="cp-dow">
          <div>M</div><div>T</div><div>W</div><div>T</div><div>F</div>
          <div class="cp-dow-sat">S</div><div class="cp-dow-sun">S</div>
        </div>
        <div class="cp-grid" :style="{ '--accent': quad.backgroundColor, '--accent-ink': quad.textColor }">
          <div
            v-for="(d, i) in copyCells"
            :key="i"
            class="cp-cell"
            :class="{
              out: d.getMonth() !== copyCalendarMonth.getMonth(),
              src: iso(d) === task.date,
              sel: copySelectedDates.includes(iso(d)),
              today: iso(d) === today
            }"
            @click="d.getMonth() === copyCalendarMonth.getMonth() && iso(d) !== task.date && toggleDay(iso(d))"
          >
            <span class="cp-chk">✓</span>
            <span>{{ d.getDate() }}</span>
            <span class="cp-dots">
              <i v-for="(c, j) in dotColors(iso(d)).slice(0, 3)" :key="j" :style="{ background: c }" />
            </span>
          </div>
        </div>
        <div class="cp-legend">
          <div class="lg"><span class="sw src" />原任務</div>
          <div class="lg"><span class="sw sel" :style="{ background: quad.backgroundColor }" />已選</div>
          <div class="lg"><span class="sw dotlg" />當天已有任務</div>
        </div>
      </div>
      <div class="cp-foot">
        <span class="cp-count">已選 <b class="mono">{{ copySelectedDates.length }}</b> 天</span>
        <div class="cp-actions">
          <button v-if="copySelectedDates.length > 0" class="cp-clear" @click="copySelectedDates = []">清除</button>
          <button
            class="cp-go"
            :style="{ background: quad.backgroundColor, color: quad.textColor }"
            :disabled="copySelectedDates.length === 0 || !copyTaskTitle.trim()"
            @click="doCopy"
          >
            {{ copySelectedDates.length ? `複製 ${copySelectedDates.length} 份` : '複製' }}
          </button>
        </div>
      </div>
    </div>

    <div v-else class="drawer detail themed" :style="{ '--accent': theme.backgroundColor, '--accent-ink': theme.textColor }">
      <div class="head-band" :class="{ 'with-chip': theme.icon }" :style="{ background: theme.backgroundColor, color: theme.textColor }">
        <div class="band-tex" :style="{ background: detTexBG }" />
        <div class="hb-topbtns">
          <button class="hb-icon" aria-label="複製到多天" title="複製到多天" @click="openCopyMode">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 012-2h10" />
            </svg>
          </button>
          <button class="hb-close" aria-label="關閉" @click="close">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div v-if="theme.icon" class="hb-chip locked" style="cursor: default">
          <span v-if="theme.icon.startsWith('<')" class="chip-glyph" v-html="theme.icon" />
          <span v-else class="chip-glyph chip-emoji">{{ theme.icon }}</span>
        </div>
        <div class="hb-main">
          <div class="hb-eyebrow">{{ theme.isEvent ? '活動' : `${quad.name} · ${quad.description}` }}</div>
          <div class="hb-titlerow">
            <h2 class="hb-title" :class="{ done: task.done }">{{ task.title || '（未命名任務）' }}</h2>
            <span v-if="!task.allDay" class="title-toms" style="margin-right: 8px" :aria-label="`完成 ${task.completedPomodoros} / 預估 ${detPoms} 顆番茄`">
              <svg
                v-for="i in detPoms"
                :key="i"
                :class="{ 'pip-ghost': i > task.completedPomodoros }"
                width="17"
                height="17"
                viewBox="0 0 24 24"
                v-html="TOMATO_SVG"
              />
              <span class="x mono">{{ task.completedPomodoros }}/{{ detPoms }}</span>
            </span>
            <button
              class="hb-check"
              :class="{ on: task.done }"
              :aria-label="task.done ? '標為待進行' : '標為完成'"
              :title="task.done ? '標為待進行' : '標為完成'"
              @click="tasksStore.toggleDone(task.id)"
            >
              {{ task.done ? '✓' : '' }}
            </button>
          </div>
        </div>
      </div>
      <div class="td-scroll">
        <div class="td-rows">
          <div class="td-row"><span class="td-k">時間</span><span class="td-v mono">{{ task.allDay ? '整天' : `${task.start}–${task.end}` }}</span></div>
          <div class="td-row"><span class="td-k">日期</span><span class="td-v mono">{{ dateLabel }}</span></div>
          <div v-if="task.location" class="td-row"><span class="td-k">地點</span><span class="td-v">{{ task.location }}</span></div>
          <div v-if="task.repeat !== 'none'" class="td-row"><span class="td-k">重複</span><span class="td-v">{{ task.repeat }}</span></div>
          <div class="td-row">
            <span class="td-k">狀態</span>
            <span class="td-v">{{ task.done ? '已完成' : '待進行' }}{{ !task.allDay && task.completedPomodoros > 0 ? ` · 完成 ${task.completedPomodoros} 顆番茄` : '' }}</span>
          </div>
        </div>
        <div v-if="task.notes" class="td-sec">
          <div class="td-sec-h">備註</div>
          <p class="td-notes">{{ task.notes }}</p>
        </div>
      </div>
      <div class="td-bar">
        <button class="td-trash" aria-label="刪除" @click="deleteTask">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
          </svg>
        </button>
        <button class="td-primary" @click="edit">編輯</button>
      </div>
    </div>

    <div v-if="ui.toast" class="preview-toast" :class="ui.toast.type">{{ ui.toast.message }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useUiStore } from '@/stores/ui-store'
import { useTasksStore, mkTask } from '@/stores/tasks-store'
import { quadrantOf, themeOf } from '@/composables/use-theme'
import { autoPoms, addDays, iso, pad, parseISO, startOfWeek, WD_SHORT } from '@/utils/convert-date-time'
import { TOMATO_SVG } from '@/utils/tomato-icon'

const ui = useUiStore()
const tasksStore = useTasksStore()

const today = iso(new Date())
const task = computed(() => ui.previewTask)
const quad = computed(() => (task.value ? quadrantOf(task.value) : quadrantOf({ important: false, urgent: false })))
const theme = computed(() => themeOf(task.value ?? mkTask({ date: today })))
const detTexBG = computed(() => {
  if (theme.value.texture === 'none') return 'none'
  return `radial-gradient(rgba(255,255,255,.6) 1.2px,transparent 1.5px) 0 0/9px 9px`
})
const detPoms = computed(() => (task.value ? autoPoms(task.value) : 1))
const dateLabel = computed(() => {
  if (!task.value) return ''
  const d = parseISO(task.value.date)
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} 週${WD_SHORT[d.getDay()]}`
})

const copyModeEnabled = ref(false)
const copySelectedDates = ref<string[]>([])
const copyCalendarMonth = ref(new Date())
const copyTaskTitle = ref('')

watch(task, (t) => {
  copyModeEnabled.value = false
  copySelectedDates.value = []
  copyTaskTitle.value = t?.title ?? ''
  if (t) copyCalendarMonth.value = parseISO(t.date)
})

function openCopyMode(): void {
  if (!task.value) return
  copyCalendarMonth.value = parseISO(task.value.date)
  copyModeEnabled.value = true
}

function toggleDay(dt: string): void {
  copySelectedDates.value = copySelectedDates.value.includes(dt)
    ? copySelectedDates.value.filter((x) => x !== dt)
    : [...copySelectedDates.value, dt]
}

const copyCells = computed(() => {
  const first = new Date(copyCalendarMonth.value.getFullYear(), copyCalendarMonth.value.getMonth(), 1)
  const gridStart = startOfWeek(first)
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
})

function dotColors(dt: string): string[] {
  return tasksStore.tasks.filter((x) => x.date === dt).map((x) => quadrantOf(x).backgroundColor)
}

function doCopy(): void {
  if (!task.value) return
  const title = copyTaskTitle.value.trim()
  if (!title || copySelectedDates.value.length === 0) return
  const { created, skipped } = tasksStore.copyToDays({ ...task.value, title }, copySelectedDates.value)
  if (skipped.length > 0) {
    ui.toast = { type: 'warn', message: `已跳過衝突日期：${skipped.join('、')}` }
  } else if (created.length > 0) {
    ui.toast = { type: 'ok', message: `已複製 ${created.length} 份` }
  }
  copyModeEnabled.value = false
  copySelectedDates.value = []
}

function deleteTask(): void {
  if (!task.value) return
  tasksStore.deleteTask(task.value.id)
  ui.previewTaskId = null
}

function edit(): void {
  if (!task.value) return
  ui.taskEditorInitialValues = { ...task.value }
  ui.previewTaskId = null
}

function close(): void {
  ui.previewTaskId = null
}
</script>

<style scoped lang="sass">
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
  padding: 0
  overflow: hidden
  display: flex
  flex-direction: column
  animation: drawerIn .28s cubic-bezier(.2, .7, .2, 1)

@keyframes drawerIn
  from
    transform: translateX(calc(100% + 16px))
  to
    transform: translateX(0)

@media (prefers-reduced-motion: reduce)
  .drawer
    animation: none

.head-band
  position: relative
  overflow: hidden
  margin: 0
  border-radius: 0
  padding: 54px 24px 30px
  display: flex
  align-items: center
  gap: 15px

  &.with-chip
    padding-left: 22px
    padding-right: 80px

  > .band-tex
    position: absolute
    inset: 0
    pointer-events: none
    z-index: 0
    opacity: .9

  > .hb-main, > .hb-chip
    position: relative
    z-index: 1

  > .hb-topbtns
    position: absolute
    top: 14px
    right: 14px
    display: flex
    gap: 8px
    z-index: 4

.hb-close, .hb-icon
  border: none
  background: transparent
  color: rgba(255, 255, 255, .9)
  width: 34px
  height: 34px
  border-radius: 50%
  line-height: 0
  flex: none
  cursor: pointer
  transition: .15s
  display: grid
  place-items: center

  &:hover
    background: rgba(255, 255, 255, .2)

.hb-chip
  flex: none
  width: 52px
  height: 74px
  border-radius: 26px
  display: grid
  place-items: center
  background: rgba(255, 255, 255, .2)

  .chip-glyph
    display: grid
    place-items: center
    font-size: 28px
    line-height: 1

    :deep(svg)
      width: 28px
      height: 28px

.hb-main
  flex: 1
  min-width: 0

.hb-eyebrow
  font-size: 10.5px
  letter-spacing: .2em
  text-transform: uppercase
  font-weight: 700
  opacity: .62
  margin-bottom: 12px

.hb-titlerow
  display: flex
  align-items: center
  gap: 14px

.hb-title
  font-size: 24px
  font-weight: 800
  letter-spacing: -.01em
  line-height: 1.22
  margin: 0
  color: inherit
  word-break: break-word
  flex: 1
  min-width: 0

  &.done
    text-decoration: line-through
    opacity: .6

.title-toms
  display: inline-flex
  align-items: center
  gap: 3px
  flex: none

  .pip-ghost
    opacity: .35

.hb-check
  flex: none
  width: 30px
  height: 30px
  border-radius: 50%
  border: 2.5px solid currentColor
  background: none
  color: inherit
  cursor: pointer
  display: grid
  place-items: center
  font-size: 15px
  line-height: 0
  transition: .15s
  opacity: .9

  &:hover
    opacity: 1

  &.on
    background: #fff
    border-color: #fff
    color: #3A3A3A

.td-scroll
  flex: 1
  overflow-y: auto
  padding: 22px 24px 8px

.td-rows
  display: flex
  flex-direction: column
  gap: 0
  border-top: 1px solid $line
  margin-bottom: 20px

.td-row
  display: flex
  align-items: center
  gap: 14px
  padding: 11px 2px
  border-bottom: 1px solid $line

  .td-k
    font-size: 12px
    color: $ink-3
    font-weight: 600
    width: 44px
    flex: none
    letter-spacing: .06em

  .td-v
    font-size: 14px
    color: $ink
    font-weight: 500

.td-sec
  margin-bottom: 20px

.td-sec-h
  font-size: 12px
  color: $ink-3
  font-weight: 700
  letter-spacing: .06em
  margin-bottom: 9px

.td-notes
  font-size: 14px
  line-height: 1.65
  color: $ink-2
  margin: 0
  white-space: pre-wrap

.td-bar
  flex: none
  display: flex
  align-items: center
  justify-content: space-between
  gap: 10px
  padding: 14px 20px
  background: $bg

.td-trash
  width: 36px
  height: 36px
  border-radius: 50%
  border: none
  background: transparent
  color: $ink-3
  font-size: 15px
  line-height: 0
  display: grid
  place-items: center
  cursor: pointer
  transition: .15s
  flex: none

  &:hover
    color: $sun
    background: rgba(192, 86, 75, .1)

.td-primary
  background: var(--accent)
  color: var(--accent-ink)
  border: none
  border-radius: 999px
  padding: 11px 26px
  font-size: 14px
  font-weight: 800
  cursor: pointer
  transition: .15s

  &:hover
    filter: brightness(1.06)

.cp-body
  flex: 1
  overflow-y: auto
  padding: 18px 22px 6px

.cp-backrow
  display: flex
  align-items: center
  gap: 8px
  margin-bottom: 14px

.cp-back
  border: none
  background: none
  color: $ink-2
  font-size: 13px
  font-weight: 600
  padding: 4px 2px
  cursor: pointer

  &:hover
    color: $ink

.cp-hint
  font-size: 12px
  color: $ink-3
  margin-left: auto

.cp-titlefield
  display: flex
  flex-direction: column
  gap: 6px
  margin-bottom: 14px

  label
    font-size: 11px
    letter-spacing: .12em
    text-transform: uppercase
    color: $ink-3
    font-weight: 600

.cp-title
  border: 1px solid $line-2
  border-radius: 10px
  background: $surface
  padding: 11px 12px
  font-size: 14px
  font-weight: 600
  color: $ink
  outline: none
  width: 100%

  &:focus
    border-color: $ink

.cp-monthbar
  display: flex
  align-items: center
  justify-content: space-between
  margin-bottom: 12px

  .mo
    font-size: 15px
    font-weight: 700
    color: $ink

.cp-nav
  display: flex
  gap: 6px

  button
    width: 30px
    height: 30px
    border-radius: 8px
    border: 1px solid $line-2
    background: $surface
    color: $ink
    font-size: 14px
    display: grid
    place-items: center
    cursor: pointer

.cp-dow
  display: grid
  grid-template-columns: repeat(7, 1fr)
  margin-bottom: 5px

  div
    text-align: center
    font-size: 10.5px
    font-weight: 600
    letter-spacing: .06em
    color: $ink-3
    padding: 4px 0

.cp-dow .cp-dow-sat
  color: $sat

.cp-dow .cp-dow-sun
  color: $sun

.cp-grid
  display: grid
  grid-template-columns: repeat(7, 1fr)
  gap: 5px

.cp-cell
  aspect-ratio: 1 / 1
  border-radius: 9px
  border: 1px solid transparent
  background: $surface
  position: relative
  cursor: pointer
  display: flex
  flex-direction: column
  align-items: center
  justify-content: center
  gap: 2px
  font-size: 12px
  color: $ink

  &:hover
    border-color: $line-2

  &.out
    color: $ink-3
    background: transparent
    pointer-events: none

  &.today
    box-shadow: inset 0 0 0 1.5px $ink-3

  &.src
    background: repeating-linear-gradient(45deg, $line 0 3px, transparent 3px 7px)
    color: $ink-3
    cursor: not-allowed

  &.sel
    background: var(--accent)
    border-color: var(--accent)
    color: var(--accent-ink)

.cp-chk
  position: absolute
  top: 3px
  right: 4px
  width: 15px
  height: 15px
  border-radius: 50%
  background: var(--accent-ink)
  color: var(--accent)
  font-size: 9px
  display: none
  place-items: center
  line-height: 0

.cp-cell.sel .cp-chk
  display: grid

.cp-dots
  display: flex
  gap: 2.5px
  height: 5px
  align-items: center

  i
    width: 5px
    height: 5px
    border-radius: 50%
    display: block

.cp-cell.sel .cp-dots i
  outline: 1px solid rgba(0, 0, 0, .18)

.cp-legend
  display: flex
  gap: 14px
  padding: 12px 2px 4px
  flex-wrap: wrap

  .lg
    display: flex
    align-items: center
    gap: 6px
    font-size: 11px
    color: $ink-2

  .sw
    width: 13px
    height: 13px
    border-radius: 4px
    flex: none

    &.src
      background: repeating-linear-gradient(45deg, $line 0 3px, transparent 3px 7px)
      border: 1px solid $line-2

    &.dotlg
      background: none
      position: relative

      &::after
        content: ""
        position: absolute
        left: 2px
        bottom: 2px
        width: 4px
        height: 4px
        border-radius: 50%
        background: $sun

      &::before
        content: ""
        position: absolute
        left: 7px
        bottom: 2px
        width: 4px
        height: 4px
        border-radius: 50%
        background: $btn

.cp-foot
  flex: none
  display: flex
  align-items: center
  justify-content: space-between
  gap: 12px
  padding: 16px 20px
  border-top: 1px solid $line
  background: $bg

.cp-count
  font-size: 13px
  color: $ink-2
  font-weight: 600

  b
    color: $ink

.cp-actions
  display: flex
  align-items: center
  gap: 9px

.cp-clear
  border: none
  background: none
  color: $ink-3
  font-size: 12.5px
  font-weight: 600
  cursor: pointer

  &:hover
    color: $ink

.cp-go
  border: none
  border-radius: 999px
  padding: 11px 22px
  font-size: 14px
  font-weight: 800
  transition: .15s
  cursor: pointer

  &:hover
    filter: brightness(1.06)

  &:disabled
    opacity: .35
    cursor: not-allowed

.preview-toast
  position: absolute
  bottom: 24px
  left: 50%
  transform: translateX(-50%)
  padding: 10px 18px
  border-radius: 999px
  font-size: 13px
  font-weight: 600
  color: #fff
  z-index: 70
  box-shadow: 0 12px 30px -10px rgba(20, 19, 15, .5)

  &.ok
    background: $green
    color: $ink

  &.warn
    background: $rest
</style>
