import type { Task } from '@/types/task'

export interface Appearance {
  backgroundColor: string
  textColor: string
  icon: string | null
}

export interface Quadrant extends Appearance {
  key: 'do' | 'plan' | 'quick' | 'later'
  name: string
  /** The English label. Not a translation of `name` — the two are the app's two registers, and
   *  surfaces pick the one that matches their own copy (the v2 pickers and the Notebook card are
   *  English; the older popovers show `name`). Kept here rather than re-declared per component:
   *  Pv2EventEditCard, CdEventEditCard and CdDraftDrawer each carried an identical private copy
   *  of these four strings, which is exactly how the four spellings drift apart. */
  enName: string
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
export const QUADRANTS: Quadrant[] = [
  {
    key: 'do',
    name: '馬上做',
    enName: 'Do Now',
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
    enName: 'Plan',
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
    enName: 'Quick',
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
    enName: 'Later',
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

/** The two axes that identify a quadrant. Named rather than written as Pick<Task, …> because
 *  notes carry the same pair and are not tasks — the matrix is a property of the encoding, not
 *  of the record type that happens to use it. */
export interface QuadrantAxes {
  important: boolean
  urgent: boolean
}

export function quadrantOf(axes: QuadrantAxes): Quadrant {
  return QUADRANTS.find((q) => q.important === axes.important && q.urgent === axes.urgent) ?? FALLBACK_QUADRANT
}

/** The quadrant after this one, wrapping. Order is QUADRANTS' own order (do → plan → quick →
 *  later), so a control that cycles moves through the matrix in the same sequence the pickers
 *  list it in. Returns the axes rather than the Quadrant: callers persist the pair. */
export function nextQuadrantAxes(axes: QuadrantAxes): QuadrantAxes {
  const index = QUADRANTS.findIndex((q) => q.important === axes.important && q.urgent === axes.urgent)
  // -1 (an unreachable pair) lands on QUADRANTS[0], which is the useful answer: cycling from an
  // unrecognized state should reach a known one rather than stick.
  const next = QUADRANTS[(index + 1) % QUADRANTS.length]!
  return { important: next.important, urgent: next.urgent }
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
