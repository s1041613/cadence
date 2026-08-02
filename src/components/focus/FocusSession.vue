<template>
  <!-- Any click unlocks audio: a session restored by reload has no gesture of its own,
       and autoplay policy keeps the chime silent until one happens. -->
  <div
    v-if="task && focus.state"
    class="fx"
    :class="{ rest: mode === 'rest', overrun: focus.overrunning }"
    @click="focus.unlockSound()"
  >
    <div class="fx-top">
      <button v-if="phase === 'breathing'" class="fx-skip" @click="focus.skipBreathing()">Skip</button>
      <button class="fx-close" aria-label="Close" @click="focus.close()">
        <CdIcon name="close" :size="16" color="#fff" />
      </button>
    </div>

    <template v-if="phase === 'breathing'">
      <div class="fx-hud">Breathe in on the rise · out on the fall</div>
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
      <div class="fx-hud">{{ mode === 'focus' ? 'Focus · Pomodoro' : `Short break · ${restMinutes} min` }}</div>
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
          <span class="fx-ft-txt">{{ task.title || 'Untitled' }}</span>
          <span class="fx-fp mono">{{ focus.doneCount }}/{{ focus.estPoms }}</span>
        </div>
        <svg class="fx-faceTom" :class="{ pulse: pulseTomato }" width="50" height="50" viewBox="0 0 24 24" v-html="TOMATO_SVG" />
        <div class="fk fx-fk mono">{{ fmt(secondsLeft) }}</div>
        <div class="fl fx-fl">{{ statusLabel }}</div>
        <div v-if="focus.overrunning" class="fx-overrunHint">Past scheduled end time</div>
        <div v-if="!focus.soundUnlocked" class="fx-soundHint">Tap anywhere to enable sound</div>
      </div>
      <div v-if="mode !== 'done'" class="fx-bar show">
        <template v-if="mode === 'focus'">
          <button class="sec" @click="togglePause">{{ paused ? 'Resume' : 'Pause' }}</button>
          <button class="prim" @click="openEarlyFinishSheet">Finish</button>
        </template>
        <template v-else-if="mode === 'rest'">
          <button class="sec" @click="focus.skipRest()">Skip break</button>
          <button class="prim" :disabled="!focus.canAnother" @click="focus.anotherPomodoro()">Start another pomodoro</button>
        </template>
      </div>
      <div v-if="mode === 'done'" class="fx-bar show">
        <button class="prim" @click="focus.close()">Done</button>
      </div>
    </template>

    <div v-if="earlyFinishSheetOpen" class="fx-sheet">
      <div class="box">
        <h4>Finish early?</h4>
        <p>Time's not up yet. Count this as a completed pomodoro?</p>
        <div class="r">
          <button class="no" @click="cancelEarlyFinish">Keep focusing</button>
          <button class="yes" @click="confirmEarlyFinish">Yes, count it</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useUiStore } from '@/stores/ui-store'
import { useFocusStore } from '@/stores/focus-store'
import { makeFocusAudio, type FocusAudio } from '@/utils/make-focus-audio'
import { breathingGeometry, countCompletedBreaths } from '@/utils/breathing-curve'
import { TOMATO_SVG } from '@/utils/tomato-icon'
import CdIcon from '../ui/CdIcon.vue'

// This component is a projection of focus-store. It owns no timer state: only the
// breathing animation (rAF-driven) and purely visual flags live here.

const BREATHS = 3
const CYCLE = 5000
const RING_C = 2 * Math.PI * 140

const ui = useUiStore()
const focus = useFocusStore()

const task = computed(() => ui.focusTask)

const phase = computed(() => (focus.state?.phase === 'breathing' ? 'breathing' : 'timer'))
const mode = computed(() => {
  const p = focus.state?.phase
  return p === 'rest' || p === 'done' ? p : 'focus'
})
const secondsLeft = computed(() => Math.max(0, Math.ceil((focus.view?.remainingMs ?? 0) / 1000)))
const paused = computed(() => focus.view?.paused ?? false)
// Derived from the store rather than a local constant, so the label cannot drift away
// from the duration the timer actually runs for.
const restMinutes = computed(() => Math.round((focus.config?.restMs ?? 0) / 60_000))

const breathsDone = ref(0)
const rising = ref(true)
const scroll = ref(Math.PI / 2)
const wordOpacity = ref('0.22')
const pulseTomato = ref(false)
const earlyFinishSheetOpen = ref(false)

let audio: FocusAudio | null = null
let raf: number | null = null
let lastTs: number | null = null
let wasRising: boolean | undefined

const frame = computed(() => breathingGeometry(scroll.value))
const hillPath = computed(() => frame.value.hillPath)
const charX = computed(() => frame.value.charX)
const charY = computed(() => frame.value.charY)
const charTransform = computed(() => frame.value.charTransform)

const ringOffset = computed(() => RING_C * (focus.view?.progress ?? 0))
const ringCircumference = RING_C

const statusLabel = computed(() => {
  if (mode.value === 'done') return 'Completed'
  if (mode.value === 'rest') return paused.value ? 'Paused' : 'On break'
  return paused.value ? 'Paused' : 'Focusing'
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

  const f = frame.value
  rising.value = f.rising
  wordOpacity.value = f.wordOpacity
  audio?.mix(f.rising, f.breath)

  if (phase.value === 'breathing') {
    breathsDone.value += countCompletedBreaths(wasRising, f.rising)
    wasRising = f.rising
    if (breathsDone.value >= BREATHS) focus.skipBreathing()
  }

  raf = requestAnimationFrame(loop)
}

function togglePause(): void {
  focus.togglePause()
  if (focus.view?.paused) audio?.pause()
  else audio?.resume()
}

// Remembers whether the session was already paused when the sheet opened, so cancelling
// restores what the user had rather than always resuming.
let pausedBeforeSheet = false

function openEarlyFinishSheet(): void {
  pausedBeforeSheet = paused.value
  earlyFinishSheetOpen.value = true
  focus.pause()
  audio?.pause()
}

function confirmEarlyFinish(): void {
  earlyFinishSheetOpen.value = false
  focus.finishEarly()
}

function cancelEarlyFinish(): void {
  earlyFinishSheetOpen.value = false
  if (pausedBeforeSheet) return
  focus.resume()
  audio?.resume()
}

function onVisibilityChange(): void {
  if (document.visibilityState === 'visible') focus.syncNow()
}

// Ambient audio follows the phase: it fades out once the countdown begins, exactly as
// before. The end-of-phase chime deliberately does NOT go through this graph.
watch(
  () => focus.state?.phase,
  (next, prev) => {
    if (next === undefined) return
    if (prev === 'breathing' && next !== 'breathing') audio?.fadeOut()
    if (next === 'rest') audio?.enterCalm()
    if (next !== prev && (next === 'rest' || next === 'done')) {
      pulseTomato.value = true
      setTimeout(() => (pulseTomato.value = false), 420)
    }
  }
)

onMounted(() => {
  audio = makeFocusAudio()
  audio.start()
  lastTs = null
  raf = requestAnimationFrame(loop)
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onUnmounted(() => {
  if (raf) cancelAnimationFrame(raf)
  raf = null
  audio?.stop()
  audio = null
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>

<style scoped lang="sass">
.fx
  position: fixed
  inset: 0
  // Focus is a full-screen mode, so it sits above Quasar's drawers (~3000) but stays
  // below dialogs (~6000) — a confirmation must still be able to appear over it.
  // Fixed positioning is relative to the viewport, so this stays full-bleed even though
  // the v2 pages constrain their content to a 393px frame on desktop.
  z-index: 4000
  overflow: hidden
  background: #0e3527
  transition: background .8s
  animation: fxIn .4s ease

// Running past the event's slot warms the background from green towards dusk. Deliberately
// gentle: it inherits the .8s background transition above, so it arrives as a slow shift
// rather than an alarm. Nothing stops — being cut off mid-pomodoro is worse than overrunning.
.fx.overrun
  background: #3a2a1c

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
    font-weight: 700
    color: #ffd9cf

  .fk
    font-size: 50px
    font-weight: 700
    color: #fff
    line-height: 1
    letter-spacing: .01em

  // Autoplay policy keeps the chime muted until a gesture. A restored session may have
  // none, so say so quietly rather than failing silently or interrupting with a dialog.
  .fx-soundHint
    font-size: 11px
    letter-spacing: .04em
    color: rgba(255, 255, 255, .5)
    margin-top: 2px

  .fx-overrunHint
    font-size: 11px
    letter-spacing: .06em
    color: rgba(255, 214, 170, .82)
    margin-top: 2px

  .fl
    font-size: 13px
    color: rgba(255, 255, 255, .7)
    font-weight: 700
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
    font-weight: 700
    cursor: pointer

    // Previously this button silently did nothing once every pomodoro was done; showing
    // it disabled tells the user it is unavailable rather than broken.
    &:disabled
      opacity: .45
      cursor: not-allowed

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
    font-weight: 700
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
    font-weight: 700
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
