import { describe, it, expect } from 'vitest'
import {
  FOCUS_STATE_VERSION,
  DEFAULT_FOCUS_MS,
  DEFAULT_REST_MS,
  startSession,
  skipBreathing,
  projectFocus,
  advanceExpired,
  finishEarly,
  skipRest,
  anotherPomodoro,
  canStartAnotherPomodoro,
  pause,
  resume,
  parseFocusState,
  decideRehydrate,
  shouldAskWhatGotDone,
  type FocusConfig,
  type FocusState
} from './focus-timer'

const T0 = 1_700_000_000_000

function cfg(over: Partial<FocusConfig> = {}): FocusConfig {
  return {
    focusMs: DEFAULT_FOCUS_MS,
    restMs: DEFAULT_REST_MS,
    estPoms: 4,
    doneCount: 0,
    ...over
  }
}

/** A focus segment that started at T0 and has the full 25 minutes ahead of it. */
function focusState(over: Partial<FocusState> = {}): FocusState {
  return {
    version: FOCUS_STATE_VERSION,
    taskId: 'task-1',
    phase: 'focus',
    durationMs: DEFAULT_FOCUS_MS,
    segment: { status: 'running', endsAt: T0 + DEFAULT_FOCUS_MS },
    sessionPoms: 0,
    updatedAt: T0,
    ...over
  }
}

describe('projectFocus', () => {
  it('derives remaining time from the deadline, never by accumulating ticks', () => {
    // The whole point of wall-clock: a tab that was throttled for 10 minutes still
    // reports the true remaining time on its next projection.
    const view = projectFocus(focusState(), T0 + 10 * 60_000)
    expect(view.remainingMs).toBe(15 * 60_000)
  })

  it('clamps remaining time at zero once the deadline has passed', () => {
    const view = projectFocus(focusState(), T0 + DEFAULT_FOCUS_MS + 60_000)
    expect(view.remainingMs).toBe(0)
  })

  it('reports progress across the segment', () => {
    expect(projectFocus(focusState(), T0).progress).toBe(0)
    expect(projectFocus(focusState(), T0 + DEFAULT_FOCUS_MS / 2).progress).toBeCloseTo(0.5)
  })

  it('reports zero progress when the phase has no duration', () => {
    const breathing = focusState({ phase: 'breathing', durationMs: 0 })
    expect(projectFocus(breathing, T0).progress).toBe(0)
  })

  it('marks a running segment expired exactly at the deadline', () => {
    expect(projectFocus(focusState(), T0 + DEFAULT_FOCUS_MS - 1).expired).toBe(false)
    expect(projectFocus(focusState(), T0 + DEFAULT_FOCUS_MS).expired).toBe(true)
  })

  // Breathing has no deadline of its own. If it reported expired, a consumer watching
  // that flag would latch true before the first countdown and then never see the real
  // focus expiry as a change.
  it('never marks the breathing phase expired', () => {
    const breathing = startSession('task-1', T0)
    expect(projectFocus(breathing, T0).expired).toBe(false)
    expect(projectFocus(breathing, T0 + 60_000).expired).toBe(false)
  })

  it('never marks a finished session expired', () => {
    const done = focusState({ phase: 'done', durationMs: 0, segment: { status: 'running', endsAt: T0 } })
    expect(projectFocus(done, T0 + 60_000).expired).toBe(false)
  })
})

describe('pause / resume', () => {
  it('freezes the remaining time at the moment of pausing', () => {
    const paused = pause(focusState(), cfg(), T0 + 60_000).state!
    expect(projectFocus(paused, T0 + 60_000).remainingMs).toBe(DEFAULT_FOCUS_MS - 60_000)
  })

  it('does not let time elapse while paused, however long the gap', () => {
    const paused = pause(focusState(), cfg(), T0 + 60_000).state!
    const muchLater = T0 + 72 * 60 * 60_000
    expect(projectFocus(paused, muchLater).remainingMs).toBe(DEFAULT_FOCUS_MS - 60_000)
  })

  it('is idempotent', () => {
    const once = pause(focusState(), cfg(), T0 + 60_000).state!
    const twice = pause(once, cfg(), T0 + 120_000).state!
    expect(twice).toEqual(once)
  })

  it('never reports a paused segment as expired', () => {
    const paused = pause(focusState(), cfg(), T0 + 60_000).state!
    expect(projectFocus(paused, T0 + 999 * 60_000).expired).toBe(false)
  })

  it('resumes with the frozen remainder measured from the new instant', () => {
    const paused = pause(focusState(), cfg(), T0 + 60_000).state!
    const resumed = resume(paused, T0 + 3_600_000)
    expect(projectFocus(resumed, T0 + 3_600_000).remainingMs).toBe(DEFAULT_FOCUS_MS - 60_000)
  })

  it('is idempotent on resume', () => {
    const resumed = resume(focusState(), T0 + 60_000)
    expect(resumed).toEqual(focusState())
  })

  // The boundary that a naive "paused segments never expire" rule gets wrong: pausing a
  // segment whose time already ran out would freeze it at 00:00 until resume.
  it('advances instead of freezing when the segment has already run out', () => {
    const atDeadline = T0 + DEFAULT_FOCUS_MS
    const result = pause(focusState(), cfg(), atDeadline)

    expect(result.state!.phase).toBe('rest')
    expect(result.effects).toContainEqual({ kind: 'creditPomodoro', taskId: 'task-1' })
  })

  it('advances when pausing after the deadline has passed', () => {
    const result = pause(focusState(), cfg(), T0 + DEFAULT_FOCUS_MS + 5_000)
    expect(result.state!.phase).toBe('rest')
  })

  it('never produces a paused segment with no time left', () => {
    const result = pause(focusState(), cfg(), T0 + DEFAULT_FOCUS_MS)
    expect(result.state!.segment.status).not.toBe('paused')
  })
})

describe('advanceExpired', () => {
  it('credits a pomodoro and moves into rest', () => {
    const result = advanceExpired(focusState(), cfg(), T0 + DEFAULT_FOCUS_MS)

    expect(result.effects).toEqual([
      { kind: 'creditPomodoro', taskId: 'task-1' },
      { kind: 'playChime', sound: 'focusEnd' }
    ])
    expect(result.state!.phase).toBe('rest')
  })

  it('finishes the session when the last pomodoro completes', () => {
    const result = advanceExpired(focusState(), cfg({ doneCount: 3, estPoms: 4 }), T0)

    expect(result.state!.phase).toBe('done')
    expect(result.effects).toContainEqual({ kind: 'playChime', sound: 'allDone' })
  })

  it('returns to focus when rest ends with pomodoros still to do', () => {
    const rest = focusState({ phase: 'rest', durationMs: DEFAULT_REST_MS })
    const result = advanceExpired(rest, cfg({ doneCount: 1 }), T0)

    expect(result.state!.phase).toBe('focus')
    expect(result.effects).toEqual([{ kind: 'playChime', sound: 'restEnd' }])
  })

  it('does not credit a second pomodoro when rest ends', () => {
    const rest = focusState({ phase: 'rest', durationMs: DEFAULT_REST_MS })
    const result = advanceExpired(rest, cfg({ doneCount: 1 }), T0)

    expect(result.effects.filter((e) => e.kind === 'creditPomodoro')).toHaveLength(0)
  })

  // Idempotence is what lets several lapsed phases unwind one tick at a time.
  it('produces a state that is no longer expired', () => {
    const result = advanceExpired(focusState(), cfg(), T0 + DEFAULT_FOCUS_MS)
    const at = T0 + DEFAULT_FOCUS_MS
    expect(projectFocus(result.state!, at).expired).toBe(false)
  })

  it('does nothing for phases that cannot expire', () => {
    const done = focusState({ phase: 'done' })
    expect(advanceExpired(done, cfg(), T0).effects).toEqual([])
  })
})

describe('session actions', () => {
  it('starts on the breathing phase', () => {
    expect(startSession('task-1', T0).phase).toBe('breathing')
  })

  it('moves from breathing into a full focus segment', () => {
    const state = skipBreathing(startSession('task-1', T0), cfg(), T0)
    expect(state.phase).toBe('focus')
    expect(projectFocus(state, T0).remainingMs).toBe(DEFAULT_FOCUS_MS)
  })

  it('credits a pomodoro when finishing early', () => {
    const result = finishEarly(focusState(), cfg(), T0 + 60_000)
    expect(result.effects).toContainEqual({ kind: 'creditPomodoro', taskId: 'task-1' })
    expect(result.state!.phase).toBe('rest')
  })

  it('returns to focus without crediting when rest is skipped', () => {
    const rest = focusState({ phase: 'rest' })
    const result = skipRest(rest, cfg({ doneCount: 1 }), T0)

    expect(result.state!.phase).toBe('focus')
    expect(result.effects).toEqual([])
  })

  it('allows another pomodoro while work remains', () => {
    const rest = focusState({ phase: 'rest' })
    expect(canStartAnotherPomodoro(rest, cfg({ doneCount: 1 }))).toBe(true)
    expect(anotherPomodoro(rest, cfg({ doneCount: 1 }), T0).state!.phase).toBe('focus')
  })

  // focus-subtasks spec "The completed phase becomes a fork, not a terminus". The milestone
  // screen states that the planned pomodoros are done and offers a way onward; the estimate is
  // a reference, so reaching it must not disable the button.
  it('allows another pomodoro from the milestone screen', () => {
    const done = focusState({ phase: 'done' })
    const full = cfg({ doneCount: 4, estPoms: 4 })

    expect(canStartAnotherPomodoro(done, full)).toBe(true)
    expect(anotherPomodoro(done, full, T0).state!.phase).toBe('focus')
  })

  it('allows another pomodoro during rest even once the estimate is reached', () => {
    const rest = focusState({ phase: 'rest' })
    const full = cfg({ doneCount: 4, estPoms: 4 })

    expect(canStartAnotherPomodoro(rest, full)).toBe(true)
  })

  // Each pomodoro past the estimate returns here, so the count keeps climbing against a fixed
  // denominator — 5/4, 6/4 — rather than the screen becoming a dead end.
  it('still allows another pomodoro once past the estimate', () => {
    const done = focusState({ phase: 'done' })
    expect(canStartAnotherPomodoro(done, cfg({ doneCount: 6, estPoms: 4 }))).toBe(true)
  })

  // The guard is about phase, not count: mid-pomodoro there is nothing to start.
  it('refuses another pomodoro while a pomodoro is running', () => {
    const focus = focusState({ phase: 'focus' })
    expect(canStartAnotherPomodoro(focus, cfg({ doneCount: 1, estPoms: 4 }))).toBe(false)
  })
})

describe('session pomodoro counter', () => {
  // focus-subtasks spec "The settle-up prompt is gated on pomodoros completed in this session".
  // The task's stored completedPomodoros is a cumulative DB total, so a task already at 3/3
  // from yesterday would wrongly satisfy the gate. This counter belongs to the session.
  it('starts a session at zero', () => {
    expect(startSession('task-1', T0).sessionPoms).toBe(0)
  })

  it('is unchanged by breathing being skipped', () => {
    const s = startSession('task-1', T0)
    expect(skipBreathing(s, cfg(), T0).sessionPoms).toBe(0)
  })

  it('counts a pomodoro that runs to its end', () => {
    const focus = focusState({ segment: { status: 'running', endsAt: T0 } })
    expect(advanceExpired(focus, cfg({ doneCount: 0 }), T0).state!.sessionPoms).toBe(1)
  })

  it('counts a pomodoro finished early', () => {
    const focus = focusState()
    expect(finishEarly(focus, cfg({ doneCount: 0 }), T0).state!.sessionPoms).toBe(1)
  })

  it('accumulates across several pomodoros', () => {
    let state = focusState({ sessionPoms: 2 })
    state = finishEarly(state, cfg({ doneCount: 2 }), T0).state!
    expect(state.sessionPoms).toBe(3)
  })

  // A break is not work: only completing focus increments the count.
  it('does not count a completed rest', () => {
    const rest = focusState({ phase: 'rest', sessionPoms: 1, segment: { status: 'running', endsAt: T0 } })
    expect(advanceExpired(rest, cfg({ doneCount: 1 }), T0).state!.sessionPoms).toBe(1)
  })

  it('carries the count through starting another pomodoro', () => {
    const done = focusState({ phase: 'done', sessionPoms: 4 })
    expect(anotherPomodoro(done, cfg({ doneCount: 4 }), T0).state!.sessionPoms).toBe(4)
  })

  it('carries the count through a pause and resume', () => {
    const focus = focusState({ sessionPoms: 2 })
    const paused = pause(focus, cfg(), T0).state!
    expect(paused.sessionPoms).toBe(2)
    expect(resume(paused, T0).sessionPoms).toBe(2)
  })
})

describe('shouldAskWhatGotDone', () => {
  // The gate for the settle-up prompt. Pure so the rule is testable without a store: leaving
  // is worth a question only when something was actually completed to report.
  it('does not ask when no pomodoro was completed this session', () => {
    expect(shouldAskWhatGotDone(focusState({ sessionPoms: 0 }))).toBe(false)
  })

  it('asks once a pomodoro has been completed', () => {
    expect(shouldAskWhatGotDone(focusState({ sessionPoms: 1 }))).toBe(true)
  })

  // The distinction the spec calls out: the task's lifetime total is irrelevant here.
  it('ignores pomodoros completed in earlier sessions', () => {
    const freshSessionOnAWellWorkedTask = focusState({ sessionPoms: 0 })
    expect(shouldAskWhatGotDone(freshSessionOnAWellWorkedTask)).toBe(false)
  })
})

describe('parseFocusState', () => {
  const valid = focusState()

  it('round-trips a valid state through JSON', () => {
    expect(parseFocusState(JSON.parse(JSON.stringify(valid)))).toEqual(valid)
  })

  it.each([
    ['null', null],
    ['a string', 'nope'],
    ['a wrong version', { ...valid, version: 99 }],
    // The concrete migration case the version bump exists for: a v1 payload is well-formed in
    // every field it has, but has no record of how much of the session was worked. Reading it
    // as zero would silently skip the settle-up prompt after real work.
    ['a session persisted before sessionPoms existed', { ...valid, version: 1, sessionPoms: undefined }],
    ['a negative session count', { ...valid, sessionPoms: -1 }],
    ['a fractional session count', { ...valid, sessionPoms: 1.5 }],
    ['an empty taskId', { ...valid, taskId: '' }],
    ['a non-string taskId', { ...valid, taskId: 42 }],
    ['an unknown phase', { ...valid, phase: 'sprinting' }],
    ['a NaN duration', { ...valid, durationMs: NaN }],
    ['an infinite duration', { ...valid, durationMs: Infinity }],
    ['a negative duration', { ...valid, durationMs: -1 }],
    ['a zero duration on a timed phase', { ...valid, durationMs: 0 }],
    ['a missing segment', { ...valid, segment: null }],
    ['an unknown segment status', { ...valid, segment: { status: 'frozen' } }],
    ['a NaN deadline', { ...valid, segment: { status: 'running', endsAt: NaN } }],
    ['an infinite deadline', { ...valid, segment: { status: 'running', endsAt: Infinity } }],
    ['a running segment carrying remainingMs', { ...valid, segment: { status: 'running', remainingMs: 100 } }],
    ['a paused segment carrying endsAt', { ...valid, segment: { status: 'paused', endsAt: T0 } }],
    ['a segment with both time fields', { ...valid, segment: { status: 'running', endsAt: T0, remainingMs: 5 } }],
    ['a spent paused segment', { ...valid, segment: { status: 'paused', remainingMs: 0 } }],
    ['a negative paused remainder', { ...valid, segment: { status: 'paused', remainingMs: -5 } }],
    ['a NaN updatedAt', { ...valid, updatedAt: NaN }]
  ])('rejects %s', (_label, payload) => {
    expect(parseFocusState(payload)).toBeNull()
  })

  it('accepts a zero duration on the breathing phase', () => {
    const breathing = { ...valid, phase: 'breathing', durationMs: 0 }
    expect(parseFocusState(breathing)).not.toBeNull()
  })
})

describe('decideRehydrate', () => {
  it('resumes a session that is still running', () => {
    const outcome = decideRehydrate(focusState(), true, T0 + 60_000)
    expect(outcome.kind).toBe('resume')
  })

  it('discards a session whose time ran out while away', () => {
    const outcome = decideRehydrate(focusState(), true, T0 + DEFAULT_FOCUS_MS + 1)
    expect(outcome).toEqual({ kind: 'discard', reason: 'stale' })
  })

  it('discards exactly at the deadline', () => {
    const outcome = decideRehydrate(focusState(), true, T0 + DEFAULT_FOCUS_MS)
    expect(outcome).toEqual({ kind: 'discard', reason: 'stale' })
  })

  it('never credits a pomodoro when discarding', () => {
    // Discard is silent by design: crediting time we cannot vouch for would make the
    // pomodoro count meaningless.
    const outcome = decideRehydrate(focusState(), true, T0 + 999 * 60_000)
    expect(outcome.kind).toBe('discard')
  })

  it('resumes a paused session however long it sat', () => {
    const paused = pause(focusState(), cfg(), T0 + 60_000).state!
    const outcome = decideRehydrate(paused, true, T0 + 30 * 24 * 60 * 60_000)

    expect(outcome.kind).toBe('resume')
    expect(projectFocus((outcome as { state: FocusState }).state, T0).remainingMs)
      .toBe(DEFAULT_FOCUS_MS - 60_000)
  })

  it('discards when the task no longer exists', () => {
    expect(decideRehydrate(focusState(), false, T0)).toEqual({ kind: 'discard', reason: 'taskGone' })
  })

  it('discards a corrupt payload', () => {
    expect(decideRehydrate({ garbage: true }, true, T0)).toEqual({ kind: 'discard', reason: 'badPayload' })
  })

  it('discards when nothing was stored', () => {
    expect(decideRehydrate(undefined, true, T0)).toEqual({ kind: 'discard', reason: 'badPayload' })
  })

  it('restarts breathing rather than resuming mid-breath', () => {
    const breathing = focusState({ phase: 'breathing', durationMs: 0 })
    const outcome = decideRehydrate(breathing, true, T0 + 5 * 60_000)

    expect(outcome.kind).toBe('resume')
    expect((outcome as { state: FocusState }).state.phase).toBe('breathing')
  })

  it('resumes a finished session so the user sees the done screen', () => {
    const done = focusState({ phase: 'done', durationMs: 0 })
    expect(decideRehydrate(done, true, T0 + 60_000).kind).toBe('resume')
  })
})
