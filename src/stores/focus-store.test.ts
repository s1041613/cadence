import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { useFocusStore } from './focus-store'
import { useUiStore } from './ui-store'
import { useTasksStore } from './tasks-store'
import { loadStore, saveStore } from '@/utils/save-load-local-storage'
import { FOCUS_STATE_KEY, DEFAULT_FOCUS_MS, type FocusState } from '@/utils/focus-timer'
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

const T0 = 1_700_000_000_000

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

  it('disables another pomodoro once every one is done', async () => {
    const { focus, open } = setup(makeTask({ completedPomodoros: 4, estimatedPomodoros: 4 }))
    await open()
    focus.skipBreathing()
    focus.finishEarly()

    expect(focus.canAnother).toBe(false)
  })
})

describe('focus-store rehydration', () => {
  it('resumes a session that still has time left', () => {
    const { focus, ui } = setup()
    saveStore(FOCUS_STATE_KEY, {
      version: 1,
      taskId: 'task-1',
      phase: 'focus',
      durationMs: DEFAULT_FOCUS_MS,
      segment: { status: 'running', endsAt: T0 + 10 * 60_000 },
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
      version: 1,
      taskId: 'task-1',
      phase: 'focus',
      durationMs: DEFAULT_FOCUS_MS,
      segment: { status: 'running', endsAt: T0 - 60_000 },
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
    saveStore(FOCUS_STATE_KEY, { version: 1, taskId: 'task-1', segment: 'broken' })

    focus.rehydrate()

    expect(focus.state).toBeNull()
    expect(loadStore(FOCUS_STATE_KEY)).toBeUndefined()
  })

  it('discards a session whose task no longer exists', () => {
    const { focus } = setup()
    saveStore(FOCUS_STATE_KEY, {
      version: 1,
      taskId: 'deleted-task',
      phase: 'focus',
      durationMs: DEFAULT_FOCUS_MS,
      segment: { status: 'running', endsAt: T0 + 60_000 },
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
      version: 1,
      taskId: 'task-1',
      phase: 'focus',
      durationMs: DEFAULT_FOCUS_MS,
      segment: { status: 'paused', remainingMs: 7 * 60_000 },
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
