import type { QuickAddState } from '@/stores/ui-store'

// The date/time half of QuickAddPopover's seed, lifted out of the component so it can be
// tested: vitest runs `environment: 'node'` (vitest.config.ts), so the SFC itself cannot be
// mounted. The constant resets (title, colour, reminder) stay in the component — this is the
// part that carries the click's context, and the part that was silently dropping it.
export interface QuickAddSeed {
  allDay: boolean
  date: string
  /** Inclusive end date. A freshly opened quick-add is always single-day, so it starts on `date`. */
  endDate: string
  start: string
  end: string
}

// A month cell carries no time (QuickAddState.time === null) and means all-day; the fallbacks
// only exist for that case, since the day/week grids always pass a rounded range.
export function quickAddSeed(pop: QuickAddState): QuickAddSeed {
  return {
    allDay: pop.time === null,
    date: pop.date,
    endDate: pop.date,
    start: pop.time ?? '09:00',
    end: pop.endTime ?? '10:00'
  }
}
