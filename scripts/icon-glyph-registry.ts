// icon-glyph-registry.ts — glyph path data used to GENERATE the exported SVG files in
// public/icons/utility/ via export-icons.mts. The app no longer renders from this data at runtime:
// CdIcon loads the files listed in src/components/ui/icons.ts (the manifest). Edit a glyph here,
// then rerun `node scripts/export-icons.mts` to regenerate its file.
//
// (Historical header from when this lived at src/components/ui/icons.ts as the runtime registry:)
//
// Source of truth for glyph paths/stroke params is CADENCE-Icon.dc.html (the UI glyph consistency
// audit). Glyphs the audit doesn't cover (bell, target, search, calendar, clock, check, image,
// arrow-up, repeat, location, notes, grip, plus …) are ported from CADENCE-Prototype-v2.dc.html or,
// where neither reference covers a glyph verbatim (e.g. `repeat`), carried over unchanged from the
// existing inline SVG in the Cd* component.
//
// Two stroke tiers (see audit turn 20): `hero` (brand/personality, olive accent — nav, AI, key
// actions) uses --cd-ink (#56585E) stroke + --cd-olive (#B3AC91) accent fills; `utility` (quiet,
// consistency-first — settings/forms/menus) uses the same slate stroke without an olive accent,
// matching the audit's "quiet slate line" utility set. Components that pass an explicit `color`
// prop always win over the tier default.
//
// Second audit pass (turns t8, t10-t21 — task 1.3): confirmed close/copy/pencil/trash/journal/spark
// and the chevrons above were already faithfully ported by the prior pass. Added the two families
// the prior pass didn't cover yet: `tomato` (turn 21 `cd_tomato`, task-only pomodoro glyph) and the
// bound-calendar view-switcher family `view-day`/`view-week`/`view-month`/`view-list`/`gear` (turn
// 10 `cd_day`/`cd_week`/`cd_month`/`cd_list`/`cd_gear` — distinct from the plain-grid `calendar`
// field icon above, which is a different glyph family per turn 19's exclusion note). Turn 19's
// utility-set icons already present in this registry (bell/target/search/calendar/clock/check/
// image/info/reset) were cross-checked against `sysIcon`/`uic` in the source and are the same
// silhouettes already in use by live Cd* call sites; turn 19 grid entries with no current Cd*
// consumer (account/at/adv/shield/help/cloud/logout) were deliberately NOT added — nothing in this
// codebase references them yet, and speculative entries would be untestable dead code until a real
// call site needs them. `brush`/`globe`/`star`/`layers`/`home`/`lock`/`heart`/`work`/`users`/
// `school`/`bulb`/`eye`/`note` were added later once CdEventEditCard's Style/Location rows and
// CdAppearancePicker's icon-category set gave them real call sites (design-fidelity pass against
// CADENCE Handoff.dc.html's editCard/ICO_CATS, lines ~2070/2114-2119/2134).

export type IconName =
  | 'close'
  | 'plus'
  | 'copy'
  | 'pencil'
  | 'trash'
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-down'
  | 'journal'
  | 'spark'
  | 'bell'
  | 'target'
  | 'search'
  | 'calendar'
  | 'clock'
  | 'check'
  | 'image'
  | 'arrow-up'
  | 'repeat'
  | 'location'
  | 'notes'
  | 'info'
  | 'sync'
  | 'mail'
  | 'reset'
  | 'spark-mono'
  | 'journal-plain'
  | 'x-small'
  | 'pencil-small'
  | 'calendar-alt'
  | 'tomato'
  | 'view-day'
  | 'view-week'
  | 'view-month'
  | 'view-list'
  | 'gear'
  | 'brush'
  | 'globe'
  | 'star'
  | 'layers'
  | 'home'
  | 'lock'
  | 'heart'
  | 'work'
  | 'users'
  | 'school'
  | 'bulb'
  | 'eye'
  | 'note'

/** Sentinel fill/stroke value meaning "use CdIcon's resolved color prop" (as opposed to a fixed
 *  hex, or the literal CSS keyword `currentColor` which would instead track the element's `color`
 *  CSS property — not what these glyphs need, since CdIcon drives color via the `stroke` attribute). */
export const ICON_COLOR = '@icon-color' as const

export interface IconPathSpec {
  /** SVG element tag. `ellipse` added for turn-21 `cd_tomato` (task 1.3), the first glyph whose
   *  source shapes are non-circular ellipses rather than approximable with `circle`. */
  tag: 'path' | 'line' | 'circle' | 'polyline' | 'rect' | 'ellipse'
  attrs: Record<string, string | number>
  /** Per-path fill override. Defaults to 'none' unless set here. Pass ICON_COLOR to fill with
   *  CdIcon's resolved color instead of a fixed value. */
  fill?: string
  /** Per-path stroke override. Defaults to the glyph/tier stroke unless set here. */
  stroke?: string
  strokeWidth?: number
  fillOpacity?: number
}

export interface IconSpec {
  viewBox: string
  /** Default stroke width for paths that don't specify their own. */
  strokeWidth: number
  paths: IconPathSpec[]
}

export const ICONS: Record<IconName, IconSpec> = {
  // Close / dismiss — muted X. Audit turn 18: 24-grid, 2px slate, no fill.
  close: {
    viewBox: '0 0 24 24',
    strokeWidth: 2,
    paths: [
      { tag: 'line', attrs: { x1: 7, y1: 7, x2: 17, y2: 17 } },
      { tag: 'line', attrs: { x1: 17, y1: 7, x2: 7, y2: 17 } }
    ]
  },

  // Plus — simple cross, used by CdCreateButton / CdFab (2.4px stroke, round cap in those contexts;
  // registry default is 2px, callers needing 2.4 pass an explicit strokeWidth via size scaling is not
  // supported per-instance, so CdIcon consumers keep their own stroke width via CSS where it matters).
  plus: {
    viewBox: '0 0 24 24',
    strokeWidth: 2.4,
    paths: [{ tag: 'path', attrs: { d: 'M12 5v14M5 12h14' } }]
  },

  // Duplicate / copy — audit turn 17 `cd_copy`, ported verbatim per Zoe's ruling (audit wins over
  // the app's previous plain two-path outline version): back sheet as an open path, then the front
  // sheet drawn twice — a 22%-opacity olive fill rect underneath, and the outline rect on top.
  // The olive fill is a fixed brand accent (var(--cd-olive) = #B3AC91, audit's `a` accent param
  // default) and intentionally does NOT track the `color`/`tier` props — hero-tier glyphs keep
  // their olive personality accent regardless of stroke color, per audit turn 20.
  copy: {
    viewBox: '0 0 24 24',
    strokeWidth: 2,
    paths: [
      { tag: 'path', attrs: { d: 'M4.5 15 V6 a2 2 0 0 1 2 -2 h8' } },
      { tag: 'rect', attrs: { x: 8.5, y: 8, width: 11, height: 12, rx: 2.4 }, fill: 'var(--cd-olive)', fillOpacity: 0.22, stroke: 'none' },
      { tag: 'rect', attrs: { x: 8.5, y: 8, width: 11, height: 12, rx: 2.4 } }
    ]
  },

  // Pencil / draft / edit — audit turn 12 `cd_draft`, ported verbatim per Zoe's ruling (audit wins
  // over the app's previous single-path pencil): slate outline body + separate eraser cap + solid
  // olive graphite-tip fill + seam line. Olive tip is a fixed hero-tier accent (does not track
  // `color`/`tier`), per audit turn 20.
  pencil: {
    viewBox: '0 0 24 24',
    strokeWidth: 2,
    paths: [
      { tag: 'path', attrs: { d: 'M4 20 v-3.4 L14.6 6 l3.4 3.4 L7.4 20 Z' } },
      { tag: 'path', attrs: { d: 'M14.6 6 l1.9 -1.9 a1.4 1.4 0 0 1 2 0 l1.4 1.4 a1.4 1.4 0 0 1 0 2 L18 9.4' } },
      { tag: 'path', attrs: { d: 'M4 20 v-3.4 L7.4 20 Z' }, fill: 'var(--cd-olive)', stroke: 'none' },
      { tag: 'line', attrs: { x1: 12.4, y1: 8.2, x2: 15.8, y2: 11.6 } }
    ]
  },

  // Trash / delete — audit turn 13 `cd_trash`, ported verbatim per Zoe's ruling (audit wins over
  // the app's previous plain two-path bin): 22%-opacity olive body fill underneath, then lid line +
  // lid handle + body outline + two rib lines. Olive body fill is a fixed hero-tier accent (does
  // not track `color`/`tier`), per audit turn 20 — so e.g. the danger-red delete buttons get a red
  // stroke over the same subtle olive body tint.
  trash: {
    viewBox: '0 0 24 24',
    strokeWidth: 2,
    paths: [
      { tag: 'path', attrs: { d: 'M6 8 h12 l-1 11.5 a1.6 1.6 0 0 1 -1.6 1.5 H8.6 a1.6 1.6 0 0 1 -1.6 -1.5 Z' }, fill: 'var(--cd-olive)', fillOpacity: 0.22, stroke: 'none' },
      { tag: 'line', attrs: { x1: 3.5, y1: 6, x2: 20.5, y2: 6 } },
      { tag: 'path', attrs: { d: 'M9.5 6 V4.6 a1.3 1.3 0 0 1 1.3 -1.3 h2.4 a1.3 1.3 0 0 1 1.3 1.3 V6' } },
      { tag: 'path', attrs: { d: 'M6 8 l1 11.5 a1.6 1.6 0 0 0 1.6 1.5 h6.8 a1.6 1.6 0 0 0 1.6 -1.5 L18 8' } },
      { tag: 'line', attrs: { x1: 10, y1: 11, x2: 10.4, y2: 18 } },
      { tag: 'line', attrs: { x1: 14, y1: 11, x2: 13.6, y2: 18 } }
    ]
  },

  // Chevron left — audit turn 11: date-nav arrows, 24-grid, 2px slate. Not currently used by any
  // Cd* component (no prev/next date-nav control exists yet in this component set) — reserved per
  // the audit for future use, registered so the glyph exists when that control is built.
  'chevron-left': {
    viewBox: '0 0 24 24',
    strokeWidth: 2,
    paths: [{ tag: 'path', attrs: { d: 'M15 5 L9 12 L15 19' } }]
  },

  // Chevron right — disclosure chevron at rest pointing right (rotated via CSS per call site to
  // point down/up for expand-collapse).
  'chevron-right': {
    viewBox: '0 0 24 24',
    strokeWidth: 2,
    paths: [{ tag: 'polyline', attrs: { points: '9 18 15 12 9 6' } }]
  },

  // Chevron down — disclosure chevron at rest pointing down (rotated via CSS per call site).
  // Ported verbatim from CdDropdownField / CdEventEditCard "more options" / CdTimeDropdown's
  // existing identical `polyline points="6 9 12 15 18 9"`.
  'chevron-down': {
    viewBox: '0 0 24 24',
    strokeWidth: 2,
    paths: [{ tag: 'polyline', attrs: { points: '6 9 12 15 18 9' } }]
  },

  // Journal — notebook + quill. Audit turn 14 `cd_journal`, matches CdTopbar's existing inline SVG
  // exactly (slate outline page + two write-lines + olive feather vane fill + spine + barbs).
  journal: {
    viewBox: '0 0 24 24',
    strokeWidth: 2,
    paths: [
      { tag: 'path', attrs: { d: 'M5 4.5 h8.4 a1.4 1.4 0 0 1 1.4 1.4 V13' } },
      { tag: 'path', attrs: { d: 'M5 4.5 a1.4 1.4 0 0 0 -1.4 1.4 V18.6 a1.4 1.4 0 0 0 1.4 1.4 h8.4 a1.4 1.4 0 0 0 1.4 -1.4 V17' } },
      { tag: 'line', attrs: { x1: 6.6, y1: 8, x2: 11.5, y2: 8 } },
      { tag: 'line', attrs: { x1: 6.6, y1: 11, x2: 9.4, y2: 11 } },
      {
        tag: 'path',
        attrs: { d: 'M20.4 4 C21.4 6.6 20.7 9.6 18.6 12 C17.1 13.7 15 14.8 12.7 15.3 C14.2 12.8 15.9 10.2 17.6 7.9 C18.6 6.5 19.5 5 20.4 4 Z' },
        fill: 'var(--cd-olive)',
        fillOpacity: 0.9,
        stroke: 'none'
      },
      { tag: 'path', attrs: { d: 'M20.4 4 L12.7 15.3 L10.8 18' } },
      { tag: 'line', attrs: { x1: 17.6, y1: 7.9, x2: 15.4, y2: 8.3 } },
      { tag: 'line', attrs: { x1: 16, y1: 10.3, x2: 13.9, y2: 10.8 } }
    ]
  },

  // Spark / AI assistant — audit turn 15 `cd_ai`: big olive-filled star (0.85 opacity fill under a
  // slate outline) + small accent star. NOTE: the audit's `star(9.6,12.8,7.2,2.5)` /
  // `star(18.6,5.4,3,1.05)` helper calls expand to EXACTLY the path coordinates the app's
  // `_sparkSvg` already used (M9.6 5.6 L12.1 10.3 … / M18.6 2.4 L19.65 4.35 …) — audit and app were
  // geometrically identical all along; the only real delta was the big star's fill opacity 0.85,
  // now included. Olive fills are fixed hero-tier accents (do not track `color`/`tier`).
  spark: {
    viewBox: '0 0 24 24',
    strokeWidth: 2,
    paths: [
      {
        tag: 'path',
        attrs: { d: 'M9.6 5.6 L12.1 10.3 L16.8 12.8 L12.1 15.3 L9.6 20 L7.1 15.3 L2.4 12.8 L7.1 10.3 Z' },
        fill: 'var(--cd-olive)',
        fillOpacity: 0.85,
        stroke: 'none'
      },
      { tag: 'path', attrs: { d: 'M9.6 5.6 L12.1 10.3 L16.8 12.8 L12.1 15.3 L9.6 20 L7.1 15.3 L2.4 12.8 L7.1 10.3 Z' } },
      {
        tag: 'path',
        attrs: { d: 'M18.6 2.4 L19.65 4.35 L21.6 5.4 L19.65 6.45 L18.6 8.4 L17.55 6.45 L15.6 5.4 L17.55 4.35 Z' },
        fill: 'var(--cd-olive)',
        strokeWidth: 1.5
      }
    ]
  },

  // Bell — reminder/alert field icon (CdEventEditCard, CdEventPreviewCard).
  // Not in the audit file; ported from CADENCE-Prototype-v2.dc.html `st_icon('bell', …)`.
  bell: {
    viewBox: '0 0 24 24',
    strokeWidth: 2,
    paths: [
      { tag: 'path', attrs: { d: 'M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9' } },
      { tag: 'path', attrs: { d: 'M13.73 21a2 2 0 01-3.46 0' } }
    ]
  },

  // Target — quadrant/priority concentric-rings glyph used in CdEventPreviewCard's info row.
  // Not in the audit file; ported from CADENCE-Prototype-v2.dc.html `st_icon('target', …)`.
  target: {
    viewBox: '0 0 24 24',
    strokeWidth: 2,
    paths: [
      { tag: 'circle', attrs: { cx: 12, cy: 12, r: 10 } },
      { tag: 'circle', attrs: { cx: 12, cy: 12, r: 6 } },
      { tag: 'circle', attrs: { cx: 12, cy: 12, r: 2 } }
    ]
  },

  // Search — magnifying glass. Not in the audit file; ported from CADENCE-Prototype-v2.dc.html
  // `st_icon('search', …)`. Used by CdDraftDrawer's search toggle + empty-state glyph.
  search: {
    viewBox: '0 0 24 24',
    strokeWidth: 2,
    paths: [
      { tag: 'circle', attrs: { cx: 10.5, cy: 10.5, r: 6.5 } },
      { tag: 'line', attrs: { x1: 15.5, y1: 15.5, x2: 20, y2: 20 } }
    ]
  },

  // Calendar — plain day-grid glyph (rect + top ticks + horizontal rule). Not in the audit file
  // (the audit's calendar glyphs are the bound-notebook `cal()`/`cd_month` family, which is a
  // distinct nav/view-switcher glyph, not this field icon). Used by Draft schedule buttons and
  // event edit date/time rows.
  calendar: {
    viewBox: '0 0 24 24',
    strokeWidth: 2,
    paths: [
      { tag: 'rect', attrs: { x: 3, y: 4, width: 18, height: 18, rx: 2 } },
      { tag: 'path', attrs: { d: 'M16 2v4M8 2v4M3 10h18' } }
    ]
  },

  // Clock — circle + hour/minute hand. Not in the audit file; ported from
  // CADENCE-Prototype-v2.dc.html `st_icon('clock', …)` / the app's existing `clockSvg` helper.
  // CdEventEditCard's alert row uses bell; clock is used in settings/time affordances.
  clock: {
    viewBox: '0 0 24 24',
    strokeWidth: 2,
    paths: [
      { tag: 'circle', attrs: { cx: 12, cy: 12, r: 9 } },
      { tag: 'path', attrs: { d: 'M12 7v5l3 2' } }
    ]
  },

  // Check — checkmark. Matches the audit's `uic`/`sysIcon` "check" polyline. Used by CdCheckCircle
  // (done state) and CdEventEditCard's selected-color-swatch check.
  check: {
    viewBox: '0 0 24 24',
    strokeWidth: 2,
    paths: [{ tag: 'polyline', attrs: { points: '20 6 9 17 4 12' } }]
  },

  // Image — picture frame + mountain glyph. Not in the audit file; ported from
  // CADENCE-Prototype-v2.dc.html `st_icon('image', …)`. Used by CdAssistantDrawer's input-bar
  // attach-image icon.
  image: {
    viewBox: '0 0 24 24',
    strokeWidth: 1.8,
    paths: [
      { tag: 'rect', attrs: { x: 3, y: 4, width: 18, height: 16, rx: 2 } },
      { tag: 'circle', attrs: { cx: 8.5, cy: 9.5, r: 1.6 } },
      { tag: 'path', attrs: { d: 'M21 16l-5-5-7 7' } }
    ]
  },

  // Arrow up — send button glyph. Not in the audit file; ported verbatim from
  // CdAssistantDrawer's existing inline SVG send-button path.
  'arrow-up': {
    viewBox: '0 0 24 24',
    strokeWidth: 2.2,
    paths: [{ tag: 'path', attrs: { d: 'M12 19V5M6 11l6-6 6 6' } }]
  },

  // Repeat — loop/cycle arrows. Not covered by either reference file; carried over unchanged from
  // the existing inline SVG used by CdEventEditCard's repeat-field icon.
  repeat: {
    viewBox: '0 0 24 24',
    strokeWidth: 2,
    paths: [
      { tag: 'polyline', attrs: { points: '17 1 21 5 17 9' } },
      { tag: 'path', attrs: { d: 'M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4' } },
      { tag: 'path', attrs: { d: 'M21 13v2a4 4 0 01-4 4H3' } }
    ]
  },

  // Location / pin — map pin glyph. Not in the audit file; ported verbatim from
  // CdEventEditCard's existing inline SVG location field icon.
  location: {
    viewBox: '0 0 24 24',
    strokeWidth: 2,
    paths: [
      { tag: 'path', attrs: { d: 'M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0118 0z' } },
      { tag: 'circle', attrs: { cx: 12, cy: 10, r: 3 } }
    ]
  },

  // Notes — page-with-lines glyph. Not in the audit file; ported verbatim from
  // CdEventEditCard's existing inline SVG notes field icon.
  notes: {
    viewBox: '0 0 24 24',
    strokeWidth: 2,
    paths: [
      { tag: 'path', attrs: { d: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z' } },
      { tag: 'polyline', attrs: { points: '14 2 14 8 20 8' } }
    ]
  },

  // Info — circled i. Not in the audit file; ported from CADENCE-Prototype-v2.dc.html
  // `st_icon('info', …)` minus the filled dot (app's existing CdEventPreviewCard usage uses a plain
  // line, no dot — kept as-is to match that call site exactly).
  info: {
    viewBox: '0 0 24 24',
    strokeWidth: 2,
    paths: [
      { tag: 'circle', attrs: { cx: 12, cy: 12, r: 10 } },
      { tag: 'line', attrs: { x1: 12, y1: 16, x2: 12, y2: 12 } },
      { tag: 'line', attrs: { x1: 12, y1: 8, x2: 12.01, y2: 8 } }
    ]
  },

  // Sync / cloud-sync — used by CdSettingsDrawer's "Fully synced" row. Ported verbatim from its
  // existing inline SVG (cloud-with-check silhouette).
  sync: {
    viewBox: '0 0 24 24',
    strokeWidth: 2,
    paths: [{ tag: 'path', attrs: { d: 'M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z' } }]
  },

  // Mail / envelope — used by CdSettingsDrawer's account-email row. Ported verbatim from its
  // existing inline SVG.
  mail: {
    viewBox: '0 0 24 24',
    strokeWidth: 2,
    paths: [
      { tag: 'rect', attrs: { x: 2, y: 4, width: 20, height: 16, rx: 2 } },
      { tag: 'path', attrs: { d: 'M2 7l10 6 10-6' } }
    ]
  },

  // Reset — circular-arrow "reset app" glyph. Ported verbatim from CdSettingsDrawer's existing
  // inline SVG (also matches the audit/prototype `uic`/`sysIcon` "reset" shape).
  reset: {
    viewBox: '0 0 24 24',
    strokeWidth: 2,
    paths: [
      { tag: 'path', attrs: { d: 'M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8' } },
      { tag: 'path', attrs: { d: 'M3 3v5h5' } }
    ]
  },

  // Spark (monochrome variant, no accent star) — same big-star silhouette as `spark` (which equals
  // the audit's `cd_ai` big star — see the `spark` entry note), but single-color: fill and stroke
  // both use CdIcon's resolved color (ICON_COLOR sentinel) at the audit's .85 fill opacity, and the
  // small accent star is omitted. Matches CdAssistantDrawer's header-icon usage (blue #3A6EA5, cf.
  // the audit's v16 "satTint/satSolid" recolored-AI-badge treatments). Kept as a distinct registry
  // entry rather than overloading `spark` with fill-tracking + accent-star-toggle behavior.
  'spark-mono': {
    viewBox: '0 0 24 24',
    strokeWidth: 2,
    paths: [
      {
        tag: 'path',
        attrs: { d: 'M9.6 5.6 L12.1 10.3 L16.8 12.8 L12.1 15.3 L9.6 20 L7.1 15.3 L2.4 12.8 L7.1 10.3 Z' },
        stroke: 'none',
        fill: ICON_COLOR,
        fillOpacity: 0.85
      },
      { tag: 'path', attrs: { d: 'M9.6 5.6 L12.1 10.3 L16.8 12.8 L12.1 15.3 L9.6 20 L7.1 15.3 L2.4 12.8 L7.1 10.3 Z' } }
    ]
  },

  // Journal, plain (no quill/feather) — ported verbatim from CdDraftDrawer's existing header-icon
  // inline SVG, which draws only the notebook-page outline (the first two paths of `journal`) and
  // omits the write-lines + feather quill entirely. Kept as a distinct registry entry rather than
  // trying to make `journal` conditionally omit paths.
  'journal-plain': {
    viewBox: '0 0 24 24',
    strokeWidth: 2,
    paths: [
      { tag: 'path', attrs: { d: 'M5 4.5 h8.4 a1.4 1.4 0 0 1 1.4 1.4 V13' } },
      { tag: 'path', attrs: { d: 'M5 4.5 a1.4 1.4 0 0 0 -1.4 1.4 V18.6 a1.4 1.4 0 0 0 1.4 1.4 h8.4 a1.4 1.4 0 0 0 1.4 -1.4 V17' } }
    ]
  },

  // X, small (no round linecap) — ported verbatim from CdDraftDrawer's small 12px "Remove" row
  // button. Differs from `close` (which uses stroke-linecap="round" per the audit) — this glyph
  // has no linecap override in the original markup, meaning it renders with CdIcon's default round
  // cap anyway, but the coordinates differ slightly (6,6→18,18 vs close's 7,7→17,17) so it's kept
  // as its own entry to preserve the exact original geometry.
  'x-small': {
    viewBox: '0 0 24 24',
    strokeWidth: 2.6,
    paths: [
      { tag: 'line', attrs: { x1: 6, y1: 6, x2: 18, y2: 18 } },
      { tag: 'line', attrs: { x1: 18, y1: 6, x2: 6, y2: 18 } }
    ]
  },

  // Pencil, small — NOT a scaled-down `pencil`/`cd_draft`: it's a distinct single-path
  // badge silhouette (no cap/seam/tip detail — those would smear at its 12px render size), so per
  // Zoe's ruling (align only if it were a same-shape reduction) it stays unchanged.
  'pencil-small': {
    viewBox: '0 0 24 24',
    strokeWidth: 2.4,
    paths: [{ tag: 'path', attrs: { d: 'M5 19l1-4L16 5l3 3L9 18z' } }]
  },

  // Calendar, alt proportions — preserved for the larger date-field proportions.
  // Differs from `calendar` (rect height 18 vs 17, and the tick-line path draws the horizontal rule
  // first then the two vertical ticks, vs `calendar`'s ticks-then-rule order/position) — kept as a
  // distinct entry to preserve the exact original proportions at this call site.
  'calendar-alt': {
    viewBox: '0 0 24 24',
    strokeWidth: 2,
    paths: [
      { tag: 'rect', attrs: { x: 3, y: 4, width: 18, height: 17, rx: 2 } },
      { tag: 'path', attrs: { d: 'M3 9h18M8 2v4M16 2v4' } }
    ]
  },

  // Pomodoro tomato — audit turn 21 `cd_tomato`, ported verbatim (fixed brand colors, not
  // stroke-driven — task-only glyph, never shown on events/drafts per the audit's scope note).
  // Body is a squashed ellipse with a darker under-shade wedge and a soft highlight; the calyx is
  // a stem line + 5 radiating leaf ellipses (rotated at 72-degree steps starting from -90deg,
  // computed from the source's `-90 + (360/5)*i` loop) + a small center dot. Colors are the
  // audit's default `body`/`leaf` params (`#C0564B` / `#6E9153`) — not tier-driven, since this
  // glyph's identity IS its fixed red/green coloring, unlike the slate-stroke utility family.
  tomato: {
    viewBox: '0 0 24 24',
    strokeWidth: 0,
    paths: [
      { tag: 'ellipse', attrs: { cx: 12, cy: 14.3, rx: 8.2, ry: 7.5 }, fill: '#C0564B', stroke: 'none' },
      {
        tag: 'ellipse',
        attrs: { cx: 9, cy: 11.6, rx: 1.6, ry: 2.5, transform: 'rotate(-20 9 11.6)' },
        fill: 'rgba(255,255,255,.26)',
        stroke: 'none'
      },
      { tag: 'line', attrs: { x1: 12, y1: 7, x2: 12, y2: 4.3 }, stroke: '#6E9153', strokeWidth: 1.7 },
      { tag: 'ellipse', attrs: { cx: 12, cy: 7, rx: 1.5, ry: 3, transform: 'rotate(-90 12 7)' }, fill: '#6E9153', stroke: 'none' },
      { tag: 'ellipse', attrs: { cx: 12, cy: 7, rx: 1.5, ry: 3, transform: 'rotate(-18 12 7)' }, fill: '#6E9153', stroke: 'none' },
      { tag: 'ellipse', attrs: { cx: 12, cy: 7, rx: 1.5, ry: 3, transform: 'rotate(54 12 7)' }, fill: '#6E9153', stroke: 'none' },
      { tag: 'ellipse', attrs: { cx: 12, cy: 7, rx: 1.5, ry: 3, transform: 'rotate(126 12 7)' }, fill: '#6E9153', stroke: 'none' },
      { tag: 'ellipse', attrs: { cx: 12, cy: 7, rx: 1.5, ry: 3, transform: 'rotate(198 12 7)' }, fill: '#6E9153', stroke: 'none' },
      { tag: 'circle', attrs: { cx: 12, cy: 7, r: 1.4 }, fill: '#6E9153', stroke: 'none' }
    ]
  },

  // View-switcher family — audit turn 10 `cal()` bound-calendar silhouette (spiral binding rings
  // over the top edge of a rounded frame), distinct from the plain-grid `calendar`/`calendar-alt`
  // field icons per turn 19's exclusion note ("已單獨設計過的不重複: ... Day/Week/Month/List").
  // Shared frame + 3 binding-ring paths (`cal()`'s procedural loop over x=7/12/17, rendered here as
  // static paths since the coordinates don't vary per instance) plus a per-view body. Olive body
  // accents (`var(--cd-olive)`) mark the active-unit emphasis the audit draws by default; the CdIcon
  // `tier`/`color` props still drive the frame/ring stroke via ICON_COLOR-less default (fixed slate
  // per the audit — bound-calendar glyphs don't recolor their frame per hero/utility tier).
  'view-day': {
    viewBox: '0 0 24 24',
    strokeWidth: 1.8,
    paths: [
      { tag: 'rect', attrs: { x: 3.5, y: 5, width: 17, height: 15.5, rx: 2.4 } },
      { tag: 'path', attrs: { d: 'M5.6 6 Q5.6 2.6 7 2.6 Q8.4 2.6 8.4 6' } },
      { tag: 'path', attrs: { d: 'M10.6 6 Q10.6 2.6 12 2.6 Q13.4 2.6 13.4 6' } },
      { tag: 'path', attrs: { d: 'M15.6 6 Q15.6 2.6 17 2.6 Q18.4 2.6 18.4 6' } },
      { tag: 'line', attrs: { x1: 3.5, y1: 9, x2: 20.5, y2: 9 } },
      { tag: 'rect', attrs: { x: 7, y: 12, width: 10, height: 5.5, rx: 1 }, fill: 'var(--cd-olive)', stroke: 'none' }
    ]
  },

  'view-week': {
    viewBox: '0 0 24 24',
    strokeWidth: 1.8,
    paths: [
      { tag: 'rect', attrs: { x: 3.5, y: 5, width: 17, height: 15.5, rx: 2.4 } },
      { tag: 'path', attrs: { d: 'M5.6 6 Q5.6 2.6 7 2.6 Q8.4 2.6 8.4 6' } },
      { tag: 'path', attrs: { d: 'M10.6 6 Q10.6 2.6 12 2.6 Q13.4 2.6 13.4 6' } },
      { tag: 'path', attrs: { d: 'M15.6 6 Q15.6 2.6 17 2.6 Q18.4 2.6 18.4 6' } },
      { tag: 'line', attrs: { x1: 3.5, y1: 9, x2: 20.5, y2: 9 } },
      { tag: 'rect', attrs: { x: 5, y: 12, width: 14, height: 3.4, rx: 0.6 }, fill: 'var(--cd-olive)', stroke: 'none' },
      { tag: 'line', attrs: { x1: 8.5, y1: 12, x2: 8.5, y2: 15.4 }, stroke: '#fff' },
      { tag: 'line', attrs: { x1: 12, y1: 12, x2: 12, y2: 15.4 }, stroke: '#fff' },
      { tag: 'line', attrs: { x1: 15.5, y1: 12, x2: 15.5, y2: 15.4 }, stroke: '#fff' }
    ]
  },

  'view-month': {
    viewBox: '0 0 24 24',
    strokeWidth: 1.8,
    paths: [
      { tag: 'rect', attrs: { x: 3.5, y: 5, width: 17, height: 15.5, rx: 2.4 } },
      { tag: 'path', attrs: { d: 'M5.6 6 Q5.6 2.6 7 2.6 Q8.4 2.6 8.4 6' } },
      { tag: 'path', attrs: { d: 'M10.6 6 Q10.6 2.6 12 2.6 Q13.4 2.6 13.4 6' } },
      { tag: 'path', attrs: { d: 'M15.6 6 Q15.6 2.6 17 2.6 Q18.4 2.6 18.4 6' } },
      { tag: 'line', attrs: { x1: 3.5, y1: 9, x2: 20.5, y2: 9 } },
      { tag: 'line', attrs: { x1: 9, y1: 9, x2: 9, y2: 20.5 } },
      { tag: 'line', attrs: { x1: 15, y1: 9, x2: 15, y2: 20.5 } },
      { tag: 'line', attrs: { x1: 3.5, y1: 13, x2: 20.5, y2: 13 } },
      { tag: 'line', attrs: { x1: 3.5, y1: 16.75, x2: 20.5, y2: 16.75 } }
    ]
  },

  // List — audit turn 10 `cd_list`: no calendar frame (unlike day/week/month above), just a
  // checklist silhouette — 3 rule lines + a checkmark accent on row 1 + 2 plain row dots.
  'view-list': {
    viewBox: '0 0 24 24',
    strokeWidth: 2,
    paths: [
      { tag: 'line', attrs: { x1: 9, y1: 6, x2: 20, y2: 6 } },
      { tag: 'line', attrs: { x1: 9, y1: 12, x2: 20, y2: 12 } },
      { tag: 'line', attrs: { x1: 9, y1: 18, x2: 20, y2: 18 } },
      { tag: 'path', attrs: { d: 'M3.5 5.5 L4.6 6.6 L6.4 4.4' }, stroke: 'var(--cd-olive)' },
      { tag: 'circle', attrs: { cx: 5, cy: 12, r: 1.3 }, fill: ICON_COLOR, stroke: 'none' },
      { tag: 'circle', attrs: { cx: 5, cy: 18, r: 1.3 }, fill: ICON_COLOR, stroke: 'none' }
    ]
  },

  // Settings / gear — audit turn 10e `cd_gear`: chunky rounded 6-tooth gear silhouette (distinct
  // family from the thin 8-spoke `ic_settings` gear drawn in the deprecated turn-9 exploration,
  // which this catalog excludes). Path is the exact numeric output of the audit's procedural
  // gear-outline loop (cx 12, cy 12, rOut 9.4, rIn 6.6, 6 teeth, 5-degree tooth shoulder) —
  // generated once and inlined here since the shape has no per-instance parameters. Center hole is
  // a plain ring at rest; the audit's optional accent dot is omitted (this registry has no
  // "active" state concept for a single settings glyph — CdIcon callers needing emphasis pass
  // `color`).
  gear: {
    viewBox: '0 0 24 24',
    strokeWidth: 1.8,
    paths: [
      {
        tag: 'path',
        attrs: {
          d: 'M18.12 9.53 L20.99 9.25 L20.99 14.75 L18.12 14.47 A6.6 6.6 0 0 1 17.20 16.06 L18.87 18.41 L14.11 21.16 L12.92 18.54 A6.6 6.6 0 0 1 11.08 18.54 L9.89 21.16 L5.13 18.41 L6.80 16.06 A6.6 6.6 0 0 1 5.88 14.47 L3.01 14.75 L3.01 9.25 L5.88 9.53 A6.6 6.6 0 0 1 6.80 7.94 L5.13 5.59 L9.89 2.84 L11.08 5.46 A6.6 6.6 0 0 1 12.92 5.46 L14.11 2.84 L18.87 5.59 L17.20 7.94 A6.6 6.6 0 0 1 18.12 9.53 Z'
        }
      },
      { tag: 'circle', attrs: { cx: 12, cy: 12, r: 3.4 } }
    ]
  },

  // Brush — Style row field icon (CdEventEditCard). Ported verbatim from CADENCE Handoff.dc.html's
  // `brush` glyph: paint-tube body + angled ferrule + bristle tip.
  brush: {
    viewBox: '0 0 24 24',
    strokeWidth: 2,
    paths: [
      { tag: 'rect', attrs: { x: 3.5, y: 4.5, width: 13, height: 6, rx: 1.6 } },
      { tag: 'path', attrs: { d: 'M14 7.5h4.5a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H11' } },
      { tag: 'path', attrs: { d: 'M9.5 13.5v2.5a2 2 0 0 1-2 2H7a1 1 0 0 0-1 1v1' } }
    ]
  },

  // Globe — Location field icon (CdEventEditCard) and Timezone row icon. Ported verbatim from
  // CADENCE Handoff.dc.html's `globe` glyph: circle + equator line + meridian lens shape.
  globe: {
    viewBox: '0 0 24 24',
    strokeWidth: 2,
    paths: [
      { tag: 'circle', attrs: { cx: 12, cy: 12, r: 8.5 } },
      { tag: 'path', attrs: { d: 'M3.5 12h17' } },
      { tag: 'path', attrs: { d: 'M12 3.5c2.4 2.3 3.6 5.3 3.6 8.5s-1.2 6.2-3.6 8.5c-2.4-2.3-3.6-5.3-3.6-8.5s1.2-6.2 3.6-8.5z' } }
    ]
  },

  // Icon-picker category glyphs (CdAppearancePicker) — ported verbatim from CADENCE Handoff.dc.html's
  // `ICO_CATS` category set (General / Home & Life / Work & Study) and their per-icon options.
  star: {
    viewBox: '0 0 24 24',
    strokeWidth: 2,
    paths: [{ tag: 'path', attrs: { d: 'M12 3.6l2.5 5.1 5.6.8-4 3.9.95 5.6L12 17.9 6.9 20l1-5.6-4-3.9 5.6-.8z' } }]
  },

  layers: {
    viewBox: '0 0 24 24',
    strokeWidth: 2,
    paths: [
      { tag: 'path', attrs: { d: 'M12 3.5l8.5 4.5-8.5 4.5-8.5-4.5z' } },
      { tag: 'path', attrs: { d: 'M3.5 12.5l8.5 4.5 8.5-4.5' } },
      { tag: 'path', attrs: { d: 'M3.5 16.8l8.5 4.5 8.5-4.5' } }
    ]
  },

  home: {
    viewBox: '0 0 24 24',
    strokeWidth: 2,
    paths: [
      { tag: 'path', attrs: { d: 'M4 10.5L12 4l8 6.5' } },
      { tag: 'path', attrs: { d: 'M6 9.5V19a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V9.5' } }
    ]
  },

  lock: {
    viewBox: '0 0 24 24',
    strokeWidth: 2,
    paths: [
      { tag: 'rect', attrs: { x: 5, y: 10.5, width: 14, height: 9, rx: 2 } },
      { tag: 'path', attrs: { d: 'M8 10.5V8a4 4 0 0 1 8 0v2.5' } }
    ]
  },

  heart: {
    viewBox: '0 0 24 24',
    strokeWidth: 2,
    paths: [{ tag: 'path', attrs: { d: 'M12 20s-7-4.6-7-9.5A3.7 3.7 0 0 1 12 8a3.7 3.7 0 0 1 7-2.5c0 4.9-7 9.5-7 9.5z' } }]
  },

  work: {
    viewBox: '0 0 24 24',
    strokeWidth: 2,
    paths: [
      { tag: 'rect', attrs: { x: 3.5, y: 7.5, width: 17, height: 12, rx: 2 } },
      { tag: 'path', attrs: { d: 'M8.5 7.5V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5' } }
    ]
  },

  users: {
    viewBox: '0 0 24 24',
    strokeWidth: 2,
    paths: [
      { tag: 'circle', attrs: { cx: 9, cy: 9, r: 3 } },
      { tag: 'path', attrs: { d: 'M3.5 19c.9-2.6 3-3.7 5.5-3.7s4.6 1.1 5.5 3.7' } },
      { tag: 'path', attrs: { d: 'M16 6.2a3 3 0 0 1 0 5.8' } },
      { tag: 'path', attrs: { d: 'M17.5 15.6c1.8.5 3 1.7 3.5 3.4' } }
    ]
  },

  school: {
    viewBox: '0 0 24 24',
    strokeWidth: 2,
    paths: [
      { tag: 'path', attrs: { d: 'M12 4l9 4-9 4-9-4 9-4z' } },
      { tag: 'path', attrs: { d: 'M6.5 10v5c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5v-5' } }
    ]
  },

  bulb: {
    viewBox: '0 0 24 24',
    strokeWidth: 2,
    paths: [
      { tag: 'path', attrs: { d: 'M9 17.5h6M9.5 20h5' } },
      { tag: 'path', attrs: { d: 'M12 3.5a5.5 5.5 0 0 0-3.2 10c.5.4.7.9.7 1.5h5c0-.6.2-1.1.7-1.5A5.5 5.5 0 0 0 12 3.5z' } }
    ]
  },

  eye: {
    viewBox: '0 0 24 24',
    strokeWidth: 2,
    paths: [
      { tag: 'path', attrs: { d: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z' } },
      { tag: 'circle', attrs: { cx: 12, cy: 12, r: 3 } }
    ]
  },

  note: {
    viewBox: '0 0 24 24',
    strokeWidth: 2,
    paths: [
      { tag: 'path', attrs: { d: 'M6.5 3.5h7L19 9v10.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19.5v-14a2 2 0 0 1 1.5-2z' } },
      { tag: 'path', attrs: { d: 'M13 3.5V9h5.5' } },
      { tag: 'line', attrs: { x1: 8.5, y1: 13, x2: 15.5, y2: 13 } },
      { tag: 'line', attrs: { x1: 8.5, y1: 16, x2: 13, y2: 16 } }
    ]
  }
}
