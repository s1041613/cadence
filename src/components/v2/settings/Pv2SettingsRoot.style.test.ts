import { describe, it, expect, beforeAll } from 'vitest'
import { readFile } from 'node:fs/promises'

// vitest runs `environment: 'node'` (vitest.config.ts) so these components can't be mounted and
// computed styles can't be read. What is pinned here is the Settings UI spec's acceptance
// checklist — the handful of numbers whose whole point is that they agree across six rows and
// three files, and which drift silently when someone edits one of them. Everything else about
// the visual result is verified by eye in the browser.

let root = ''
let row = ''
let brand = ''
let page = ''

beforeAll(async () => {
  root = await readFile(new URL('./Pv2SettingsRoot.vue', import.meta.url), 'utf8')
  row = await readFile(new URL('./Pv2SettingsRow.vue', import.meta.url), 'utf8')
  brand = await readFile(new URL('./Pv2SettingsBrandHeader.vue', import.meta.url), 'utf8')
  page = await readFile(new URL('../../../pages/SettingsPageV2.vue', import.meta.url), 'utf8')
})

/** Escape a selector so `+`, `.` and `:` in it are matched literally. */
function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Pull one declaration out of a scoped-CSS rule block.
 * Anchored to a line start so `.pv2-set-row` can't match `.pv2-set-row--divided`.
 * Comments are stripped first: these files explain their numbers in prose, and a comment
 * mentioning `min-height:` would otherwise be read as the declaration.
 */
function decl(src: string, selector: string, prop: string): string | undefined {
  const css = src.replace(/\/\*[\s\S]*?\*\//g, '')
  const start = css.search(new RegExp(`^${escapeRe(selector)} \\{`, 'm'))
  if (start === -1) return undefined
  const block = css.slice(start, css.indexOf('}', start))
  return block.match(new RegExp(`(?:^|[;{\\s])${prop}:\\s*([^;]+);`))?.[1]?.trim()
}

describe('Settings brand header · spec §2', () => {
  it('shows the drawn title inside the spec 260-280px band', () => {
    const width = decl(brand, '.pv2-set-brand__mark', 'width')
    expect(width).toBe('270px')
  })

  it('never stretches the art', () => {
    // height:auto is what actually preserves the 550x203 ratio; object-fit is the backstop
    // if a later layout ever constrains the height.
    expect(decl(brand, '.pv2-set-brand__mark', 'height')).toBe('auto')
    expect(decl(brand, '.pv2-set-brand__mark', 'object-fit')).toBe('contain')
  })

  it('is the page heading, not decoration', () => {
    expect(brand).toContain('<h1 class="pv2-set-brand">')
    expect(brand).toContain('alt="Settings"')
  })
})

describe('Settings rows · spec §4', () => {
  it('locks every row to the same 64px height', () => {
    expect(decl(row, '.pv2-set-row', 'height')).toBe('64px')
    // The 1px divider has to live inside that height, not add to it.
    expect(decl(row, '.pv2-set-row', 'box-sizing')).toBe('border-box')
  })

  it('gives every row the same 40x40 icon container', () => {
    expect(decl(row, '.pv2-set-row__icon', 'width')).toBe('40px')
    expect(decl(row, '.pv2-set-row__icon', 'height')).toBe('40px')
    expect(decl(row, '.pv2-set-row__icon', 'border-radius')).toBe('50%')
  })

  it('starts the divider at the text, clear of the icon', () => {
    // 70px = 16 padding + 40 icon container + 14 gap. If any of those three move, this must.
    expect(decl(row, '.pv2-set-row--divided::before', 'left')).toBe('70px')
    expect(decl(row, '.pv2-set-row', 'padding')).toBe('0 16px')
    expect(decl(row, '.pv2-set-row', 'gap')).toBe('14px')
  })

  it('sets menu labels in Title Case at reading size', () => {
    expect(decl(row, '.pv2-set-row__label', 'font')).toContain('16px')
    expect(decl(row, '.pv2-set-row__label', 'text-transform')).toBeUndefined()
  })

  it('tints Log out with the accent alone, icon included', () => {
    // The icons stroke in currentColor, so one `color` declaration carries both — that is the
    // whole of "danger" here, with no added border, fill or weight to over-warn.
    expect(decl(row, '.pv2-set-row--danger', 'color')).toBe('var(--pv2-set-danger)')
    expect(row).not.toMatch(/\.pv2-set-row--danger[^{]*\{[^}]*background:/)
  })
})

describe('Settings cards · spec §1 §3', () => {
  it('gives the profile card and the menu cards one radius', () => {
    expect(decl(root, '.pv2-set__profile', 'border-radius')).toBe('20px')
    expect(decl(root, '.pv2-set__card', 'border-radius')).toBe('20px')
  })

  it('holds the profile card at 92px', () => {
    expect(decl(root, '.pv2-set__profile', 'height')).toBe('92px')
    expect(decl(root, '.pv2-set__avatar', 'width')).toBe('56px')
    expect(decl(root, '.pv2-set__avatar', 'height')).toBe('56px')
  })

  it('keeps the page on its 24px column and the groups 20px apart', () => {
    expect(decl(root, '.pv2-set__scroll', 'padding')).toContain('24px')
    expect(decl(root, '.pv2-set__card + .pv2-set__card', 'margin-top')).toBe('20px')
  })

  it('clears the floating bottom nav on a short frame', () => {
    // Everything that scrolls under the nav pill reads --pv2-nav-h; the spare 12px is what
    // keeps the version line off the glass.
    expect(decl(root, '.pv2-set__scroll', 'padding')).toContain('var(--pv2-nav-h)')
  })
})

describe('Settings page · spec §6 §7', () => {
  it('reuses the shared bottom nav rather than a settings-only copy', () => {
    expect(page).toContain("import Pv2BottomNav from '@/components/v2/ui/Pv2BottomNav.vue'")
    expect(page).toContain('<Pv2BottomNav active="setting" />')
  })

  it('paints a warm off-white page, not a cold white', () => {
    expect(decl(page, '.sp2__frame', 'background')).toBe('var(--pv2-set-canvas)')
    expect(page).toMatch(/--pv2-set-canvas:\s*#fdfbfa/i)
  })

  it('composes the pink surfaces from the shared accent instead of a second pink', () => {
    expect(row).toContain('rgba(var(--pv2-accent-rgb)')
    expect(root).toContain('rgba(var(--pv2-accent-rgb)')
  })
})
