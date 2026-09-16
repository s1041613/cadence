import { describe, it, expect, beforeAll } from 'vitest'
import { readFile, access } from 'node:fs/promises'
import { Buffer } from 'node:buffer'
import { monthWordmarkPath } from './public-assets'

/**
 * Guards the drawn month wordmarks that replaced the typeset title on the v2 poster.
 *
 * All twelve are drawn now, so the failures worth catching are the silent ones: a month pointing
 * at a file that isn't in public/, a file drawn on a different canvas (the poster sizes the image
 * by width alone, so an odd aspect ratio moves the calendar under it), and the poster losing the
 * text branch that a failed image load falls back to.
 */

const STEMS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

let poster = ''

beforeAll(async () => {
  poster = await readFile(new URL('../components/v2/ui/Pv2Poster.vue', import.meta.url), 'utf8')
})

/** Width and height out of a PNG's IHDR, which is the first chunk after the 8-byte signature. */
async function pngSize(path: URL): Promise<{ width: number; height: number }> {
  const bytes = await readFile(path)
  expect(bytes.subarray(0, 8), `${path.pathname} should be a PNG`).toEqual(PNG_SIGNATURE)
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
}

describe('monthWordmarkPath', () => {
  it('names the file for every month, January first', () => {
    expect(STEMS.map((_, m) => monthWordmarkPath(m))).toEqual(
      STEMS.map((stem) => `/month-wordmarks/${stem}.png`)
    )
  })

  it('ships every file it names', async () => {
    for (const stem of STEMS) {
      await expect(
        access(new URL(`../../public/month-wordmarks/${stem}.png`, import.meta.url)),
        `${stem}.png should exist in public/`
      ).resolves.toBeUndefined()
    }
  })

  it('draws all twelve on the same canvas, so the title box does not resize month to month', async () => {
    for (const stem of STEMS) {
      const { width, height } = await pngSize(
        new URL(`../../public/month-wordmarks/${stem}.png`, import.meta.url)
      )
      expect({ stem, width, height }).toEqual({ stem, width: 1200, height: 400 })
    }
  })
})

describe('Pv2Poster', () => {
  it('keeps the typeset title as the branch a failed image load falls back to', () => {
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
