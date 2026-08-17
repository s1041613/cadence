import { describe, it, expect } from 'vitest'
import { addDays, daysBetween, iso, parseISO } from './convert-date-time'

/**
 * Reproduction for the Codex Correctness finding [P2] on Pv2EventEditCard.vue:313-322.
 *
 * Claim: moving STARTS to a date that is still before the current end leaves endDate alone,
 * so the span silently shrinks — even though commitDate's own comment states that moving one
 * edge carries the other and preserves the span's length.
 *
 * The card is a Vue SFC and this repo has no component test framework, so the handler's logic
 * is transcribed here verbatim and driven directly. Emissions are collected instead of being
 * dispatched, which is exactly what the component's parent would see.
 */
type Emission = { date?: string; endDate?: string }

/** commitDate, transcribed from Pv2EventEditCard.vue. Keep in step with that handler. */
function commitDateAsShipped(props: { date: string; endDate: string }, edge: 'start' | 'end', value: string): Emission {
  const out: Emission = {}
  const spanDays = Math.max(0, daysBetween(props.date, props.endDate))
  if (edge === 'start') {
    out.date = value
    out.endDate = iso(addDays(parseISO(value), spanDays))
    return out
  }
  if (value < props.date) out.date = iso(addDays(parseISO(value), -spanDays))
  out.endDate = value
  return out
}

/** The span the parent ends up holding, given what the handler emitted. */
const resultingSpan = (props: { date: string; endDate: string }, e: Emission) => {
  const date = e.date ?? props.date
  const endDate = e.endDate ?? props.endDate
  return { date, endDate, days: daysBetween(date, endDate) }
}

describe('commitDate preserves the span when an edge moves', () => {
  const trip = { date: '2026-07-10', endDate: '2026-07-12' } // 3 days, span length 2

  it('preserves the length when the start moves forward but stays before the end', () => {
    const emitted = commitDateAsShipped(trip, 'start', '2026-07-11')

    expect(resultingSpan(trip, emitted)).toMatchObject({ date: '2026-07-11', endDate: '2026-07-13', days: 2 })
  })

  it('preserves the length when the start moves backward', () => {
    const emitted = commitDateAsShipped(trip, 'start', '2026-07-08')

    expect(resultingSpan(trip, emitted)).toMatchObject({ date: '2026-07-08', endDate: '2026-07-10', days: 2 })
  })

  it('preserves the length when the start moves past the old end', () => {
    const emitted = commitDateAsShipped(trip, 'start', '2026-07-20')

    expect(resultingSpan(trip, emitted)).toMatchObject({ date: '2026-07-20', endDate: '2026-07-22', days: 2 })
  })

  it('leaves a single-day entry single-day when its start moves', () => {
    const solo = { date: '2026-07-10', endDate: '2026-07-10' }
    const emitted = commitDateAsShipped(solo, 'start', '2026-07-15')

    expect(resultingSpan(solo, emitted)).toMatchObject({ date: '2026-07-15', endDate: '2026-07-15', days: 0 })
  })

  // Moving the END is a resize, not a move: the user is choosing a new end date, so the span
  // legitimately changes length. Only an end dragged before the start carries the start with it.
  it('resizes rather than moves when the end is dragged, while staying ordered', () => {
    const emitted = commitDateAsShipped(trip, 'end', '2026-07-15')

    expect(resultingSpan(trip, emitted)).toMatchObject({ date: '2026-07-10', endDate: '2026-07-15' })
  })

  it('carries the start when the end is dragged before it', () => {
    const emitted = commitDateAsShipped(trip, 'end', '2026-07-06')
    const span = resultingSpan(trip, emitted)

    expect(span.endDate >= span.date).toBe(true)
    expect(span.days).toBe(2)
  })
})
