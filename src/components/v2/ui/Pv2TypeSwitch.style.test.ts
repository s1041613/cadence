import { describe, it, expect, beforeAll } from 'vitest'
import { readFile } from 'node:fs/promises'

/**
 * Guards the month filter switch.
 *
 * vitest runs `environment: 'node'` (vitest.config.ts) with no @vue/test-utils, so the control
 * can't be mounted and the glass can only be judged on a device. What IS checkable here is the
 * handful of conditions the thing rests on — and every one of them fails SILENTLY:
 *
 *  - the thumb's travel drifting from the segment width → the pill lands between two icons
 *  - the track losing its white plate → invisible on the default canvas, which ships with no
 *    wallpaper at all (v2-appearance-store: backgroundImage null, scrim 0.8)
 *  - the filter reaching the day sheet → a tapped cell hides the very tasks it exists to show
 */

let sw = ''
let monthView = ''

beforeAll(async () => {
  sw = await readFile(new URL('./Pv2TypeSwitch.vue', import.meta.url), 'utf8')
  monthView = await readFile(new URL('../month/MonthViewV2.vue', import.meta.url), 'utf8')
})

/**
 * Pull one declaration out of a scoped-CSS rule block.
 * Anchored to a line start, and the trailing space keeps `.pv2-typeswitch` off
 * `.pv2-typeswitch__thumb`.
 */
function decl(source: string, selector: string, prop: string): string | undefined {
  const start = source.search(new RegExp(`^${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\{`, 'm'))
  if (start === -1) return undefined
  const block = source.slice(start, source.indexOf('}', start))
  return block.match(new RegExp(`\\b${prop}:\\s*([^;]+);`))?.[1]?.trim()
}

/** The body of a top-level function declaration in the <script setup> block. */
function fnBody(source: string, name: string): string {
  const start = source.indexOf(`function ${name}(`)
  expect(start, `${name} should exist`).toBeGreaterThan(-1)
  return source.slice(start, source.indexOf('\n}', start))
}

describe('Pv2TypeSwitch · the thumb lands on a segment', () => {
  it('travels exactly one segment width per option', () => {
    // SEG_W is the script's only statement of the geometry; the CSS restates it twice. All three
    // have to agree or the thumb stops between icons — which looks like a rendering bug, not a
    // wrong constant.
    const segW = sw.match(/const SEG_W = (\d+)/)?.[1]
    expect(segW).toBe('42')
    expect(decl(sw, '.pv2-typeswitch__seg', 'width')).toBe(`${segW}px`)
    expect(decl(sw, '.pv2-typeswitch__thumb', 'width')).toBe(`${segW}px`)
  })

  it('orders the options the way the thumb counts them', () => {
    // The thumb's offset is the option's INDEX. 'all' is the resting state, so it has to be
    // index 0 or a fresh mount shows the pill parked on the wrong icon.
    const order = [...sw.matchAll(/\{ value: '(\w+)', label:/g)].map((m) => m[1])
    expect(order).toEqual(['all', 'event'])
  })
})

describe('Pv2TypeSwitch · readable without a wallpaper', () => {
  it('keeps the white plate under the glass', () => {
    // The clear-glass version (blur plus edge highlights, no fill) is the better-looking one on a
    // photo and is invisible on the canvas the app actually ships: white ring on white. The plate
    // is what makes the control work in both cases — see the component's own comment.
    const bg = decl(sw, '.pv2-typeswitch', 'background')
    expect(bg).toContain('linear-gradient(180deg, rgba(255, 255, 255, .72), rgba(255, 255, 255, .46))')
    expect(bg).toContain('var(--pv2-canvas)')
  })

  it('restores a 44px touch target outside the 36px capsule', () => {
    // The visible height is 36 so the grid keeps its third lane (month-lanes.ts ROW_MAX_H). The
    // target that buys back is on the pseudo-element, where it costs no layout.
    expect(decl(sw, '.pv2-typeswitch__seg::after', 'width')).toBe('44px')
    expect(decl(sw, '.pv2-typeswitch__seg::after', 'height')).toBe('44px')
    expect(decl(sw, '.pv2-typeswitch__seg::after', 'position')).toBe('absolute')
  })
})

describe('MonthViewV2 · the filter governs the grid and nothing else', () => {
  it('applies it to the grid', () => {
    expect(monthView).toMatch(/calendarsStore\.isVisible\(t\.calendarId\) && matchesMonthFilter\(t\)/)
  })

  it('keeps it out of the day sheet', () => {
    // A tapped cell shows everything that day holds. Filtering here would mean the sheet agrees
    // with the grid and disagrees with the day.
    expect(fnBody(monthView, 'visibleTasksForDate')).not.toContain('matchesMonthFilter')
  })

  it('leaves the todo cards alone', () => {
    // todosBetween is the TASKS cards' list. They are labelled tasks and answer a different
    // question than "what is drawn this month".
    expect(fnBody(monthView, 'todosBetween')).not.toContain('matchesMonthFilter')
  })
})
