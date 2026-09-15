// dot-matrix — samples type onto a grid of dots, shared by the brand marks that use it.
//
// Cadence's launch animation and app icon are both the same treatment: take the glyph
// outlines, keep the cells of a fixed grid that the shape covers, and draw one
// equal-sized dot in each. Dots are on or off — there is no dot-size-by-coverage, which
// is what would make it a halftone rather than a dot matrix.
//
// Sampling runs in headless Chromium against the real Inter 500 face rather than against
// traced paths, so the dots follow the shipping typeface instead of an approximation of
// it. That is why the callers are not wired into any npm script: they need a browser, and
// their output is checked in.
//
//   npm i -D playwright
//
// Consumers: scripts/gen-splash-dots.mjs, scripts/gen-app-icon.mjs.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/** One grid pitch, in the units of the viewBox that layOut() produces. */
export const UNIT = 10

// Read straight from the dependency the app itself loads Inter from, so nothing has to be
// checked in beside these scripts and the two can never drift.
const FONT_FILE = join(ROOT, 'node_modules', '@fontsource', 'inter', 'files', 'inter-latin-500-normal.woff2')

/**
 * Sample `text` onto a grid and return the cells to draw, as [gridX, gridY] pairs.
 *
 * @param {object}  o
 * @param {string}  o.text
 * @param {number}  o.fontPx      size to rasterise at; only its ratio to `step` matters
 * @param {number}  o.step        grid pitch in canvas pixels — smaller means more, finer dots
 * @param {number} [o.trackingEm] letter-spacing, in em
 * @param {number} [o.threshold]  share of a cell's probe that must be covered to light it
 * @param {boolean} [o.contour]   keep only boundary cells rather than the solid shape
 */
export async function sampleDots({ text, fontPx, step, trackingEm = 0, threshold = 0.45, contour = true }) {
  const { chromium } = await import('playwright').catch(() => {
    throw new Error('playwright is not installed — run `npm i -D playwright` first')
  })

  const fontUri = `data:font/woff2;base64,${readFileSync(FONT_FILE).toString('base64')}`
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    return await page.evaluate(
      async ({ fontUri, text, fontPx, step, trackingEm, threshold, contour }) => {
        const face = new FontFace('InterSample', `url(${fontUri})`, { weight: '500' })
        await face.load()
        document.fonts.add(face)

        const W = 2400
        const H = 600
        const canvas = document.createElement('canvas')
        canvas.width = W
        canvas.height = H
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        ctx.fillStyle = '#000'
        ctx.fillRect(0, 0, W, H)
        ctx.font = `500 ${fontPx}px InterSample`
        ctx.letterSpacing = `${trackingEm}em`
        ctx.textBaseline = 'alphabetic'
        ctx.fillStyle = '#fff'
        ctx.fillText(text, (W - ctx.measureText(text).width) / 2, H / 2 + fontPx * 0.36)

        const px = ctx.getImageData(0, 0, W, H).data
        const inkAt = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : px[(y * W + x) * 4] / 255)

        // Probe each cell over its centre 3x3 rather than a single pixel, so a thin stem
        // that falls between two sample points is not dropped.
        const filled = []
        for (let gy = 0; gy * step < H; gy++) {
          for (let gx = 0; gx * step < W; gx++) {
            const cx = Math.round(gx * step + step / 2)
            const cy = Math.round(gy * step + step / 2)
            let sum = 0
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) sum += inkAt(cx + dx, cy + dy)
            if (sum / 9 > threshold) filled.push([gx, gy])
          }
        }
        if (!contour) return filled

        // A solid block of dots reads as a bitmap screenshot; the contour reads as
        // something drawn, and costs about a third of the dots.
        const set = new Set(filled.map(([gx, gy]) => `${gx},${gy}`))
        const interior = ([gx, gy]) =>
          set.has(`${gx - 1},${gy}`) && set.has(`${gx + 1},${gy}`) &&
          set.has(`${gx},${gy - 1}`) && set.has(`${gx},${gy + 1}`)
        return filled.filter((cell) => !interior(cell))
      },
      { fontUri, text, fontPx, step, trackingEm, threshold, contour },
    )
  } finally {
    await browser.close()
  }
}

/**
 * Place sampled cells on a tidy integer viewBox, `margin` pitches of clearance all round.
 * Returns the placed centres in viewBox units alongside the box they need.
 */
export function layOut(cells, margin = 1) {
  const minX = Math.min(...cells.map(([x]) => x))
  const minY = Math.min(...cells.map(([, y]) => y))
  const dots = cells.map(([x, y]) => [(x - minX + margin) * UNIT, (y - minY + margin) * UNIT])
  return {
    dots,
    width: Math.max(...dots.map(([x]) => x)) + margin * UNIT,
    height: Math.max(...dots.map(([, y]) => y)) + margin * UNIT,
  }
}
