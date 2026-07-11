<template>
  <div v-if="task" class="fx" :class="{ rest: mode === 'rest' }">
    <div class="fx-top">
      <button v-if="phase === 'breathing'" class="fx-skip" @click="skipBreathing">跳過</button>
      <button class="fx-mute" @click="onToggleMute">{{ muted ? '開聲' : '靜音' }}</button>
      <button class="fx-close" aria-label="關閉" @click="close">
        <CdIcon name="close" :size="16" color="#fff" />
      </button>
    </div>

    <template v-if="phase === 'breathing'">
      <div class="fx-hud">上坡吸氣 · 下坡吐氣（三次）</div>
      <div class="fx-dots">
        <span v-for="i in BREATHS" :key="i" :class="{ done: i <= breathsDone, active: i === breathsDone + 1 }" />
      </div>
      <svg class="fx-scene" viewBox="0 0 100 190" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="fxbg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#123f30" /><stop offset="1" stop-color="#0e3527" /></linearGradient>
          <linearGradient id="fxhill" x1="0" y1="0" x2="0.2" y2="1"><stop offset="0" stop-color="#4f9c72" /><stop offset="1" stop-color="#2f7a54" /></linearGradient>
        </defs>
        <rect width="100" height="190" fill="url(#fxbg)" />
        <path class="fx-hillP" fill="url(#fxhill)" :d="hillPath" />
        <g class="fx-charG" :transform="charTransform">
          <svg class="fx-charI" width="34" height="34" :x="charX" :y="charY" viewBox="0 0 24 24" overflow="visible" v-html="TOMATO_SVG" />
        </g>
      </svg>
      <div class="fx-word" :style="{ opacity: wordOpacity }">{{ rising ? 'Inhale' : 'Exhale' }}</div>
    </template>

    <template v-else>
      <div class="fx-hud">{{ mode === 'focus' ? '正在專注 · 番茄鐘' : `短休息 · ${REST_MIN} 分鐘` }}</div>
      <svg class="fx-scene" viewBox="0 0 100 190" preserveAspectRatio="xMidYMid slice" style="opacity: .3">
        <defs>
          <linearGradient id="fxbg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#123f30" /><stop offset="1" stop-color="#0e3527" /></linearGradient>
        </defs>
        <rect width="100" height="190" fill="url(#fxbg2)" />
      </svg>
      <div class="fx-timer show">
        <svg width="300" height="300" viewBox="0 0 300 300">
          <circle class="rt" cx="150" cy="150" r="140" />
          <circle
            class="rp fx-ring"
            cx="150"
            cy="150"
            r="140"
            :style="{ strokeDasharray: ringCircumference, strokeDashoffset: ringOffset }"
          />
        </svg>
      </div>
      <div class="fx-face show">
        <div class="ft fx-ft">
          <span class="fx-ft-txt">{{ task.title || '（未命名）' }}</span>
          <span class="fx-fp mono">{{ doneCount }}/{{ estPoms }}</span>
        </div>
        <svg class="fx-faceTom" :class="{ pulse: pulseTomato }" width="50" height="50" viewBox="0 0 24 24" v-html="TOMATO_SVG" />
        <div class="fk fx-fk mono">{{ fmt(Math.max(secondsLeft, 0)) }}</div>
        <div class="fl fx-fl">{{ statusLabel }}</div>
      </div>
      <div v-if="mode !== 'done'" class="fx-bar show">
        <template v-if="mode === 'focus'">
          <button class="sec" @click="togglePause">{{ paused ? '繼續' : '暫停' }}</button>
          <button class="prim" @click="openEarlyFinishSheet">完成</button>
        </template>
        <template v-else-if="mode === 'rest'">
          <button class="sec" @click="skipRest">跳過休息</button>
          <button class="prim" @click="anotherPomodoro">再一顆番茄</button>
        </template>
      </div>
      <div v-if="mode === 'done'" class="fx-bar show">
        <button class="prim" @click="close">結束</button>
      </div>
    </template>

    <div v-if="earlyFinishSheetOpen" class="fx-sheet">
      <div class="box">
        <h4>提早完成？</h4>
        <p>還沒到時間。確定要把這段算成一顆完成的番茄嗎？</p>
        <div class="r">
          <button class="no" @click="cancelEarlyFinish">再專注一下</button>
          <button class="yes" @click="confirmEarlyFinish">完成，算一顆</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useUiStore } from '@/stores/ui-store'
import { useTasksStore } from '@/stores/tasks-store'
import { autoPoms } from '@/utils/convert-date-time'
import { makeFocusAudio, type FocusAudio } from '@/utils/make-focus-audio'
import { TOMATO_SVG } from '@/utils/tomato-icon'
import CdIcon from '../ui/CdIcon.vue'

const FOCUS_MIN = 25
const REST_MIN = 5
const BREATHS = 3
const FOCUS_S = FOCUS_MIN * 60
const REST_S = REST_MIN * 60
const VH = 190
const SIZE = 34
const CX = 50
const PERIOD = 100
const BASE = 118
const AMP = 20
const CYCLE = 5000
const RING_C = 2 * Math.PI * 140

const ui = useUiStore()
const tasksStore = useTasksStore()

const task = computed(() => ui.focusTask)
const estPoms = computed(() => (task.value ? autoPoms(task.value) : 1))

type Phase = 'breathing' | 'timer'
type Mode = 'focus' | 'rest' | 'done'

const phase = ref<Phase>('breathing')
const mode = ref<Mode>('focus')
const breathsDone = ref(0)
const rising = ref(true)
const scroll = ref(Math.PI / 2)
const wordOpacity = ref('0.22')
const doneCount = ref(0)
const secondsLeft = ref(FOCUS_S)
const paused = ref(false)
const muted = ref(false)
const earlyFinishSheetOpen = ref(false)
const pulseTomato = ref(false)
const allPomsDone = ref(false)

let audio: FocusAudio | null = null
let raf: number | null = null
let intervalId: ReturnType<typeof setInterval> | null = null
let restTimeoutId: ReturnType<typeof setTimeout> | null = null
let lastTs: number | null = null
let wasRising: boolean | undefined

const worldY = (sx: number, s: number) => BASE - AMP * Math.sin((sx / PERIOD) * Math.PI * 2 + s)
const isRising = (s: number) => Math.cos((CX / PERIOD) * Math.PI * 2 + s) > 0

const hillPath = computed(() => {
  const s = scroll.value
  let d = `M0 ${VH} L0 ${worldY(0, s).toFixed(2)}`
  for (let x = 1; x <= 100; x++) d += ` L${x} ${worldY(x, s).toFixed(2)}`
  return d + ` L100 ${VH} Z`
})

const charY = ref(BASE - SIZE * 0.42 - SIZE / 2)
const charX = ref(CX - SIZE / 2)
const charTransform = ref('rotate(0 50 100)')

const ringOffset = computed(() => {
  const total = mode.value === 'rest' ? REST_S : FOCUS_S
  return RING_C * (1 - secondsLeft.value / total)
})
const ringCircumference = RING_C

const statusLabel = computed(() => {
  if (mode.value === 'done') return '已完成'
  if (mode.value === 'rest') return paused.value ? '已暫停' : '休息中'
  return paused.value ? '已暫停' : '專注中'
})

function fmt(v: number): string {
  const m = Math.floor(v / 60)
  const s = Math.floor(v % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function loop(ts: number): void {
  if (lastTs === null) lastTs = ts
  const dt = ts - lastTs
  lastTs = ts
  scroll.value += (2 * Math.PI) * (dt / CYCLE)
  const r = isRising(scroll.value)
  rising.value = r

  const y = worldY(CX, scroll.value)
  const yL = worldY(CX - 2.5, scroll.value)
  const yR = worldY(CX + 2.5, scroll.value)
  const slope = (yR - yL) / 5
  const angle = (Math.atan(slope) * 180) / Math.PI
  const cy = y - SIZE * 0.42
  charX.value = CX - SIZE / 2
  charY.value = cy - SIZE / 2
  charTransform.value = `rotate(${angle.toFixed(2)} ${CX} ${cy})`

  const p = (CX / PERIOD) * Math.PI * 2 + scroll.value
  const breath = (Math.sin(p) + 1) / 2
  wordOpacity.value = (0.22 + Math.abs(slope) * 0.14).toFixed(2)
  audio?.mix(r, breath)

  if (phase.value === 'breathing') {
    if (wasRising === undefined) wasRising = r
    if (wasRising && !r) {
      breathsDone.value++
      if (breathsDone.value >= BREATHS) {
        phase.value = 'timer'
        enterTimer()
      }
    }
    wasRising = r
  }

  raf = requestAnimationFrame(loop)
}

function enterTimer(): void {
  audio?.fadeOut()
  showTimer()
}

function showTimer(): void {
  mode.value = 'focus'
  startCountdown(FOCUS_S, 'focus')
}

function startCountdown(secs: number, which: 'focus' | 'rest'): void {
  if (intervalId) clearInterval(intervalId)
  clearRestTimeout()
  secondsLeft.value = secs
  paused.value = false
  audio?.resume()
  mode.value = which
  intervalId = setInterval(() => {
    if (paused.value) return
    secondsLeft.value--
    if (secondsLeft.value <= 0) {
      if (intervalId) clearInterval(intervalId)
      intervalId = null
      if (which === 'focus') completePom()
      else endRest()
    }
  }, 1000)
}

function completePom(): void {
  if (!task.value) return
  audio?.resume()
  clearRestTimeout()
  if (doneCount.value < estPoms.value) {
    doneCount.value = Math.min(estPoms.value, doneCount.value + 1)
    tasksStore.incrementCompletedPomodoros(task.value.id)
  }
  pulseTomato.value = true
  setTimeout(() => (pulseTomato.value = false), 420)
  if (doneCount.value >= estPoms.value) {
    allPomsDone.value = true
    mode.value = 'done'
    secondsLeft.value = 0
    return
  }
  restTimeoutId = setTimeout(() => {
    restTimeoutId = null
    if (mode.value !== 'done' && task.value) startRest()
  }, 1600)
}

function startRest(): void {
  audio?.enterCalm()
  startCountdown(REST_S, 'rest')
}

function endRest(): void {
  if (doneCount.value >= estPoms.value) {
    allPomsDone.value = true
    mode.value = 'done'
  } else {
    backToFocus()
  }
}

function backToFocus(): void {
  showTimer()
}

function skipBreathing(): void {
  if (phase.value !== 'breathing') return
  phase.value = 'timer'
  enterTimer()
}

function togglePause(): void {
  paused.value = !paused.value
  if (paused.value) audio?.pause()
  else audio?.resume()
}

function openEarlyFinishSheet(): void {
  earlyFinishSheetOpen.value = true
  paused.value = true
  audio?.pause()
}

function confirmEarlyFinish(): void {
  earlyFinishSheetOpen.value = false
  if (intervalId) clearInterval(intervalId)
  intervalId = null
  completePom()
}

function cancelEarlyFinish(): void {
  earlyFinishSheetOpen.value = false
  paused.value = false
  audio?.resume()
}

function skipRest(): void {
  if (intervalId) clearInterval(intervalId)
  intervalId = null
  endRest()
}

function anotherPomodoro(): void {
  if (mode.value === 'done' || allPomsDone.value) return
  if (intervalId) clearInterval(intervalId)
  intervalId = null
  backToFocus()
}

function onToggleMute(): void {
  muted.value = audio?.toggleMute() ?? !muted.value
}

function close(): void {
  stopAll()
  ui.focusTaskId = null
}

function clearRestTimeout(): void {
  if (restTimeoutId) clearTimeout(restTimeoutId)
  restTimeoutId = null
}

function stopAll(): void {
  if (raf) cancelAnimationFrame(raf)
  raf = null
  if (intervalId) clearInterval(intervalId)
  intervalId = null
  clearRestTimeout()
  audio?.stop()
  audio = null
}

function syncDoneCountFromTask(): void {
  if (!task.value) return
  doneCount.value = Math.min(task.value.completedPomodoros ?? 0, estPoms.value)
  allPomsDone.value = doneCount.value >= estPoms.value
  if (allPomsDone.value) {
    phase.value = 'timer'
    mode.value = 'done'
    secondsLeft.value = 0
  }
}

watch(task, (t) => {
  if (!t) {
    stopAll()
    ui.focusTaskId = null
    return
  }
  syncDoneCountFromTask()
}, { immediate: true })

onMounted(() => {
  syncDoneCountFromTask()
  audio = makeFocusAudio()
  audio.start()
  lastTs = null
  raf = requestAnimationFrame(loop)
})

onUnmounted(() => {
  stopAll()
})
</script>

<style scoped lang="sass">
.fx
  position: fixed
  inset: 0
  z-index: 200
  overflow: hidden
  background: #0e3527
  transition: background .8s
  animation: fxIn .4s ease

@keyframes fxIn
  from
    opacity: 0
  to
    opacity: 1

.fx svg.fx-scene
  position: absolute
  inset: 0
  width: 100%
  height: 100%
  transition: opacity .8s

.fx .fx-word
  position: absolute
  left: 0
  right: 0
  top: 30%
  text-align: center
  z-index: 6
  color: #eafff4
  font-size: 15px
  letter-spacing: .3em
  text-transform: uppercase
  font-weight: 700

.fx .fx-hud
  position: absolute
  top: 26px
  left: 0
  right: 0
  text-align: center
  z-index: 7
  font-size: 12px
  letter-spacing: .2em
  color: rgba(255, 255, 255, .7)
  text-transform: uppercase
  font-weight: 700

.fx .fx-dots
  position: absolute
  top: 52px
  left: 0
  right: 0
  display: flex
  gap: 9px
  justify-content: center
  z-index: 7

  span
    width: 8px
    height: 8px
    border-radius: 50%
    background: rgba(255, 255, 255, .24)
    transition: .3s
    display: block

    &.done
      background: #ff9a86

    &.active
      background: #fff
      transform: scale(1.3)

.fx .fx-top
  position: absolute
  top: 20px
  right: 22px
  z-index: 9
  display: flex
  gap: 9px

  button
    background: rgba(255, 255, 255, .14)
    border: none
    color: #fff
    height: 36px
    min-width: 36px
    padding: 0 12px
    border-radius: 999px
    cursor: pointer
    font-weight: 700
    transition: .15s

    &:hover
      background: rgba(255, 255, 255, .26)

  .fx-close
    display: flex
    align-items: center
    justify-content: center
    padding: 0
    width: 36px

.fx .fx-timer
  position: absolute
  left: 50%
  top: 50%
  transform: translate(-50%, -50%)
  z-index: 8
  width: min(78vw, 300px)
  opacity: 1

  svg
    transform: rotate(-90deg)

  .rt
    fill: none
    stroke: rgba(255, 255, 255, .14)
    stroke-width: 5

  .rp
    fill: none
    stroke: #ff9a86
    stroke-width: 5
    stroke-linecap: round
    transition: stroke-dashoffset 1s linear

.fx.rest .fx-timer .rp
  stroke: #8fd0c0

.fx .fx-face
  position: absolute
  left: 50%
  top: 50%
  transform: translate(-50%, -50%)
  z-index: 9
  display: flex
  flex-direction: column
  align-items: center
  gap: 6px
  opacity: 1

  .ft
    display: flex
    align-items: center
    justify-content: center
    gap: 7px
    font-size: 15px
    color: #ffd9cf
    font-weight: 700

  .fx-fp
    font-size: 11px
    font-weight: 800
    color: #ffd9cf

  .fk
    font-size: 50px
    font-weight: 800
    color: #fff
    line-height: 1
    letter-spacing: .01em

  .fl
    font-size: 13px
    color: rgba(255, 255, 255, .7)
    font-weight: 600
    letter-spacing: .08em

  .fx-faceTom.pulse
    transition: transform .5s cubic-bezier(.2, 1.5, .4, 1)
    transform: scale(1.3)

.fx .fx-bar
  position: absolute
  left: 0
  right: 0
  bottom: 48px
  z-index: 9
  display: flex
  gap: 12px
  justify-content: center
  opacity: 1

  button
    border: none
    border-radius: 999px
    padding: 13px 26px
    font-size: 14px
    font-weight: 800
    cursor: pointer

  .prim
    background: #fff
    color: #2a211e

  .sec
    background: rgba(255, 255, 255, .16)
    color: #fff

.fx .fx-sheet
  position: absolute
  inset: 0
  z-index: 20
  display: flex
  align-items: center
  justify-content: center
  background: rgba(20, 15, 12, .5)

  .box
    background: $surface
    border-radius: 18px
    padding: 24px 22px
    width: min(320px, 86vw)
    text-align: center

  h4
    margin: 0 0 6px
    font-size: 17px
    font-weight: 800
    color: $ink

  p
    margin: 0 0 18px
    font-size: 13.5px
    color: $ink-2
    line-height: 1.55

  .r
    display: flex
    gap: 10px

  button
    flex: 1
    border: none
    border-radius: 10px
    padding: 12px
    font-weight: 800
    font-size: 14px
    cursor: pointer

  .yes
    background: $rest
    color: #fff

  .no
    background: $bg
    border: 1px solid $line-2
    color: $ink-2
</style>
