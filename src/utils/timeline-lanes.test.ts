import { describe, expect, it } from 'vitest'
import { assignLanes } from './timeline-lanes'

describe('assignLanes', () => {
  it('gives every event a single lane when nothing overlaps', () => {
    const layout = assignLanes([
      { id: 'a', s: 9 * 60, e: 10 * 60 },
      { id: 'b', s: 10 * 60, e: 11 * 60 },
      { id: 'c', s: 12 * 60, e: 13 * 60 }
    ])
    expect(layout.a).toEqual({ lane: 0, cols: 1 })
    expect(layout.b).toEqual({ lane: 0, cols: 1 })
    expect(layout.c).toEqual({ lane: 0, cols: 1 })
  })

  it('splits two overlapping events into two side-by-side lanes', () => {
    // Prototype demo data: "Deep work 14:00-16:00" and "Dentist 14:30-15:00" deliberately overlap.
    const layout = assignLanes([
      { id: 'deep-work', s: 14 * 60, e: 16 * 60 },
      { id: 'dentist', s: 14 * 60 + 30, e: 15 * 60 }
    ])
    expect(layout['deep-work']!.cols).toBe(2)
    expect(layout.dentist!.cols).toBe(2)
    expect(layout['deep-work']!.lane).not.toBe(layout.dentist!.lane)
  })

  it('starts a fresh cluster once an event starts at/after the running cluster end', () => {
    // a: 9-10, b: 9:30-10:30 (overlaps a -> cluster of 2 lanes).
    // c: 10:30-11 starts exactly when the cluster's max end (b's 10:30) is reached,
    // so per the prototype's flush condition (`ev.s >= clusterEnd`) c begins a brand-new
    // cluster and gets its own single lane, even though it also doesn't overlap b in time.
    const layout = assignLanes([
      { id: 'a', s: 9 * 60, e: 10 * 60 },
      { id: 'b', s: 9 * 60 + 30, e: 10 * 60 + 30 },
      { id: 'c', s: 10 * 60 + 30, e: 11 * 60 }
    ])
    expect(layout.a!.cols).toBe(2)
    expect(layout.b!.cols).toBe(2)
    expect(layout.a!.lane).not.toBe(layout.b!.lane)
    expect(layout.c).toEqual({ lane: 0, cols: 1 })
  })

  it('assigns 3 lanes for three mutually overlapping events', () => {
    const layout = assignLanes([
      { id: 'a', s: 9 * 60, e: 11 * 60 },
      { id: 'b', s: 9 * 60 + 15, e: 10 * 60 + 45 },
      { id: 'c', s: 9 * 60 + 30, e: 10 * 60 + 30 }
    ])
    const lanes = new Set([layout.a!.lane, layout.b!.lane, layout.c!.lane])
    expect(lanes.size).toBe(3)
    expect(layout.a!.cols).toBe(3)
  })

  it('separates non-overlapping clusters independently', () => {
    const layout = assignLanes([
      { id: 'a', s: 9 * 60, e: 10 * 60 },
      { id: 'b', s: 9 * 60 + 15, e: 9 * 60 + 45 }, // overlaps a -> cluster 1, 2 lanes
      { id: 'c', s: 14 * 60, e: 15 * 60 },
      { id: 'd', s: 14 * 60 + 10, e: 14 * 60 + 50 }, // overlaps c -> cluster 2, 2 lanes
      { id: 'e', s: 14 * 60 + 20, e: 14 * 60 + 40 } // overlaps c and d -> cluster 2, 3 lanes
    ])
    expect(layout.a!.cols).toBe(2)
    expect(layout.b!.cols).toBe(2)
    expect(layout.c!.cols).toBe(3)
    expect(layout.d!.cols).toBe(3)
    expect(layout.e!.cols).toBe(3)
  })

  it('handles unsorted input identically to sorted input', () => {
    const events = [
      { id: 'c', s: 12 * 60, e: 13 * 60 },
      { id: 'a', s: 9 * 60, e: 10 * 60 },
      { id: 'b', s: 9 * 60 + 30, e: 10 * 60 + 30 }
    ]
    const layout = assignLanes(events)
    expect(layout.a!.cols).toBe(2)
    expect(layout.b!.cols).toBe(2)
    expect(layout.c!.cols).toBe(1)
  })

  it('returns an empty layout for an empty input', () => {
    expect(assignLanes([])).toEqual({})
  })

  it('handles a single event', () => {
    const layout = assignLanes([{ id: 'solo', s: 60, e: 120 }])
    expect(layout.solo).toEqual({ lane: 0, cols: 1 })
  })

  it('does not treat back-to-back events (touching endpoints) as needing extra lanes when only two exist', () => {
    const layout = assignLanes([
      { id: 'a', s: 9 * 60, e: 10 * 60 },
      { id: 'b', s: 10 * 60, e: 11 * 60 }
    ])
    expect(layout.a).toEqual({ lane: 0, cols: 1 })
    expect(layout.b).toEqual({ lane: 0, cols: 1 })
  })
})
