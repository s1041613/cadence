import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const OUT = new URL('./project/', import.meta.url).pathname
mkdirSync(OUT, { recursive: true })

// ---- tokens, copied from src/css/cadence-tokens.css + use-theme.ts ----
const INK = '#000000'
const INK2 = '#666666'
const INK3 = '#8E8E8E'
const INK4 = '#B5B5B5'
const LINE_SOFT = '#EFEFEF'
const FILL = '#F3F3F3'
const ACCENT = '#DE6E8C'
// Darkened accent for text/glyphs: #DE6E8C is 3.1:1 on white and fails at these sizes.
const ACCENT_INK = '#A8425E'
const ACCENT_TINT = 'rgba(222,110,140,.12)'
const ACCENT_EDGE = 'rgba(222,110,140,.38)'
const UI = "'Inter','Noto Sans TC',sans-serif"
const MONO = "'JetBrains Mono',ui-monospace,monospace"
const Q = { do: '#EC5093', plan: '#D98BC4', quick: '#F4A9A0', later: '#C9A3B3' }

const helmet = `<helmet>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&amp;family=Noto+Sans+TC:wght@400;500;600;700&amp;family=JetBrains+Mono:wght@400;500;600&amp;display=swap">
  <style>
    body { margin: 0; font-family: ${UI}; -webkit-font-smoothing: antialiased; color: ${INK}; }
    a { color: ${ACCENT_INK}; } a:hover { color: #8C3350; }
    * { box-sizing: border-box; }
  </style>
</helmet>`

function page(title, w, h, inner) {
  return `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<title>${title}</title>
<script src="./support.js"><\/script>
</head>
<body>
<x-dc>
${helmet}
${inner}
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":${w},"height":${h}}}'>
class Component extends DCLogic {
  renderVals() { return {}; }
}
<\/script>
</body>
</html>
`
}

// ---- icons (24 grid, stroke 1.8 round — same family as the nav glyphs) ----
const svg = (d, size, stroke = 1.8) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`

const ICON_UNCHECKED = '<rect x="3" y="4" width="7.5" height="7.5" rx="2.2"/><rect x="3" y="14" width="7.5" height="7.5" rx="2.2"/><path d="M14.5 7.75H21M14.5 17.75H21"/>'
const ICON_CLOCK = '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>'
const ICON_MOVE = '<path d="M3.5 12h11"/><path d="M11 8.5 14.5 12 11 15.5"/><path d="M19.5 5v14"/>'
const ICON_TRASH = '<path d="M4.5 7h15"/><path d="M9.5 7V5.5A1.5 1.5 0 0 1 11 4h2a1.5 1.5 0 0 1 1.5 1.5V7"/><path d="M6.5 7l.8 11.2A1.8 1.8 0 0 0 9.1 20h5.8a1.8 1.8 0 0 0 1.8-1.8L17.5 7"/>'
const ICON_CHEVRON_UP = '<path d="m6 14.5 6-6 6 6"/>'
const ICON_UNDO = '<path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H9"/><path d="M8 4.5 3.5 9 8 13.5"/>'

// ---- pieces ----

/** Day header. `toggle`: 'off' | 'on' | 'none' (no unfinished tasks — the control is not drawn). */
function header({ toggle = 'off', count = 3 } = {}) {
  const on = toggle === 'on'
  const toggleBtn =
    toggle === 'none'
      ? ''
      : `<button type="button" aria-label="${on ? '隱藏' : '顯示'} ${count} 筆未完成待辦" aria-pressed="${on}" style="display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px 0 9px; border-radius: 999px; border: 1px solid ${on ? ACCENT_EDGE : 'transparent'}; background: ${on ? ACCENT_TINT : '#fff'}; box-shadow: ${on ? 'none' : '0 2px 6px rgba(0,0,0,.06)'}; color: ${on ? ACCENT_INK : INK2}; cursor: pointer;">
          ${svg(ICON_UNCHECKED, 13, 1.9)}
          <span style="font: 600 11px ${MONO}; line-height: 1;">${count}</span>
        </button>`
  return `<div style="padding: 32px 22px 0; display: flex; align-items: flex-end; justify-content: space-between; gap: 12px;">
      <div style="display: flex; align-items: flex-end; gap: 14px; min-width: 0;">
        <span style="font: 300 50px/0.9 ${UI}; color: ${INK};">19</span>
        <span style="display: flex; flex-direction: column; gap: 4px; padding-bottom: 6px;">
          <span style="font: 700 14px ${UI}; letter-spacing: .12em; color: ${INK};">SAT</span>
          <span style="font: 500 11px ${UI}; letter-spacing: .12em; color: ${INK};">SEP 2026</span>
        </span>
      </div>
      <div style="display: flex; align-items: center; gap: 8px; flex: none; padding-bottom: 2px;">
        ${toggleBtn}
        <button type="button" aria-label="回到今天" style="display: inline-flex; align-items: center; gap: 5px; height: 28px; padding: 0 11px; border: none; border-radius: 999px; background: #fff; box-shadow: 0 2px 6px rgba(0,0,0,.06); color: ${INK2}; font: 500 9.5px ${UI}; letter-spacing: .1em; text-transform: uppercase; cursor: pointer;">
          ${svg(ICON_CLOCK, 11)}
          Today
        </button>
      </div>
    </div>`
}

const ACT_BTN = (label, icon, kind) => {
  const tinted = kind === 'primary'
  return `<button type="button" aria-label="${label}" style="flex: none; display: grid; place-items: center; width: 32px; height: 32px; border-radius: 10px; border: none; background: ${tinted ? ACCENT_TINT : 'transparent'}; color: ${tinted ? ACCENT_INK : INK3}; cursor: pointer;">${svg(icon, 16)}</button>`
}

/**
 * One unfinished row. `state`: 'idle' | 'confirm' (inline delete confirmation) |
 * 'select' (Option B multi-select).
 */
function row({ title, meta, color, state = 'idle', checked = false, last = false }) {
  const rule = last ? '' : `<div style="height: 1px; background: ${LINE_SOFT}; margin-left: 27px;"></div>`
  if (state === 'confirm') {
    return `<div style="display: flex; align-items: center; gap: 10px; padding: 9px 14px; background: #FDF6F8;">
        <span style="flex: none; width: 3px; height: 30px; border-radius: 2px; background: ${color};"></span>
        <span style="flex-grow: 1; min-width: 0; font: 500 13px/17px ${UI}; color: ${INK2};">刪除「${title}」？</span>
        <button type="button" style="flex: none; height: 30px; padding: 0 10px; border: none; border-radius: 9px; background: transparent; color: ${INK2}; font: 600 12px ${UI}; cursor: pointer;">取消</button>
        <button type="button" style="flex: none; height: 30px; padding: 0 12px; border: none; border-radius: 9px; background: ${ACCENT_INK}; color: #fff; font: 600 12px ${UI}; cursor: pointer;">刪除</button>
      </div>${rule}`
  }
  const lead =
    state === 'select'
      ? `<span style="flex: none; display: grid; place-items: center; width: 20px; height: 20px; border-radius: 50%; border: 1.6px solid ${checked ? ACCENT_INK : 'rgba(0,0,0,.28)'}; background: ${checked ? ACCENT_INK : 'transparent'};">${checked ? '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7"/></svg>' : ''}</span>
       <span style="flex: none; width: 3px; height: 30px; border-radius: 2px; background: ${color};"></span>`
      : `<span style="flex: none; width: 3px; height: 30px; border-radius: 2px; background: ${color};"></span>`
  const tail =
    state === 'select'
      ? ''
      : `${ACT_BTN('移到今天', ICON_MOVE, 'primary')}${ACT_BTN('刪除', ICON_TRASH, 'quiet')}`
  const inner = `<div style="display: flex; align-items: center; gap: 10px; padding: 9px 14px;">
      ${lead}
      <span style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px;">
        <span style="font: 600 14px/18px ${UI}; color: ${INK}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${title}</span>
        <span style="font: 500 10.5px/13px ${MONO}; letter-spacing: .02em; color: ${INK3};">${meta}</span>
      </span>
      ${tail}
    </div>`
  return state === 'select'
    ? `<label style="display: block; cursor: pointer;">${inner}</label>${rule}`
    : `${inner}${rule}`
}

const ROWS = [
  { title: '送出設計稿給 Zoe', meta: '09/16 · 逾期 3 天', color: Q.do },
  { title: '訂下週的牙醫', meta: '09/17 · 逾期 2 天', color: Q.quick },
  { title: '寫 week view 的驗收筆記', meta: '09/18 · 逾期 1 天', color: Q.plan }
]

/** The unfinished panel. `variant`: 'actions' | 'confirm' | 'select'. */
function panel({ variant = 'actions' } = {}) {
  const select = variant === 'select'
  const body = ROWS.map((r, i) =>
    row({
      ...r,
      state: variant === 'confirm' && i === 1 ? 'confirm' : select ? 'select' : 'idle',
      checked: select && i !== 2,
      last: i === ROWS.length - 1
    })
  ).join('\n      ')
  const head = `<div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 12px 14px 10px;">
        <span style="font: 600 11px ${MONO}; letter-spacing: .12em; color: ${INK3};">UNFINISHED · ${ROWS.length}</span>
        ${
          select
            ? `<button type="button" style="border: none; background: none; padding: 4px 2px; font: 600 11.5px ${UI}; color: ${ACCENT_INK}; cursor: pointer;">全選</button>`
            : `<div style="display: flex; align-items: center; gap: 4px;">
          <button type="button" style="border: none; background: none; padding: 4px 6px; font: 600 11.5px ${UI}; color: ${ACCENT_INK}; cursor: pointer;">全部移到今天</button>
          <button type="button" aria-label="收起未完成待辦" style="display: grid; place-items: center; width: 24px; height: 24px; border: none; border-radius: 8px; background: none; color: ${INK3}; cursor: pointer;">${svg(ICON_CHEVRON_UP, 15)}</button>
        </div>`
        }
      </div>`
  const foot = select
    ? `<div style="display: flex; align-items: center; gap: 8px; padding: 10px 14px 12px; border-top: 1px solid ${LINE_SOFT};">
        <button type="button" style="flex-grow: 1; height: 38px; border: none; border-radius: 12px; background: ${ACCENT_INK}; color: #fff; font: 600 13px ${UI}; cursor: pointer;">移到今天 · 2</button>
        <button type="button" aria-label="刪除選取的 2 筆" style="flex: none; display: grid; place-items: center; width: 38px; height: 38px; border: none; border-radius: 12px; background: ${FILL}; color: ${INK2}; cursor: pointer;">${svg(ICON_TRASH, 17)}</button>
      </div>`
    : ''
  return `<div style="margin: 16px 22px 0; border-radius: 18px; background: #fff; border: 1px solid ${LINE_SOFT}; box-shadow: 0 1px 2px rgba(0,0,0,.04), 0 12px 28px -16px rgba(0,0,0,.22); overflow: hidden;">
      ${head}
      <div style="height: 1px; background: ${LINE_SOFT}; margin: 0 14px;"></div>
      ${body}
      ${foot}
    </div>`
}

/** The time grid behind everything. `squeeze` = px of height the open panel takes from it. */
function grid({ squeeze = 0, highlight = false } = {}) {
  const hours = ['09', '10', '11', '12', '13', '14', '15', '16']
  const lines = hours
    .map(
      (h, i) => `<div style="position: absolute; left: 0; right: 0; top: ${i * 58}px; border-top: 1px solid rgba(0,0,0,.07);"></div>
        <span style="position: absolute; left: 0; top: ${i * 58 - 7}px; font: 500 12px/14px ${UI}; color: ${INK3};">${h}</span>`
    )
    .join('\n        ')
  const block = (top, height, color, title, time, done = false, ring = false) =>
    `<div style="position: absolute; left: 44px; right: 0; top: ${top}px; height: ${height}px; border-radius: 8px; padding: 6px 12px; overflow: hidden; background: color-mix(in srgb, ${color} 10%, #fff); box-shadow: ${ring ? `0 0 0 2px ${ACCENT_EDGE}, ` : ''}0 1px 2px rgba(0,0,0,.05), 0 6px 16px -6px rgba(0,0,0,.16);">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="flex: none; display: grid; place-items: center; width: 18px; height: 18px; border-radius: 50%; border: 1.6px solid ${done ? ACCENT_INK : 'rgba(0,0,0,.28)'}; background: ${done ? ACCENT_INK : 'transparent'};"></span>
            <span style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column;">
              <span style="font: 600 15px/19px ${UI}; color: ${INK}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${title}</span>
              <span style="font: 500 12px/16px ${MONO}; color: ${INK2};">${time}</span>
            </span>
          </div>
        </div>`
  const moved = highlight ? block(58, 52, Q.do, '送出設計稿給 Zoe', '10:00', false, true) : ''
  return `<div style="flex-grow: 1; min-height: 0; display: flex; flex-direction: column; padding: ${18 - Math.min(squeeze, 6)}px 22px 0;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="flex: none; width: 58px; font: 600 11px ${MONO}; letter-spacing: .12em; color: ${INK3};">ALL-DAY</span>
        <span style="display: inline-flex; align-items: center; height: 22px; padding: 0 9px; border-radius: 6px; border-left: 3px solid ${Q.later}; background: rgba(201,163,179,.16); font: 500 12px ${UI}; color: ${INK};">團隊 offsite</span>
      </div>
      <div style="flex: none; height: 1px; background: rgba(0,0,0,.16); margin-top: 12px;"></div>
      <div style="position: relative; flex-grow: 1; min-height: 0; margin-top: 10px; overflow: hidden;">
        ${lines}
        ${moved}
        ${block(145, 74, Q.plan, '設計評審', '11:30 · 還有 1 小時')}
        ${block(290, 52, Q.quick, '回信給客戶', '14:00')}
      </div>
    </div>`
}

const nav = `<div style="position: absolute; left: 50%; bottom: 22px; transform: translateX(-50%); display: flex; align-items: center; gap: 2px; height: 56px; padding: 0 10px; border-radius: 999px; border: 1px solid rgba(255,255,255,.55); background: linear-gradient(180deg, rgba(255,255,255,.82), rgba(255,255,255,.62)), #fff; box-shadow: 0 10px 30px -12px rgba(0,0,0,.35);">
      ${['月', '週', '日', '筆記', '設定']
        .map(
          (t, i) =>
            `<span style="display: grid; place-items: center; width: 56px; height: 44px; border-radius: 999px; background: ${i === 2 ? ACCENT_TINT : 'transparent'}; font: 500 11px ${UI}; color: ${i === 2 ? ACCENT_INK : INK3};">${t}</span>`
        )
        .join('')}
    </div>`

function toast(text, action) {
  return `<div role="status" style="position: absolute; left: 22px; right: 22px; bottom: 92px; display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 14px; background: #1B1B1B; box-shadow: 0 14px 34px -16px rgba(0,0,0,.6);">
      <span style="flex-grow: 1; font: 500 13px ${UI}; color: #fff;">${text}</span>
      ${
        action
          ? `<button type="button" style="flex: none; display: inline-flex; align-items: center; gap: 5px; border: none; background: none; padding: 4px 2px; font: 600 12.5px ${UI}; color: #FFB3C6; cursor: pointer;">${svg(ICON_UNDO, 13)} ${action}</button>`
          : ''
      }
    </div>`
}

function phone(inner) {
  return `<div style="position: relative; width: 393px; height: 852px; overflow: hidden; background: #fff; display: flex; flex-direction: column;">
    ${inner}
    ${nav}
  </div>`
}

// ---- boards ----
const boards = {}

boards['Main.dc.html'] = page(
  '日檢視 · 收合',
  393,
  852,
  phone(`${header({ toggle: 'off', count: 3 })}
    ${grid()}`)
)

boards['Expanded.dc.html'] = page(
  '日檢視 · 未完成面板展開',
  393,
  852,
  phone(`${header({ toggle: 'on', count: 3 })}
    ${panel({ variant: 'actions' })}
    ${grid({ squeeze: 6 })}`)
)

boards['Confirm.dc.html'] = page(
  '刪除確認',
  393,
  852,
  phone(`${header({ toggle: 'on', count: 3 })}
    ${panel({ variant: 'confirm' })}
    ${grid({ squeeze: 6 })}`)
)

boards['Undo.dc.html'] = page(
  '移到今天之後',
  393,
  852,
  phone(`${header({ toggle: 'none' })}
    ${grid({ highlight: true })}
    ${toast('3 筆已移到今天', '復原')}`)
)

boards['Empty.dc.html'] = page(
  '沒有未完成',
  393,
  852,
  phone(`${header({ toggle: 'none' })}
    ${grid()}`)
)

boards['MultiSelect.dc.html'] = page(
  '替代方案 B · 多選',
  393,
  852,
  phone(`${header({ toggle: 'on', count: 3 })}
    ${panel({ variant: 'select' })}
    ${grid({ squeeze: 6 })}`)
)

// ---- spec sheet ----
const specPanel = (title, body) =>
  `<div style="display: flex; flex-direction: column; gap: 14px; padding: 24px 26px 26px; border-radius: 18px; background: #fff; border: 1px solid ${LINE_SOFT}; box-shadow: 0 2px 10px rgba(0,0,0,.04);">
      <span style="font: 600 11px ${UI}; letter-spacing: .14em; text-transform: uppercase; color: ${INK3};">${title}</span>
      ${body}
    </div>`

const kv = (pairs) =>
  `<div style="display: grid; grid-template-columns: 150px 1fr; gap: 8px 18px; align-items: baseline;">
      ${pairs
        .map(
          ([k, v]) =>
            `<span style="font: 500 11.5px ${UI}; color: ${INK3};">${k}</span><span style="font: 400 11.5px/1.6 ${MONO}; color: ${INK};">${v}</span>`
        )
        .join('\n      ')}
    </div>`

const stage = (inner, h = 120) =>
  `<div style="display: grid; place-items: center; height: ${h}px; border-radius: 14px; background: ${FILL};">${inner}</div>`

boards['Anatomy.dc.html'] = page(
  '規格',
  1040,
  820,
  `<div style="width: 1040px; height: 820px; padding: 48px 48px 52px; background: #FBFBFB; display: flex; flex-direction: column; gap: 26px; overflow: hidden;">
    <div style="display: flex; flex-direction: column; gap: 8px;">
      <span style="font: 600 11px ${UI}; letter-spacing: .14em; text-transform: uppercase; color: ${INK3};">Cadence · Day view</span>
      <h1 style="margin: 0; font: 700 34px/1.1 ${UI}; letter-spacing: -.02em; color: ${INK};">未完成待辦面板</h1>
      <p style="margin: 0; max-width: 760px; font: 400 13px/1.7 ${UI}; color: ${INK2};">標題列右側多一顆藥丸鈕，數字是「比這一天早、而且還沒打勾」的待辦數。按下去，面板從標題與時間軸之間長出來；每一列可以移到這一天，或刪掉。</p>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 22px;">
      ${specPanel(
        '切換鈕 · 三種狀態',
        `${stage(
          `<div style="display: flex; align-items: center; gap: 26px; transform: scale(1.6);">
            <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
              <button type="button" aria-label="顯示 3 筆未完成待辦" style="display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px 0 9px; border: 1px solid transparent; border-radius: 999px; background: #fff; box-shadow: 0 2px 6px rgba(0,0,0,.06); color: ${INK2}; cursor: pointer;">${svg(ICON_UNCHECKED, 13, 1.9)}<span style="font: 600 11px ${MONO}; line-height: 1;">3</span></button>
              <span style="font: 500 7px ${UI}; letter-spacing: .1em; color: ${INK3};">OFF</span>
            </div>
            <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
              <button type="button" aria-label="隱藏未完成待辦" style="display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px 0 9px; border: 1px solid ${ACCENT_EDGE}; border-radius: 999px; background: ${ACCENT_TINT}; color: ${ACCENT_INK}; cursor: pointer;">${svg(ICON_UNCHECKED, 13, 1.9)}<span style="font: 600 11px ${MONO}; line-height: 1;">3</span></button>
              <span style="font: 500 7px ${UI}; letter-spacing: .1em; color: ${INK3};">ON</span>
            </div>
            <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
              <span style="display: grid; place-items: center; height: 28px; padding: 0 14px; border: 1px dashed ${INK4}; border-radius: 999px; font: 500 8px ${UI}; color: ${INK4};">不畫出來</span>
              <span style="font: 500 7px ${UI}; letter-spacing: .1em; color: ${INK3};">COUNT = 0</span>
            </div>
          </div>`,
          132
        )}
        ${kv([
          ['尺寸', '28 高 · 圓角 999 · 命中區 44×44（::after）'],
          ['關閉態', `白底 + 0 2px 6px rgba(0,0,0,.06)，同 TODAY 鈕`],
          ['開啟態', `${ACCENT_TINT} 底、${ACCENT_EDGE} 邊、${ACCENT_INK} 墨`],
          ['數字', `600 11px ${MONO}`],
          ['沒有逾期時', '整顆不 render，TODAY 鈕遞補位置']
        ])}`
      )}
      ${specPanel(
        '列 · 解剖',
        `${stage(
          `<div style="width: 349px; border-radius: 14px; background: #fff; border: 1px solid ${LINE_SOFT};">${row({ ...ROWS[0], last: true })}</div>`,
          132
        )}
        ${kv([
          ['列高', '48（9 上下留白 + 30 內容）'],
          ['象限色條', '3 寬 · 30 高 · 圓角 2'],
          ['標題', `600 14/18 ${UI}，單行 ellipsis`],
          ['副標', `500 10.5 ${MONO} · ${INK3} · 「日期 · 逾期 N 天」`],
          ['動作鈕', '32×32 · 圓角 10 · 命中區 44×44'],
          ['移到今天', `${ACCENT_TINT} 底 / ${ACCENT_INK} 墨（主要動作）`],
          ['刪除', `透明底 / ${INK3} 墨，按下才轉成確認列`]
        ])}`
      )}
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 22px;">
      ${specPanel(
        '資料規則',
        kv([
          ['納入條件', "type === 'quadrant' &amp;&amp; !done"],
          ['', 'date &lt; 檢視中的日期'],
          ['', 'calendarsStore.isVisible(calendarId)'],
          ['', 'ownerId 是自己（別人的列唯讀，不納入）'],
          ['排序', 'date 由舊到新，同日照 start'],
          ['上限', '不截斷；面板 max-height 232，自身捲動'],
          ['移到今天', 'date = 檢視中的日期；endDate 同步平移'],
          ['', 'start / end / allDay 原樣保留'],
          ['刪除', 'tasksStore.deleteTask（已有樂觀更新 + 失敗回滾）']
        ])
      )}
      ${specPanel(
        '狀態與回饋',
        kv([
          ['開關狀態', 'ui-store 的 ref，不同步、重整回到關閉'],
          ['換日', '面板不關，數字與內容跟著新日期重算'],
          ['清空後', '最後一列處理完 → 面板自行收起，鈕消失'],
          ['移到今天', 'toast「N 筆已移到今天」+ 復原'],
          ['刪除', '列內就地確認（取消 / 刪除），不用 toast'],
          ['a11y', '鈕 aria-pressed；面板 role="region" + aria-label'],
          ['動態', '高度 200ms var(--cd-ease-standard)；reduce-motion 直接切換']
        ])
      )}
    </div>
  </div>`
)


// ---- 很多筆的時候 ----

/** Panel footer that hands a long list over to the sheet. */
function overflowRow(rest) {
  return `<button type="button" style="display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%; height: 44px; padding: 0 14px; border: none; border-top: 1px solid ${LINE_SOFT}; background: none; font: 600 12.5px ${UI}; color: ${ACCENT_INK}; cursor: pointer;">
      <span>還有 ${rest} 筆 · 查看全部</span>
      ${svg('<path d="m9.5 5.5 6.5 6.5-6.5 6.5"/>', 15)}
    </button>`
}

/** The inline panel, capped at 4 rows, when the backlog is long. */
function cappedPanel() {
  const shown = [
    { title: '寫 week view 的驗收筆記', meta: '09/18 · 逾期 1 天', color: Q.plan },
    { title: '回覆設計系統的 PR', meta: '09/18 · 逾期 1 天', color: Q.do },
    { title: '訂下週的牙醫', meta: '09/17 · 逾期 2 天', color: Q.quick },
    { title: '送出設計稿給 Zoe', meta: '09/16 · 逾期 3 天', color: Q.do }
  ]
  return `<div style="margin: 16px 22px 0; border-radius: 18px; background: #fff; border: 1px solid ${LINE_SOFT}; box-shadow: 0 1px 2px rgba(0,0,0,.04), 0 12px 28px -16px rgba(0,0,0,.22); overflow: hidden;">
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 12px 14px 10px;">
        <span style="font: 600 11px ${MONO}; letter-spacing: .12em; color: ${INK3};">UNFINISHED · 15</span>
        <div style="display: flex; align-items: center; gap: 4px;">
          <button type="button" style="border: none; background: none; padding: 4px 6px; font: 600 11.5px ${UI}; color: ${ACCENT_INK}; cursor: pointer;">全部移到今天</button>
          <button type="button" aria-label="收起未完成待辦" style="display: grid; place-items: center; width: 24px; height: 24px; border: none; border-radius: 8px; background: none; color: ${INK3}; cursor: pointer;">${svg(ICON_CHEVRON_UP, 15)}</button>
        </div>
      </div>
      <div style="height: 1px; background: ${LINE_SOFT}; margin: 0 14px;"></div>
      ${shown.map((r, i) => row({ ...r, last: i === shown.length - 1 })).join('\n      ')}
      ${overflowRow(11)}
    </div>`
}

const GROUPS = [
  {
    label: '昨天 · 2',
    rows: [
      { title: '寫 week view 的驗收筆記', meta: '09/18 · 逾期 1 天', color: Q.plan },
      { title: '回覆設計系統的 PR', meta: '09/18 · 逾期 1 天', color: Q.do }
    ]
  },
  {
    label: '本週 · 4',
    rows: [
      { title: '訂下週的牙醫', meta: '09/17 · 逾期 2 天', color: Q.quick },
      { title: '送出設計稿給 Zoe', meta: '09/16 · 逾期 3 天', color: Q.do },
      { title: '補上 focus 頁的 e2e', meta: '09/15 · 逾期 4 天', color: Q.plan },
      { title: '整理 Q3 收據', meta: '09/14 · 逾期 5 天', color: Q.later }
    ]
  }
]

function groupHead(label, { collapsed = false, select = false } = {}) {
  return `<div style="position: sticky; top: 0; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 12px 18px 8px; background: #fff;">
        <span style="display: inline-flex; align-items: center; gap: 6px; font: 600 11px ${MONO}; letter-spacing: .1em; color: ${INK3};">
          ${collapsed ? `<span style="display: inline-grid; place-items: center; color: ${INK3};">${svg('<path d="m8 5.5 6.5 6.5L8 18.5"/>', 13)}</span>` : ''}
          ${label}
        </span>
        ${
          select || collapsed
            ? ''
            : `<button type="button" style="border: none; background: none; padding: 4px 2px; font: 600 11.5px ${UI}; color: ${ACCENT_INK}; cursor: pointer;">整組移到今天</button>`
        }
      </div>`
}

/** The full-height sheet a long backlog opens into. `select` = multi-select mode. */
function sheet({ select = false } = {}) {
  const body = GROUPS.map(
    (g) =>
      `${groupHead(g.label, { select })}
      ${g.rows
        .map((r, i) =>
          row({ ...r, state: select ? 'select' : 'idle', checked: select && i < 3, last: i === g.rows.length - 1 })
        )
        .join('\n      ')}`
  ).join('\n      ')

  const collapsed = `${groupHead('更早 · 9', { collapsed: true, select })}
      <div style="padding: 0 18px 4px;">
        <span style="font: 400 11.5px/1.6 ${UI}; color: ${INK4};">收起來的不會消失，數字照算。</span>
      </div>`

  const foot = select
    ? `<div style="flex: none; display: flex; align-items: center; gap: 8px; padding: 12px 18px 26px; border-top: 1px solid ${LINE_SOFT}; background: #fff;">
        <button type="button" style="flex-grow: 1; height: 44px; border: none; border-radius: 14px; background: ${ACCENT_INK}; color: #fff; font: 600 14px ${UI}; cursor: pointer;">移到今天 · 3</button>
        <button type="button" aria-label="刪除選取的 3 筆" style="flex: none; display: grid; place-items: center; width: 44px; height: 44px; border: none; border-radius: 14px; background: ${FILL}; color: ${INK2}; cursor: pointer;">${svg(ICON_TRASH, 18)}</button>
      </div>`
    : ''

  return `<div style="position: absolute; inset: 0; z-index: 30; display: flex; align-items: flex-end; background: rgba(0,0,0,.32);">
      <div role="dialog" aria-label="未完成待辦" style="display: flex; flex-direction: column; width: 100%; height: 672px; border-radius: 28px 28px 0 0; background: #fff; box-shadow: 0 -18px 44px -20px rgba(0,0,0,.4); overflow: hidden;">
        <div style="flex: none; display: grid; place-items: center; padding: 8px 0 2px;">
          <span style="width: 38px; height: 4px; border-radius: 999px; background: ${LINE_SOFT};"></span>
        </div>
        <div style="flex: none; display: flex; align-items: baseline; justify-content: space-between; gap: 10px; padding: 8px 18px 10px;">
          <span style="display: flex; align-items: baseline; gap: 8px;">
            <span style="font: 600 17px ${UI}; color: ${INK};">未完成</span>
            <span style="font: 500 12px ${MONO}; color: ${INK3};">15 筆</span>
          </span>
          <button type="button" style="border: none; background: none; padding: 4px 2px; font: 600 12.5px ${UI}; color: ${ACCENT_INK}; cursor: pointer;">${select ? '完成' : '選取'}</button>
        </div>
        <div style="flex-grow: 1; min-height: 0; overflow: hidden; border-top: 1px solid ${LINE_SOFT};">
          ${body}
          ${collapsed}
        </div>
        ${foot}
      </div>
    </div>`
}

boards['Many.dc.html'] = page(
  '面板 · 很多筆',
  393,
  852,
  phone(`${header({ toggle: 'on', count: 15 })}
    ${cappedPanel()}
    ${grid({ squeeze: 6 })}`)
)

boards['Sheet.dc.html'] = page(
  '全部未完成 · sheet',
  393,
  852,
  `<div style="position: relative; width: 393px; height: 852px; overflow: hidden; background: #fff; display: flex; flex-direction: column;">
    ${header({ toggle: 'on', count: 15 })}
    ${grid()}
    ${sheet()}
  </div>`
)

boards['SheetSelect.dc.html'] = page(
  'sheet · 選取模式',
  393,
  852,
  `<div style="position: relative; width: 393px; height: 852px; overflow: hidden; background: #fff; display: flex; flex-direction: column;">
    ${header({ toggle: 'on', count: 15 })}
    ${grid()}
    ${sheet({ select: true })}
  </div>`
)


for (const [name, html] of Object.entries(boards)) writeFileSync(join(OUT, name), html)

// ---- index ----
const GAP = 80
const W = 393
const H = 852
const row1 = ['Main.dc.html', 'Expanded.dc.html', 'Confirm.dc.html', 'Undo.dc.html', 'Empty.dc.html']
const frames = {}
row1.forEach((n, i) => {
  frames[n] = { x: i * (W + GAP), y: 0, w: W, h: H }
})
frames['MultiSelect.dc.html'] = { x: 0, y: 1252, w: W, h: H }
frames['Anatomy.dc.html'] = { x: W + GAP, y: 1252, w: 1040, h: 820 }
const ROW3 = 2504
;['Many.dc.html', 'Sheet.dc.html', 'SheetSelect.dc.html'].forEach((n, i) => {
  frames[n] = { x: i * (W + GAP), y: ROW3, w: W, h: H }
})

frames['Main.dc.html'].title = '收合（預設）'
frames['Expanded.dc.html'].title = '展開'
frames['Confirm.dc.html'].title = '刪除確認'
frames['Undo.dc.html'].title = '移到今天之後'
frames['Empty.dc.html'].title = '沒有未完成'
frames['MultiSelect.dc.html'].title = '替代方案 B · 多選'
frames['Anatomy.dc.html'].title = '規格'
frames['Many.dc.html'].title = '面板 · 15 筆（截到 4 列）'
frames['Sheet.dc.html'].title = '全部未完成 · sheet'
frames['SheetSelect.dc.html'].title = 'sheet · 選取模式'

const canvas = {
  v: 3,
  createdOnFiles: { v: 1, at: new Date().toISOString() },
  title: 'Day 未完成待辦面板',
  launch: { view: 'canvas' },
  pages: [],
  boards: frames,
  order: [...row1, 'MultiSelect.dc.html', 'Anatomy.dc.html', 'Many.dc.html', 'Sheet.dc.html', 'SheetSelect.dc.html'],
  notes: {
    flow: {
      x: 0,
      y: -300,
      text: '主流程 · 收合 → 展開 → 處理掉',
      kind: 'title1',
      maxW: 2285
    },
    alt: {
      x: 0,
      y: 960,
      text: '替代方案與規格',
      kind: 'title1',
      maxW: 1513
    },
    many: {
      x: 0,
      y: 2210,
      text: '很多筆的時候 · 面板截斷 → sheet',
      kind: 'title1',
      maxW: 1259
    }
  },
  designSystems: []
}
writeFileSync(join(OUT, 'canvas.json'), JSON.stringify(canvas, null, 2))
console.log('wrote', Object.keys(boards).length, 'boards')
