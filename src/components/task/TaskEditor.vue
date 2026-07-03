<template>
  <div v-if="draft" class="drawer-overlay" @mousedown="(e) => e.target === e.currentTarget && close()">
    <div class="drawer detail edit themed" :style="accentStyle" @mousedown.stop>
      <div class="head-band modal-band with-chip" :style="{ background: theme.backgroundColor, color: theme.textColor }">
        <div class="band-tex" :style="{ background: bandTexBG }" />
        <div class="hb-topbtns">
          <button class="hb-close" aria-label="關閉" @click="close">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div
          class="hb-chip"
          :class="{ locked: isQuadrant }"
          :title="isQuadrant ? '象限圖示（固定，不可更改）' : 'Emoji / Icon / Color'"
          @click="!isQuadrant && (pickerOpen = true)"
        >
          <span v-if="theme.icon" class="chip-glyph" v-html="theme.icon.startsWith('<') ? theme.icon : ''" />
          <span v-if="theme.icon && !theme.icon.startsWith('<')" class="chip-glyph chip-emoji">{{ theme.icon }}</span>
          <span v-if="!isQuadrant" class="chip-edit">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M14 4l6 6M4 20l1-4L16 5l3 3L8 19z" />
            </svg>
          </span>
        </div>
        <div class="hb-main">
          <div class="hb-eyebrow">{{ isEditing ? '編輯任務' : '新增任務' }}</div>
          <div class="hb-titlerow">
            <input
              v-model="draft.title"
              class="hb-title hb-input"
              autofocus
              placeholder="要做什麼？"
              @keydown.enter.prevent
            />
            <span v-if="!draft.allDay" class="title-toms" :aria-label="`預估 ${poms} 顆番茄`">
              <svg v-for="i in poms" :key="i" width="17" height="17" viewBox="0 0 24 24" v-html="TOMATO_SVG" />
              <span class="x mono">×{{ poms }}</span>
            </span>
          </div>
        </div>
      </div>

      <div class="modal-body td-scroll">
        <div class="field">
          <label>時間</label>
          <div class="inline">
            <input v-model="draft.date" type="date" class="ctrl" style="width: auto" />
            <button type="button" class="toggle" :class="{ on: draft.allDay }" @click="draft.allDay = !draft.allDay">
              <span class="tk" />全天
            </button>
          </div>
          <div v-if="!draft.allDay" class="seg-time" style="margin-top: 4px">
            <input v-model="draft.start" type="time" class="ctrl" style="width: auto" />
            <span class="st-arrow">→</span>
            <input v-model="draft.end" type="time" class="ctrl" style="width: auto" />
          </div>
          <div v-if="conflict" class="conflict-warn">
            <span class="cw-ico">!</span>
            <span>
              這個時段跟「<b>{{ conflict.title || '未命名任務' }}</b
              >」（{{ conflict.start }}–{{ conflict.end }}）重疊了，同一天同時段只能排一項。請改時間或日期。
            </span>
          </div>
        </div>

        <div class="row">
          <div class="field" style="flex: 1; min-width: 140px">
            <label>重複</label>
            <select v-model="draft.repeat" class="ctrl">
              <option v-for="[v, l] in REPEATS" :key="v" :value="v">{{ l }}</option>
            </select>
          </div>
          <div class="field" style="flex: 1; min-width: 140px">
            <label>地點</label>
            <input v-model="draft.location" class="ctrl" placeholder="在哪做？" />
          </div>
        </div>

        <div class="field">
          <div class="quad-head">
            <label style="margin: 0">象限 · 重要與緊急</label>
            <button type="button" class="quad-toggle" :class="{ on: isQuadrant }" @click="toggleQuad">
              <span class="qt-lab">排進象限</span><span class="qt-sw" />
            </button>
          </div>
          <div class="quad-pick-wrap" :class="{ off: !isQuadrant }">
            <QuadrantPicker
              :model-value="{ important: draft.important, urgent: draft.urgent }"
              @update:model-value="
                (v) => {
                  if (!isQuadrant || !draft) return
                  draft.important = v.important
                  draft.urgent = v.urgent
                }
              "
            />
          </div>
        </div>

        <div class="field">
          <label>備註</label>
          <textarea v-model="draft.notes" class="ctrl" rows="2" placeholder="連結、電話、任何補充…" />
        </div>
      </div>

      <div class="td-bar">
        <span />
        <button
          class="td-primary td-themed"
          :disabled="!valid"
          :style="{ background: theme.backgroundColor, color: theme.textColor }"
          @click="trySave"
        >
          <span class="btn-tex" :style="{ background: bandTexBG }" />
          <span class="btn-lab">{{ isEditing ? '儲存變更' : '建立任務' }}</span>
        </button>
      </div>

      <ThemePicker
        v-if="pickerOpen"
        :model-value="{ backgroundColor: theme.backgroundColor, textColor: theme.textColor, texture: draft.texture, icon: draft.icon }"
        @update:model-value="
          (v) => {
            if (!draft) return
            draft.backgroundColor = v.backgroundColor
            draft.texture = v.texture
            draft.icon = v.icon
          }
        "
        @close="pickerOpen = false"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import QuadrantPicker from './QuadrantPicker.vue'
import ThemePicker from './ThemePicker.vue'
import { useUiStore } from '@/stores/ui-store'
import { useTasksStore, mkTask } from '@/stores/tasks-store'
import { useInboxStore } from '@/stores/inbox-store'
import { themeOf } from '@/composables/use-theme'
import { autoPoms } from '@/utils/convert-date-time'
import { TOMATO_SVG } from '@/utils/tomato-icon'
import type { Task } from '@/types/task'

const REPEATS: Array<[Task['repeat'], string]> = [
  ['none', '不重複'],
  ['daily', '每天'],
  ['weekly', '每週'],
  ['monthly', '每月']
]

const ui = useUiStore()
const tasksStore = useTasksStore()
const inboxStore = useInboxStore()

const draft = ref<Task | null>(null)
const isEditing = ref(false)
const conflict = ref<Task | null>(null)
const pickerOpen = ref(false)

watch(
  () => ui.taskEditorInitialValues,
  (initialValues) => {
    if (initialValues === null) {
      draft.value = null
      return
    }
    const existing = initialValues.id ? tasksStore.tasks.find((t) => t.id === initialValues.id) : undefined
    isEditing.value = existing !== undefined
    draft.value = existing ? { ...existing } : mkTask({ date: ui.selectedDate, ...initialValues })
    conflict.value = null
    pickerOpen.value = false
  },
  { immediate: true }
)

const isQuadrant = computed(() => draft.value?.type === 'quadrant')
const theme = computed(() => (draft.value ? themeOf(draft.value) : themeOf(mkTask({ date: ui.selectedDate }))))
const accentStyle = computed(() => ({ '--accent': theme.value.backgroundColor, '--accent-ink': theme.value.textColor }))
const bandTexBG = computed(() => {
  if (!draft.value || theme.value.texture === 'none') return 'none'
  return `radial-gradient(rgba(255,255,255,.6) 1.2px,transparent 1.5px) 0 0/9px 9px`
})
const poms = computed(() => (draft.value ? autoPoms(draft.value) : 1))
const valid = computed(() => (draft.value?.title.trim().length ?? 0) > 0)

function toggleQuad(): void {
  if (!draft.value) return
  draft.value.type = draft.value.type === 'quadrant' ? 'event' : 'quadrant'
}

function trySave(): void {
  if (!draft.value) return
  draft.value.estimatedPomodoros = autoPoms(draft.value)
  const result = tasksStore.saveTask(draft.value)
  if (result) {
    conflict.value = result
    return
  }
  inboxStore.completePromotion()
  ui.taskEditorInitialValues = null
}

function close(): void {
  inboxStore.cancelPromotion()
  ui.taskEditorInitialValues = null
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
  animation: drawerIn .28s cubic-bezier(.2, .7, .2, 1)
  display: flex
  flex-direction: column

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
  display: flex
  align-items: center
  gap: 15px
  padding: 20px 22px
  padding-left: 22px
  padding-right: 80px
  transition: background .25s, color .25s

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

.hb-close
  border: none
  background: transparent
  color: rgba(255, 255, 255, .9)
  width: 34px
  height: 34px
  border-radius: 50%
  font-size: 18px
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
  position: relative
  cursor: pointer
  display: grid
  place-items: center
  background: rgba(255, 255, 255, .2)

  &:hover
    background: rgba(255, 255, 255, .34)

  &.locked
    cursor: default

    &:hover
      background: rgba(255, 255, 255, .22)

  .chip-glyph
    display: grid
    place-items: center
    font-size: 28px
    line-height: 1

    :deep(svg)
      width: 28px
      height: 28px

  .chip-edit
    position: absolute
    right: 2px
    bottom: 2px
    width: 22px
    height: 22px
    border-radius: 50%
    display: grid
    place-items: center
    background: rgba(0, 0, 0, .2)

    svg
      width: 12px
      height: 12px

  &.locked .chip-edit
    display: none

.hb-main
  flex: 1
  min-width: 0

.hb-eyebrow
  font-size: 10.5px
  letter-spacing: .2em
  text-transform: uppercase
  font-weight: 700
  opacity: .62
  margin-bottom: 9px

.hb-titlerow
  display: flex
  align-items: flex-end
  gap: 14px

.hb-title.hb-input
  font-size: 22px
  font-weight: 800
  letter-spacing: -.01em
  line-height: 1.22
  margin: 0
  color: inherit
  word-break: break-word
  background: none
  border: none
  outline: none
  width: 100%
  font-family: inherit
  border-bottom: 1.5px solid currentColor
  padding-bottom: 8px

  &::placeholder
    color: inherit
    opacity: .45

.title-toms
  display: inline-flex
  align-items: center
  gap: 3px
  flex: none

.modal-body
  flex: 1
  overflow-y: auto
  padding: 22px 24px 8px
  display: flex
  flex-direction: column
  gap: 14px

.field
  display: flex
  flex-direction: column
  gap: 7px

  > label
    font-size: 11px
    letter-spacing: .12em
    text-transform: uppercase
    color: $ink-3
    font-weight: 600

.row
  display: flex
  gap: 10px
  flex-wrap: wrap

.ctrl
  border: 1px solid $line-2
  border-radius: 10px
  background: $surface
  padding: 11px 12px
  font-size: 14px
  color: $ink
  outline: none
  width: 100%

  &:focus
    border-color: $ink

.inline
  display: flex
  align-items: center
  gap: 10px
  flex-wrap: wrap

.seg-time
  display: flex
  align-items: center
  gap: 8px
  font-family: 'JetBrains Mono', ui-monospace, monospace

.st-arrow
  color: $ink-3

.toggle
  display: flex
  align-items: center
  gap: 8px
  border: 1px solid $line-2
  border-radius: 999px
  padding: 8px 14px
  font-size: 13px
  font-weight: 600
  color: $ink-2
  user-select: none
  background: none
  cursor: pointer

  &.on
    background: $btn
    color: $ink
    border-color: $btn

    .tk
      background: $ink
      border-color: $ink

  .tk
    width: 9px
    height: 9px
    border-radius: 50%
    border: 1.5px solid currentColor

.conflict-warn
  display: flex
  align-items: flex-start
  gap: 9px
  margin-top: 10px
  padding: 11px 13px
  border-radius: 10px
  background: rgba(224, 104, 94, .12)
  font-size: 12.5px
  color: $ink-2
  line-height: 1.5

  b
    font-weight: 700

  .cw-ico
    flex: none
    width: 18px
    height: 18px
    border-radius: 50%
    background: $rest
    color: #fff
    display: grid
    place-items: center
    font-size: 11px
    font-weight: 800

.quad-head
  display: flex
  align-items: center
  justify-content: space-between
  margin-bottom: 8px

.quad-toggle
  display: inline-flex
  align-items: center
  gap: 8px
  cursor: pointer
  border: none
  background: none
  padding: 0

  .qt-lab
    font-size: 12px
    color: $ink-2
    font-weight: 600

  .qt-sw
    width: 38px
    height: 22px
    border-radius: 999px
    background: #D7D4CB
    position: relative
    transition: .2s
    flex: none

    &::after
      content: ""
      position: absolute
      top: 2px
      left: 2px
      width: 18px
      height: 18px
      border-radius: 50%
      background: #fff
      transition: .2s
      box-shadow: 0 1px 3px rgba(0, 0, 0, .2)

  &.on .qt-sw
    background: #3f4147

    &::after
      left: 18px

.quad-pick-wrap.off
  opacity: .32
  filter: grayscale(.4)
  pointer-events: none

.td-bar
  flex: none
  display: flex
  align-items: center
  justify-content: space-between
  gap: 10px
  padding: 14px 20px
  background: $bg

.td-primary
  border: none
  background: $ink
  color: $paper
  border-radius: 999px
  padding: 11px 26px
  font-size: 14px
  font-weight: 800
  cursor: pointer
  transition: .15s
  position: relative
  overflow: hidden

  &:hover
    filter: brightness(1.12)

  &:disabled
    opacity: .35
    cursor: not-allowed
    filter: none

  .btn-tex
    position: absolute
    inset: 0
    pointer-events: none
    z-index: 0
    opacity: .9

  .btn-lab
    position: relative
    z-index: 1
</style>
