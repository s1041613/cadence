import { describe, it, expect } from 'vitest'
import { addDays, daysBetween, iso, parseISO } from './convert-date-time'

// Spec axis [INFERRED]: moving ENDS before STARTS is specified to pull the start back and
// preserve the span's length. The card emits update:endDate FIRST and update:date second,
// while the host's endDate setter deletes the field whenever the value is <= the start —
// so the claim is that the span collapses instead of shifting.
//
// This reproduces the exact two-emit sequence against a stand-in for the host's draft.

type Draft = { date: string; endDate?: string }

// Mirrors EventComposerOverlay.setDraftDate / setDraftEndDate.
function makeHost(initial: Draft) {
  const draft: Draft = { ...initial }
  return {
    draft,
    setDate(value: string): void {
      draft.date = value
      if (draft.endDate !== undefined && draft.endDate <= value) delete draft.endDate
    },
    setEndDate(value: string): void {
      if (value <= draft.date) delete draft.endDate
      else draft.endDate = value
    }
  }
}

// Mirrors Pv2EventEditCard.commitDate, including its emit ORDER.
function commitDate(
  props: { date: string; endDate: string },
  edge: 'start' | 'end',
  value: string,
  host: ReturnType<typeof makeHost>
): void {
  const spanDays = Math.max(0, daysBetween(props.date, props.endDate))
  if (edge === 'start') {
    host.setDate(value)
    if (props.endDate < value) host.setEndDate(iso(addDays(parseISO(value), spanDays)))
    return
  }
  if (value < props.date) host.setDate(iso(addDays(parseISO(value), -spanDays)))
  host.setEndDate(value)
}

describe('commitDate through the composer host', () => {
  it('preserves the span length when the end is dragged before the start', () => {
    // A three-day event, 10th to 12th. Dragging ENDS back to the 8th should carry the start
    // to the 6th and keep three days, per the spec's "保持 span 長度".
    const host = makeHost({ date: '2026-07-10', endDate: '2026-07-12' })
    commitDate({ date: '2026-07-10', endDate: '2026-07-12' }, 'end', '2026-07-08', host)

    expect(host.draft.date).toBe('2026-07-06')
    expect(host.draft.endDate).toBe('2026-07-08')
  })

  it('carries the end when the start is dragged past it', () => {
    const host = makeHost({ date: '2026-07-10', endDate: '2026-07-12' })
    commitDate({ date: '2026-07-10', endDate: '2026-07-12' }, 'start', '2026-07-20', host)

    expect(host.draft.date).toBe('2026-07-20')
    expect(host.draft.endDate).toBe('2026-07-22')
  })

  it('drops the end date when the span is shortened to a single day', () => {
    const host = makeHost({ date: '2026-07-10', endDate: '2026-07-12' })
    commitDate({ date: '2026-07-10', endDate: '2026-07-12' }, 'end', '2026-07-10', host)

    expect(host.draft.date).toBe('2026-07-10')
    expect(host.draft).not.toHaveProperty('endDate')
  })
})
