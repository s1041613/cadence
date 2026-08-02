// Pure focus-session logic. Deliberately imports nothing from vue/pinia/localStorage and
// never reads the clock: `now` is always a parameter. That is what makes every wall-clock
// boundary (background throttling, reload, "came back three hours later") a table test
// instead of a fake-timer dance.

// 2 adds sessionPoms. Bumped rather than defaulted so a session persisted by the previous
// build is discarded: it has no record of how much of it was worked, and treating its absence
// as zero would silently skip the settle-up prompt after real work.
export const FOCUS_STATE_VERSION = 2
export const FOCUS_STATE_KEY = 'cadence.focus.session'

export type FocusPhase = 'breathing' | 'focus' | 'rest' | 'done'

/** Running: the segment ends at a wall-clock instant, whatever the tab is doing. */
export interface RunningSegment {
  readonly status: 'running'
  readonly endsAt: number
}

/** Paused: no wall-clock identity at all, just the debt still owed to the segment.
 *  Invariant: remainingMs > 0. pause() never mints a spent paused segment. */
export interface PausedSegment {
  readonly status: 'paused'
  readonly remainingMs: number
}

export type Segment = RunningSegment | PausedSegment

export interface FocusState {
  readonly version: typeof FOCUS_STATE_VERSION
  readonly taskId: string
  readonly phase: FocusPhase
  /** Full length of the current segment; needed to redraw the ring after a reload. */
  readonly durationMs: number
  readonly segment: Segment
  /** Pomodoros completed since this session opened. Distinct from the task's
   *  completedPomodoros, which is a cumulative total the DB owns and other devices can move.
   *  Only this counter can answer "was anything done in the sitting I am now leaving?" */
  readonly sessionPoms: number
  readonly updatedAt: number
}

export interface FocusConfig {
  readonly focusMs: number
  readonly restMs: number
  /** Total pomodoros this task needs — always via estPomsOf(). */
  readonly estPoms: number
  /** Pomodoros already credited in the DB. The session never owns this number. */
  readonly doneCount: number
}

/** Side effects are returned, never performed here. Lets tests assert "credited exactly
 *  once" without mocking the tasks store. */
export type FocusEffect =
  | { kind: 'creditPomodoro'; taskId: string }
  | { kind: 'playChime'; sound: 'focusEnd' | 'restEnd' | 'allDone' }
  | { kind: 'clearPersisted' }

export interface FocusResult {
  /** null means the session is over and should unmount. */
  readonly state: FocusState | null
  readonly effects: readonly FocusEffect[]
}

export interface FocusView {
  readonly phase: FocusPhase
  readonly remainingMs: number
  /** 0..1 for the progress ring. */
  readonly progress: number
  readonly paused: boolean
  readonly expired: boolean
}

export const DEFAULT_FOCUS_MS = 25 * 60_000
export const DEFAULT_REST_MS = 5 * 60_000

// ---------- projection ----------

/** Phases that actually run against the clock. Breathing is animation-driven and `done`
 *  is terminal, so neither can expire — reporting them as expired would latch the
 *  caller's expiry watcher to true before the first real countdown even starts. */
function isTimed(phase: FocusPhase): boolean {
  return phase === 'focus' || phase === 'rest'
}

export function projectFocus(state: FocusState, now: number): FocusView {
  const paused = state.segment.status === 'paused'
  const remainingMs = paused
    ? state.segment.remainingMs
    : Math.max(0, state.segment.endsAt - now)

  return {
    phase: state.phase,
    remainingMs,
    progress: state.durationMs > 0 ? 1 - remainingMs / state.durationMs : 0,
    paused,
    // A paused segment can never expire. That is only sound because pause() refuses to
    // create a zero-remaining paused segment — otherwise a spent timer would sit frozen
    // at 00:00 forever and only fire on resume.
    expired:
      isTimed(state.phase) &&
      state.segment.status === 'running' &&
      now >= state.segment.endsAt
  }
}

// ---------- construction ----------

function running(endsAt: number): RunningSegment {
  return { status: 'running', endsAt }
}

function makeState(
  taskId: string,
  phase: FocusPhase,
  durationMs: number,
  segment: Segment,
  now: number,
  sessionPoms: number
): FocusState {
  return { version: FOCUS_STATE_VERSION, taskId, phase, durationMs, segment, sessionPoms, updatedAt: now }
}

/** Opens on the breathing phase, which is animation-driven rather than clock-driven. */
export function startSession(taskId: string, now: number): FocusState {
  return makeState(taskId, 'breathing', 0, running(now), now, 0)
}

export function skipBreathing(state: FocusState, cfg: FocusConfig, now: number): FocusState {
  if (state.phase !== 'breathing') return state
  return makeState(state.taskId, 'focus', cfg.focusMs, running(now + cfg.focusMs), now, state.sessionPoms)
}

// ---------- transitions ----------

function enterRest(state: FocusState, cfg: FocusConfig, now: number): FocusState {
  return makeState(state.taskId, 'rest', cfg.restMs, running(now + cfg.restMs), now, state.sessionPoms)
}

function enterFocus(state: FocusState, cfg: FocusConfig, now: number): FocusState {
  return makeState(state.taskId, 'focus', cfg.focusMs, running(now + cfg.focusMs), now, state.sessionPoms)
}

function enterDone(state: FocusState, now: number): FocusState {
  return makeState(state.taskId, 'done', 0, running(now), now, state.sessionPoms)
}

/** Credits the pomodoro and moves on. `now` is the instant the segment actually ended,
 *  which may be earlier than the wall clock when several phases lapsed while away.
 *  Idempotent by construction: the returned state is never itself expired. */
function completeFocus(state: FocusState, cfg: FocusConfig, now: number): FocusResult {
  const credited = cfg.doneCount + 1
  const effects: FocusEffect[] = [{ kind: 'creditPomodoro', taskId: state.taskId }]
  // The one place a pomodoro is earned, so the one place the session's own count moves.
  const worked: FocusState = { ...state, sessionPoms: state.sessionPoms + 1 }

  if (credited >= cfg.estPoms) {
    effects.push({ kind: 'playChime', sound: 'allDone' })
    return { state: enterDone(worked, now), effects }
  }

  effects.push({ kind: 'playChime', sound: 'focusEnd' })
  return { state: enterRest(worked, cfg, now), effects }
}

function completeRest(state: FocusState, cfg: FocusConfig, now: number): FocusResult {
  if (cfg.doneCount >= cfg.estPoms) {
    return { state: enterDone(state, now), effects: [{ kind: 'playChime', sound: 'allDone' }] }
  }
  return {
    state: enterFocus(state, cfg, now),
    effects: [{ kind: 'playChime', sound: 'restEnd' }]
  }
}

/** The single entry point for "the clock ran out". Advances from the instant the segment
 *  actually ended rather than the caller's clock, so several phases that lapsed while the
 *  tab was away unwind one at a time instead of collapsing into the present. */
export function advanceExpired(state: FocusState, cfg: FocusConfig, now: number): FocusResult {
  const endedAt = state.segment.status === 'running' ? state.segment.endsAt : now
  if (state.phase === 'focus') return completeFocus(state, cfg, endedAt)
  if (state.phase === 'rest') return completeRest(state, cfg, endedAt)
  return { state, effects: [] }
}

/** The "finish now" button during focus: credit early and move on, exactly as a natural
 *  expiry would. */
export function finishEarly(state: FocusState, cfg: FocusConfig, now: number): FocusResult {
  if (state.phase !== 'focus') return { state, effects: [] }
  return completeFocus(state, cfg, now)
}

/** The "skip break" button: no credit, straight back to focus. */
export function skipRest(state: FocusState, cfg: FocusConfig, now: number): FocusResult {
  if (state.phase !== 'rest') return { state, effects: [] }
  if (cfg.doneCount >= cfg.estPoms) return { state: enterDone(state, now), effects: [] }
  return { state: enterFocus(state, cfg, now), effects: [] }
}

/** The "one more pomodoro" button during rest. Same shape as skipRest but guarded by its
 *  own predicate so the button can render disabled instead of silently doing nothing. */
export function anotherPomodoro(state: FocusState, cfg: FocusConfig, now: number): FocusResult {
  if (!canStartAnotherPomodoro(state, cfg)) return { state, effects: [] }
  return { state: enterFocus(state, cfg, now), effects: [] }
}

/** Purely a question of phase: there is something to start whenever a pomodoro is not already
 *  running. Deliberately NOT gated on the estimate — that is a reference derived from the slot
 *  length, and stopping at it stranded a user mid-flow with a dead button. `done` is included
 *  because the milestone screen offers this as its way onward. */
export function canStartAnotherPomodoro(state: FocusState, _cfg: FocusConfig): boolean {
  return state.phase === 'rest' || state.phase === 'done'
}

/** Whether leaving the session should ask what got done. Deliberately reads the session's own
 *  count and not the task's completedPomodoros: a task already at 3/3 from another day would
 *  otherwise make an untouched session prompt on the way out. Opening a timer by mistake
 *  should cost one tap. */
export function shouldAskWhatGotDone(state: FocusState): boolean {
  return state.sessionPoms > 0
}

// ---------- pause / resume ----------

/** Returns a result rather than a state because pausing an already-spent segment must be
 *  able to emit effects: it advances instead of freezing at zero. */
export function pause(state: FocusState, cfg: FocusConfig, now: number): FocusResult {
  if (state.segment.status === 'paused') return { state, effects: [] }

  const remainingMs = state.segment.endsAt - now
  if (remainingMs <= 0) return advanceExpired(state, cfg, now)

  return {
    state: { ...state, segment: { status: 'paused', remainingMs }, updatedAt: now },
    effects: []
  }
}

export function resume(state: FocusState, now: number): FocusState {
  if (state.segment.status === 'running') return state
  return {
    ...state,
    segment: running(now + state.segment.remainingMs),
    updatedAt: now
  }
}

// ---------- persistence boundary ----------

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

const PHASES: readonly string[] = ['breathing', 'focus', 'rest', 'done']

function parseSegment(raw: Record<string, unknown>): Segment | null {
  const status = raw.status
  const hasEndsAt = 'endsAt' in raw
  const hasRemaining = 'remainingMs' in raw

  // Both fields present means the union has been corrupted — we cannot tell which is
  // authoritative, so reject rather than guess.
  if (hasEndsAt && hasRemaining) return null

  if (status === 'running') {
    if (!hasEndsAt || !isFiniteNumber(raw.endsAt)) return null
    return { status: 'running', endsAt: raw.endsAt }
  }

  if (status === 'paused') {
    if (!hasRemaining || !isFiniteNumber(raw.remainingMs)) return null
    // Violates the PausedSegment invariant; a spent paused segment can never expire and
    // would hang the session at 00:00.
    if (raw.remainingMs <= 0) return null
    return { status: 'paused', remainingMs: raw.remainingMs }
  }

  return null
}

/** The only place that trusts localStorage — and it trusts nothing. Returns null for any
 *  payload that is not an exact, current-version FocusState. */
export function parseFocusState(raw: unknown): FocusState | null {
  if (typeof raw !== 'object' || raw === null) return null
  const o = raw as Record<string, unknown>

  if (o.version !== FOCUS_STATE_VERSION) return null
  if (typeof o.taskId !== 'string' || o.taskId === '') return null
  if (typeof o.phase !== 'string' || !PHASES.includes(o.phase)) return null
  if (!isFiniteNumber(o.durationMs) || o.durationMs < 0) return null
  if (!isFiniteNumber(o.updatedAt)) return null
  // A negative or fractional session count could only come from tampering, and it feeds the
  // settle-up gate — reject rather than coerce.
  if (!isFiniteNumber(o.sessionPoms) || o.sessionPoms < 0 || !Number.isInteger(o.sessionPoms)) return null
  if (typeof o.segment !== 'object' || o.segment === null) return null

  const segment = parseSegment(o.segment as Record<string, unknown>)
  if (segment === null) return null

  // Only the timed phases carry a duration; breathing/done are instantaneous markers.
  if (isTimed(o.phase as FocusPhase) && o.durationMs <= 0) return null

  return {
    version: FOCUS_STATE_VERSION,
    taskId: o.taskId,
    phase: o.phase as FocusPhase,
    durationMs: o.durationMs,
    segment,
    sessionPoms: o.sessionPoms,
    updatedAt: o.updatedAt
  }
}

// ---------- rehydration ----------

export type RehydrateOutcome =
  | { kind: 'resume'; state: FocusState }
  | { kind: 'discard'; reason: 'stale' | 'badPayload' | 'taskGone' }

/** Pure restore decision. Anything that has already run out is discarded outright —
 *  no prompt, no silent credit — so the pomodoro count stays trustworthy. */
export function decideRehydrate(raw: unknown, taskExists: boolean, now: number): RehydrateOutcome {
  const state = parseFocusState(raw)
  if (state === null) return { kind: 'discard', reason: 'badPayload' }
  if (!taskExists) return { kind: 'discard', reason: 'taskGone' }

  // Breathing is animation-driven; resuming mid-breath is meaningless, so restart it.
  if (state.phase === 'breathing') {
    return { kind: 'resume', state: { ...state, segment: running(now), updatedAt: now } }
  }

  if (state.phase === 'done') return { kind: 'resume', state }

  // A paused segment holds its remaining time however long we were away, so it is always
  // safe to resume regardless of elapsed time.
  if (state.segment.status === 'paused') return { kind: 'resume', state }

  if (now >= state.segment.endsAt) return { kind: 'discard', reason: 'stale' }
  return { kind: 'resume', state }
}
