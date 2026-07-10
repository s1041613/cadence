// Lane assignment for overlapping time-grid events (CdTimeGrid / CdEventBlock).
// Ported from the CADENCE prototype's `_timeGrid` lane algorithm (design-research-report.md §3.6):
// overlapping events split into side-by-side columns, "Google/Apple style".
//
// Algorithm: scan events sorted by start time, grouping into clusters of
// transitively-overlapping events (a cluster ends once an event starts at or after
// the running max end of everything seen so far). Within each cluster, greedily
// assign each event the lowest-numbered lane whose previous occupant has already
// ended by the time this event starts. The lane count for every event in the
// cluster is the total number of lanes used by that cluster.

export interface LaneInput {
  /** Stable identifier used as the key into the returned layout map. */
  id: string
  /** Start time in minutes from midnight. */
  s: number
  /** End time in minutes from midnight. */
  e: number
}

export interface LaneAssignment {
  lane: number
  cols: number
}

/**
 * Assigns lane/cols to each event for absolute-positioned side-by-side rendering.
 * Input does not need to be pre-sorted — this function sorts a copy by start time.
 * Returns a map keyed by `id` (not affected by input order or duplicate id collisions
 * beyond "last one wins" for the layout map, matching how the prototype indexed by
 * array index).
 */
export function assignLanes(events: LaneInput[]): Record<string, LaneAssignment> {
  const layout: Record<string, LaneAssignment> = {}
  const sorted = [...events].sort((a, b) => a.s - b.s)

  let cluster: LaneInput[] = []
  let clusterEnd = -1

  const flush = (): void => {
    if (!cluster.length) return
    const laneEnds: number[] = [] // laneEnds[k] = end minute of the last event placed in lane k
    const assigned = new Map<LaneInput, number>()
    cluster.forEach((ev) => {
      let k = laneEnds.findIndex((end) => ev.s >= end)
      if (k === -1) {
        k = laneEnds.length
        laneEnds.push(0)
      }
      laneEnds[k] = ev.e
      assigned.set(ev, k)
    })
    const cols = laneEnds.length
    cluster.forEach((ev) => {
      layout[ev.id] = { lane: assigned.get(ev)!, cols }
    })
    cluster = []
    clusterEnd = -1
  }

  for (const ev of sorted) {
    if (cluster.length && ev.s >= clusterEnd) flush()
    cluster.push(ev)
    clusterEnd = Math.max(clusterEnd, ev.e)
  }
  flush()

  return layout
}
