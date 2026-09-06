// Emits the four .dc.html artboards for the month-density comparison.
// Every metric below is lifted from the app's own source, not from the screenshot:
//   CELL (src/utils/month-lanes.ts), Pv2Cell/Pv2EventChip/Pv2Grid/Pv2WeekRow,
//   Pv2Poster/Pv2CalStrip/Pv2Chip/Pv2WeekdayHeader/Pv2BottomNav, cadence-tokens.css.
import { writeFileSync } from 'node:fs'

const CELL = { padTop: 4, padBottom: 5, headGap: 3, headH: 20, chipH: 15, chipGap: 2 }

// --- frame -----------------------------------------------------------------
const FRAME_W = 402
const FRAME_H = 874
const STATUS_H = 59      // the OS status bar draws here; --pv2-safe-top is 0 so the app paints under it
const NAV_H = 91         // --pv2-nav-inset 14 + --pv2-nav-pill-h 77
const BODY_PAD_TOP = 6
const BODY_PAD_X = 8

// heights of everything above the grid, from the real components
const POSTER_H = 25 + Math.round(48 * 0.9) + 8 + 15 + 25   // padding 25/25, month 48px/0.9, gap 8, year ~15
const STRIP_H = 18 + (6 + 10 + 6 + 2) + 6                  // margin-top 18, chip 6+10+6+2 border, row padding-bottom 6
const WD_H = 10 + 11 + 6                                   // margin-top 10, 9px line, padding-bottom 6
const GRID_H = FRAME_H - STATUS_H - BODY_PAD_TOP - NAV_H - POSTER_H - STRIP_H - WD_H

const rowH = (lanes) => CELL.padTop + CELL.headH + CELL.headGap + lanes * CELL.chipH + (lanes - 1) * CELL.chipGap + CELL.padBottom

// --- palette (src/components/v2/ui/event-colors.ts) ------------------------
const C = { rose: '#D65179', lilac: '#8E6FB0', violet: '#9B72D4', indigo: '#6863B0', sky: '#3B8FD9', teal: '#4A8B85' }

const mix = (hex, target, amt) => {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
  const [r, g, b] = p(hex), [tr, tg, tb] = p(target)
  const c = (a, t) => Math.round(a + (t - a) * amt).toString(16).padStart(2, '0')
  return `#${c(r, tr)}${c(g, tg)}${c(b, tb)}`
}

// --- data: September 2026, exactly what the screenshot shows ----------------
const ev = (title, color, allDay = false) => ({ title, color, allDay })
const D = {
  '8-30': [ev('燈光助理（', C.rose, true), ev('直覺徵選', C.lilac)],
  '8-31': [ev('React', C.sky), ev('⚪', C.teal), ev('市民大道牽', C.teal), ev('💃', C.sky)],
  '9-2': [ev('燈光助理（', C.rose, true), ev('英文課', C.violet), ev('💃', C.sky)],
  '9-3': [ev('文法英文講', C.sky)],
  '9-5': [ev('聽讀雅思', C.teal)],
  '9-7': [ev('燈光助理（', C.rose, true)],
  '9-9': [ev('燈光助理（', C.rose, true), ev('英文課', C.violet), ev('💃', C.sky)],
  '9-10': [ev('燈光助理（', C.rose, true), ev('文法英文講', C.sky)],
  '9-11': [ev('燈光師（蘇', C.rose, true)],
  '9-12': [ev('Cake 職缺(', C.indigo), ev('聽讀雅思', C.teal)],
  '9-16': [ev('💃', C.sky)],
  '9-17': [ev('文法英文講', C.sky)],
  '9-19': [ev('燈光助理（', C.rose, true), ev('聽讀雅思', C.teal)],
  '9-20': [ev('燈光助理（', C.rose, true)],
  '9-23': [ev('💃', C.sky)],
  '9-24': [ev('文法英文講', C.sky)],
  '9-26': [ev('聽讀雅思', C.teal)],
  '9-27': [ev('🐱🌻', C.rose, true)],
  '9-30': [ev('💃', C.sky)],
  '10-1': [ev('文法英文講', C.sky)],
  '10-3': [ev('方婚禮！', C.rose, true), ev('聽讀雅思', C.teal)]
}
const cell = (m, n, outside = false, today = false) => ({ m, n, outside, today, events: D[`${m}-${n}`] ?? [] })
const WEEKS = [
  [cell(8, 30, true), cell(8, 31, true), cell(9, 1), cell(9, 2), cell(9, 3), cell(9, 4), cell(9, 5)],
  [cell(9, 6), cell(9, 7, false, true), cell(9, 8), cell(9, 9), cell(9, 10), cell(9, 11), cell(9, 12)],
  [cell(9, 13), cell(9, 14), cell(9, 15), cell(9, 16), cell(9, 17), cell(9, 18), cell(9, 19)],
  [cell(9, 20), cell(9, 21), cell(9, 22), cell(9, 23), cell(9, 24), cell(9, 25), cell(9, 26)],
  [cell(9, 27), cell(9, 28), cell(9, 29), cell(9, 30), cell(10, 1, true), cell(10, 2, true), cell(10, 3, true)]
]

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// --- pieces ----------------------------------------------------------------
function chip(e, filled) {
  const base = `display:flex;align-items:center;height:${CELL.chipH}px;box-sizing:border-box;border-radius:6px;font:700 9px/1.2 'Inter','Noto Sans TC',sans-serif;letter-spacing:-0.02em;`
  let skin
  if (e.allDay) skin = `background:${e.color};color:#fff;padding:3px 3px;`
  else if (filled) skin = `background:${mix(e.color, '#ffffff', 0.78)};color:${mix(e.color, '#000000', 0.36)};padding:3px 4px;`
  else skin = `border:1px solid ${e.color};color:${e.color};background:#fff;padding:1px 3px;`
  return `<span style="${base}${skin}"><span style="display:block;width:100%;white-space:nowrap;overflow:hidden">${esc(e.title)}</span></span>`
}

function dayCell(c, lanes, lastRow, filled) {
  const shown = c.events.slice(0, lanes)
  const hidden = c.events.length - shown.length
  const numSkin = c.today
    ? 'background:#1b1b1b;color:#fafaf9;'
    : c.outside
      ? 'color:#cdcdcd;'
      : 'color:#1b1b1b;text-shadow:0 1px 3px rgba(250,250,249,.9),0 0 2px rgba(250,250,249,.9);'
  // Moved out of the cell's bottom-right (Pv2Cell's current spot): with a tight lane budget the
  // last chip lands on top of it, so it rides the day-number row instead.
  const more = hidden > 0
    ? `<span style="position:absolute;right:3px;top:8px;font:400 8px 'Inter',sans-serif;color:#b2b2b2">+${hidden}</span>`
    : ''
  return `      <div style="position:relative;min-height:0;overflow:hidden;${lastRow ? '' : 'border-bottom:1px solid #cdcdcd;'}padding:${CELL.padTop}px 2px ${CELL.padBottom}px;box-sizing:border-box">
        <div style="display:flex;align-items:center;justify-content:center;height:${CELL.headH}px">
          <span style="display:inline-grid;place-items:center;min-width:20px;height:20px;padding:0 3px;border-radius:999px;font:700 13px/1 'Inter',sans-serif;${numSkin}">${c.n}</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:${CELL.chipGap}px;margin-top:${CELL.headGap}px">
${shown.map((e) => '          ' + chip(e, filled)).join('\n')}
        </div>${more}
      </div>`
}

function grid({ lanes, rowHeight, filled }) {
  const rows = WEEKS.map((w, i) => {
    const last = i === WEEKS.length - 1
    return `    <div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));height:${rowHeight}px">
${w.map((c) => dayCell(c, lanes, last, filled)).join('\n')}
    </div>`
  })
  return `  <div style="display:flex;flex-direction:column;border-top:1px solid #e2e2e2">
${rows.join('\n')}
  </div>`
}

const NAV_ICONS = {
  month: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5.5" width="16" height="15" rx="3"/><path d="M4 10H20M8.5 3v3.5M15.5 3v3.5"/></svg>',
  day: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="7" r="1.1" fill="currentColor" stroke="none"/><path d="M9 7H20"/><circle cx="5" cy="12" r="1.1" fill="currentColor" stroke="none"/><path d="M9 12H20"/><circle cx="5" cy="17" r="1.1" fill="currentColor" stroke="none"/><path d="M9 17H20"/></svg>',
  notes: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/></svg>',
  setting: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v3M12 18.5v3M4.5 12h-3M22.5 12h-3M6.3 6.3L4.2 4.2M19.8 19.8l-2.1-2.1M17.7 6.3l2.1-2.1M4.2 19.8l2.1-2.1"/></svg>'
}

function nav() {
  const items = [['month', 'MONTH'], ['day', 'DAY'], ['notes', 'NOTES'], ['setting', 'SETTING']]
  const colW = (FRAME_W - 32 - 20) / 4
  const cells = items.map(([k, label], i) => {
    const on = i === 0
    return `      <div style="position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 4px">
        <span style="display:grid;place-items:center;width:24px;height:24px;color:${on ? '#56585E' : '#9a9a95'}">${NAV_ICONS[k]}</span>
        <span style="font:400 9px 'Inter',sans-serif;letter-spacing:0.1em;text-transform:uppercase;color:${on ? '#56585E' : '#9a9a95'}">${label}</span>
      </div>`
  })
  return `    <div style="position:absolute;left:16px;right:16px;bottom:14px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));padding:11px 10px;box-sizing:border-box;border-radius:999px;border:1px solid rgba(255,255,255,.55);background:linear-gradient(180deg,rgba(255,255,255,.72),rgba(255,255,255,.46)),#FBFAF7;box-shadow:0 0 40px -12px rgba(60,60,60,.44)">
      <div style="position:absolute;top:11px;bottom:11px;left:10px;width:${colW}px;border-radius:20px;background:linear-gradient(160deg,rgba(255,255,255,.55),rgba(255,255,255,.18)),rgba(86,88,94,.08);border:1px solid rgba(255,255,255,.5);box-shadow:inset 0 1px 2px rgba(255,255,255,.6),0 2px 8px rgba(86,88,94,.18)"></div>
${cells.join('\n')}
    </div>`
}

// The user's own wallpaper stands in for Pv2PageBackdrop's image + scrim: pale paper with
// soft yellow sparkles, drawn rather than embedded so nothing depends on a binary asset.
function backdrop() {
  const stars = [[24, 300, 90, 0.5], [300, 190, 130, 0.42], [96, 470, 150, 0.4], [270, 560, 110, 0.45], [10, 640, 120, 0.36], [250, 760, 160, 0.4], [150, 120, 70, 0.3]]
  const shapes = stars.map(([x, y, s, o]) =>
    `<path d="M${x + s / 2} ${y} C${x + s / 2 + s * 0.06} ${y + s * 0.36} ${x + s * 0.64} ${y + s * 0.44} ${x + s} ${y + s / 2} C${x + s * 0.64} ${y + s * 0.56} ${x + s / 2 + s * 0.06} ${y + s * 0.64} ${x + s / 2} ${y + s} C${x + s / 2 - s * 0.06} ${y + s * 0.64} ${x + s * 0.36} ${y + s * 0.56} ${x} ${y + s / 2} C${x + s * 0.36} ${y + s * 0.44} ${x + s / 2 - s * 0.06} ${y + s * 0.36} ${x + s / 2} ${y}Z" fill="#f2d873" opacity="${o}"/>`
  ).join('')
  return `    <svg width="${FRAME_W}" height="${FRAME_H}" viewBox="0 0 ${FRAME_W} ${FRAME_H}" style="position:absolute;inset:0;z-index:0" aria-hidden="true"><rect width="${FRAME_W}" height="${FRAME_H}" fill="#faf7f0"/><g filter="url(#sb)">${shapes}</g><filter id="sb"><feGaussianBlur stdDeviation="1.6"/></filter></svg>`
}

const sparkle = (x, y, s, o) =>
  `<path d="M${x + s / 2} ${y} C${x + s / 2 + s * 0.06} ${y + s * 0.36} ${x + s * 0.64} ${y + s * 0.44} ${x + s} ${y + s / 2} C${x + s * 0.64} ${y + s * 0.56} ${x + s / 2 + s * 0.06} ${y + s * 0.64} ${x + s / 2} ${y + s} C${x + s / 2 - s * 0.06} ${y + s * 0.64} ${x + s * 0.36} ${y + s * 0.56} ${x} ${y + s / 2} C${x + s * 0.36} ${y + s * 0.44} ${x + s / 2 - s * 0.06} ${y + s * 0.36} ${x + s / 2} ${y}Z" fill="#eccf6b" opacity="${o}"/>`

// PLACEHOLDER artwork for the two cut-out (transparent-PNG) slots. Line art on nothing, so it
// sits on the white the way a real cut-out would; swap for the user's own asset.
function topSlot(h) {
  return `    <svg width="${FRAME_W}" height="${h}" viewBox="0 0 ${FRAME_W} ${h}" style="position:absolute;left:0;top:0;z-index:0" aria-hidden="true">
      ${sparkle(326, 34, 34, 0.85)}${sparkle(364, 84, 20, 0.6)}${sparkle(30, 96, 22, 0.55)}${sparkle(292, 108, 13, 0.45)}
    </svg>`
}

function bottomSlot(top, h) {
  return `    <svg width="${FRAME_W}" height="${h}" viewBox="0 0 402 122" style="position:absolute;left:0;top:${top}px;z-index:0" aria-hidden="true">
      <g stroke="#b3a894" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <path d="M60 106 L104 95 L104 58 L60 69 Z" fill="#ffffff"/>
        <path d="M104 95 L148 106 L148 69 L104 58 Z" fill="#ffffff"/>
        <path d="M104 58 L104 95"/>
        <path d="M70 78 L94 72M70 88 L94 82M114 72 L138 78M114 82 L138 88" opacity="0.6"/>
        <path d="M196 68 h40 v26 a11 11 0 0 1 -11 11 h-18 a11 11 0 0 1 -11 -11 Z" fill="rgba(214,81,121,.10)"/>
        <path d="M236 74 a11 11 0 0 1 0 20"/>
        <path d="M206 56 c4 -6 -4 -10 0 -16M220 56 c4 -6 -4 -10 0 -16" opacity="0.7"/>
        <path d="M300 92 h38 l-5 21 h-28 Z" fill="rgba(74,139,133,.10)"/>
        <path d="M319 92 v-22"/>
        <path d="M319 78 c-14 -2 -18 -12 -16 -20 9 -1 16 6 16 14" fill="rgba(74,139,133,.14)"/>
        <path d="M319 84 c13 -3 17 -13 15 -21 -9 -1 -15 7 -15 15" fill="rgba(74,139,133,.14)"/>
        <path d="M44 113 H358" opacity="0.35"/>
      </g>
      ${sparkle(360, 40, 18, 0.5)}${sparkle(36, 52, 14, 0.45)}
    </svg>`
}

function artboard({ lanes, rowHeight, filled, chrome }) {
  const topBandH = STATUS_H + BODY_PAD_TOP + POSTER_H
  const gridBottom = topBandH + STRIP_H + WD_H + 1 + rowHeight * WEEKS.length
  const bottomBandTop = gridBottom + 8
  const bottomBandH = Math.max(0, FRAME_H - NAV_H - bottomBandTop)
  const white = chrome === 'white-slots'
  const layers = white
    ? `    <div style="position:absolute;inset:0;z-index:0;background:#fafaf9"></div>\n${topSlot(topBandH)}\n${bottomSlot(bottomBandTop, bottomBandH)}`
    : backdrop()
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"><\/script>
</head>
<body>
<x-dc>
<helmet>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,600;0,700;0,800;1,400&family=Noto+Sans+TC:wght@400;500;700&display=swap">
  <style>
    body { margin: 0; }
    a { color: #56585E; } a:hover { color: #1b1b1b; }
  </style>
</helmet>
<div style="position:relative;width:${FRAME_W}px;height:${FRAME_H}px;overflow:hidden;background:#fafaf9;font-family:'Inter','Noto Sans TC',sans-serif">
${layers}
  <div style="position:relative;z-index:2;display:flex;flex-direction:column;height:100%;box-sizing:border-box;padding:${STATUS_H + BODY_PAD_TOP}px ${BODY_PAD_X}px ${NAV_H}px">
    <div style="display:flex;flex-direction:column;align-items:center;padding:25px 0">
      <span style="font:italic 400 48px/0.9 'Inter',sans-serif;color:#1b1b1b">September</span>
      <span style="margin-top:8px;font:600 12px 'Inter',sans-serif;letter-spacing:0.16em;color:#1b1b1b">2026</span>
    </div>
    <div style="display:flex;gap:6px;margin-top:18px;padding-bottom:6px;overflow:hidden">
      <span style="flex:none;display:inline-flex;align-items:center;padding:6px 11px;border-radius:999px;border:1px solid #1b1b1b;background:#1b1b1b;font:600 10px/1 'Inter','Noto Sans TC',sans-serif;letter-spacing:0.03em;color:#fafaf9">#河賴瑞斯 Mo</span>
      <span style="flex:none;display:inline-flex;align-items:center;padding:6px 11px;border-radius:999px;border:1px solid #1b1b1b;background:#1b1b1b;font:600 10px/1 'Inter','Noto Sans TC',sans-serif;letter-spacing:0.03em;color:#fafaf9">#Bu</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));margin-top:10px;padding-bottom:6px">
${['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map((w) => `      <span style="text-align:center;font:600 9px 'Inter',sans-serif;letter-spacing:0.03em;color:#6e6e6e">${w}</span>`).join('\n')}
    </div>
${grid({ lanes, rowHeight, filled })}
  </div>
${nav()}
</div>
</x-dc>
<script data-dc-script data-props='{"$preview":{"width":${FRAME_W},"height":${FRAME_H}}}'>
class Component extends DCLogic {}
<\/script>
</body>
</html>
`
}

const NOW_ROW = GRID_H / WEEKS.length
const NOW_LANES = Math.max(1, Math.floor((NOW_ROW - CELL.padTop - CELL.padBottom - CELL.headGap - CELL.headH + CELL.chipGap) / (CELL.chipH + CELL.chipGap)))
const FIX_LANES = 3
const FIX_ROW = rowH(FIX_LANES)

const out = (f, s) => writeFileSync(new URL(f, import.meta.url), s)
out('Now.dc.html', artboard({ lanes: NOW_LANES, rowHeight: NOW_ROW, filled: false, chrome: 'wallpaper' }))
out('Step1.dc.html', artboard({ lanes: FIX_LANES, rowHeight: FIX_ROW, filled: false, chrome: 'wallpaper' }))
out('Step2.dc.html', artboard({ lanes: FIX_LANES, rowHeight: FIX_ROW, filled: false, chrome: 'white-slots' }))
out('Main.dc.html', artboard({ lanes: FIX_LANES, rowHeight: FIX_ROW, filled: true, chrome: 'white-slots' }))

console.log(JSON.stringify({ GRID_H, NOW_ROW, NOW_LANES, FIX_ROW, FIX_LANES, gridNow: NOW_ROW * 5, gridFix: FIX_ROW * 5, saved: (NOW_ROW - FIX_ROW) * 5 }, null, 1))
