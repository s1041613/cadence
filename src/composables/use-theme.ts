import type { Task } from '@/types/task'
import { DEFAULT_EVENT_COLOR, readableInkOn } from '@/components/v2/ui/event-colors'

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
//
// This array is the authority for quadrant colors, and the values stay literal hex on purpose:
// backgroundColor is written onto persisted event records (see completePromotion callers), so a
// var() reference here would store CSS syntax as data. There is no CSS mirror: the former
// --cd-quad-* / --cd-quad-*-ink tokens were deleted (see cadence-tokens.css), so read these
// colors from JS only — a stylesheet var() reference to them resolves to nothing.
//
// The four sit in the same pink family as the event palette (event-colors.ts), and they are
// separated by TEMPERATURE and intensity rather than by hue: hot pink for the urgent-and-
// important corner, coral for the merely urgent, orchid for the planned, dusty rose for the
// deferred. Every one carries the same deep-plum ink and clears 4.5:1 against its fill —
// quadrant chips render at 9px, so a mid-tone that only just works at 14px does not work here.
//
// Existing records keep whatever backgroundColor they were promoted with: this array is read at
// render time for quadrant tasks, but a promoted event stores the value it had at promotion.

/** The one ink all four quadrant fills carry; same value as the chips' CHIP_INK. */
const QUAD_INK = '#2A1420'

export const QUADRANTS: Quadrant[] = [
  {
    key: 'do',
    name: '馬上做',
    description: '重要又緊急',
    important: true,
    urgent: true,
    backgroundColor: '#EC5093',
    textColor: QUAD_INK,
    icon: null
  },
  {
    key: 'plan',
    name: '排時間做',
    description: '重要不緊急',
    important: true,
    urgent: false,
    backgroundColor: '#D98BC4',
    textColor: QUAD_INK,
    icon: null
  },
  {
    key: 'quick',
    name: '快速處理',
    description: '緊急不重要',
    important: false,
    urgent: true,
    backgroundColor: '#F4A9A0',
    textColor: QUAD_INK,
    icon: null
  },
  {
    key: 'later',
    name: '之後再說',
    description: '不重要不緊急',
    important: false,
    urgent: false,
    backgroundColor: '#C9A3B3',
    textColor: QUAD_INK,
    icon: null
  }
]

const FALLBACK_QUADRANT = QUADRANTS[3]!
const FALLBACK_EVENT_COLOR = DEFAULT_EVENT_COLOR

export function quadrantOf(task: Pick<Task, 'important' | 'urgent'>): Quadrant {
  return QUADRANTS.find((q) => q.important === task.important && q.urgent === task.urgent) ?? FALLBACK_QUADRANT
}

// Single theme-resolution function: quadrant tasks derive their appearance at render time (nothing
// persisted); event tasks return their persisted appearance, with the text colour measured against
// the fill rather than fixed to white — the palette runs from pale blossom to deep berry, and one
// fixed ink cannot stay legible across both ends.
export function themeOf(task: Task): TaskTheme {
  if (task.type === 'event') {
    const backgroundColor = task.backgroundColor ?? FALLBACK_EVENT_COLOR
    return {
      backgroundColor,
      textColor: readableInkOn(backgroundColor),
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
