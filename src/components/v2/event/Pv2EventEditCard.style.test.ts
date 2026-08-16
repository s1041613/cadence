import { describe, it, expect, beforeAll } from 'vitest'
import { readFile } from 'node:fs/promises'

// vitest runs `environment: 'node'` (vitest.config.ts) so the component can't be
// mounted and computed styles can't be read. These assertions pin the few values
// that make the card's value controls agree with each other — the exact thing that
// silently drifted apart before: five controls at three heights, two font sizes and
// three chevrons. Everything else about the visual result is verified by eye.

let card = ''
let selectField = ''
let timeChip = ''

beforeAll(async () => {
  card = await readFile(new URL('./Pv2EventEditCard.vue', import.meta.url), 'utf8')
  selectField = await readFile(
    new URL('../ui/Pv2SelectField.vue', import.meta.url),
    'utf8'
  )
  timeChip = await readFile(new URL('../ui/Pv2TimeChip.vue', import.meta.url), 'utf8')
})

/**
 * Pull one declaration out of a rule block, anchored to a line start.
 * The property is matched after a line start rather than with \b, so custom
 * properties work too — \b never matches before their leading hyphen.
 */
function decl(src: string, selector: string, prop: string): string | undefined {
  const start = src.search(new RegExp(`^\\${selector} \\{`, 'm'))
  if (start === -1) return undefined
  const block = src.slice(start, src.indexOf('}', start))
  return block.match(new RegExp(`^\\s*${prop}:\\s*([^;]+);`, 'm'))?.[1]?.trim()
}

describe('Pv2EventEditCard · value-control contract', () => {
  it('declares one height for every control in a row value column', () => {
    expect(card).toMatch(/--pv2-control-h:\s*40px;/)
  })

  it('derives the row height from the control height instead of measuring it', () => {
    // Was pinned at 62.67px — whatever the tallest control happened to render at —
    // so the whole card's rhythm depended on a number nobody could safely change.
    // 20px is the row's own 10px top and bottom padding.
    expect(decl(card, '.pv2-edit-card', '--pv2-row-h')).toBe('calc(var(--pv2-control-h) + 20px)')
  })

  it('keeps the time row vertically centred like every other row', () => {
    // `.pv2-edit-card__line--time { align-items: start }` existed only because the
    // date/time pills were 6.7px taller than the rest. Now that they are not, a
    // top-aligned row would be the odd one out.
    expect(card).not.toContain('pv2-edit-card__line--time')
  })

  it('routes CALENDAR through the shared select control, not a bare <select>', () => {
    // A bare <select> with no `appearance: none` is drawn by the UA — its height,
    // font metrics and chevron were never ours to line up.
    expect(card).not.toContain('pv2-edit-card__select')
    expect(card).toContain('<Pv2SelectField')
  })

  it('leaves no second chevron implementation behind', () => {
    // Three used to coexist: the UA's double arrow, this SVG, and a 7x7 square
    // rotated 45deg out of two borders inside CdReminderPill.
    expect(card).not.toContain('pv2-edit-card__more-icon')
    // Matched as markup/import rather than as a bare string: the comments above
    // still name CdReminderPill to explain what the sentinel value is for.
    expect(card).not.toMatch(/<CdReminderPill/)
    expect(card).not.toMatch(/^import CdReminderPill/m)
    // No inline chevron path left in the card — Pv2Chevron owns the only copy.
    expect(card).not.toMatch(/<path d="M1 1\.5 L5\.5 5\.5 L10 1\.5"/)
  })

  it('gives every control the same four interaction states', () => {
    for (const state of [':hover', ':active', ':focus-visible']) {
      expect(card).toContain(`.pv2-edit-card__style${state}`)
    }
    expect(card).toContain('.pv2-edit-card__style--open')
  })
})

describe('Pv2SelectField · overlay technique', () => {
  it('keeps a real <select> so mobile still gets the native picker', () => {
    expect(selectField).toContain('<select')
    expect(decl(selectField, '.pv2-select-field__native', 'opacity')).toBe('0')
    expect(decl(selectField, '.pv2-select-field__native', 'inset')).toBe('0')
    expect(decl(selectField, '.pv2-select-field__native', 'appearance')).toBe('none')
  })

  it('consumes the control contract with fallbacks so it renders standalone', () => {
    expect(decl(selectField, '.pv2-select-field', 'height')).toBe('var(--pv2-control-h, 40px)')
    expect(decl(selectField, '.pv2-select-field', 'background')).toBe('var(--pv2-control-bg, #f0f0ed)')
  })

  it('asks for touch-action itself, since app.css only grants it to buttons', () => {
    // The root is a <label>, which the `button, a, [role="button"]` rule in
    // src/css/app.css does not match.
    expect(decl(selectField, '.pv2-select-field', 'touch-action')).toBe('manipulation')
  })
})

describe('Pv2TimeChip · joins the same contract', () => {
  it('matches the shared height rather than its old 42.67px', () => {
    expect(decl(timeChip, '.pv2-time-chip', 'height')).toBe('var(--pv2-control-h, 40px)')
  })

  it('guards every host variable with a fallback', () => {
    // It previously read --pv2-line-strong and --pv2-fill with no defaults, so
    // outside the edit card its border and hover resolved to nothing at all.
    const block = timeChip.slice(
      timeChip.indexOf('.pv2-time-chip {'),
      timeChip.indexOf('}', timeChip.indexOf('.pv2-time-chip {'))
    )
    for (const match of block.matchAll(/var\((--pv2-[a-z-]+)([^)]*)\)/g)) {
      expect(match[2], `${match[1]} has no fallback`).toMatch(/^,\s*\S/)
    }
  })
})
