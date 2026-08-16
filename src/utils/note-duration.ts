/** Duration model for a Notebook note's stepper. Minutes throughout — the control moves in
 *  exact 15-minute increments, and integer minutes stay exact where fractional hours do not. */

/** Floor and ceiling of the stepper, mirrored by the notes_duration_min_range check constraint. */
export const MIN_DURATION = 15
export const MAX_DURATION = 480
export const DURATION_STEP = 15

/** Presets the clock button cycles through. Coarser as they grow: past two hours, the
 *  difference between 2h and 2h15m is not a distinction worth a stop on the cycle, whereas
 *  the same 15 minutes matters a great deal at the short end. The ± buttons still reach every
 *  15-minute value in between — this list is the fast path, not the set of legal values. */
export const DURATION_PRESETS = [15, 30, 45, 60, 75, 90, 105, 120, 150, 180, 240]

/** Formats as the design labels it: "15m", "1h", "1h 30m". Hours are omitted when zero and
 *  minutes when zero, so no value ever renders a "0h" or "0m" limb. */
export function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60
  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

/** Clamps to the stepper's range and snaps onto the 15-minute grid, so a value that arrived
 *  off-grid (an older row, a hand-edited record) is corrected rather than propagated. */
export function clampDuration(totalMinutes: number): number {
  const snapped = Math.round(totalMinutes / DURATION_STEP) * DURATION_STEP
  return Math.min(MAX_DURATION, Math.max(MIN_DURATION, snapped))
}

/** One ± press. Returns the clamped neighbour; at a boundary that is the current value, which
 *  is what lets the card grey out the − glyph without duplicating the range check. */
export function stepDuration(totalMinutes: number, direction: 1 | -1): number {
  return clampDuration(totalMinutes + direction * DURATION_STEP)
}

/** The next preset strictly above the current value, wrapping to the first at the top.
 *  Strictly above, not "next in the list": the ± buttons can leave the value between presets
 *  (say 65m), and the cycle should advance from there rather than snap backwards to 60m. */
export function nextPreset(totalMinutes: number): number {
  return DURATION_PRESETS.find((preset) => preset > totalMinutes) ?? DURATION_PRESETS[0]!
}
