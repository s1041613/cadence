import type { Task, Texture } from '@/types/task'

export interface Appearance {
  backgroundColor: string
  textColor: string
  texture: Texture
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

const DO_ICON =
  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4 14h6l-1 8 9-12h-6z"/></svg>'
const PLAN_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>'
const QUICK_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 11-6.2-8.5M21 4v5h-5"/></svg>'
const LATER_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h12M6 21h12M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9"/></svg>'

export const QUADRANTS: Quadrant[] = [
  {
    key: 'do',
    name: '馬上做',
    description: '重要又緊急',
    important: true,
    urgent: true,
    backgroundColor: '#E3A75C',
    textColor: '#4A3318',
    texture: 'none',
    icon: DO_ICON
  },
  {
    key: 'plan',
    name: '排時間做',
    description: '重要不緊急',
    important: true,
    urgent: false,
    backgroundColor: '#8C928B',
    textColor: '#2A2D27',
    texture: 'none',
    icon: PLAN_ICON
  },
  {
    key: 'quick',
    name: '快速處理',
    description: '緊急不重要',
    important: false,
    urgent: true,
    backgroundColor: '#D6C7DB',
    textColor: '#3E3845',
    texture: 'none',
    icon: QUICK_ICON
  },
  {
    key: 'later',
    name: '之後再說',
    description: '不重要不緊急',
    important: false,
    urgent: false,
    backgroundColor: '#C6CDBC',
    textColor: '#33403A',
    texture: 'dot',
    icon: LATER_ICON
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
      texture: task.texture || 'none',
      icon: task.icon,
      isEvent: true
    }
  }
  const quad = quadrantOf(task)
  return {
    backgroundColor: quad.backgroundColor,
    textColor: quad.textColor,
    texture: quad.texture,
    icon: quad.icon,
    isEvent: false,
    quad
  }
}

// Cute texture: hand-drawn scattered bows/stars/hearts/diamonds/dots, returned as a background-image url().
function cuteSVG(stroke: string): string {
  const paths = [
    `<path d="M8 30c-2-2-2-4 0-5 2 1 2 3 0 5z M8 30c2-2 2-4 0-5-2 1-2 3 0 5z" fill="${stroke}"/>`,
    `<path d="M40 8c1 3 2 4 5 5-3 1-4 2-5 5-1-3-2-4-5-5 3-1 4-2 5-5z" fill="${stroke}"/>`,
    `<path d="M20 46c-3-2-5-4-5-6a2.2 2.2 0 014-1 2.2 2.2 0 014 1c0 2-2 4-3 6z" fill="${stroke}"/>`,
    `<path d="M48 40l3 3-3 3-3-3z" fill="${stroke}"/>`,
    `<path d="M30 20v6M27 23h6" stroke="${stroke}" stroke-width="1.6" stroke-linecap="round"/>`,
    `<circle cx="12" cy="16" r="2.2" fill="none" stroke="${stroke}" stroke-width="1.6"/>`,
    `<circle cx="44" cy="24" r="1.4" fill="${stroke}"/>`,
    `<circle cx="24" cy="34" r="1.2" fill="${stroke}"/>`
  ].join('')
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='56' height='56' viewBox='0 0 56 56'>${paths}</svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

// Dark modal-header band: white-tinted overlay.
export function textureBackground(texture: Texture, color: string): string {
  if (!texture || texture === 'none') return 'none'
  const w = 'rgba(255,255,255,.6)'
  switch (texture) {
    case 'dot':
      return `radial-gradient(${w} 1.2px,transparent 1.5px) 0 0/9px 9px`
    case 'cute':
      return cuteSVG(w)
    default:
      return 'none'
  }
}

// Light card surface: overlay tinted with the task's own color.
export function textureBackgroundForCard(texture: Texture, color: string): string {
  if (!texture || texture === 'none') return 'none'
  const c = `color-mix(in srgb, ${color} 30%, transparent)`
  switch (texture) {
    case 'dot':
      return `radial-gradient(${c} 1px,transparent 1.3px) 0 0/8px 8px`
    case 'cute':
      return cuteSVG(`color-mix(in srgb, ${color} 55%, transparent)`)
    default:
      return 'none'
  }
}
