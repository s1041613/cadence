// End-of-phase chimes.
//
// This module owns its OWN AudioContext and connects straight to ctx.destination.
// It deliberately does NOT share make-focus-audio's context. That one is unusable for
// alerts: fadeOut() ramps its master gain to 0 and never restores it — and it is called
// the moment the timer starts — while pause() suspends the whole context. A chime routed
// through that graph would be silent exactly when it matters. Do not "helpfully" merge
// these two modules.

export type ChimeSound = 'focusEnd' | 'restEnd' | 'allDone'

export interface FocusChime {
  /** Must be called from inside a user-gesture handler. Idempotent and cheap. */
  unlock(): void
  /** Plays if unlocked; a no-op (never a throw) while the context is still blocked. */
  play(sound: ChimeSound): void
  /** True once the context reached 'running' — drives the "tap to enable sound" hint. */
  readonly unlocked: boolean
  dispose(): void
}

type ContextFactory = () => AudioContext

/** Each sound is a short two-note motif; the interval is what makes them tellable apart
 *  without looking at the screen. Frequencies are in Hz, offsets/durations in seconds. */
const MOTIFS: Record<ChimeSound, readonly { freq: number; at: number; dur: number }[]> = {
  // Rising major third: "work is done, go rest".
  focusEnd: [
    { freq: 660, at: 0, dur: 0.28 },
    { freq: 830, at: 0.16, dur: 0.34 }
  ],
  // Falling third: "break is over, back to it".
  restEnd: [
    { freq: 830, at: 0, dur: 0.24 },
    { freq: 620, at: 0.15, dur: 0.32 }
  ],
  // Three rising notes: unmistakably the end of the whole task.
  allDone: [
    { freq: 660, at: 0, dur: 0.22 },
    { freq: 830, at: 0.15, dur: 0.22 },
    { freq: 990, at: 0.3, dur: 0.44 }
  ]
}

function defaultFactory(): AudioContext {
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  return new Ctor()
}

export function makeFocusChime(createContext: ContextFactory = defaultFactory): FocusChime {
  let ctx: AudioContext | null = null
  let disposed = false

  // Created lazily on first unlock() rather than at module load, so we never hold an
  // AudioContext for a user who has not started a session. Safari in particular is
  // strict about how many contexts may exist at once.
  const ensure = (): AudioContext | null => {
    if (disposed) return null
    if (ctx === null) ctx = createContext()
    return ctx
  }

  const tryResume = (c: AudioContext): void => {
    if (c.state !== 'suspended') return
    // resume() rejects when called outside a user gesture. That is an expected outcome
    // after a reload, not an error worth surfacing — the caller stays "locked" and the
    // UI shows a hint instead.
    void Promise.resolve(c.resume()).catch(() => undefined)
  }

  return {
    unlock() {
      const c = ensure()
      if (c === null) return
      tryResume(c)
    },

    play(sound) {
      const c = ensure()
      if (c === null) return
      tryResume(c)
      // Still blocked by autoplay policy — drop the chime rather than throwing. This
      // happens for a session restored by reload that expires before any interaction.
      if (c.state !== 'running') return

      const start = c.currentTime
      for (const note of MOTIFS[sound]) {
        const osc = c.createOscillator()
        const gain = c.createGain()
        const at = start + note.at

        osc.type = 'sine'
        osc.frequency.setValueAtTime(note.freq, at)

        // Short attack then exponential decay: a bell-ish shape with no click.
        gain.gain.setValueAtTime(0, at)
        gain.gain.linearRampToValueAtTime(0.18, at + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, at + note.dur)

        osc.connect(gain)
        gain.connect(c.destination)
        osc.start(at)
        osc.stop(at + note.dur + 0.02)
        osc.onended = () => {
          try {
            gain.disconnect()
          } catch {
            // already torn down
          }
        }
      }
    },

    get unlocked() {
      return ctx !== null && ctx.state === 'running'
    },

    dispose() {
      disposed = true
      if (ctx === null) return
      const c = ctx
      ctx = null
      void Promise.resolve(c.close()).catch(() => undefined)
    }
  }
}
