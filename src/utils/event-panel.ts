import type { ReminderPreset } from '@/types/task'
import type { FirstDayName } from './convert-date-time'
import { monthGridCells } from './month-grid'

export interface CopyToDaysCell {
  date: string
  day: number
  disabled: boolean
}

export interface ReminderOption {
  value: ReminderPreset | null
  label: string
}

export const REMINDER_OPTIONS: ReminderOption[] = [
  { value: null, label: 'None' },
  { value: 'at-time', label: 'At time' },
  { value: '5-min', label: '5 min before' },
  { value: '15-min', label: '15 min before' },
  { value: '30-min', label: '30 min before' },
  { value: '1-hour', label: '1 hour before' },
  { value: '1-day', label: '1 day before' }
]

const REMINDER_LABELS = new Map(REMINDER_OPTIONS.map((option) => [option.value, option.label]))

export function reminderLabel(reminder: ReminderPreset | null): string {
  return REMINDER_LABELS.get(reminder) ?? 'None'
}

export function nextReminder(reminder: ReminderPreset | null): ReminderPreset | null {
  const index = REMINDER_OPTIONS.findIndex((option) => option.value === reminder)
  const next = (index + 1) % REMINDER_OPTIONS.length
  return REMINDER_OPTIONS[next]?.value ?? null
}

export function buildCopyToDaysCells(
  year: number,
  month: number,
  firstDay: FirstDayName,
  _sourceDate?: string
): Array<CopyToDaysCell | null> {
  const cells = monthGridCells(year, month, firstDay).map((cell) =>
    cell.outsideMonth ? null : { date: cell.date, day: cell.dayNum, disabled: false }
  )

  return [...cells, ...Array<null>(Math.max(0, 42 - cells.length)).fill(null)]
}
