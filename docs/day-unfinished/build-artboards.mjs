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
const ACCENT_INK = '#A8425E' // --pv2-accent is 3.1:1 on white; text and glyphs need this one
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
function header({ toggle = 'off', count = 15 } = {}) {
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

/** One overdue row. `state`: 'idle' | 'confirm' | 'select'. */
function row({ title, meta, color, state = 'idle', checked = false, last = false }) {
  const rule = last ? '' : `<div style="height: 1px; background: ${LINE_SOFT}; margin-left: 31px;"></div>`
  if (state === 'confirm') {
    return `<div style="display: flex; align-items: center; gap: 10px; padding: 9px 18px; background: #FDF6F8;">
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
    state === 'select' ? '' : `${ACT_BTN('移到今天', ICON_MOVE, 'primary')}${ACT_BTN('刪除', ICON_TRASH, 'quiet')}`
  const inner = `<div style="display: flex; align-items: center; gap: 10px; padding: 9px 18px;">
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

// ---- the data the boards draw ----
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
  },
  {
    label: '更早 · 9',
    rows: [
      { title: '把設計稿的字級表補完', meta: '09/08 · 逾期 11 天', color: Q.plan },
      { title: '退訂那個電子報', meta: '09/07 · 逾期 12 天', color: Q.later },
      { title: '回 Ian 的 email', meta: '09/05 · 逾期 14 天', color: Q.quick },
      { title: '換機車機油', meta: '09/02 · 逾期 17 天', color: Q.later },
      { title: '寫 focus timer 的 ADR', meta: '08/30 · 逾期 20 天', color: Q.plan },
      { title: '整理桌機的截圖資料夾', meta: '08/28 · 逾期 22 天', color: Q.later },
      { title: '問房東冷氣的事', meta: '08/25 · 逾期 25 天', color: Q.quick },
      { title: '備份舊硬碟', meta: '08/21 · 逾期 29 天', color: Q.plan },
      { title: '把 v1 的 token 表存檔', meta: '08/18 · 逾期 32 天', color: Q.later }
    ]
  }
]

const SHORT_GROUPS = [
  { label: '昨天 · 1', rows: [{ title: '寫 week view 的驗收筆記', meta: '09/18 · 逾期 1 天', color: Q.plan }] },
  {
    label: '本週 · 2',
    rows: [
      { title: '訂下週的牙醫', meta: '09/17 · 逾期 2 天', color: Q.quick },
      { title: '送出設計稿給 Zoe', meta: '09/16 · 逾期 3 天', color: Q.do }
    ]
  }
]

function groupHead(label, { select = false } = {}) {
  return `<div style="position: sticky; top: 0; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 13px 18px 8px; background: rgba(255,255,255,.94); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);">
        <span style="font: 600 11px ${MONO}; letter-spacing: .1em; color: ${INK3};">${label}</span>
        ${
          select
            ? ''
            : `<button type="button" style="border: none; background: none; padding: 4px 2px; font: 600 11.5px ${UI}; color: ${ACCENT_INK}; cursor: pointer;">整組移到今天</button>`
        }
      </div>`
}

/**
 * The one surface. Height follows the content up to MAX; past that the list scrolls,
 * and every overdue task is in it — no cap, no collapsed group, no second tap.
 */
function sheet({ groups, count, h, select = false, confirmAt = null, clipped = false } = {}) {
  let n = -1
  const body = groups
    .map(
      (g) =>
        `${groupHead(g.label, { select })}
      ${g.rows
        .map((r, i) => {
          n += 1
          return row({
            ...r,
            state: confirmAt === n ? 'confirm' : select ? 'select' : 'idle',
            checked: select && [0, 2, 3].includes(n),
            last: i === g.rows.length - 1
          })
        })
        .join('\n      ')}`
    )
    .join('\n      ')

  const fade = clipped
    ? `<div aria-hidden="true" style="position: absolute; left: 0; right: 0; bottom: 0; height: 40px; background: linear-gradient(to bottom, rgba(255,255,255,0), #fff);"></div>`
    : ''

  const foot = select
    ? `<div style="flex: none; display: flex; align-items: center; gap: 8px; padding: 12px 18px 26px; border-top: 1px solid ${LINE_SOFT}; background: #fff;">
        <button type="button" style="flex-grow: 1; height: 44px; border: none; border-radius: 14px; background: ${ACCENT_INK}; color: #fff; font: 600 14px ${UI}; cursor: pointer;">移到今天 · 3</button>
        <button type="button" aria-label="刪除選取的 3 筆" style="flex: none; display: grid; place-items: center; width: 44px; height: 44px; border: none; border-radius: 14px; background: ${FILL}; color: ${INK2}; cursor: pointer;">${svg(ICON_TRASH, 18)}</button>
      </div>`
    : `<div style="flex: none; height: 26px;"></div>`

  return `<div style="position: absolute; inset: 0; z-index: 30; display: flex; align-items: flex-end; background: rgba(0,0,0,.32);">
      <div role="dialog" aria-label="未完成待辦" style="display: flex; flex-direction: column; width: 100%; height: ${h}px; border-radius: 28px 28px 0 0; background: #fff; box-shadow: 0 -18px 44px -20px rgba(0,0,0,.4); overflow: hidden;">
        <div style="flex: none; display: grid; place-items: center; padding: 8px 0 2px;">
          <span style="width: 38px; height: 4px; border-radius: 999px; background: ${LINE_SOFT};"></span>
        </div>
        <div style="flex: none; display: flex; align-items: baseline; justify-content: space-between; gap: 10px; padding: 8px 18px 10px; border-bottom: 1px solid ${LINE_SOFT};">
          <span style="display: flex; align-items: baseline; gap: 8px;">
            <span style="font: 600 17px ${UI}; color: ${INK};">未完成</span>
            <span style="font: 500 12px ${MONO}; color: ${INK3};">${count} 筆</span>
          </span>
          <button type="button" style="border: none; background: none; padding: 4px 2px; font: 600 12.5px ${UI}; color: ${ACCENT_INK}; cursor: pointer;">${select ? '完成' : '選取'}</button>
        </div>
        <div style="position: relative; flex-grow: 1; min-height: 0; overflow: hidden;">
          ${body}
          ${fade}
        </div>
        ${foot}
      </div>
    </div>`
}

/** The time grid behind everything. */
function grid({ highlight = false } = {}) {
  const hours = ['09', '10', '11', '12', '13', '14', '15', '16']
  const lines = hours
    .map(
      (h, i) => `<div style="position: absolute; left: 0; right: 0; top: ${i * 58}px; border-top: 1px solid rgba(0,0,0,.07);"></div>
        <span style="position: absolute; left: 0; top: ${i * 58 - 7}px; font: 500 12px/14px ${UI}; color: ${INK3};">${h}</span>`
    )
    .join('\n        ')
  const block = (top, height, color, title, time, ring = false) =>
    `<div style="position: absolute; left: 44px; right: 0; top: ${top}px; height: ${height}px; border-radius: 8px; padding: 6px 12px; overflow: hidden; background: color-mix(in srgb, ${color} 10%, #fff); box-shadow: ${ring ? `0 0 0 2px ${ACCENT_EDGE}, ` : ''}0 1px 2px rgba(0,0,0,.05), 0 6px 16px -6px rgba(0,0,0,.16);">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="flex: none; width: 18px; height: 18px; border-radius: 50%; border: 1.6px solid rgba(0,0,0,.28);"></span>
            <span style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column;">
              <span style="font: 600 15px/19px ${UI}; color: ${INK}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${title}</span>
              <span style="font: 500 12px/16px ${MONO}; color: ${INK2};">${time}</span>
            </span>
          </div>
        </div>`
  return `<div style="flex-grow: 1; min-height: 0; display: flex; flex-direction: column; padding: 18px 22px 0;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="flex: none; width: 58px; font: 600 11px ${MONO}; letter-spacing: .12em; color: ${INK3};">ALL-DAY</span>
        <span style="display: inline-flex; align-items: center; height: 22px; padding: 0 9px; border-radius: 6px; border-left: 3px solid ${Q.later}; background: rgba(201,163,179,.16); font: 500 12px ${UI}; color: ${INK};">團隊 offsite</span>
      </div>
      <div style="flex: none; height: 1px; background: rgba(0,0,0,.16); margin-top: 12px;"></div>
      <div style="position: relative; flex-grow: 1; min-height: 0; margin-top: 10px; overflow: hidden;">
        ${lines}
        ${highlight ? block(58, 52, Q.do, '送出設計稿給 Zoe', '10:00', true) : ''}
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
      <button type="button" style="flex: none; display: inline-flex; align-items: center; gap: 5px; border: none; background: none; padding: 4px 2px; font: 600 12.5px ${UI}; color: #FFB3C6; cursor: pointer;">${svg(ICON_UNDO, 13)} ${action}</button>
    </div>`
}

const screen = (inner, { withNav = true } = {}) =>
  `<div style="position: relative; width: 393px; height: 852px; overflow: hidden; background: #fff; display: flex; flex-direction: column;">
    ${inner}
    ${withNav ? nav : ''}
  </div>`

// ---- boards ----
const boards = {}

boards['Main.dc.html'] = page('日檢視 · 收合', 393, 852, screen(`${header({ toggle: 'off', count: 15 })}
    ${grid()}`))

boards['SheetShort.dc.html'] = page(
  '3 筆 · sheet 貼著內容',
  393,
  852,
  screen(
    `${header({ toggle: 'on', count: 3 })}
    ${grid()}
    ${sheet({ groups: SHORT_GROUPS, count: 3, h: 320 })}`,
    { withNav: false }
  )
)

boards['SheetHalf.dc.html'] = page(
  '15 筆 · 預設停在一半',
  393,
  852,
  screen(
    `${header({ toggle: 'on', count: 15 })}
    ${grid()}
    ${sheet({ groups: GROUPS, count: 15, h: 450, clipped: true })}`,
    { withNav: false }
  )
)

boards['SheetAll.dc.html'] = page(
  '15 筆 · 往上拖看到全部',
  393,
  852,
  screen(
    `${header({ toggle: 'on', count: 15 })}
    ${grid()}
    ${sheet({ groups: GROUPS, count: 15, h: 700, clipped: true })}`,
    { withNav: false }
  )
)

boards['Confirm.dc.html'] = page(
  '刪除確認',
  393,
  852,
  screen(
    `${header({ toggle: 'on', count: 15 })}
    ${grid()}
    ${sheet({ groups: GROUPS, count: 15, h: 700, clipped: true, confirmAt: 3 })}`,
    { withNav: false }
  )
)

boards['SheetSelect.dc.html'] = page(
  '選取模式',
  393,
  852,
  screen(
    `${header({ toggle: 'on', count: 15 })}
    ${grid()}
    ${sheet({ groups: GROUPS, count: 15, h: 700, clipped: true, select: true })}`,
    { withNav: false }
  )
)

boards['Undo.dc.html'] = page(
  '移到今天之後',
  393,
  852,
  screen(`${header({ toggle: 'on', count: 12 })}
    ${grid({ highlight: true })}
    ${toast('3 筆已移到今天', '復原')}`)
)

boards['Empty.dc.html'] = page('沒有未完成', 393, 852, screen(`${header({ toggle: 'none' })}
    ${grid()}`))

// ---- 沒採用：內嵌面板 ----
function inlinePanel({ capped = false } = {}) {
  const shown = capped
    ? [...GROUPS[0].rows, ...GROUPS[1].rows.slice(0, 2)]
    : [...GROUPS[0].rows, GROUPS[1].rows[0]]
  const foot = capped
    ? `<button type="button" style="display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%; height: 44px; padding: 0 18px; border: none; border-top: 1px solid ${LINE_SOFT}; background: none; font: 600 12.5px ${UI}; color: ${ACCENT_INK}; cursor: pointer;">
        <span>還有 11 筆 · 查看全部</span>
        ${svg('<path d="m9.5 5.5 6.5 6.5-6.5 6.5"/>', 15)}
      </button>`
    : ''
  return `<div style="margin: 16px 22px 0; border-radius: 18px; background: #fff; border: 1px solid ${LINE_SOFT}; box-shadow: 0 1px 2px rgba(0,0,0,.04), 0 12px 28px -16px rgba(0,0,0,.22); overflow: hidden;">
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 12px 18px 10px;">
        <span style="font: 600 11px ${MONO}; letter-spacing: .12em; color: ${INK3};">UNFINISHED · ${capped ? 15 : 3}</span>
        <div style="display: flex; align-items: center; gap: 4px;">
          <button type="button" style="border: none; background: none; padding: 4px 6px; font: 600 11.5px ${UI}; color: ${ACCENT_INK}; cursor: pointer;">全部移到今天</button>
          <button type="button" aria-label="收起" style="display: grid; place-items: center; width: 24px; height: 24px; border: none; border-radius: 8px; background: none; color: ${INK3}; cursor: pointer;">${svg(ICON_CHEVRON_UP, 15)}</button>
        </div>
      </div>
      <div style="height: 1px; background: ${LINE_SOFT}; margin: 0 18px;"></div>
      ${shown.map((r, i) => row({ ...r, last: i === shown.length - 1 })).join('\n      ')}
      ${foot}
    </div>`
}

boards['Rejected-Panel.dc.html'] = page(
  '沒採用 A · 內嵌面板',
  393,
  852,
  screen(`${header({ toggle: 'on', count: 3 })}
    ${inlinePanel()}
    ${grid()}`)
)

boards['Rejected-Capped.dc.html'] = page(
  '沒採用 B · 面板截斷',
  393,
  852,
  screen(`${header({ toggle: 'on', count: 15 })}
    ${inlinePanel({ capped: true })}
    ${grid()}`)
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
  860,
  `<div style="width: 1040px; height: 860px; padding: 44px 48px 48px; background: #FBFBFB; display: flex; flex-direction: column; gap: 22px; overflow: hidden;">
    <div style="display: flex; flex-direction: column; gap: 8px;">
      <span style="font: 600 11px ${UI}; letter-spacing: .14em; text-transform: uppercase; color: ${INK3};">Cadence · Day view</span>
      <h1 style="margin: 0; font: 700 34px/1.1 ${UI}; letter-spacing: -.02em; color: ${INK};">未完成待辦</h1>
      <p style="margin: 0; max-width: 780px; font: 400 13px/1.7 ${UI}; color: ${INK2};">標題列右側一顆藥丸鈕，數字是「比這一天早、而且還沒打勾」的待辦數。按下去，一張 sheet 由下往上長出來，<strong style="font-weight: 600; color: ${INK};">浮在日檢視上面、不推擠它</strong>，裡面是<strong style="font-weight: 600; color: ${INK};">全部</strong>——不截斷、不收合、不用再點一次。預設停在一半，時間軸還看得到；往上拖就看完整份。</p>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
      ${specPanel(
        '切換鈕 · 三種狀態',
        `${stage(
          `<div style="display: flex; align-items: center; gap: 26px; transform: scale(1.6);">
            <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
              <button type="button" aria-label="顯示 15 筆未完成待辦" style="display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px 0 9px; border: 1px solid transparent; border-radius: 999px; background: #fff; box-shadow: 0 2px 6px rgba(0,0,0,.06); color: ${INK2}; cursor: pointer;">${svg(ICON_UNCHECKED, 13, 1.9)}<span style="font: 600 11px ${MONO}; line-height: 1;">15</span></button>
              <span style="font: 500 7px ${UI}; letter-spacing: .1em; color: ${INK3};">OFF</span>
            </div>
            <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
              <button type="button" aria-label="隱藏未完成待辦" style="display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px 0 9px; border: 1px solid ${ACCENT_EDGE}; border-radius: 999px; background: ${ACCENT_TINT}; color: ${ACCENT_INK}; cursor: pointer;">${svg(ICON_UNCHECKED, 13, 1.9)}<span style="font: 600 11px ${MONO}; line-height: 1;">15</span></button>
              <span style="font: 500 7px ${UI}; letter-spacing: .1em; color: ${INK3};">ON</span>
            </div>
            <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
              <span style="display: grid; place-items: center; height: 28px; padding: 0 14px; border: 1px dashed ${INK4}; border-radius: 999px; font: 500 8px ${UI}; color: ${INK4};">不畫出來</span>
              <span style="font: 500 7px ${UI}; letter-spacing: .1em; color: ${INK3};">COUNT = 0</span>
            </div>
          </div>`,
          128
        )}
        ${kv([
          ['尺寸', '28 高 · 圓角 999 · 命中區 44×44（::after）'],
          ['關閉態', '白底 + 0 2px 6px rgba(0,0,0,.06)，同 TODAY 鈕'],
          ['開啟態', `${ACCENT_TINT} 底、${ACCENT_EDGE} 邊、${ACCENT_INK} 墨`],
          ['數字', `600 11px ${MONO}，照實顯示，不截成 9+`],
          ['沒有逾期時', '整顆不 render，TODAY 鈕遞補位置']
        ])}`
      )}
      ${specPanel(
        '列 · 解剖',
        `${stage(
          `<div style="width: 349px; border-radius: 14px; background: #fff; border: 1px solid ${LINE_SOFT};">${row({ ...GROUPS[1].rows[1], last: true })}</div>`,
          128
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

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
      ${specPanel(
        'sheet · 高度與分組',
        kv([
          ['浮在上面', '不推擠時間軸；日檢視的版面一格都不動'],
          ['預設高度', 'min(內容, 52vh)——短清單就是矮 sheet'],
          ['第二段', '往上拖 / 上滑 → 82vh，看完整份'],
          ['超過高度', '清單自己捲；組標題 sticky'],
          ['分組', '昨天 / 本週 / 更早，全部展開，沒有收合'],
          ['組標題', `600 11 ${MONO} · ${INK3} · sticky · 半透明白底`],
          ['組動作', '每組右上「整組移到今天」'],
          ['排序', '組內 date 由舊到新，同日照 start'],
          ['頂層', '沒有「全部移到今天」——批次走「選取」'],
          ['選取模式', '圓形 checkbox + 底部「移到今天 · N」/ 刪除']
        ])
      )}
      ${specPanel(
        '資料 · 狀態 · 回饋',
        kv([
          ['納入條件', "type === 'quadrant' &amp;&amp; !done"],
          ['', 'date &lt; 檢視中的日期'],
          ['', 'isVisible(calendarId) &amp;&amp; ownerId 是自己'],
          ['上限', '沒有上限，也沒有回看天數的上限'],
          ['移到今天', 'date = 檢視中的日期；endDate 同步平移'],
          ['', 'start / end / allDay 原樣保留'],
          ['刪除', '列內就地確認 → tasksStore.deleteTask'],
          ['移動回饋', 'toast「N 筆已移到今天」+ 復原'],
          ['清空後', 'sheet 自己關掉，鈕消失'],
          ['a11y', 'aria-pressed；sheet role="dialog" + aria-label']
        ])
      )}
    </div>
  </div>`
)

for (const [name, html] of Object.entries(boards)) writeFileSync(join(OUT, name), html)

// ---- index ----
const GAP = 80
const W = 393
const H = 852
const row1 = [
  'Main.dc.html',
  'SheetShort.dc.html',
  'SheetHalf.dc.html',
  'SheetAll.dc.html',
  'Confirm.dc.html',
  'SheetSelect.dc.html',
  'Undo.dc.html',
  'Empty.dc.html'
]
const titles = {
  'Main.dc.html': '收合（預設）',
  'SheetShort.dc.html': '3 筆 · sheet 貼著內容',
  'SheetHalf.dc.html': '15 筆 · 預設停在一半',
  'SheetAll.dc.html': '15 筆 · 往上拖看到全部',
  'Confirm.dc.html': '刪除確認',
  'SheetSelect.dc.html': '選取模式',
  'Undo.dc.html': '移到今天之後',
  'Empty.dc.html': '沒有未完成',
  'Anatomy.dc.html': '規格',
  'Rejected-Panel.dc.html': '沒採用 A · 內嵌面板',
  'Rejected-Capped.dc.html': '沒採用 B · 面板截斷'
}

const frames = {}
row1.forEach((n, i) => {
  frames[n] = { x: i * (W + GAP), y: 0, w: W, h: H }
})
frames['Anatomy.dc.html'] = { x: 0, y: 1252, w: 1040, h: 860 }
frames['Rejected-Panel.dc.html'] = { x: 1120, y: 1252, w: W, h: H }
frames['Rejected-Capped.dc.html'] = { x: 1593, y: 1252, w: W, h: H }
for (const [n, t] of Object.entries(titles)) if (frames[n]) frames[n].title = t

const canvas = {
  v: 3,
  createdOnFiles: { v: 1, at: '2026-09-19T10:50:03.166Z' },
  title: 'Day 未完成待辦面板',
  launch: { view: 'canvas' },
  pages: [],
  boards: frames,
  order: [...row1, 'Anatomy.dc.html', 'Rejected-Panel.dc.html', 'Rejected-Capped.dc.html'],
  notes: {
    flow: {
      x: 0,
      y: -300,
      text: '主流程 · 一顆鈕 → 一張 sheet → 全部在裡面',
      kind: 'title1',
      maxW: 3231
    },
    alt: {
      x: 0,
      y: 960,
      text: '規格與沒採用的做法',
      kind: 'title1',
      maxW: 1986
    }
  },
  designSystems: []
}
writeFileSync(join(OUT, 'canvas.json'), JSON.stringify(canvas, null, 2))
console.log('wrote', Object.keys(boards).length, 'boards')
