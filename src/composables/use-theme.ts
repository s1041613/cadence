import type { Task } from '@/types/task'

export interface Appearance {
  backgroundColor: string
  textColor: string
  icon: string | null
}

export interface Quadrant extends Appearance {
  key: 'do' | 'plan' | 'quick' | 'later'
  name: string
  description: string
  important: boolean
  urgent: boolean
}

export interface TaskTheme extends Appearance {
  isEvent: boolean
  quad?: Quadrant
}

// Quadrant tasks carry no glyph — the month/week/day views render the quad via the CdEventChip
// mini-icon (keyed off quad.key, see CdEventChip QUAD_ICON_SRC), never off theme.icon. Only event
// tasks have a user-picked icon (task.icon). So Appearance.icon stays null for quadrants.
export const QUADRANTS: Quadrant[] = [
  {
    key: 'do',
    name: '馬上做',
    description: '重要又緊急',
    important: true,
    urgent: true,
    backgroundColor: '#C56A5E',
    textColor: '#4A3318',
    icon: null
  },
  {
    key: 'plan',
    name: '排時間做',
    description: '重要不緊急',
    important: true,
    urgent: false,
    backgroundColor: '#6E839B',
    textColor: '#2A2D27',
    icon: null
  },
  {
    key: 'quick',
    name: '快速處理',
    description: '緊急不重要',
    important: false,
    urgent: true,
    backgroundColor: '#BFA86A',
    textColor: '#3E3845',
    icon: null
  },
  {
    key: 'later',
    name: '之後再說',
    description: '不重要不緊急',
    important: false,
    urgent: false,
    backgroundColor: '#9A988F',
    textColor: '#33403A',
    icon: null
  }
]

const FALLBACK_QUADRANT = QUADRANTS[3]!
const FALLBACK_EVENT_COLOR = '#6E839B'

export function quadrantOf(task: Pick<Task, 'important' | 'urgent'>): Quadrant {
  return QUADRANTS.find((q) => q.important === task.important && q.urgent === task.urgent) ?? FALLBACK_QUADRANT
}

// Single theme-resolution function: quadrant tasks derive their appearance at render time (nothing
// persisted); event tasks return their persisted appearance with textColor fixed to white.
export function themeOf(task: Task): TaskTheme {
  if (task.type === 'event') {
    return {
      backgroundColor: task.backgroundColor ?? FALLBACK_EVENT_COLOR,
      textColor: '#fff',
      icon: task.icon,
      isEvent: true
    }
  }
  const quad = quadrantOf(task)
  return {
    backgroundColor: quad.backgroundColor,
    textColor: quad.textColor,
    icon: quad.icon,
    isEvent: false,
    quad
  }
}
