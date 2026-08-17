export type TaskType = 'quadrant' | 'event'
export type RepeatMode = 'none' | 'daily' | 'weekly' | 'monthly'
export type ReminderPreset = 'at-time' | '5-min' | '15-min' | '30-min' | '1-hour' | '1-day'

export interface Task {
  id: string
  title: string
  /** Inclusive start date, 'YYYY-MM-DD'. */
  date: string
  /** Inclusive END date. Absent — or equal to `date` — means a single-day entry. Never before
   * `date`: the mapper and the edit card both normalize, so readers can compare it directly.
   * Read it through endDateOf() rather than touching it, which keeps the absent case in one place. */
  endDate?: string
  start: string
  end: string
  allDay: boolean
  location: string
  repeat: RepeatMode
  notes: string
  important: boolean
  urgent: boolean
  done: boolean
  estimatedPomodoros: number
  completedPomodoros: number
  type: TaskType
  backgroundColor: string | null
  icon: string | null
  calendarId: string
  reminder: ReminderPreset | null
  /** Event author (events.owner_id). Absent on locally created tasks — the creator is always the
   * current user, so absence means "own task". Foreign ownerId gates the UI to read-only (RLS
   * only lets the author write the row). */
  ownerId?: string
}
