import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useUiStore } from './ui-store'
import { useTasksStore } from './tasks-store'
import { estPomsOf, isSlotOver, slotEndAt } from '@/utils/convert-date-time'
import { loadStore, saveStore, removeStore } from '@/utils/save-load-local-storage'
import { makeFocusChime, type FocusChime } from '@/utils/make-focus-chime'
import {
  FOCUS_STATE_KEY,
  DEFAULT_FOCUS_MS,
  DEFAULT_REST_MS,
  startSession,
  skipBreathing as skipBreathingPure,
  projectFocus,
  advanceExpired,
  finishEarly as finishEarlyPure,
  skipRest as skipRestPure,
  anotherPomodoro as anotherPomodoroPure,
  canStartAnotherPomodoro,
  pause as pausePure,
  resume as resumePure,
  decideRehydrate,
  type FocusConfig,
  type FocusEffect,
  type FocusResult,
  type FocusState
} from '@/utils/focus-timer'

/** Render cadence. Faster than 1s because the displayed second is derived from the
 *  deadline rather than counted — sampling quickly keeps the digits from visibly jumping. */
const TICK_MS = 250

/** How much of the slot must remain for the wind-down warning to arrive. */
const SLOT_WARNING_MS = 10 * 60_000

export const useFocusStore = defineStore('focus', () => {
  const ui = useUiStore()
  const tasksStore = useTasksStore()

  const state = ref<FocusState | null>(null)
  /** The only clock read in the whole feature. */
  const now = ref(Date.now())

  let intervalId: ReturnType<typeof setInterval> | null = null
  let chime: FocusChime | null = null
  /** Latches the ten-minute warning to once per session. Reset when a session is torn down,
   *  not when the window is left, so re-entering it cannot re-fire the chime. */
  let slotWarningFired = false

  const task = computed(() => ui.focusTask)

  const config = computed<FocusConfig | null>(() => {
    const t = task.value
    if (!t) return null
    return {
      focusMs: DEFAULT_FOCUS_MS,
      restMs: DEFAULT_REST_MS,
      estPoms: estPomsOf(t),
      // Unclamped, so the ring can read 4/3. The denominator stays at the original estimate:
      // a numerator past it is itself the signal that the plan has been exceeded.
      doneCount: t.completedPomodoros ?? 0
    }
  })

  const view = computed(() => (state.value ? projectFocus(state.value, now.value) : null))

  /** Derived from the synced task, never from persisted state: another device may have
   *  logged pomodoros while this tab was closed, and the DB is the authority. */
  const doneCount = computed(() => config.value?.doneCount ?? 0)
  const estPoms = computed(() => config.value?.estPoms ?? 1)
  const canAnother = computed(() =>
    state.value !== null && config.value !== null
      ? canStartAnotherPomodoro(state.value, config.value)
      : false
  )
  const soundUnlocked = computed(() => chime?.unlocked ?? false)

  /** The session has outlived the event's scheduled slot. Purely informational — it never
   *  stops the timer, because being interrupted mid-pomodoro is worse than running late.
   *  Recomputes with `now`, so it turns on by itself as the session passes the end time. */
  const overrunning = computed(() => {
    const t = task.value
    if (!t || state.value === null || state.value.phase === 'done') return false
    return isSlotOver(t, new Date(now.value))
  })

  /** How much of the *timebox* is left — a different and more important clock than the ring,
   *  which counts down only the current pomodoro. null when the event has no bounded slot.
   *  Goes negative past the end rather than clamping: the context bar says how far over the
   *  session is, and freezing at zero would imply the slot had only just run out. */
  const slotRemainingMs = computed<number | null>(() => {
    const t = task.value
    if (!t) return null
    const endsAt = slotEndAt(t)
    if (endsAt === null) return null
    return endsAt.getTime() - now.value
  })

  /** The timebox is nearly up. Stands down once the slot is actually over, where the overrun
   *  treatment takes over — two escalating states, never both at once. Withheld during the
   *  breathing intro, which is animation-driven: a wind-down warning before the first pomodoro
   *  has even started would spend the once-per-session latch on the least useful moment. */
  const slotEndingSoon = computed(() => {
    const remaining = slotRemainingMs.value
    if (remaining === null || state.value === null) return false
    if (state.value.phase === 'breathing') return false
    return remaining > 0 && remaining <= SLOT_WARNING_MS
  })

  /** Read-only inside the session: the list is there for orientation, and mid-session
   *  fiddling with checkboxes is exactly what the settle-up prompt exists to avoid. */
  const subtasks = computed(() =>
    task.value ? tasksStore.subtasksFor(task.value.id) : []
  )

  function ensureChime(): FocusChime {
    chime ??= makeFocusChime()
    return chime
  }

  /** Call from any user gesture inside the session — cheap and idempotent. Needed because
   *  a session restored by reload has no gesture of its own to unlock audio with. */
  function unlockSound(): void {
    ensureChime().unlock()
  }

  function persist(): void {
    if (state.value === null) return
    saveStore(FOCUS_STATE_KEY, state.value)
  }

  function runEffects(effects: readonly FocusEffect[]): void {
    for (const effect of effects) {
      if (effect.kind === 'creditPomodoro') {
        tasksStore.incrementCompletedPomodoros(effect.taskId)
      } else if (effect.kind === 'playChime') {
        ensureChime().play(effect.sound)
      } else {
        removeStore(FOCUS_STATE_KEY)
      }
    }
  }

  function apply(result: FocusResult): void {
    state.value = result.state
    runEffects(result.effects)
    if (result.state === null) removeStore(FOCUS_STATE_KEY)
    else persist()
  }

  function startTicking(): void {
    if (intervalId !== null) return
    intervalId = setInterval(() => {
      now.value = Date.now()
    }, TICK_MS)
  }

  function stopTicking(): void {
    if (intervalId === null) return
    clearInterval(intervalId)
    intervalId = null
  }

  /** Real teardown. Never touches ui.focusTaskId, so it cannot re-enter the watcher. */
  function stopSession(): void {
    if (state.value === null) return
    state.value = null
    stopTicking()
    removeStore(FOCUS_STATE_KEY)
    chime?.dispose()
    chime = null
    slotWarningFired = false
  }

  /** User-facing close: tear down first, then clear the entry intent. The watcher fires
   *  again on that second write, and the guards above make the re-entry a no-op. */
  function close(): void {
    if (state.value === null && ui.focusTaskId === null) return
    stopSession()
    ui.focusTaskId = null
  }

  /** Stamps the shared clock and hands back that instant. Every action goes through here
   *  so an action can never act on a different moment than the view is rendering — a
   *  deadline set from a fresher Date.now() than `now` would look already-expired, or
   *  never expire at all. */
  function stampNow(): number {
    now.value = Date.now()
    return now.value
  }

  function start(taskId: string): void {
    // Without this the watcher's re-entry would restart the countdown from scratch.
    if (state.value?.taskId === taskId) return
    state.value = startSession(taskId, stampNow())
    startTicking()
    unlockSound()
    persist()
  }

  function skipBreathing(): void {
    if (state.value === null || config.value === null) return
    unlockSound()
    state.value = skipBreathingPure(state.value, config.value, stampNow())
    persist()
  }

  /** Absolute, not a toggle: callers that need a definite state (the early-finish sheet)
   *  must not depend on what the session happened to be doing beforehand. */
  function pause(): void {
    if (state.value === null || config.value === null) return
    if (state.value.segment.status === 'paused') return
    unlockSound()
    apply(pausePure(state.value, config.value, stampNow()))
  }

  function resume(): void {
    if (state.value === null) return
    if (state.value.segment.status === 'running') return
    unlockSound()
    state.value = resumePure(state.value, stampNow())
    persist()
  }

  function togglePause(): void {
    if (state.value === null) return
    if (state.value.segment.status === 'paused') resume()
    else pause()
  }

  function finishEarly(): void {
    if (state.value === null || config.value === null) return
    unlockSound()
    apply(finishEarlyPure(state.value, config.value, stampNow()))
  }

  function skipRest(): void {
    if (state.value === null || config.value === null) return
    unlockSound()
    apply(skipRestPure(state.value, config.value, stampNow()))
  }

  function anotherPomodoro(): void {
    if (state.value === null || config.value === null) return
    unlockSound()
    apply(anotherPomodoroPure(state.value, config.value, stampNow()))
  }

  /** Restores a session across reloads. Anything already expired is dropped outright —
   *  no prompt and no credit, so the pomodoro count stays trustworthy. */
  function rehydrate(): void {
    const raw = loadStore<unknown>(FOCUS_STATE_KEY)
    if (raw === undefined) return

    const at = stampNow()
    const taskId = (raw as { taskId?: unknown }).taskId
    const exists = typeof taskId === 'string' && ui.findTask(taskId) !== undefined
    const outcome = decideRehydrate(raw, exists, at)

    if (outcome.kind === 'discard') {
      removeStore(FOCUS_STATE_KEY)
      return
    }

    state.value = outcome.state
    ui.focusTaskId = outcome.state.taskId
    startTicking()
    persist()
  }

  /** Called on visibilitychange so a backgrounded tab catches up the instant it returns
   *  rather than waiting for the next tick. */
  function syncNow(): void {
    stampNow()
  }

  // The single driver of phase progression, replacing the interval callback, the rest
  // timeout and the ad-hoc calls that used to each advance the session independently.
  watch(
    () => view.value?.expired === true,
    (expired) => {
      if (!expired || state.value === null || config.value === null) return
      apply(advanceExpired(state.value, config.value, now.value))
    }
  )

  // Fires the wind-down chime once and never again for this session. Latched rather than
  // driven by the boolean's edge because the window can be entered more than once — a paused
  // session resumed inside it, or a rehydrated one restored straight into it — and a warning
  // that repeats stops being a nudge and becomes nagging. Deliberately emits no state change:
  // nothing stops or pauses.
  watch(slotEndingSoon, (soon) => {
    if (!soon || slotWarningFired) return
    slotWarningFired = true
    ensureChime().play('slotEndingSoon')
  })

  // ui.focusTaskId is the entry intent; state is the lifecycle. One-way link only.
  watch(
    () => ui.focusTaskId,
    (id) => {
      if (id === null) close()
      else start(id)
    }
  )

  return {
    state,
    view,
    config,
    doneCount,
    estPoms,
    canAnother,
    soundUnlocked,
    overrunning,
    slotRemainingMs,
    slotEndingSoon,
    subtasks,
    start,
    close,
    skipBreathing,
    pause,
    resume,
    togglePause,
    finishEarly,
    skipRest,
    anotherPomodoro,
    rehydrate,
    unlockSound,
    syncNow
  }
})
