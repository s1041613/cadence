import { describe, it, expect, beforeAll } from 'vitest'
import { readFile, access } from 'node:fs/promises'
import { monthWordmarkPath } from './public-assets'

/**
 * Guards the drawn month wordmark that replaced the typeset title on the v2 poster.
 *
 * Only September has been drawn, so every other month still renders the text title — which
 * means the two failures worth catching are both silent ones: a month claiming art that isn't
 * in public/, and the poster losing the text branch that eleven months out of twelve depend on.
 */

let poster = ''

beforeAll(async () => {
  poster = await readFile(new URL('../components/v2/ui/Pv2Poster.vue', import.meta.url), 'utf8')
})

describe('monthWordmarkPath', () => {
  it('returns the September wordmark', () => {
    expect(monthWordmarkPath(8)).toBe('/month-wordmarks/sep.png')
  })

  it('returns null for every month that has no art yet', () => {
    const drawn = [8]
    for (let m = 0; m < 12; m++) {
      if (drawn.includes(m)) continue
      expect(monthWordmarkPath(m), `month ${m}`).toBeNull()
    }
  })

  it('ships the file for every month it claims art for', async () => {
    for (let m = 0; m < 12; m++) {
      const path = monthWordmarkPath(m)
      if (!path) continue
      await expect(
        access(new URL(`../../public${path}`, import.meta.url)),
        `${path} should exist in public/`
      ).resolves.toBeUndefined()
    }
  })
})

describe('Pv2Poster', () => {
  it('keeps the typeset title as the branch for months with no wordmark', () => {
    expect(poster).toContain('v-else class="pv2-poster__month"')
  })

  it('falls back to the typeset title when the image fails to load', () => {
    expect(poster).toMatch(/@error="onWordmarkError"/)
    expect(poster).toMatch(/wordmarkFailed\.value = true/)
  })

  it('names the month in the image alt, so the title is still read out', () => {
    expect(poster).toMatch(/:alt="monthName"/)
  })
})
