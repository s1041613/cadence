import { describe, it, expect, vi } from 'vitest'
import { makeFocusChime } from './make-focus-chime'

// The oscillator graph itself is not worth asserting on — node has no Web Audio and a
// mock deep enough to "verify" the sound would only be testing itself. What matters is
// the lifecycle contract: unlock before play, survive a rejected resume, close on dispose.
function createFakeContext(state: AudioContextState = 'suspended') {
  const ctx = {
    state,
    currentTime: 0,
    destination: {},
    resume: vi.fn(() => {
      ctx.state = 'running'
      return Promise.resolve()
    }),
    close: vi.fn(() => Promise.resolve()),
    createOscillator: vi.fn(() => ({
      type: '',
      frequency: { setValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null
    })),
    createGain: vi.fn(() => ({
      gain: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn()
      },
      connect: vi.fn(),
      disconnect: vi.fn()
    }))
  }
  return ctx
}

describe('makeFocusChime', () => {
  it('does not create a context until unlocked', () => {
    const factory = vi.fn(() => createFakeContext() as unknown as AudioContext)
    makeFocusChime(factory)
    expect(factory).not.toHaveBeenCalled()
  })

  it('resumes a suspended context on unlock', () => {
    const ctx = createFakeContext('suspended')
    const chime = makeFocusChime(() => ctx as unknown as AudioContext)

    chime.unlock()

    expect(ctx.resume).toHaveBeenCalled()
    expect(chime.unlocked).toBe(true)
  })

  it('reuses one context across repeated unlocks', () => {
    const factory = vi.fn(() => createFakeContext() as unknown as AudioContext)
    const chime = makeFocusChime(factory)

    chime.unlock()
    chime.unlock()

    expect(factory).toHaveBeenCalledTimes(1)
  })

  it('plays once the context is running', () => {
    const ctx = createFakeContext('running')
    const chime = makeFocusChime(() => ctx as unknown as AudioContext)

    chime.unlock()
    chime.play('focusEnd')

    expect(ctx.createOscillator).toHaveBeenCalled()
  })

  it('uses a distinct motif per sound so they can be told apart', () => {
    const ctx = createFakeContext('running')
    const chime = makeFocusChime(() => ctx as unknown as AudioContext)
    chime.unlock()

    chime.play('focusEnd')
    const focusEndNotes = ctx.createOscillator.mock.calls.length
    ctx.createOscillator.mockClear()

    chime.play('allDone')
    expect(ctx.createOscillator.mock.calls.length).not.toBe(focusEndNotes)
  })

  // A session restored by reload can expire before the user touches anything, so
  // resume() may reject. That must not throw or leave the chime broken.
  it('stays silent without throwing when resume is rejected', () => {
    const ctx = createFakeContext('suspended')
    ctx.resume = vi.fn(() => Promise.reject(new Error('autoplay blocked')))
    const chime = makeFocusChime(() => ctx as unknown as AudioContext)

    expect(() => {
      chime.unlock()
      chime.play('focusEnd')
    }).not.toThrow()

    expect(ctx.createOscillator).not.toHaveBeenCalled()
    expect(chime.unlocked).toBe(false)
  })

  it('reports itself locked before any unlock', () => {
    const chime = makeFocusChime(() => createFakeContext() as unknown as AudioContext)
    expect(chime.unlocked).toBe(false)
  })

  it('drops a play that happens while still locked', () => {
    const ctx = createFakeContext('suspended')
    ctx.resume = vi.fn(() => Promise.reject(new Error('blocked')))
    const chime = makeFocusChime(() => ctx as unknown as AudioContext)

    chime.play('restEnd')

    expect(ctx.createOscillator).not.toHaveBeenCalled()
  })

  it('closes the context on dispose', () => {
    const ctx = createFakeContext('running')
    const chime = makeFocusChime(() => ctx as unknown as AudioContext)
    chime.unlock()

    chime.dispose()

    expect(ctx.close).toHaveBeenCalled()
    expect(chime.unlocked).toBe(false)
  })

  it('does not resurrect a context after dispose', () => {
    const factory = vi.fn(() => createFakeContext('running') as unknown as AudioContext)
    const chime = makeFocusChime(factory)
    chime.unlock()

    chime.dispose()
    chime.unlock()
    chime.play('focusEnd')

    expect(factory).toHaveBeenCalledTimes(1)
  })

  it('tolerates dispose before anything was created', () => {
    const chime = makeFocusChime(() => createFakeContext() as unknown as AudioContext)
    expect(() => chime.dispose()).not.toThrow()
  })
})
