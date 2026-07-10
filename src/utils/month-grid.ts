// Pure month-grid cell generator: Monday-start 6x7 grid (42 cells), always including the full
// month plus leading/trailing days from adjacent months. Year carries correctly across the
// December/January boundary because it derives from `new Date(y, m, 1)` / `new Date(y, m + 1, 0)`,
// which normalize out-of-range month indices instead of needing manual carry logic.
export interface MonthGridCellDate {
  date: string // ISO YYYY-MM-DD
  dayNum: number
  dow: number // 0=Sun..6=Sat
  outsideMonth: boolean
}

import { addDays, iso, startOfWeek } from './convert-date-time'

export function monthGridCells(year: number, month: number): MonthGridCellDate[] {
  const first = new Date(year, month, 1)
  const gridStart = startOfWeek(first)
  return Array.from({ length: 42 }, (_, i) => {
    const d = addDays(gridStart, i)
    return {
      date: iso(d),
      dayNum: d.getDate(),
      dow: d.getDay(),
      outsideMonth: d.getMonth() !== month
    }
  })
}

// Steps a (year, month) pair by `delta` months, carrying the year across the Dec/Jan boundary.
export function stepMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const total = year * 12 + month + delta
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 }
}
