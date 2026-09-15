// Generates the dot-matrix CADENCE markup that index.html's launch animation renders.
//
// The wordmark is not a font at runtime: it is a grid of <circle>s, one per cell the
// glyph outlines pass through. Sampling happens here, once, so index.html ships static
// markup and needs no font file on the cold-start path (see HANDOFF.md, 2026-09).
//
// The sampling is done in headless Chromium against the real Inter 500 face rather than
// against traced paths, so the dots follow the shipping typeface instead of an
// approximation of it. That is also why this script is not part of any npm script: it
// needs a browser, and its output is checked in.
//
//   npm i -D playwright && node docs/splash-animation/gen-dots.mjs
//
// Paste the printed markup into the #cd-splash block in index.html, and keep the
// printed column count in sync with the sweep timings documented in HANDOFF.md.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

/* ── knobs ────────────────────────────────────────────────────────────────────
   STEP is the grid pitch in canvas pixels: smaller means more, finer dots. It is set
   by what a phone can actually show. The wordmark spans ~330 CSS px at 393 px wide,
   so 13 puts each dot at roughly 6 px across — still reading as dots rather than as
   blurred type, which is the whole point of the treatment. Going finer (9 gives a
   prettier contour on a desktop) drops the dots under 4 px on a phone and the
   texture disappears; coarser than ~15 starts eating the crossbars of E.            */
const TEXT = 'CADENCE'
const FONT_PX = 140
const TRACKING_EM = 0.14
const STEP = 13
const INK_THRESHOLD = 0.45 // share of a cell's 3x3 probe that must be covered
const UNIT = 10 // one grid pitch, in the emitted viewBox's units
const DOT_R = 4 // dot radius in the same units: 0.4 pitch, so dots never touch

/* ── sweep, must match the keyframes in index.html ───────────────────────────── */
const SWEEP_START_S = 0.28
const SWEEP_SPAN_S = 1.15

const { chromium } = await import('playwright').catch(() => {
  throw new Error('playwright is not installed — run `npm i -D playwright` first')
})

// Sampled straight from the dependency the app itself loads Inter from, so nothing
// has to be checked in alongside this script and the two can never drift.
const fontUri = `data:font/woff2;base64,${readFileSync(
  join(ROOT, 'node_modules', '@fontsource', 'inter', 'files', 'inter-latin-500-normal.woff2'),
).toString('base64')}`

const browser = await chromium.launch()
const page = await browser.newPage()

const dots = await page.evaluate(
  async ({ fontUri, TEXT, FONT_PX, TRACKING_EM, STEP, INK_THRESHOLD }) => {
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
    ctx.font = `500 ${FONT_PX}px InterSample`
    ctx.letterSpacing = `${TRACKING_EM}em`
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = '#fff'
    ctx.fillText(TEXT, (W - ctx.measureText(TEXT).width) / 2, H / 2 + FONT_PX * 0.36)

    const px = ctx.getImageData(0, 0, W, H).data
    const inkAt = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : px[(y * W + x) * 4] / 255)

    // Probe each cell over its centre 3x3 rather than a single pixel, so a thin stem
    // that falls between two sample points is not dropped.
    const filled = []
    for (let gy = 0; gy * STEP < H; gy++) {
      for (let gx = 0; gx * STEP < W; gx++) {
        const cx = Math.round(gx * STEP + STEP / 2)
        const cy = Math.round(gy * STEP + STEP / 2)
        let sum = 0
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) sum += inkAt(cx + dx, cy + dy)
        if (sum / 9 > INK_THRESHOLD) filled.push([gx, gy])
      }
    }

    // Keep only the boundary cells. A solid block of dots reads as a bitmap screenshot;
    // the contour reads as something drawn, and costs a third of the dots.
    const set = new Set(filled.map(([gx, gy]) => `${gx},${gy}`))
    const interior = ([gx, gy]) =>
      set.has(`${gx - 1},${gy}`) && set.has(`${gx + 1},${gy}`) &&
      set.has(`${gx},${gy - 1}`) && set.has(`${gx},${gy + 1}`)
    return filled.filter((cell) => !interior(cell))
  },
  { fontUri, TEXT, FONT_PX, TRACKING_EM, STEP, INK_THRESHOLD },
)

await browser.close()

/* ── lay the cells out on a tidy integer viewBox, one pitch of margin all round ── */
const minX = Math.min(...dots.map(([x]) => x))
const minY = Math.min(...dots.map(([, y]) => y))
const placed = dots.map(([x, y]) => [(x - minX) * UNIT + UNIT, (y - minY) * UNIT + UNIT])
const vbW = Math.max(...placed.map(([x]) => x)) + UNIT
const vbH = Math.max(...placed.map(([, y]) => y)) + UNIT

// One delay per column, not per dot: the custom property inherits, so a column's dots
// share their group's --d and the markup carries 60-odd delays instead of 300-odd.
const columns = new Map()
for (const [x, y] of placed) columns.set(x, [...(columns.get(x) ?? []), y])
const xs = [...columns.keys()].sort((a, b) => a - b)

const groups = xs.map((x, i) => {
  const delay = (SWEEP_START_S + (i / (xs.length - 1)) * SWEEP_SPAN_S).toFixed(3)
  const circles = columns
    .get(x)
    .sort((a, b) => a - b)
    .map((y) => `<circle cx="${x}" cy="${y}" r="${DOT_R}"/>`)
    .join('')
  return `          <g style="--d:${delay}s">${circles}</g>`
})

console.error(
  `${placed.length} dots in ${xs.length} columns; ` +
    `sweep ${SWEEP_START_S}s → ${(SWEEP_START_S + SWEEP_SPAN_S).toFixed(2)}s`,
)
// The playhead's travel is geometry, so it is emitted with the markup rather than
// hardcoded in the stylesheet: the keyframes read it back as var(--travel). The rect
// straddles x=0 so translating it by a column's x centres it on that column.
const beat =
  `        <rect class="cd-splash__beat" x="-6" y="0" width="12" height="${vbH}" rx="6"` +
  ` style="--travel:${vbW - UNIT}px"/>`

console.log(
  `      <svg class="cd-splash__matrix" viewBox="0 0 ${vbW} ${vbH}" aria-hidden="true" focusable="false">\n` +
    `${beat}\n        <g class="cd-splash__dots">\n${groups.join('\n')}\n        </g>\n      </svg>`,
)
