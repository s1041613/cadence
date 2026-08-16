import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * Guards the iOS standalone touch-feedback setup.
 *
 * The phone is the only place these rules can be observed — :active does not
 * misbehave on desktop, there is no 300ms delay, and no tap highlight exists —
 * so these tests pin the two invariants that ARE checkable off-device:
 * the CSP must not be contradicted, and the interactive-element rules must
 * cover the tap targets that are not <button>.
 */

const repoUrl = (p: string) => fileURLToPath(new URL(`../../${p}`, import.meta.url))
const indexHtml = readFileSync(repoUrl('index.html'), 'utf-8')
const appCss = readFileSync(repoUrl('src/css/app.css'), 'utf-8')

describe('index.html CSP vs. inline handlers', () => {
  it('declares a script-src that forbids inline script', () => {
    // Establishes the premise of the test below; if the CSP is ever loosened
    // this assertion fails loudly rather than silently voiding the next one.
    expect(indexHtml).toMatch(/script-src 'self'/)
    expect(indexHtml).not.toMatch(/script-src[^;"]*'unsafe-inline'/)
  })

  it('carries no inline event handler attribute', () => {
    // An on*="" attribute is an inline script under CSP. With script-src 'self'
    // and no 'unsafe-inline', the browser refuses to register it, so any
    // :active enablement resting on one silently does nothing on the phone.
    const inlineHandlers = indexHtml.match(/\son[a-z]+\s*=\s*"/gi) ?? []
    expect(inlineHandlers).toEqual([])
  })
})

describe('iOS :active enablement', () => {
  const bootFile = readFileSync(repoUrl('src/boot/ios-active-state.ts'), 'utf-8')
  const quasarConfig = readFileSync(repoUrl('quasar.config.ts'), 'utf-8')

  it('registers a passive touchstart listener from bundled JS', () => {
    // Bundled JS is CSP-clean where an inline attribute is not. Passive so the
    // listener can never block scrolling.
    expect(bootFile).toMatch(/addEventListener\(\s*'touchstart'/)
    expect(bootFile).toMatch(/passive:\s*true/)
  })

  it('is wired into the boot sequence', () => {
    // A boot file absent from this array is dead code that never runs.
    expect(quasarConfig).toMatch(/'ios-active-state'/)
  })
})

describe('app.css interactive touch rules', () => {
  it('clears the iOS tap highlight globally', () => {
    expect(appCss).toMatch(/-webkit-tap-highlight-color:\s*transparent/)
  })

  it('covers clickable elements that are not <button>', () => {
    // These are <div @click> tap targets (Pv2Cell.vue, Pv2TimeGrid.vue); a
    // bare `button` selector misses them entirely.
    expect(appCss).toMatch(/\.pv2-cell\b/)
    expect(appCss).toMatch(/\.pv2-grid__column\b/)
  })

  it('applies manipulation, selection and callout suppression together', () => {
    // Splitting these apart is the common regression: touch-action alone
    // still leaves long-press selection and the share callout in place.
    expect(appCss).toMatch(/touch-action:\s*manipulation/)
    expect(appCss).toMatch(/-webkit-user-select:\s*none/)
    expect(appCss).toMatch(/-webkit-touch-callout:\s*none/)
  })
})
