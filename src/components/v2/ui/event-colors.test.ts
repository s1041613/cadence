import { describe, it, expect } from 'vitest'
import {
  EVENT_COLORS,
  EVENT_COLOR_HEXES,
  DEFAULT_EVENT_COLOR,
  eventColorNameOf,
  readableInkOn,
  shadeOf,
  tintOf
} from './event-colors'
import { QUADRANTS, themeOf } from '@/composables/use-theme'
import { mkTask } from '@/stores/tasks-store'
import type { Task } from '@/types/task'

/**
 * The palette's promise is not "these are pink" — it is that both chip renderings stay
 * legible for EVERY entry. That promise is the thing a future colour breaks, and it breaks
 * silently: a swatch that looks lovely in the picker and renders an unreadable 9px chip in
 * the month grid is a bug nobody sees while choosing the colour.
 *
 * The page colour is duplicated here rather than read from cadence-tokens.css: what these
 * assert is that the palette suits the surface it was measured against, so a change to that
 * surface SHOULD fail this file and force a re-measure.
 */
const CANVAS = '#FFF7FA'

function channels(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number]
}

function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((c) => {
    const s = c / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

describe('event palette · every colour survives both chip renderings', () => {
  it.each(EVENT_COLORS.map((c) => [c.name, c.hex] as const))(
    '%s: title on a solid fill clears 4.5:1',
    (_name, hex) => {
      // The all-day bar. readableInkOn picks white or the deep plum, whichever measures
      // better — a palette entry that suits neither is the one this catches.
      expect(contrast(hex, readableInkOn(hex))).toBeGreaterThanOrEqual(4.5)
    }
  )

  it.each(EVENT_COLORS.map((c) => [c.name, c.hex] as const))(
    '%s: title on the tinted fill clears 4.5:1',
    (_name, hex) => {
      expect(contrast(tintOf(hex), shadeOf(hex))).toBeGreaterThanOrEqual(4.5)
    }
  )

  it.each(EVENT_COLORS.map((c) => [c.name, c.hex] as const))(
    '%s: the tinted fill is visible against the page',
    (_name, hex) => {
      // The failure this exists for: a fixed 86% white mix turned the palest pinks into the
      // page colour itself, so a timed chip had no fill at all. 1.1:1 is not a legibility
      // bar — it is the point at which a filled box stops reading as a box.
      expect(contrast(tintOf(hex), CANVAS)).toBeGreaterThanOrEqual(1.1)
    }
  )
})

describe('event palette · shape', () => {
  it('has no duplicate hexes and no duplicate names', () => {
    // Two rows with the same colour make the v2 picker's list unusable: the name is the only
    // thing distinguishing them, and the selected state matches on hex.
    expect(new Set(EVENT_COLORS.map((c) => c.hex.toLowerCase())).size).toBe(EVENT_COLORS.length)
    expect(new Set(EVENT_COLORS.map((c) => c.name)).size).toBe(EVENT_COLORS.length)
  })

  it('keeps the flat hex list in step with the named list', () => {
    expect(EVENT_COLOR_HEXES).toEqual(EVENT_COLORS.map((c) => c.hex))
  })

  it('defaults to a colour that is actually in the palette', () => {
    // Otherwise every untouched event renders with a swatch the picker cannot show as chosen.
    expect(EVENT_COLOR_HEXES).toContain(DEFAULT_EVENT_COLOR)
  })

  it('names a stored colour case-insensitively, and stays silent about one it does not know', () => {
    // Hexes reach us from hand-written constants and from the database, in either case.
    expect(eventColorNameOf(DEFAULT_EVENT_COLOR.toLowerCase())).toBe(
      eventColorNameOf(DEFAULT_EVENT_COLOR.toUpperCase())
    )
    // A retired palette's colour is still on existing records; guessing a name for it would
    // put a wrong label on the user's own data.
    expect(eventColorNameOf('#4A8B85')).toBeNull()
    expect(eventColorNameOf(undefined)).toBeNull()
  })
})

/**
 * The quadrant fills live in use-theme.ts, but they are the same family and carry the same
 * promise, and this file already holds the measuring tape. Checking them here rather than in
 * a second file with a second copy of the WCAG helper keeps one place to look when a colour
 * moves.
 */
describe('quadrant palette · one ink across four fills', () => {
  it.each(QUADRANTS.map((q) => [q.name, q.backgroundColor, q.textColor] as const))(
    '%s clears 4.5:1',
    (_name, fill, ink) => {
      // Quadrant chips render at 9px in the month grid — a fill that only just works at 14px
      // does not work there.
      expect(contrast(fill, ink)).toBeGreaterThanOrEqual(4.5)
    }
  )
})

describe('themeOf · event text colour follows the fill', () => {
  const event = (backgroundColor: string | null): Task =>
    mkTask({ date: '2026-09-08', calendarId: 'c1', type: 'event', backgroundColor })

  it('sets a pale fill in the deep ink and a deep fill in white', () => {
    // The bug a fixed white text colour shipped: on Blossom pink the title was invisible.
    const pale = themeOf(event('#F7C8D9'))
    const deep = themeOf(event('#A82A5C'))
    expect(contrast(pale.backgroundColor, pale.textColor)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(deep.backgroundColor, deep.textColor)).toBeGreaterThanOrEqual(4.5)
    expect(pale.textColor).not.toBe(deep.textColor)
  })

  it('falls back to the palette default when an event carries no colour', () => {
    expect(themeOf(event(null)).backgroundColor).toBe(DEFAULT_EVENT_COLOR)
  })
})
