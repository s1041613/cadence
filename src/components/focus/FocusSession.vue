<template>
  <!-- Any click unlocks audio: a session restored by reload has no gesture of its own,
       and autoplay policy keeps the chime silent until one happens. -->
  <div
    v-if="task && focus.state"
    class="fx"
    :class="{ rest: mode === 'rest', overrun: focus.overrunning, 'ending-soon': focus.slotEndingSoon }"
    @click="focus.unlockSound()"
  >
    <div class="fx-top">
      <button v-if="phase === 'breathing'" class="fx-skip" @click="focus.skipBreathing()">Skip</button>
      <button class="fx-close" aria-label="Close" @click="leaveSession">
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

      <!-- The ring counts down this pomodoro; how much of the timebox is left is a different
           and more important clock that the screen never showed. Independent of subtasks:
           it appears whether or not the event has any. Visual hierarchy carries the
           distinction — the fixed slot is dimmest, the moving figure brightest. -->
      <div class="fx-ctx">
        <i class="fx-ctx-dot" />
        <span class="fx-ctx-main">
          <span class="fx-ctx-name">{{ task.title || 'Untitled' }}</span>
          <!-- An all-day task has no bounded slot, so the times and the remaining figure have
               no source. The bar itself stays: the name is what it is mostly for. -->
          <span v-if="slotLabel" class="fx-ctx-slot">{{ slotLabel }}</span>
        </span>
        <span v-if="slotRemainingLabel" class="fx-ctx-left">{{ slotRemainingLabel }}</span>
      </div>
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
      <!-- Present for orientation, not interaction: these are <div>s with dots rather than
           checkboxes so it is visible at a glance that they cannot be ticked. Mid-session
           fiddling is exactly what the settle-up prompt at the end exists to avoid. -->
      <div v-if="focus.subtasks.length" class="fx-list">
        <p class="fx-list-h">SUBTASKS</p>
        <div v-for="subtask in focus.subtasks" :key="subtask.id" class="fx-sub" :data-done="subtask.done">
          <i />
          <span>{{ subtask.title }}</span>
        </div>
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
      <!-- The milestone is stated, not enforced: the planned pomodoros are finished, but the
           estimate is a reference, so leaving and continuing are offered side by side. -->
      <div v-if="mode === 'done'" class="fx-bar show">
        <button class="sec" @click="leaveSession">Done</button>
        <button class="prim" @click="focus.anotherPomodoro()">Start another pomodoro</button>
      </div>
    </template>

    <!-- Pomodoro-level: ends this one, and another may follow. Asks nothing about subtasks,
         which is why it never co-occurs with the session-level sheet below. -->
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

    <!-- Session-level: ✕ and the milestone Done are the same act — leaving — so they share
         one exit path, one gate and one sheet. Recording progress is never mandatory. -->
    <div v-if="settleUpOpen" class="fx-sheet">
      <div class="box box--settle">
        <p class="settle-eyebrow">FOCUS ENDED</p>
        <h4>What did you get done?</h4>
        <p class="settle-meta">{{ settleMetaLabel }}</p>
        <ul v-if="focus.subtasks.length" class="settle-list">
          <li v-for="subtask in focus.subtasks" :key="subtask.id" class="settle-sub" :data-done="subtask.done">
            <button
              type="button"
              class="settle-chk"
              :data-on="subtask.done"
              :aria-label="`${subtask.done ? 'Uncheck' : 'Check'} ${subtask.title}`"
              @click="tasksStore.toggleSubtaskDone(subtask.id)"
            >
              <CdIcon v-if="subtask.done" name="check" :size="11" :stroke-width="3.4" color="#fff" />
            </button>
            <span>{{ subtask.title }}</span>
          </li>
        </ul>
        <div class="r">
          <button class="no" @click="closeSession">Skip</button>
          <button class="yes" @click="closeSession">Done</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useUiStore } from '@/stores/ui-store'
import { useFocusStore } from '@/stores/focus-store'
import { useTasksStore } from '@/stores/tasks-store'
import { useSettingsStore } from '@/stores/settings-store'
import { makeFocusAudio, type FocusAudio } from '@/utils/make-focus-audio'
import { breathingGeometry, countCompletedBreaths } from '@/utils/breathing-curve'
import { formatTime } from '@/utils/convert-date-time'
import { shouldAskWhatGotDone } from '@/utils/focus-timer'
import { TOMATO_SVG } from '@/utils/tomato-icon'
import CdIcon from '../ui/CdIcon.vue'

// This component is a projection of focus-store. It owns no timer state: only the
// breathing animation (rAF-driven) and purely visual flags live here.

const BREATHS = 3
const CYCLE = 5000
const RING_C = 2 * Math.PI * 140

const ui = useUiStore()
const focus = useFocusStore()
const tasksStore = useTasksStore()
const settings = useSettingsStore()

const task = computed(() => ui.focusTask)

// Empty for an all-day task, which has no bounded slot — the whole bar is withheld rather
// than shown with a blank where the times belong.
const slotLabel = computed(() => {
  const t = task.value
  if (!t || t.allDay || !t.start || !t.end) return ''
  return `${formatTime(t.start, settings.timeFormat)}–${formatTime(t.end, settings.timeFormat)}`
})

const slotRemainingLabel = computed(() => {
  const remaining = focus.slotRemainingMs
  if (remaining === null) return ''
  // Rounded up while time remains so the figure only reads "0 min left" once the slot is
  // genuinely spent, and reported as an overrun past the end rather than a negative number.
  if (remaining < 0) return `${Math.floor(-remaining / 60_000)} min over`
  return `${Math.ceil(remaining / 60_000)} min left`
})

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
const settleUpOpen = ref(false)

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
  // Not "Completed": the planned pomodoros are done, but the session only ends if the user
  // says so. The label states the milestone without implying the session is over.
  if (mode.value === 'done') return 'Planned pomodoros done'
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

// ✕ and the milestone Done are the same act — leaving the session — so they share this one
// path. The prompt is gated on pomodoros completed in THIS session, not the task's cumulative
// total: a task already at 3/3 from another day would otherwise make an untouched session
// prompt on the way out, and opening a timer by mistake should cost one tap.
function leaveSession(): void {
  if (focus.state !== null && shouldAskWhatGotDone(focus.state)) {
    focus.pause()
    audio?.pause()
    settleUpOpen.value = true
    return
  }
  focus.close()
}

function closeSession(): void {
  settleUpOpen.value = false
  focus.close()
}

const settleMetaLabel = computed(() => {
  const poms = focus.state?.sessionPoms ?? 0
  const title = task.value?.title || 'Untitled'
  return `${title} · ${poms} pomodoro${poms === 1 ? '' : 's'} this session`
})

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

// Ten minutes of the timebox left. Warmer than the focus green but cooler than the overrun
// dusk, so the three states read as one escalating scale. Like overrun, nothing stops.
.fx.ending-soon
  background: #4a3a1c

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

// Three pieces of information separated by weight and brightness rather than by line, so the
// bar stays one object: the name says what, the slot says when, the remaining figure is the
// only number that moves on its own and is therefore the brightest.
.fx .fx-ctx
  position: absolute
  top: 56px
  left: 26px
  right: 26px
  z-index: 7
  display: flex
  align-items: center
  gap: 9px
  padding: 10px 14px
  border-radius: 11px
  background: rgba(255, 255, 255, .09)
  border: 1px solid rgba(255, 255, 255, .14)
  transition: background .5s, border-color .5s

  .fx-ctx-dot
    flex: none
    width: 7px
    height: 7px
    border-radius: 50%
    background: #6fbf95
    transition: background .5s

  .fx-ctx-main
    flex: 1
    min-width: 0
    display: flex
    align-items: baseline
    gap: 8px

  .fx-ctx-name
    font-size: 12.5px
    font-weight: 700
    color: #fff
    white-space: nowrap
    overflow: hidden
    text-overflow: ellipsis

  // Fixed for the whole session, so it is the dimmest thing in the bar.
  .fx-ctx-slot
    font-size: 11px
    font-weight: 700
    color: rgba(255, 255, 255, .5)
    white-space: nowrap

  .fx-ctx-left
    flex: none
    font-size: 11.5px
    font-weight: 700
    color: rgba(255, 255, 255, .72)

.fx.ending-soon .fx-ctx
  background: rgba(255, 255, 255, .15)
  border-color: rgba(246, 217, 168, .5)

  .fx-ctx-dot
    background: #c98a2e

  .fx-ctx-name,
  .fx-ctx-left
    color: #f6d9a8

  .fx-ctx-slot
    color: rgba(246, 217, 168, .55)

.fx.overrun .fx-ctx
  background: rgba(255, 255, 255, .13)
  border-color: rgba(255, 255, 255, .28)

  .fx-ctx-dot
    background: #e8a888

  .fx-ctx-name,
  .fx-ctx-left
    color: #f5cdb4

  .fx-ctx-slot
    color: rgba(245, 205, 180, .55)

// Read-only by construction: dots instead of checkboxes, and no interactive elements at all.
.fx .fx-list
  position: absolute
  left: 18px
  right: 18px
  bottom: 108px
  z-index: 7
  max-height: 132px
  overflow-y: auto

  .fx-list-h
    margin: 0 0 4px
    font-size: 9.5px
    font-weight: 800
    letter-spacing: .14em
    color: rgba(255, 255, 255, .4)

  .fx-sub
    display: flex
    align-items: center
    gap: 10px
    padding: 7px 0

    i
      flex: none
      width: 4px
      height: 4px
      border-radius: 50%
      background: rgba(255, 255, 255, .34)

    span
      flex: 1
      min-width: 0
      font-size: 14px
      font-weight: 600
      color: rgba(255, 255, 255, .82)

    &[data-done="true"] span
      color: rgba(255, 255, 255, .38)
      text-decoration: line-through

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

  // The settle-up sheet carries a list, so it aligns left rather than centring like the
  // one-question early-finish box.
  .box--settle
    text-align: left

  .settle-eyebrow
    margin: 0
    font-size: 10px
    font-weight: 800
    letter-spacing: .13em
    color: $ink-2

  // The eyebrow sits directly above the heading, so the heading's default bottom margin
  // (sized for the centred one-question box) would separate it from its own meta line.
  .box--settle h4
    margin: 8px 0 4px

  .settle-meta
    margin: 4px 0 0
    font-size: 11.5px
    font-weight: 700
    color: $ink-2

  .settle-list
    list-style: none
    margin: 14px 0 0
    padding: 0
    max-height: 208px
    overflow-y: auto

  .settle-sub
    display: grid
    grid-template-columns: 22px minmax(0, 1fr)
    align-items: center
    gap: 12px
    min-height: 44px
    border-bottom: 1px solid $line-2

    span
      min-width: 0
      font-size: 14px
      font-weight: 600
      color: $ink

    &[data-done="true"] span
      color: $ink-2
      text-decoration: line-through
      font-weight: 500

  .settle-chk
    flex: none
    width: 20px
    height: 20px
    padding: 0
    border: 1.5px solid $line-2
    border-radius: 5px
    background: transparent
    cursor: pointer
    display: grid
    place-items: center

    &[data-on="true"]
      background: $ink
      border-color: $ink

  .box--settle .r
    margin-top: 16px
</style>
