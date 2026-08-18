import { endDateOf, spanDayCount, type DateSpan } from './convert-date-time'

/**
 * Month-grid lane layout: turns a flat list of entries into per-week bars, each one element
 * spanning every column it covers.
 *
 * A multi-day event used to be rendered as an independent chip in each day cell, which read as
 * several separate events. Two things have to be true for it to read as one: the bar must be a
 * single element wide enough to cross columns (the week row owns it, not the cell), and it must
 * occupy the same vertical slot on every day it covers — which is what a lane is. Assigning
 * lanes once per week, rather than per cell, is what makes that alignment hold.
 */

/** The fields the layout reads. Task satisfies this; tests pass literals. */
export interface LaneTask extends DateSpan {
  id: string
  allDay: boolean
  start: string
}

/** One entry clipped to one week row. */
export interface WeekBar<T> {
  task: T
  /** 0-6 column within this week row, already rotated by the first-day setting. */
  startCol: number
  /** Column count, 1-7. startCol + span never exceeds 7. */
  span: number
  /** Vertical slot; 0 is topmost. Constant across every day of the span. */
  lane: number
  /** The span reaches beyond this week row, so that end is cut rather than finished. */
  continuesLeft: boolean
  continuesRight: boolean
}

export interface WeekLayout<T> {
  bars: WeekBar<T>[]
  laneCount: number
}

export const DAYS_PER_WEEK = 7

/**
 * Cell geometry, in px. Shared so the grid's "how many lanes fit" arithmetic and the week row's
 * "where does lane N sit" arithmetic cannot drift apart.
 *
 * chipH tracks Pv2EventChip's type size (10px text x 1.25 line-height ≈ 12.5px, plus 2+2
 * padding, no border — the border was dropped along with the saturated-outline chip style).
 * headH tracks Pv2Cell's day-number pill (24px). Change either component's size without
 * changing this and every cell silently fits one chip (or misjudges the head offset) too many
 * or too few.
 */
export const CELL = { padTop: 4, padBottom: 5, headGap: 3, headH: 24, chipH: 17, chipGap: 2 } as const

/** Vertical offset of the bar overlay from the top of a week row. */
export const BARS_TOP = CELL.padTop + CELL.headH + CELL.headGap

/** Top offset of a lane within the overlay. */
export const laneTop = (lane: number): number => lane * (CELL.chipH + CELL.chipGap)

/** Splits the flat month grid into week rows. Input length is always a multiple of seven. */
export function weekRows<T>(cells: readonly T[]): T[][] {
  const rows: T[][] = []
  for (let i = 0; i < cells.length; i += DAYS_PER_WEEK) rows.push(cells.slice(i, i + DAYS_PER_WEEK))
  return rows
}

/**
 * Display order for entries sharing a day. The grid's lane assignment and the day sheet's list
 * both sort with this, so the two surfaces cannot disagree about what comes first.
 *
 * Dates are 'YYYY-MM-DD' strings: compare them with localeCompare, never subtraction. `a - b` on
 * strings is NaN, which is falsy, so `||` would fall straight through to the next key and the
 * start-date ordering — the thing lane stability rests on — would silently vanish.
 */
export const compareForLane = (a: LaneTask, b: LaneTask): number =>
  a.date.localeCompare(b.date) ||
  // Longer first: a long bar claims a whole lane, letting shorter entries share the lanes below
  // it rather than being displaced in only some columns.
  spanDayCount(b) - spanDayCount(a) ||
  Number(b.allDay) - Number(a.allDay) ||
  (a.start || '').localeCompare(b.start || '') ||
  // Last resort, so the result is a function of the data and not of store insertion order.
  a.id.localeCompare(b.id)

/**
 * Lays out one week row: clips each intersecting entry to the week, then packs the results into
 * the lowest free lane.
 *
 * `weekDates` is the week's seven ISO dates left to right, straight from the month grid — so
 * column indices come from array position and the first-day-of-week setting is honoured without
 * this code ever touching getDay().
 */
export function layoutWeek<T extends LaneTask>(tasks: readonly T[], weekDates: readonly string[]): WeekLayout<T> {
  const weekStart = weekDates[0]!
  const weekEnd = weekDates[weekDates.length - 1]!

  const candidates: WeekBar<T>[] = []
  for (const task of tasks) {
    const taskEnd = endDateOf(task)
    // Range intersection, not one spansDate call per day: this runs for every week of every
    // month render.
    if (taskEnd < weekStart || task.date > weekEnd) continue

    const continuesLeft = task.date < weekStart
    const continuesRight = taskEnd > weekEnd
    const startCol = continuesLeft ? 0 : weekDates.indexOf(task.date)
    const endCol = continuesRight ? weekDates.length - 1 : weekDates.indexOf(taskEnd)

    candidates.push({ task, startCol, span: endCol - startCol + 1, lane: 0, continuesLeft, continuesRight })
  }

  // candidates holds bars, not tasks, so unwrap before comparing — compareForLane takes the entry.
  candidates.sort((a, b) => compareForLane(a.task, b.task))

  const occupied: boolean[][] = []
  for (const bar of candidates) {
    const cols = Array.from({ length: bar.span }, (_, i) => bar.startCol + i)
    let lane = 0
    for (;;) {
      if (lane === occupied.length) occupied.push(Array<boolean>(DAYS_PER_WEEK).fill(false))
      const row = occupied[lane]!
      if (cols.every((c) => !row[c])) {
        cols.forEach((c) => (row[c] = true))
        break
      }
      lane += 1
    }
    bar.lane = lane
  }

  return { bars: candidates, laneCount: occupied.length }
}

/** Just enough of a bar to decide whether it fits. */
type PlacedBar = Pick<WeekBar<unknown>, 'lane' | 'startCol' | 'span'>

export interface HiddenLayout {
  visibleLanes: number
  /** Per column, how many bars are cut off — the number the "+N" affordance shows. */
  hiddenPerDay: number[]
}

/**
 * Decides how many lanes actually render and how many entries that hides on each day.
 *
 * The "+N" row occupies a lane's worth of height, so it can only be afforded by giving one up —
 * which may itself push another bar out of view. Hence the second count against the reduced
 * budget rather than the original.
 */
export function computeHidden(bars: readonly PlacedBar[], maxLanes: number): HiddenLayout {
  const countHidden = (threshold: number): number[] => {
    const perDay = Array<number>(DAYS_PER_WEEK).fill(0)
    for (const bar of bars) {
      if (bar.lane < threshold) continue
      for (let c = bar.startCol; c < bar.startCol + bar.span; c += 1) perDay[c] = (perDay[c] ?? 0) + 1
    }
    return perDay
  }

  const ifAllFit = countHidden(maxLanes)
  if (ifAllFit.every((n) => n === 0)) return { visibleLanes: maxLanes, hiddenPerDay: ifAllFit }

  const visibleLanes = Math.max(1, maxLanes - 1)
  return { visibleLanes, hiddenPerDay: countHidden(visibleLanes) }
}
