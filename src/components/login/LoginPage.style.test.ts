import { describe, it, expect, beforeAll } from 'vitest'
import { readFile } from 'node:fs/promises'

/**
 * Guards the sign-in screen.
 *
 * vitest runs `environment: 'node'` (vitest.config.ts) with no @vue/test-utils, so nothing here
 * can be mounted and the look has to be judged in a browser. What IS checkable is the handful
 * of conditions the layout rests on — and each one fails SILENTLY, rendering a page that looks
 * plausible until you measure it:
 *
 *  - the icon rejoining the flex flow → the label centres on the space LEFT OF the icon, so it
 *    sits a dozen px right of the button's centre and reads as sloppy kerning
 *  - the frame losing its definite height → the hero's percentage flex-basis falls back to the
 *    content size, collapsing the brand area onto the wordmark and handing the rest to the panel
 *  - the two buttons drifting apart in size, which is what one geometry in two files invites
 *  - the Supabase variable names reaching a production build's error line
 */

let page = ''
let hero = ''
let panel = ''
let button = ''
let authStore = ''

beforeAll(async () => {
  page = await readFile(new URL('../../pages/LoginPage.vue', import.meta.url), 'utf8')
  hero = await readFile(new URL('./BrandHero.vue', import.meta.url), 'utf8')
  panel = await readFile(new URL('./LoginPanel.vue', import.meta.url), 'utf8')
  button = await readFile(new URL('./ProviderButton.vue', import.meta.url), 'utf8')
  authStore = await readFile(new URL('../../stores/auth-store.ts', import.meta.url), 'utf8')
})

/**
 * Pull one declaration out of a scoped-CSS rule block, anchored to a line start.
 *
 * The property is guarded with a lookbehind rather than \b, which would let `min-height`
 * answer a query for `height` — and `height` vs `min-height` is the exact distinction the
 * frame's test below turns on, so a \b here would report the broken layout as correct.
 */
function decl(source: string, selector: string, prop: string): string | undefined {
  const start = source.search(new RegExp(`^${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\{`, 'm'))
  if (start === -1) return undefined
  const block = source.slice(start, source.indexOf('}', start))
  return block.match(new RegExp(`(?<![-\\w])${prop}:\\s*([^;]+);`))?.[1]?.trim()
}

describe('ProviderButton · the label centres on the button', () => {
  it('takes the provider mark out of the flex flow', () => {
    // The whole point of the absolute icon: a flex sibling would consume width on one side
    // only, and `justify-content: center` would then centre the label in what is left rather
    // than on the button. Spec §5 calls this out by name.
    expect(decl(button, '.provider-btn__icon', 'position')).toBe('absolute')
    expect(decl(button, '.provider-btn__icon', 'left')).toBe('24px')
    expect(decl(button, '.provider-btn', 'justify-content')).toBe('center')
  })

  it('holds the 64px pill both providers are measured against', () => {
    expect(decl(button, '.provider-btn', 'height')).toBe('64px')
    expect(decl(button, '.provider-btn', 'border-radius')).toBe('32px')
  })
})

describe('LoginPanel · one geometry, two providers', () => {
  it('builds both buttons from the same component', () => {
    // "Google 與 Apple 按鈕尺寸完全一致" is only guaranteed while there is one box to change.
    expect(panel.match(/<ProviderButton/g)).toHaveLength(2)
    expect(panel).toContain('provider="google"')
    expect(panel).toContain('provider="apple"')
  })

  it('does not restate the button geometry', () => {
    expect(decl(panel, '.login-panel', 'height')).toBeUndefined()
    expect(panel).not.toMatch(/\.login-panel\s+button\s*\{/)
  })

  it('anchors the footer to the end of the panel rather than a fixed offset', () => {
    // A fixed top/bottom offset either floats the line mid-panel on a tall screen or drops it
    // under the home indicator on a short one (spec §7).
    expect(decl(panel, '.login-panel__footer', 'margin')).toContain('auto')
    expect(decl(panel, '.login-panel', 'padding')).toContain('env(safe-area-inset-bottom')
  })
})

describe('LoginPage · the hero keeps its share of the frame', () => {
  it('gives the frame a definite height for the hero to measure against', () => {
    // A percentage flex-basis resolved against an indefinite height is treated as `auto`, and
    // the hero silently becomes as tall as the wordmark. min-height alone does NOT make the
    // height definite, so this asserts the real thing rather than either-or.
    expect(decl(page, '.login__frame', 'height')).toBe('100%')
    expect(decl(hero, '.brand-hero', 'flex')).toMatch(/%$/)
  })

  it('lets the hero absorb the squeeze instead of the panel', () => {
    // flex-shrink on the hero and none on the panel is what keeps the buttons at full size on
    // a short screen (spec §7).
    const heroFlex = decl(hero, '.brand-hero', 'flex')?.split(/\s+/) ?? []
    const panelFlex = decl(panel, '.login-panel', 'flex')?.split(/\s+/) ?? []
    expect(heroFlex[1]).toBe('1')
    expect(panelFlex[1]).toBe('0')
  })

  it('caps the wordmark so a desktop window cannot stretch it', () => {
    expect(decl(hero, '.brand-hero__title', 'width')).toBe('min(72vw, 330px)')
  })
})

describe('auth-store · a production build does not name the config keys', () => {
  it('gates the variable names behind import.meta.env.DEV', () => {
    const notConfigured = authStore.slice(
      authStore.indexOf('const NOT_CONFIGURED'),
      authStore.indexOf('export const useAuthStore')
    )
    expect(notConfigured).toContain('import.meta.env.DEV')
    // Both names appear once, in the DEV branch, above the production fallback.
    const devBranch = notConfigured.slice(0, notConfigured.indexOf(':'))
    expect(devBranch).toContain('QCLI_SUPABASE_URL')

    // and nowhere else in the store, which is what a second copy-paste would break
    expect(authStore.match(/QCLI_SUPABASE_URL/g)).toHaveLength(1)
    expect(authStore.match(/QCLI_SUPABASE_ANON_KEY/g)).toHaveLength(1)
  })
})
