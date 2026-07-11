// Pure month-grid cell generator: rows just enough to cover the full month (5 or 6 weeks),
// including leading/trailing days from adjacent months to fill each week — matching CADENCE
// Handoff.dc.html's _calRows, which stops padding once the last week is complete instead of
// always emitting a 6th row. Year carries correctly across the December/January boundary because
// it derives from `new Date(y, m, 1)` / `new Date(y, m + 1, 0)`, which normalize out-of-range
// month indices instead of needing manual carry logic.
export interface MonthGridCellDate {
  date: string // ISO YYYY-MM-DD
  dayNum: number
  dow: number // 0=Sun..6=Sat
  outsideMonth: boolean
}

import { addDays, iso, startOfWeek, type FirstDayName } from './convert-date-time'

export function monthGridCells(year: number, month: number, firstDay?: FirstDayName): MonthGridCellDate[] {
  const first = new Date(year, month, 1)
  const gridStart = startOfWeek(first, firstDay)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  const daysFromGridStart = Math.round((lastDayOfMonth.getTime() - gridStart.getTime()) / 86400000) + 1
  const cellCount = Math.ceil(daysFromGridStart / 7) * 7
  return Array.from({ length: cellCount }, (_, i) => {
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
