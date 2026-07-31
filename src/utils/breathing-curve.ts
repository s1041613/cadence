// Pure maths for the breathing intro. The rAF loop that drives it stays in the component
// (it is animation, and a wrong frame is visible at a glance) — but the breath *count* is
// a state transition: miscount it and the user is stranded on the intro forever, so that
// part lives here where it can be tested.

/** One full inhale/exhale cycle, in radians of scroll phase. */
export const BREATH_CYCLE = 2 * Math.PI

/** Detects the inhale→exhale crossing that marks one completed breath.
 *
 *  `prevRising` is undefined on the very first frame, when there is no previous phase to
 *  compare against. Counting a breath there would credit one the user never took, so the
 *  first frame always yields 0 — it only seeds the comparison. */
export function countCompletedBreaths(prevRising: boolean | undefined, rising: boolean): 0 | 1 {
  if (prevRising === undefined) return 0
  return prevRising && !rising ? 1 : 0
}

export interface BreathingGeometry {
  readonly hillPath: string
  readonly charX: number
  readonly charY: number
  readonly charTransform: string
  readonly rising: boolean
  /** 0..1 — drives the ambient audio mix and the word opacity. */
  readonly breath: number
  readonly wordOpacity: string
}

export interface BreathingConstants {
  readonly viewHeight: number
  readonly size: number
  readonly centerX: number
  readonly period: number
  readonly base: number
  readonly amplitude: number
}

export const BREATHING_CONSTANTS: BreathingConstants = {
  viewHeight: 190,
  size: 34,
  centerX: 50,
  period: 100,
  base: 118,
  amplitude: 20
}

export function hillHeightAt(x: number, scroll: number, c = BREATHING_CONSTANTS): number {
  return c.base - c.amplitude * Math.sin((x / c.period) * Math.PI * 2 + scroll)
}

export function isRisingAt(scroll: number, c = BREATHING_CONSTANTS): boolean {
  return Math.cos((c.centerX / c.period) * Math.PI * 2 + scroll) > 0
}

/** Everything the SVG needs for one frame, derived purely from the scroll phase. */
export function breathingGeometry(scroll: number, c = BREATHING_CONSTANTS): BreathingGeometry {
  let hillPath = `M0 ${c.viewHeight} L0 ${hillHeightAt(0, scroll, c).toFixed(2)}`
  for (let x = 1; x <= 100; x++) hillPath += ` L${x} ${hillHeightAt(x, scroll, c).toFixed(2)}`
  hillPath += ` L100 ${c.viewHeight} Z`

  const y = hillHeightAt(c.centerX, scroll, c)
  const slope = (hillHeightAt(c.centerX + 2.5, scroll, c) - hillHeightAt(c.centerX - 2.5, scroll, c)) / 5
  const angle = (Math.atan(slope) * 180) / Math.PI
  const cy = y - c.size * 0.42
  const phase = (c.centerX / c.period) * Math.PI * 2 + scroll

  return {
    hillPath,
    charX: c.centerX - c.size / 2,
    charY: cy - c.size / 2,
    charTransform: `rotate(${angle.toFixed(2)} ${c.centerX} ${cy})`,
    rising: isRisingAt(scroll, c),
    breath: (Math.sin(phase) + 1) / 2,
    wordOpacity: (0.22 + Math.abs(slope) * 0.14).toFixed(2)
  }
}
