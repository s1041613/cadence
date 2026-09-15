// Generates the dot-matrix CADENCE markup that index.html's launch animation renders.
//
// The wordmark is not a font at runtime: it is a grid of <circle>s, one per cell the glyph
// outlines pass through. Sampling happens here, once, so index.html ships static markup and
// needs no font file on the cold-start path (see docs/splash-animation/HANDOFF.md, 2026-09).
//
//   npm i -D playwright && node scripts/gen-splash-dots.mjs
//
// Paste the printed markup into the #cd-splash block in index.html, and keep the printed
// column count in sync with the sweep timings documented in HANDOFF.md.
import { UNIT, layOut, sampleDots } from './dot-matrix.mjs'

/* ── knobs ────────────────────────────────────────────────────────────────────
   STEP is the grid pitch in canvas pixels: smaller means more, finer dots. It is set by
   what a phone can actually show. The wordmark spans ~330 CSS px at 393 px wide, so 13
   puts each dot at roughly 6 px across — still reading as dots rather than as blurred
   type, which is the whole point of the treatment. Going finer (9 gives a prettier
   contour on a desktop) drops the dots under 4 px on a phone and the texture disappears;
   coarser than ~15 starts eating the crossbars of E.                                  */
const TEXT = 'CADENCE'
const FONT_PX = 140
const TRACKING_EM = 0.14
const STEP = 13
const DOT_R = 4 // dot radius in viewBox units: 0.4 pitch, so dots never touch

/* ── sweep, must match the keyframes in index.html ───────────────────────────── */
const SWEEP_START_S = 0.28
const SWEEP_SPAN_S = 1.15

const { dots, width, height } = layOut(
  await sampleDots({ text: TEXT, fontPx: FONT_PX, trackingEm: TRACKING_EM, step: STEP }),
)

// One delay per column, not per dot: the custom property inherits, so a column's dots share
// their group's --d and the markup carries 40-odd delays instead of 160-odd.
const columns = new Map()
for (const [x, y] of dots) columns.set(x, [...(columns.get(x) ?? []), y])
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

// The playhead's travel is geometry, so it is emitted with the markup rather than hardcoded
// in the stylesheet: the keyframes read it back as var(--travel). The rect straddles x=0 so
// translating it by a column's x centres it on that column.
const beat =
  `        <rect class="cd-splash__beat" x="-6" y="0" width="12" height="${height}" rx="6"` +
  ` style="--travel:${width - UNIT}px"/>`

console.error(
  `${dots.length} dots in ${xs.length} columns; ` +
    `sweep ${SWEEP_START_S}s → ${(SWEEP_START_S + SWEEP_SPAN_S).toFixed(2)}s`,
)
console.log(
  `      <svg class="cd-splash__matrix" viewBox="0 0 ${width} ${height}" aria-hidden="true" focusable="false">\n` +
    `${beat}\n        <g class="cd-splash__dots">\n${groups.join('\n')}\n        </g>\n      </svg>`,
)
