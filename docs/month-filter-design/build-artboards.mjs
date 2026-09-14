// Generates the .dc.html artboards for the month-view Event/Task filter mockup.
// Every measurement here is lifted from the shipping components (MonthViewV2, Pv2Poster,
// Pv2TodoCard, Pv2Chip, Pv2Cell, Pv2WeekRow, Pv2EventChip, Pv2BottomNav, cadence-tokens.css)
// so the three placement options differ only in where the switcher sits.
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = dirname(fileURLToPath(import.meta.url))

/* ── colour maths, copied from src/components/v2/ui/event-colors.ts ────────── */
const CHIP_INK = '#2A1420'
const ch = (h) => { const s = h.replace('#', ''); const f = s.length === 3 ? s.split('').map((c) => c + c).join('') : s; return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16)) }
const toHex = (r) => '#' + r.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')
const mix = (a, b, t) => { const x = ch(a), y = ch(b); return toHex(x.map((c, i) => c + (y[i] - c) * t)) }
const lum = (h) => { const [r, g, b] = ch(h).map((c) => { const s = c / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4 }); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
const con = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05) }
const tintOf = (h) => mix(h, '#ffffff', Math.min(0.88, Math.max(0.52, 0.9 - 0.55 * lum(h))))
const shadeOf = (h) => mix(h, CHIP_INK, 0.6)
const readableInkOn = (h) => (con(h, '#ffffff') >= con(h, CHIP_INK) ? '#ffffff' : CHIP_INK)

/* ── tokens (src/css/cadence-tokens.css) ──────────────────────────────────── */
const T = {
  canvas: '#ffffff', ink: '#000000', ink2: '#666666', ink3: '#8E8E8E', ink4: '#B5B5B5',
  line: '#E4E4E4', lineSoft: '#EFEFEF', accent: '#DE6E8C', accentRgb: '222, 110, 140',
  onAccent: '#ffffff', holiday: '#BC7088', fill: '#F3F3F3'
}

/* ── geometry (month-lanes.ts + the components' own paddings) ─────────────── */
const FRAME_W = 393, FRAME_H = 852, SAFE_TOP = 44
const GRID_W = FRAME_W - 16            // .mv2__body padding: 6px 8px
const COL = GRID_W / 7                 // 53.857…px — never rounded
const BARS_TOP = 38                    // CELL.padTop 4 + headH 20 + festivalH 11 + headGap 3
const LANE_STEP = 17                   // CELL.chipH 15 + CELL.chipGap 2
const ROW_MAX_H = 92                   // rowHeightForLanes(3)

/* ── September 2026, week starting Sunday ────────────────────────────────── */
// Global cell index: Aug 30 = 0, so a September day d sits at index d + 1.
const idxOf = (d) => d + 1
const cellPos = (d) => ({ w: Math.floor(idxOf(d) / 7), c: idxOf(d) % 7 })
const TODAY = 14
const FESTIVALS = { 25: { name: '中秋節', holiday: true } }

const CELLS = []
for (let i = 0; i < 35; i++) {
  const d = i - 1
  if (d < 1) CELLS.push({ num: 30 + i, outside: true })            // Aug 30, Aug 31
  else if (d > 30) CELLS.push({ num: d - 30, outside: true })       // Oct 1–3
  else CELLS.push({ num: d, outside: false, today: d === TODAY, fest: FESTIVALS[d] ?? null })
}

/* ── sample content ───────────────────────────────────────────────────────── */
// Events: what is on the calendar. Colours are real palette entries (event-colors.ts).
const EVENTS = [
  { d: 1, span: 1, allDay: false, title: '晨會', color: '#3B8FD9' },
  { d: 2, span: 1, allDay: false, title: '設計評審', color: '#EC5093' },
  { d: 3, span: 3, allDay: true, title: '台中出差', color: '#6863B0' },
  { d: 8, span: 1, allDay: false, title: '牙醫回診', color: '#4A8B85' },
  { d: 10, span: 1, allDay: false, title: '產品週會', color: '#EC5093' },
  { d: 11, span: 1, allDay: false, title: '健身房', color: '#63996B' },
  { d: 14, span: 1, allDay: false, title: '1:1 with Ray', color: '#3B8FD9' },
  { d: 16, span: 1, allDay: false, title: '設計評審', color: '#EC5093' },
  { d: 17, span: 3, allDay: true, title: '宜蘭小旅行', color: '#63996B' },
  { d: 22, span: 1, allDay: false, title: '健身房', color: '#63996B' },
  { d: 25, span: 1, allDay: true, title: '中秋連假', color: '#D6453C' },
  { d: 29, span: 1, allDay: false, title: '季度回顧', color: '#6863B0' }
]
// Tasks: quadrant items. Colours are the four quadrants (use-theme.ts).
const Q = { do: '#EC5093', plan: '#D98BC4', quick: '#F4A9A0', later: '#C9A3B3' }
const TASKS = [
  { d: 4, span: 1, allDay: false, title: '健檢預約', color: Q.quick },
  { d: 7, span: 1, allDay: false, title: '報帳單據', color: Q.quick },
  { d: 9, span: 1, allDay: false, title: '退租通知信', color: Q.plan },
  { d: 14, span: 1, allDay: false, title: '送出季度報告', color: Q.do },
  { d: 15, span: 1, allDay: false, title: '回覆供應商報價', color: Q.quick },
  { d: 17, span: 1, allDay: false, title: '整理設計系統文件', color: Q.plan },
  { d: 21, span: 1, allDay: false, title: '訂中秋伴手禮', color: Q.quick },
  { d: 23, span: 1, allDay: false, title: '報稅資料備份', color: Q.later },
  { d: 24, span: 1, allDay: false, title: '面試回饋表', color: Q.do },
  { d: 28, span: 1, allDay: false, title: '讀完 Refactoring UI', color: Q.later },
  { d: 30, span: 1, allDay: false, title: '月結對帳', color: Q.plan }
]

/* ── lane packing, the shape utils/month-lanes.ts produces ────────────────── */
function layout(items) {
  const weeks = [[], [], [], [], []]
  for (const it of items) {
    const { w, c } = cellPos(it.d)
    if (c + it.span > 7) throw new Error(`sample span crosses a week boundary: ${it.title}`)
    weeks[w].push({ ...it, col: c })
  }
  return weeks.map((week) => {
    week.sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.col - b.col || b.span - a.span || a.title.localeCompare(b.title))
    const lanes = []
    return week.map((bar) => {
      let lane = 0
      while (lanes[lane]?.some((o) => bar.col < o.col + o.span && o.col < bar.col + bar.span)) lane++
      ;(lanes[lane] ??= []).push(bar)
      return {
        title: bar.title,
        left: `${(bar.col * COL).toFixed(3)}px`,
        width: `${(bar.span * COL).toFixed(3)}px`,
        top: `${BARS_TOP + lane * LANE_STEP}px`,
        bg: bar.allDay ? bar.color : tintOf(bar.color),
        ink: bar.allDay ? readableInkOn(bar.color) : shadeOf(bar.color)
      }
    })
  })
}

const DATA = {
  all: layout([...EVENTS, ...TASKS]),
  events: layout(EVENTS),
  tasks: layout(TASKS)
}

/* ── static cell markup (mode-independent: only the bars change) ──────────── */
function cellMarkup(cell, weekIdx) {
  const border = weekIdx === 4 ? 'none' : `1px solid ${T.line}`
  const numStyle = cell.today
    ? `background:${T.accent};color:${T.onAccent};text-shadow:none`
    : cell.outside
      ? `color:${T.line};text-shadow:none`
      : `color:${T.ink};text-shadow:0 1px 3px rgba(255,255,255,.9),0 0 2px rgba(255,255,255,.9)`
  const f = cell.fest
  const festStyle = f
    ? (f.holiday ? `color:${T.holiday};font-weight:700` : `color:${T.ink3}`)
    : `color:${T.ink3}`
  return `<div class="cell" style="border-bottom:${border}">
            <div class="cellhead"><span class="num" style="${numStyle}">${cell.num}</span></div>
            <div class="fest" style="${festStyle}">${f ? f.name : ''}</div>
          </div>`
}

const WEEK_CELLS = [0, 1, 2, 3, 4].map((w) =>
  CELLS.slice(w * 7, w * 7 + 7).map((c) => cellMarkup(c, w)).join('\n          ')
)

/* ── the switcher ─────────────────────────────────────────────────────────── */
// 24-grid, stroke 1.7, round caps — the same drawing rules as pv2-nav-icons.ts.
// EVENTS deliberately reuses the nav's own month glyph: in this app that shape
// already means "calendar".
const ICONS = {
  all: '<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>',
  events: '<rect x="4" y="5.5" width="16" height="15" rx="3"/><path d="M4 10H20M8.5 3v3.5M15.5 3v3.5"/>',
  tasks: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.2l2.4 2.4 4.6-4.9"/>'
}
const svg = (paths) => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`

const SEG_W = 44, SEG_H = 36, TRACK_PAD = 4
const TRACK_W = SEG_W * 3 + TRACK_PAD * 2   // 140
const TRACK_H = SEG_H + TRACK_PAD * 2       // 44

// extraStyle lets each placement position the same control differently.
function switcher(extraStyle) {
  const seg = (key, label, hole, handler, pressed) => `
      <button type="button" class="seg" aria-label="${label}" aria-pressed="{{${pressed}}}" onClick="{{${handler}}}" style="color: {{${hole}}}">${svg(ICONS[key])}</button>`
  return `<div class="sw" role="group" aria-label="月曆顯示內容" style="${extraStyle}">
      <div class="sw__thumb" style="transform: translateX({{thumbX}}px)"></div>${seg('all', '全部', 'cAll', 'pickAll', 'pAll')}${seg('events', '只看行事曆', 'cEvents', 'pickEvents', 'pEvents')}${seg('tasks', '只看待辦', 'cTasks', 'pickTasks', 'pTasks')}
    </div>`
}

/* ── bottom nav (Pv2BottomNav) ────────────────────────────────────────────── */
const NAV_ICONS = {
  month: '<rect x="4" y="5.5" width="16" height="15" rx="3"/><path d="M4 10H20M8.5 3v3.5M15.5 3v3.5"/>',
  day: '<circle cx="5" cy="7" r="1.1" fill="currentColor" stroke="none"/><path d="M9 7H20"/><circle cx="5" cy="12" r="1.1" fill="currentColor" stroke="none"/><path d="M9 12H20"/><circle cx="5" cy="17" r="1.1" fill="currentColor" stroke="none"/><path d="M9 17H20"/>',
  notes: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/>',
  setting: '<circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v3M12 18.5v3M4.5 12h-3M22.5 12h-3M6.3 6.3L4.2 4.2M19.8 19.8l-2.1-2.1M17.7 6.3l2.1-2.1M4.2 19.8l2.1-2.1"/>'
}
const navSvg = (paths) => `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`
const NAV = `<nav class="nav">
      <div class="nav__pill"></div>
      ${[['month', 'month', true], ['day', 'day', false], ['notes', 'notes', false], ['setting', 'setting', false]]
        .map(([k, label, on]) => `<div class="nav__item"><span class="nav__icon" style="color:${on ? T.accent : T.ink3}">${navSvg(NAV_ICONS[k])}</span><span class="nav__label" style="color:${on ? T.accent : T.ink3}">${label}</span></div>`)
        .join('\n      ')}
    </nav>`

/* ── weekday header ───────────────────────────────────────────────────────── */
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  .map((w, i) => `<span class="wd" style="color:${i === 0 ? T.holiday : T.ink3}">${w}</span>`).join('')

/* ── todo cards (Pv2TodoCard) ─────────────────────────────────────────────── */
const card = (label, more, dotColor, title) => `<div class="todo">
        <div class="todo__head"><span class="todo__label">${label}</span>${more ? `<span class="todo__more">+${more}</span>` : ''}</div>
        <div class="todo__item"><span class="todo__dot" style="background:${dotColor}"></span><span class="todo__title">${title}</span></div>
      </div>`
const CARDS = `<div class="todos">
      ${card("TODAY'S TASKS", 0, Q.do, '送出季度報告')}
      ${card('UP NEXT 7 DAYS', 1, Q.quick, '回覆供應商報價')}
    </div>`

/* ── calendar filter chips (Pv2Chip) ──────────────────────────────────────── */
const chip = (label, on) => `<span class="chip-tab${on ? ' chip-tab--on' : ''}">#${label}</span>`
const CHIPS = [['個人', true], ['工作', true], ['家庭', false], ['健身', false], ['共享行事曆', false]]
  .map(([l, on]) => chip(l, on)).join('')

/* ── page assembly ────────────────────────────────────────────────────────── */
const STYLE = `
    body { margin: 0; font-family: 'Inter', 'Noto Sans TC', sans-serif; -webkit-font-smoothing: antialiased; }
    a { color: ${T.accent}; } a:hover { color: #C55A78; }
    * { box-sizing: border-box; }

    .frame {
      position: relative; width: ${FRAME_W}px; height: ${FRAME_H}px;
      display: flex; flex-direction: column; overflow: hidden;
      background: ${T.canvas}; padding-top: ${SAFE_TOP}px;
    }
    .body { flex: 1; min-height: 0; display: flex; flex-direction: column; padding: 6px 8px 91px; }

    /* Pv2Poster — 9cqw of a 377px container, i.e. 33.93px */
    .poster { position: relative; display: flex; flex-direction: column; align-items: center; padding: 30px 0 0; }
    .poster__month { font-weight: 800; font-size: 33.93px; letter-spacing: -0.01em; line-height: 0.9; color: ${T.ink}; }

    /* Pv2TodoCard */
    .todos { display: flex; align-items: stretch; gap: 10px; margin-top: 20px; padding: 0 16px; }
    .todo { flex: 1; min-width: 0; padding: 18px 16px 20px; border-radius: 18px; background: #fff;
            box-shadow: 0 2px 10px rgba(0,0,0,.06); display: flex; flex-direction: column; gap: 13px; }
    .todo__head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .todo__label { font: 500 10px 'Inter', sans-serif; letter-spacing: .06em; color: ${T.ink3}; }
    .todo__more { font: 500 10px 'Inter', sans-serif; color: ${T.ink3}; }
    .todo__item { display: flex; align-items: center; gap: 7px; min-width: 0; }
    .todo__dot { flex: none; width: 4px; height: 13px; border-radius: 3px; }
    .todo__title { min-width: 0; font: 700 13px 'Inter','Noto Sans TC',sans-serif; color: ${T.ink};
                   white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    /* Pv2CalStrip / Pv2Chip */
    .strip { position: relative; margin-top: 20px; display: flex; align-items: center; }
    .strip__row { display: flex; gap: 6px; overflow: hidden; padding: 0 0 6px; }
    .chip-tab { flex: none; display: inline-flex; align-items: center; padding: 6px 11px; border-radius: 999px;
                border: 1px solid ${T.line}; font: 600 11px 'Inter','Noto Sans TC',sans-serif; line-height: 1;
                letter-spacing: .02em; color: ${T.ink3}; white-space: nowrap; }
    .chip-tab--on { background: rgba(${T.accentRgb}, .12); border-color: transparent; color: ${T.accent}; }
    .strip__fade { position: absolute; top: 0; right: 0; bottom: 6px; width: 40px;
                   background: linear-gradient(90deg, rgba(255,255,255,0), #fff); pointer-events: none; }

    /* Pv2WeekdayHeader */
    .weekdays { margin-top: 10px; display: grid; grid-template-columns: repeat(7, 1fr); padding-bottom: 6px; }
    .wd { text-align: center; font: 600 11px 'Inter', sans-serif; letter-spacing: .02em; }

    /* Pv2Grid / Pv2WeekRow / Pv2Cell / Pv2EventChip */
    .grid { flex: 1; min-height: 0; max-height: ${5 * ROW_MAX_H}px; display: grid; grid-auto-rows: 1fr;
            border-top: 1px solid ${T.lineSoft}; }
    .week { position: relative; min-height: 0; display: grid; grid-template-columns: repeat(7, 1fr); }
    .cell { position: relative; min-height: 0; overflow: hidden; padding: 4px 2px 5px; }
    .cellhead { display: flex; align-items: center; justify-content: center; }
    .num { display: inline-grid; place-items: center; min-width: 20px; height: 20px; padding: 0 3px;
           border-radius: 999px; font: 700 13px 'Inter', sans-serif; line-height: 1; }
    .fest { height: 11px; margin-top: 1px; overflow: hidden; text-align: center;
            font: 500 8px/11px 'Inter','Noto Sans TC',sans-serif; white-space: nowrap; }
    .bars { position: absolute; inset-inline: 0; top: 0; bottom: 0; pointer-events: none; overflow: hidden; }
    .bar { position: absolute; padding-inline: 2px; }
    .chip { display: flex; align-items: center; max-width: 100%; height: 15px; border-radius: 6px;
            padding: 2px 4px; font: 700 9px/1.2 'Inter','Noto Sans TC',sans-serif; letter-spacing: -.02em;
            white-space: nowrap; overflow: hidden; }

    /* ── the switcher: Pv2BottomNav's glass recipe, in a capsule ───────────── */
    .sw { position: relative; flex: none; display: flex; align-items: center;
          width: ${TRACK_W}px; height: ${TRACK_H}px; padding: ${TRACK_PAD}px; border-radius: 999px;
          border: 1px solid rgba(255,255,255,.55);
          background: linear-gradient(180deg, rgba(255,255,255,.72), rgba(255,255,255,.46)), #fff;
          backdrop-filter: blur(22px) saturate(140%); -webkit-backdrop-filter: blur(22px) saturate(140%);
          box-shadow: 0 0 40px -12px rgba(40,38,30,.44); }
    .sw__thumb { position: absolute; top: ${TRACK_PAD}px; left: ${TRACK_PAD}px;
                 width: ${SEG_W}px; height: ${SEG_H}px; border-radius: 999px;
                 background: linear-gradient(160deg, rgba(255,255,255,.55), rgba(255,255,255,.18)), rgba(${T.accentRgb}, .12);
                 backdrop-filter: blur(14px) saturate(160%); -webkit-backdrop-filter: blur(14px) saturate(160%);
                 border: 1px solid rgba(255,255,255,.5);
                 box-shadow: inset 0 1px 2px rgba(255,255,255,.6), 0 2px 8px rgba(0,0,0,.12);
                 transition: transform .42s cubic-bezier(.34,1.56,.64,1); }
    .seg { position: relative; z-index: 1; flex: none; display: grid; place-items: center;
           width: ${SEG_W}px; height: ${SEG_H}px; border: none; background: none; padding: 0; cursor: pointer;
           transition: color .18s cubic-bezier(.22,1,.36,1); }
    @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
      .sw { background: #fff; }
      .sw__thumb { background: rgba(${T.accentRgb}, .16); }
    }

    /* Pv2BottomNav */
    .nav { position: absolute; left: 16px; right: 16px; bottom: 14px; z-index: 20;
           display: grid; grid-template-columns: repeat(4, 1fr); padding: 10px; border-radius: 999px;
           border: 1px solid rgba(255,255,255,.55);
           background: linear-gradient(180deg, rgba(255,255,255,.72), rgba(255,255,255,.46)), #fff;
           backdrop-filter: blur(22px) saturate(140%); box-shadow: 0 0 40px -12px rgba(40,38,30,.44); }
    .nav__pill { position: absolute; top: 10px; bottom: 10px; left: 10px; width: calc((100% - 20px) / 4);
                 border-radius: 20px;
                 background: linear-gradient(160deg, rgba(255,255,255,.55), rgba(255,255,255,.18)), rgba(${T.accentRgb}, .12);
                 border: 1px solid rgba(255,255,255,.5);
                 box-shadow: inset 0 1px 2px rgba(255,255,255,.6), 0 2px 8px rgba(0,0,0,.12); }
    .nav__item { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center;
                 gap: 4px; padding: 8px 4px; }
    .nav__icon { display: grid; place-items: center; width: 24px; height: 24px; }
    .nav__label { font: 400 9px 'Inter', sans-serif; letter-spacing: .1em; text-transform: uppercase; }
`

function weekMarkup(w, barsHole) {
  return `<div class="week">
          ${WEEK_CELLS[w]}
          <div class="bars">
            <sc-for list="{{${barsHole}}}" as="b" hint-placeholder-count="2">
              <div class="bar" style="left: {{b.left}}; width: {{b.width}}; top: {{b.top}}">
                <span class="chip" style="background: {{b.bg}}; color: {{b.ink}}">{{b.title}}</span>
              </div>
            </sc-for>
          </div>
        </div>`
}
const GRID = `<div class="grid">
        ${[0, 1, 2, 3, 4].map((w) => weekMarkup(w, `bars${w}`)).join('\n        ')}
      </div>`

const LOGIC = `
const DATA = ${JSON.stringify(DATA)};
const ACC = '${T.accent}';
const MUT = '${T.ink3}';
const ORDER = ['all', 'events', 'tasks'];

class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = { mode: props.mode ?? 'all' };
  }
  renderVals() {
    const mode = ORDER.includes(this.state.mode) ? this.state.mode : 'all';
    const weeks = DATA[mode];
    const pick = (m) => () => this.setState({ mode: m });
    return {
      bars0: weeks[0], bars1: weeks[1], bars2: weeks[2], bars3: weeks[3], bars4: weeks[4],
      thumbX: String(ORDER.indexOf(mode) * ${SEG_W}),
      cAll: mode === 'all' ? ACC : MUT,
      cEvents: mode === 'events' ? ACC : MUT,
      cTasks: mode === 'tasks' ? ACC : MUT,
      pAll: mode === 'all' ? 'true' : 'false',
      pEvents: mode === 'events' ? 'true' : 'false',
      pTasks: mode === 'tasks' ? 'true' : 'false',
      pickAll: pick('all'), pickEvents: pick('events'), pickTasks: pick('tasks')
    };
  }
}`

const PROPS = `{"mode":{"editor":"enum","options":["all","events","tasks"],"default":"all","section":"顯示"},"$preview":{"width":${FRAME_W},"height":${FRAME_H}}}`

function page(bodyMarkup) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+TC:wght@400;500;600;700&display=swap">
  <style>${STYLE}  </style>
</helmet>
${bodyMarkup}
</x-dc>
<script data-dc-script data-props='${PROPS}'>${LOGIC}
</script>
</body>
</html>
`
}

/* ── Option A: trailing edge of the poster row ────────────────────────────── */
const optionA = page(`<div class="frame">
    <div class="body">
      <div class="poster">
        <span class="poster__month">September</span>
        ${switcher('position: absolute; right: 16px; top: 23px;')}
      </div>
      ${CARDS}
      <div class="strip"><div class="strip__row">${CHIPS}</div><div class="strip__fade"></div></div>
      <div class="weekdays">${WD}</div>
      ${GRID}
    </div>
    ${NAV}
  </div>`)

/* ── Option B (Main): pinned at the head of the filter strip ──────────────── */
const optionB = page(`<div class="frame">
    <div class="body">
      <div class="poster"><span class="poster__month">September</span></div>
      ${CARDS}
      <div class="strip">
        ${switcher('margin-right: 10px; margin-bottom: 6px;')}
        <div style="width: 1px; height: 22px; margin-right: 10px; margin-bottom: 6px; background: ${T.lineSoft};"></div>
        <div class="strip__row" style="flex: 1; min-width: 0;">${CHIPS}</div>
        <div class="strip__fade"></div>
      </div>
      <div class="weekdays">${WD}</div>
      ${GRID}
    </div>
    ${NAV}
  </div>`)

/* ── Option C: floating island above the bottom nav ───────────────────────── */
const optionC = page(`<div class="frame">
    <div class="body">
      <div class="poster"><span class="poster__month">September</span></div>
      ${CARDS}
      <div class="strip"><div class="strip__row">${CHIPS}</div><div class="strip__fade"></div></div>
      <div class="weekdays">${WD}</div>
      ${GRID}
    </div>
    ${switcher(`position: absolute; z-index: 21; left: 50%; margin-left: ${-TRACK_W / 2}px; bottom: 103px;`)}
    ${NAV}
  </div>`)

writeFileSync(join(OUT, 'OptionA.dc.html'), optionA)
writeFileSync(join(OUT, 'Main.dc.html'), optionB)
writeFileSync(join(OUT, 'OptionC.dc.html'), optionC)
console.log('wrote OptionA.dc.html, Main.dc.html, OptionC.dc.html')
