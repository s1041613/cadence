import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { useFocusStore } from './focus-store'
import { useUiStore } from './ui-store'
import { useTasksStore } from './tasks-store'
import { loadStore, saveStore } from '@/utils/save-load-local-storage'
import { FOCUS_STATE_KEY, FOCUS_STATE_VERSION, DEFAULT_FOCUS_MS, type FocusState } from '@/utils/focus-timer'
import type { Task } from '@/types/task'

// The pure reducer is covered exhaustively in focus-timer.test.ts. What is verified here
// is the wiring the reducer cannot see: that effects run exactly once, that persistence
// keeps step with state, and that the ui.focusTaskId watcher cannot re-enter itself.

const playChime = vi.fn()
const disposeChime = vi.fn()

vi.mock('@/utils/make-focus-chime', () => ({
  makeFocusChime: () => ({
    unlock: vi.fn(),
    play: playChime,
    dispose: disposeChime,
    get unlocked() {
      return true
    }
  })
}))

function createMemoryStorage(): Storage {
  const data = new Map<string, string>()
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
    clear: () => data.clear(),
    key: (index: number) => Array.from(data.keys())[index] ?? null,
    get length() {
      return data.size
    }
  }
}

// Task start/end times ("09:00") are parsed as local time, so the session clock has to be
// pinned in local time too. A fixed epoch would land on a different wall-clock hour per
// timezone and desync the two — 06:13 in Asia/Taipei, the previous evening in UTC.
const T0 = new Date(2023, 10, 15, 6, 13, 20).getTime()

function makeTask(over: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Write the spec',
    date: '2026-07-31',
    allDay: false,
    start: '09:00',
    end: '10:40',
    done: false,
    estimatedPomodoros: 4,
    completedPomodoros: 0,
    ...over
  } as Task
}

/** Seeds the ui/tasks stores with one task and returns the focus store under test.
 *  Sessions are opened via ui.focusTaskId — the same entry point the preview card uses —
 *  because focusTask (and therefore config) only resolves once that id is set. */
function setup(task: Task = makeTask()) {
  const tasks = useTasksStore()
  tasks.tasks = [task]
  const ui = useUiStore()
  const focus = useFocusStore()
  const increment = vi.spyOn(tasks, 'incrementCompletedPomodoros').mockImplementation(() => {})

  async function open(id = 'task-1') {
    ui.focusTaskId = id
    await nextTick()
  }

  return { focus, ui, tasks, increment, open }
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.stubGlobal('localStorage', createMemoryStorage())
  vi.useFakeTimers()
  vi.setSystemTime(T0)
  playChime.mockClear()
  disposeChime.mockClear()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('focus-store session lifecycle', () => {
  it('persists the session as soon as it starts', async () => {
    const { focus, open } = setup()

    await open()

    expect(loadStore<FocusState>(FOCUS_STATE_KEY)?.taskId).toBe('task-1')
    expect(focus.state?.phase).toBe('breathing')
  })

  it('ignores a restart of the session already running', async () => {
    const { focus, open } = setup()
    await open()
    focus.skipBreathing()

    vi.setSystemTime(T0 + 60_000)
    focus.start('task-1')
    focus.syncNow()

    // A restart would have reset the countdown to a full 25 minutes.
    expect(focus.view?.remainingMs).toBe(DEFAULT_FOCUS_MS - 60_000)
  })

  it('clears state and storage on close', async () => {
    const { focus, ui, open } = setup()
    await open()

    focus.close()

    expect(focus.state).toBeNull()
    expect(loadStore(FOCUS_STATE_KEY)).toBeUndefined()
    expect(ui.focusTaskId).toBeNull()
  })

  it('is safe to close repeatedly', async () => {
    const { focus, open } = setup()
    await open()

    focus.close()
    focus.close()

    expect(disposeChime).toHaveBeenCalledTimes(1)
  })

  it('is safe to close when nothing is running', () => {
    const { focus } = setup()
    expect(() => focus.close()).not.toThrow()
  })
})

describe('focus-store watcher contract', () => {
  // close() clears ui.focusTaskId, which re-fires the watcher that called close(). Without
  // the idempotence guards this recurses or double-runs teardown effects.
  it('settles after a full open/close cycle driven through ui.focusTaskId', async () => {
    const { focus, ui } = setup()

    ui.focusTaskId = 'task-1'
    await nextTick()
    expect(focus.state?.taskId).toBe('task-1')

    ui.focusTaskId = null
    await nextTick()

    expect(focus.state).toBeNull()
    expect(disposeChime).toHaveBeenCalledTimes(1)
  })

  it('keeps exactly one session across repeated open/close cycles', async () => {
    const { focus, ui } = setup()

    for (let i = 0; i < 3; i++) {
      ui.focusTaskId = 'task-1'
      await nextTick()
      ui.focusTaskId = null
      await nextTick()
    }

    expect(focus.state).toBeNull()
    expect(loadStore(FOCUS_STATE_KEY)).toBeUndefined()
    expect(disposeChime).toHaveBeenCalledTimes(3)
  })

  it('tears down when close() is called directly rather than through the watcher', async () => {
    const { focus, ui } = setup()
    ui.focusTaskId = 'task-1'
    await nextTick()

    focus.close()
    await nextTick()

    expect(focus.state).toBeNull()
    expect(ui.focusTaskId).toBeNull()
  })
})

describe('focus-store expiry wiring', () => {
  it('credits the pomodoro exactly once when the focus phase ends', async () => {
    const { focus, increment, open } = setup()
    await open()
    focus.skipBreathing()

    // Several ticks past the deadline: the credit must not repeat on each one.
    vi.setSystemTime(T0 + DEFAULT_FOCUS_MS + 1_000)
    focus.syncNow()
    await nextTick()
    vi.setSystemTime(T0 + DEFAULT_FOCUS_MS + 2_000)
    focus.syncNow()
    await nextTick()

    expect(increment).toHaveBeenCalledTimes(1)
    expect(increment).toHaveBeenCalledWith('task-1')
  })

  it('plays the chime exactly once when the focus phase ends', async () => {
    const { focus, open } = setup()
    await open()
    focus.skipBreathing()

    vi.setSystemTime(T0 + DEFAULT_FOCUS_MS)
    focus.syncNow()
    await nextTick()

    expect(playChime).toHaveBeenCalledTimes(1)
    expect(playChime).toHaveBeenCalledWith('focusEnd')
  })

  it('moves into rest and persists the new phase', async () => {
    const { focus, open } = setup()
    await open()
    focus.skipBreathing()

    vi.setSystemTime(T0 + DEFAULT_FOCUS_MS)
    focus.syncNow()
    await nextTick()

    expect(focus.state?.phase).toBe('rest')
    expect(loadStore<FocusState>(FOCUS_STATE_KEY)?.phase).toBe('rest')
  })

  it('credits once when finishing early', async () => {
    const { focus, increment, open } = setup()
    await open()
    focus.skipBreathing()

    focus.finishEarly()

    expect(increment).toHaveBeenCalledTimes(1)
    expect(focus.state?.phase).toBe('rest')
  })
})

describe('focus-store progress reporting', () => {
  it('derives the completed count from the task rather than the session', async () => {
    const { focus, open } = setup(makeTask({ completedPomodoros: 2 }))
    await open()

    expect(focus.doneCount).toBe(2)
    expect(focus.estPoms).toBe(4)
  })

  it('prefers the stored estimate over the slot-derived count', async () => {
    // 09:00-10:40 would derive 4, but the stored estimate wins.
    const { focus, open } = setup(makeTask({ estimatedPomodoros: 2 }))
    await open()

    expect(focus.estPoms).toBe(2)
  })

  // focus-subtasks spec "The completed phase becomes a fork, not a terminus": reaching the
  // planned count lands on the milestone screen, which offers continuing as well as leaving.
  // Wired end to end here because it depends on the reducer, the clock and the synced task
  // agreeing — the reducer alone cannot show that canAnother survives the transition.
  // The gate for the settle-up prompt, verified through the wiring rather than the reducer:
  // it must count only this sitting, even on a task the DB already shows as fully worked.
  it('counts nothing for a session that was opened and not worked', async () => {
    const { focus, open } = setup(makeTask({ completedPomodoros: 3, estimatedPomodoros: 4 }))
    await open()

    expect(focus.state?.sessionPoms).toBe(0)
  })

  it('counts the pomodoro completed in this sitting', async () => {
    const { focus, open } = setup(makeTask({ completedPomodoros: 3, estimatedPomodoros: 4 }))
    await open()
    focus.skipBreathing()
    focus.finishEarly()

    expect(focus.state?.sessionPoms).toBe(1)
  })

  it('still offers another pomodoro once every planned one is done', async () => {
    const { focus, open } = setup(makeTask({ completedPomodoros: 4, estimatedPomodoros: 4 }))
    await open()
    focus.skipBreathing()
    focus.finishEarly()

    expect(focus.canAnother).toBe(true)
  })
})

describe('focus-store overrun reporting', () => {
  // T0 is 2023-11-15 06:13 local, so the previous day's morning slot is over and a slot
  // later the same day is not.
  const past = makeTask({ date: '2023-11-14', start: '09:00', end: '10:00' })
  const future = makeTask({ date: '2023-11-15', start: '09:00', end: '10:00' })

  it('flags a session running past the event slot', async () => {
    const { focus, open } = setup(past)
    await open()
    focus.skipBreathing()

    expect(focus.overrunning).toBe(true)
  })

  it('does not flag a session inside its slot', async () => {
    const { focus, open } = setup(future)
    await open()
    focus.skipBreathing()

    expect(focus.overrunning).toBe(false)
  })

  it('never flags an all-day task', async () => {
    const { focus, open } = setup(makeTask({ allDay: true, start: '', end: '' }))
    await open()
    focus.skipBreathing()

    expect(focus.overrunning).toBe(false)
  })

  it('turns on by itself once the clock passes the end time', async () => {
    const { focus, open } = setup(future)
    await open()
    focus.skipBreathing()
    expect(focus.overrunning).toBe(false)

    vi.setSystemTime(new Date(2023, 10, 15, 10, 30))
    focus.syncNow()

    expect(focus.overrunning).toBe(true)
  })

  it('keeps the timer running rather than stopping it', async () => {
    const { focus, open } = setup(past)
    await open()
    focus.skipBreathing()

    expect(focus.overrunning).toBe(true)
    expect(focus.state).not.toBeNull()
    expect(focus.view?.remainingMs).toBeGreaterThan(0)
  })
})

describe('focus-store rehydration', () => {
  it('resumes a session that still has time left', () => {
    const { focus, ui } = setup()
    saveStore(FOCUS_STATE_KEY, {
      version: FOCUS_STATE_VERSION,
      taskId: 'task-1',
      phase: 'focus',
      durationMs: DEFAULT_FOCUS_MS,
      segment: { status: 'running', endsAt: T0 + 10 * 60_000 },
      sessionPoms: 0,
      updatedAt: T0
    })

    focus.rehydrate()

    expect(focus.state?.phase).toBe('focus')
    expect(focus.view?.remainingMs).toBe(10 * 60_000)
    expect(ui.focusTaskId).toBe('task-1')
  })

  it('discards an expired session without crediting anything', () => {
    const { focus, ui, increment } = setup()
    saveStore(FOCUS_STATE_KEY, {
      version: FOCUS_STATE_VERSION,
      taskId: 'task-1',
      phase: 'focus',
      durationMs: DEFAULT_FOCUS_MS,
      segment: { status: 'running', endsAt: T0 - 60_000 },
      sessionPoms: 0,
      updatedAt: T0 - DEFAULT_FOCUS_MS
    })

    focus.rehydrate()

    expect(focus.state).toBeNull()
    expect(increment).not.toHaveBeenCalled()
    expect(loadStore(FOCUS_STATE_KEY)).toBeUndefined()
    expect(ui.focusTaskId).toBeNull()
  })

  it('discards a corrupt payload', () => {
    const { focus } = setup()
    saveStore(FOCUS_STATE_KEY, { version: FOCUS_STATE_VERSION, taskId: 'task-1', segment: 'broken' })

    focus.rehydrate()

    expect(focus.state).toBeNull()
    expect(loadStore(FOCUS_STATE_KEY)).toBeUndefined()
  })

  it('discards a session whose task no longer exists', () => {
    const { focus } = setup()
    saveStore(FOCUS_STATE_KEY, {
      version: FOCUS_STATE_VERSION,
      taskId: 'deleted-task',
      phase: 'focus',
      durationMs: DEFAULT_FOCUS_MS,
      segment: { status: 'running', endsAt: T0 + 60_000 },
      sessionPoms: 0,
      updatedAt: T0
    })

    focus.rehydrate()

    expect(focus.state).toBeNull()
  })

  it('does nothing when there is no stored session', () => {
    const { focus } = setup()
    focus.rehydrate()
    expect(focus.state).toBeNull()
  })

  it('restores a paused session with its remaining time intact', () => {
    const { focus } = setup()
    saveStore(FOCUS_STATE_KEY, {
      version: FOCUS_STATE_VERSION,
      taskId: 'task-1',
      phase: 'focus',
      durationMs: DEFAULT_FOCUS_MS,
      segment: { status: 'paused', remainingMs: 7 * 60_000 },
      sessionPoms: 0,
      updatedAt: T0 - 48 * 60 * 60_000
    })

    focus.rehydrate()

    expect(focus.view?.paused).toBe(true)
    expect(focus.view?.remainingMs).toBe(7 * 60_000)
  })
})

describe('focus-store pause semantics', () => {
  it('holds the remaining time while paused', async () => {
    const { focus, open } = setup()
    await open()
    focus.skipBreathing()

    vi.setSystemTime(T0 + 60_000)
    focus.togglePause()

    vi.setSystemTime(T0 + 3_600_000)
    focus.syncNow()

    expect(focus.view?.remainingMs).toBe(DEFAULT_FOCUS_MS - 60_000)
  })

  it('resumes from the frozen remainder', async () => {
    const { focus, open } = setup()
    await open()
    focus.skipBreathing()

    vi.setSystemTime(T0 + 60_000)
    focus.togglePause()
    vi.setSystemTime(T0 + 3_600_000)
    focus.togglePause()

    expect(focus.view?.paused).toBe(false)
    expect(focus.view?.remainingMs).toBe(DEFAULT_FOCUS_MS - 60_000)
  })

  // pause()/resume() are absolute rather than toggles so the early-finish sheet can put
  // the session into a definite state without depending on what it was doing before.
  it('leaves an already-paused session paused', async () => {
    const { focus, open } = setup()
    await open()
    focus.skipBreathing()

    focus.pause()
    focus.pause()

    expect(focus.view?.paused).toBe(true)
  })

  it('leaves an already-running session running', async () => {
    const { focus, open } = setup()
    await open()
    focus.skipBreathing()

    focus.resume()

    expect(focus.view?.paused).toBe(false)
  })

  it('advances rather than freezing when paused after the deadline', async () => {
    const { focus, increment, open } = setup()
    await open()
    focus.skipBreathing()

    vi.setSystemTime(T0 + DEFAULT_FOCUS_MS)
    focus.togglePause()

    expect(focus.state?.phase).toBe('rest')
    expect(increment).toHaveBeenCalledTimes(1)
  })
})

// focus-subtasks spec "The context bar is independent of subtasks": the ring counts down the
// current pomodoro, but how much of the *timebox* is left is a different and more important
// clock that the screen never showed.
describe('focus-store slot remaining', () => {
  const slot = makeTask({ date: '2023-11-15', start: '09:00', end: '10:00' })

  it('reports the milliseconds left in the timebox, not in the pomodoro', async () => {
    const { focus, open } = setup(slot)
    await open()
    focus.skipBreathing()

    vi.setSystemTime(new Date(2023, 10, 15, 9, 17))
    focus.syncNow()

    expect(focus.slotRemainingMs).toBe(43 * 60_000)
  })

  it('reports null for an all-day task, which has no bounded slot to measure', async () => {
    const { focus, open } = setup(makeTask({ allDay: true, start: '', end: '' }))
    await open()
    focus.skipBreathing()

    expect(focus.slotRemainingMs).toBeNull()
  })

  // Past the end the figure keeps counting, negative, so the bar can say how far over it is
  // rather than freezing at zero and implying the slot just ended.
  it('goes negative once the slot has passed', async () => {
    const { focus, open } = setup(slot)
    await open()
    focus.skipBreathing()

    vi.setSystemTime(new Date(2023, 10, 15, 10, 8))
    focus.syncNow()

    expect(focus.slotRemainingMs).toBe(-8 * 60_000)
  })
})

// focus-subtasks spec "Chimes" / user stories 32-34: a gentle warning at ten minutes that
// fires once and never stops the pomodoro.
describe('focus-store ten-minute slot warning', () => {
  const slot = makeTask({ date: '2023-11-15', start: '09:00', end: '10:00' })

  it('is off with more than ten minutes left', async () => {
    const { focus, open } = setup(slot)
    await open()
    focus.skipBreathing()

    vi.setSystemTime(new Date(2023, 10, 15, 9, 45))
    focus.syncNow()

    expect(focus.slotEndingSoon).toBe(false)
  })

  it('turns on and chimes once as the slot drops to ten minutes', async () => {
    const { focus, open } = setup(slot)
    await open()
    focus.skipBreathing()
    playChime.mockClear()

    vi.setSystemTime(new Date(2023, 10, 15, 9, 50))
    focus.syncNow()
    await nextTick()

    expect(focus.slotEndingSoon).toBe(true)
    expect(playChime).toHaveBeenCalledWith('slotEndingSoon')
  })

  it('does not chime again on later ticks inside the window', async () => {
    const { focus, open } = setup(slot)
    await open()
    focus.skipBreathing()
    vi.setSystemTime(new Date(2023, 10, 15, 9, 50))
    focus.syncNow()
    await nextTick()
    playChime.mockClear()

    vi.setSystemTime(new Date(2023, 10, 15, 9, 55))
    focus.syncNow()
    await nextTick()
    vi.setSystemTime(new Date(2023, 10, 15, 9, 58))
    focus.syncNow()
    await nextTick()

    expect(playChime).not.toHaveBeenCalledWith('slotEndingSoon')
  })

  // The warning is information, not an interruption: being cut off mid-pomodoro is worse
  // than running over. Stepped in small increments so the pomodoro itself has not expired —
  // what is asserted is that crossing the threshold changes nothing about the timer.
  it('leaves the pomodoro running', async () => {
    const slotStartingNow = makeTask({ date: '2023-11-15', start: '06:00', end: '06:30' })
    const { focus, open } = setup(slotStartingNow)
    await open()
    focus.skipBreathing()
    expect(focus.state?.phase).toBe('focus')

    // 06:21 leaves nine minutes of the slot, well inside the warning window, while the
    // 25-minute pomodoro opened at 06:13 still has time on it.
    vi.setSystemTime(new Date(2023, 10, 15, 6, 21))
    focus.syncNow()
    await nextTick()

    expect(focus.slotEndingSoon).toBe(true)
    expect(focus.state?.phase).toBe('focus')
    expect(focus.view?.paused).toBe(false)
    expect(focus.view?.remainingMs).toBeGreaterThan(0)
  })

  // Past the end the screen escalates to the overrun treatment, so the amber warning state
  // stands down rather than competing with it.
  it('stands down once the slot is actually over', async () => {
    const { focus, open } = setup(slot)
    await open()
    focus.skipBreathing()

    vi.setSystemTime(new Date(2023, 10, 15, 10, 5))
    focus.syncNow()
    await nextTick()

    expect(focus.slotEndingSoon).toBe(false)
    expect(focus.overrunning).toBe(true)
  })

  // The breathing intro is animation-driven and precedes the first pomodoro. Warning there
  // would spend the once-per-session latch before the session has really begun.
  it('holds the warning until the breathing intro is over', async () => {
    const almostOver = makeTask({ date: '2023-11-15', start: '06:00', end: '06:20' })
    const { focus, open } = setup(almostOver)

    await open()
    await nextTick()
    expect(focus.state?.phase).toBe('breathing')
    expect(focus.slotEndingSoon).toBe(false)
    expect(playChime).not.toHaveBeenCalledWith('slotEndingSoon')

    focus.skipBreathing()
    await nextTick()

    expect(focus.slotEndingSoon).toBe(true)
    expect(playChime).toHaveBeenCalledWith('slotEndingSoon')
  })

  it('never warns for an all-day task', async () => {
    const { focus, open } = setup(makeTask({ allDay: true, start: '', end: '' }))
    await open()
    focus.skipBreathing()
    await nextTick()

    expect(focus.slotEndingSoon).toBe(false)
    expect(playChime).not.toHaveBeenCalledWith('slotEndingSoon')
  })
})
