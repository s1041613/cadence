import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * Guards the third batch of the animation audit — `docs/motion-audit/README.md`
 * 「第三梯 — 既有動畫瑕疵」: places that already animated, but wrongly.
 *
 * vitest runs `environment: 'node'` (vitest.config.ts) and the repo has no
 * @vue/test-utils, so nothing here can be mounted and no computed style can be
 * read. What is checkable off-device is the source text, and these fixes are
 * exactly the kind that regress silently: a missing transition looks like
 * nothing at all in a diff. The perceived result is still verified by eye on
 * the phone.
 */

const srcUrl = (p: string) => fileURLToPath(new URL(`../${p}`, import.meta.url))
const headerNav = readFileSync(srcUrl('components/v2/ui/Pv2HeaderNav.vue'), 'utf-8')
const eventBlock = readFileSync(srcUrl('components/v2/day/Pv2EventBlock.vue'), 'utf-8')

// #8 (Pv2DayTabs' `transition: all`) is intentionally not covered here. The
// component is commented out of DayViewV2.vue — both the template usage and the
// import — while the timeline is reworked, so nothing it declares reaches a
// screen. See docs/motion-audit/README.md.

describe('#13 Pv2HeaderNav — the :active colour swap is no longer a hard cut', () => {
  it('gives the segment a background transition', () => {
    // The :active rule below has always existed; without this it applied and
    // released instantly, which reads as a flicker rather than a press.
    expect(headerNav).toMatch(/transition:\s*background-color var\(--cd-duration-micro-1\)/)
  })

  it('still has the :active state the transition exists to serve', () => {
    expect(headerNav).toMatch(/\.pv2-hn__seg:active\s*\{[^}]*background:/)
  })
})

describe('Pv2EventBlock — the in-progress flip is clock-driven, so it must ease', () => {
  it('transitions the colours that blockStyle rebinds', () => {
    // background and color come from the inline :style, which flips the moment
    // the clock crosses the event boundary — with no input from the user. An
    // instant swap under those conditions reads as a glitch.
    expect(eventBlock).toMatch(/background-color var\(--cd-duration-micro-5\)/)
    expect(eventBlock).toMatch(/\bcolor var\(--cd-duration-micro-5\)/)
  })

  it('keeps the inline binding on `background`, whose computed value interpolates', () => {
    // Interpolation happens on the resolved background-color. This assertion is
    // here so that switching the binding to something non-interpolable (a
    // gradient, a shorthand carrying an image) fails instead of silently
    // reverting the transition to a snap.
    expect(eventBlock).toMatch(/background: props\.active \? props\.color/)
  })
})

describe('reduced-motion opt-out', () => {
  // Every rule added above is a colour transition, which is precisely what
  // vestibular-safe still allows to be cut. Each file carries its own block
  // because the styles are scoped and app.css cannot reach into them.
  it.each([
    ['Pv2HeaderNav', headerNav],
    ['Pv2EventBlock', eventBlock]
  ])('%s honours prefers-reduced-motion', (_name, source) => {
    expect(source).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{[^@]*transition: none/)
  })
})
