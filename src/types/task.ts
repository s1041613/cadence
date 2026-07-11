export type TaskType = 'quadrant' | 'event'
export type RepeatMode = 'none' | 'daily' | 'weekly' | 'monthly'
export type Texture = 'none' | 'dot' | 'cute'
export type ReminderPreset = 'at-time' | '5-min' | '15-min' | '30-min' | '1-hour' | '1-day'

export interface Task {
  id: string
  title: string
  date: string
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
  texture: Texture
  icon: string | null
  calendarId: string
  reminder: ReminderPreset | null
}
