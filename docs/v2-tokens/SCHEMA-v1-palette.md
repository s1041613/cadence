# v1 Palette Schema

**Status:** implemented on `feat/v2-tokens`
**Written:** 2026-07-31 · **Implemented:** 2026-08-01
**Purpose:** the complete list of colour roles a Cadence palette must define. v1's values are filled in; a second palette is authored by supplying a value for every role in this document.

---

## How to read this

Each role has a **name**, a **v1 value**, a **contract** (what it must be true of), and **usage**. A palette that omits a role is broken — there is no fallback, because silently inheriting the previous palette's colour is worse than an obviously missing one.

**Contrast figures in this document were measured against `surface-page` (`#F2F1EC`)**, the largest area of colour on screen, using WCAG 2.1 relative luminance. Where a role is normally rendered on a different surface, that is stated.

**Fonts are not part of this schema.** Two typefaces ship as a fixed passthrough and no palette may override them.

---

## 1. Surfaces and lines — 5 roles

Converged from 17 distinct hardcoded values. See "Convergence record" below for what merged into what.

| Role | v1 value | Contract | Usage |
|---|---|---|---|
| `surface-page` | `#F2F1EC` | The base. Every text role's contrast is measured against this. | Page background, topbar, bottom nav, calendar strip, day-list header. 17 sites. |
| `surface-raised` | `#FBFAF7` | Lighter than `surface-page`. Separation is intentionally subtle (1.08:1) — it reads as a lift, not a border. | Month cells, cards, popovers. 25 sites. |
| `surface-inset` | `#f1efe8` | Darker than `surface-page`. Pairs with an `inset` box-shadow to read as recessed. | Segmented control track, search fields, text inputs. |
| `surface-textured` | `#EEEBE1` | Carries a dot-pattern overlay (`#c9c6b8`, 22px pitch). **Provisional** — see note. | Draft drawer sheet only. |
| `line` | `#E5E3DB` | Divider. 1.14:1 against `surface-page` — decorative only, below the 3:1 non-text guideline. | Borders, dividers, grid lines. 56 sites — the most-used token in the app. |

**`surface-textured` is provisional.** It exists only because the draft drawer's dot texture needs a carrier surface. Zoe has scheduled a draft-drawer redesign; if the texture does not survive it, this role folds into `surface-page`. Do not build a v2 value for it without checking whether the texture still exists.

**The two interstitial pages were moved to `surface-page`.** `JoinCalendarPage` and `AuthCallbackPage` hardcoded `#eeebe1` — the same value, not a token reference — under a comment calling it a "parchment" background. A distinct interstitial surface is not worth a palette role for two screens a user never sees beside the main UI, so they now share the page colour.

---

## 2. Text — 3 roles

| Role | v1 value | Contrast vs page | Contract | Usage |
|---|---|---|---|---|
| `ink` | `#56585E` | **6.29:1** ✅ AA | Primary reading text. Must meet 4.5:1 against `surface-page`. | Body text, titles, values. 68 sites. |
| `ink-secondary` | `#6E7176` | **4.33:1** ⚠️ **fails AA** | Intended as supporting text. Currently 0.17 short of 4.5:1. | Labels, secondary rows, chevrons. 37 sites. |
| `ink-muted` | `#9C9E94` | **2.40:1** ❌ fails AA | Non-essential information only. Must never carry meaning that is unavailable elsewhere. | Placeholders, out-of-month dates, counts. 60 sites + 25 hardcoded. |

**Two accessibility findings recorded rather than fixed:**

- **`ink-secondary` fails AA against the new page background.** It measures 4.69:1 against `#FBFAF7` (the old, cooler background) but only **4.33:1** against `#F2F1EC`. Adopting the warm page colour is what pushed it below threshold. Darkening it to roughly `#696C71` would clear 4.5:1. Not changed here because it moves 37 render sites.
- **`ink-muted` is far below AA at 2.40:1.** It was already 2.60:1 against the old background. A palette author must treat this role as decorative — it is not safe for text a user needs to read.

**A v2 palette should fix both rather than copy them.** The contract column, not the v1 value, is what a new palette must satisfy.

---

## 3. Accent — 6 roles

| Role | v1 value | Contrast vs page | Contract | Usage |
|---|---|---|---|---|
| `accent` | `#B3AC91` | 2.01:1 | A **fill**, not a text colour. Never used for text against `surface-page`. | Selected fills, toggle-on, primary action. 32 sites. |
| `on-accent` | `#3f4136` | **4.57:1 vs `accent`** ✅ | **Paired role.** Its contract is against `accent`, not the page. Any palette redefining `accent` must re-check this pair. | Text and icons on an accent fill. 9 sites. |
| `accent-mid` | `#8F8A6E` | 3.08:1 | Non-text affordance (meets 3:1). Not safe for body text. | Secondary accent icons and labels. 5 sites. |
| `accent-strong` | `#6E6A52` | **4.83:1** ✅ AA | The accent value that is safe as text. | Create-button and FAB icons. 4 sites. |
| `accent-subtle` | `#e7e4d6` | 1.06:1 | A **tinted surface** in the accent family, not a neutral. Must stay warm enough to carry an accent-tinted border. | FAB background (hover `#dfdbcb`). |
| `control-off` | `#D7D4CB` | 1.29:1 | The **unset state** of a binary control. Must read as "not yet chosen" without reading as disabled. Pairs with `accent` as the on-state. | Switch track (off), checkbox border (unchecked), dropdown borders. |

**`control-off` is not yet consistently applied.** `CdSwitch` now references it, but `CdCheckCircle` still hardcodes three values of its own: `#c4c1b4` unchecked, `#8f8c7e` on hover, and `rgba(107,107,96,.12)` for its hover ring. None matches a token; `#8f8c7e` sits 16 steps from `accent-mid` and was probably meant to be it.

Consolidating those needs a per-site look, since they form a hover progression rather than a single state.

**`accent-subtle` is deliberately not merged into `surface-inset`,** despite being numerically close. The FAB composes it with an accent-tinted border (`rgba(accent-rgb, .5)`) and an `accent-strong` icon; on a neutral background that border loses its footing. Zoe reviewed this and chose to keep it separate.

**The white-on-accent defect, recorded not fixed.** Six sites place white text on `accent` at **2.28:1**, while three siblings use `on-accent` at 4.57:1. The paired-role rule above prevents recurrence; the existing six are deferred.

---

## 4. Translucent channels — 3 roles + required RGB triples

Composed as `rgba(var(--cd-ink-rgb), <alpha>)`.

| Role | Alpha | Purpose | Currently |
|---|---|---|---|
| `ink-wash-hover` | `0.06` | Hover background on buttons and list rows | 22 sites, alphas .03–.08 |
| `ink-wash-line` | `0.08` | Grid lines and column dividers | 3 sites, all in the time grid |
| `ink-wash-strong` | `0.12` | Emphasis underlines, selected cells | 10 sites, alphas .1–.3 |

**A palette MUST supply an RGB triple for every role used translucently:**

```
--cd-ink-rgb:     86, 88, 94
--cd-accent-rgb:  179, 172, 145
--cd-scrim-rgb:   40, 38, 30
```

**This is the most important rule in this document.** `rgba(86, 88, 94, α)` was hand-written at 34 sites across 16 files because `--cd-ink-rgb` did not exist. Such literals share no text with any token name, so a rename reports success while every wash stays frozen on the old palette — the exact failure this work exists to prevent, and it was unguarded for the app's most-used colour.

**Done:** the triple is added, all 34 sites reference it, and `check-tokens` now fails on the literal.

**Still open:** the three alphas above are the *intended* scale, not the current state — 18 distinct alphas remain in use. Collapsing them changes rendering visibly (the week agenda's dotted rule is `.3`) and needs per-site review, so it was deliberately not bundled with the zero-pixel work.

---

## 5. Semantic — 4 roles

| Role | v1 value | Contrast vs page | Notes |
|---|---|---|---|
| `weekday-saturday` | `#3A6EA5` | **4.70:1** ✅ AA | |
| `weekday-sunday` | `#C0564B` | 3.97:1 | Below 4.5:1 as text. Currently used on date numerals. |
| `danger` | `#C0564B` | 3.97:1 | **Same value as `weekday-sunday` in v1, kept as a separate role** — a palette may well want a distinct destructive colour. Do not merge. |
| `danger-hover` | `#B4655C` | 3.75:1 | Hover state for destructive actions. |

**`warn` is intentionally absent from the count but must be defined.** `--cd-warn` (`#C98A2E`, 2.59:1) has zero consumers today. It is retained in the schema because a semantic set without a warning colour is incomplete, and a v2 author who never sees the role will not define it. Mark it as currently-unused rather than deleting it.

---

## 6. Outside the palette

### Quadrant colours — deliberately not themeable

The four Eisenhower quadrant colours and their paired text colours **are not part of this schema** and must not be given `var()` references.

`src/composables/use-theme.ts` is the single source of truth. Its `backgroundColor` values are **persisted onto event records in the database**; a `var()` there would write CSS syntax into stored data.

| Quadrant | Fill | Text |
|---|---|---|
| do | `#C56A5E` | `#4A3318` |
| plan | `#6E839B` | `#2A2D27` |
| quick | `#BFA86A` | `#3E3845` |
| later | `#9A988F` | `#33403A` |

**Current state to clean up:** these values are written in **four places** — `use-theme.ts`, twelve zero-consumer CSS tokens, `CdEventEditCard.vue`, and `CdDraftDrawer.vue` — plus a duplicated fallback in `EventComposerOverlay.vue`. The twelve CSS tokens should be deleted (they can never gain consumers) and the three JS copies should import from `use-theme.ts`.

**Known consequence:** existing event records hold old hex values. Changing these does not update them retroactively, so a palette swap leaves old and new events inconsistent. That is a data-migration problem, not a token problem.

### Fonts

Two typefaces, fixed passthrough, not themeable. Instrument Serif for the month poster title only (single weight, no CJK coverage); Zen Kaku Gothic New for everything else (ships 300/400/500/700/900 — **no 600, no 800**).

---

## Convergence record

What merged into what, so a reviewer can check the decisions rather than re-derive them.

| Target role | Absorbed | Δ | Note |
|---|---|---|---|
| `surface-inset` | `#efede4` | 4 | Month sheet |
| | `#eeede7` | 3 | Calendar chip |
| | `#edeae0` | 6 | Settings drawer |
| | `#e4e1d7` | 13 | Draft search field — **visible change**, accepted because the draft drawer is being redesigned |
| | `#f4f2ea` | 2 | Draft composer |
| `line` | `#eeece4` (`--cd-line-3`) | — | Was a token, zero consumers |
| | `#e9e6dd` (`--cd-line-4`) | — | Popover borders |
| | `#e4e1d6` (`--cd-line-5`) | — | Sole consumer is the draft composer border |
| | `#e4e1d8` | — | Calendar chip border |
| `ink-muted` | `--cd-ink-3` | 0 | Identical value, 4 consumers vs 60 |

**Deleted outright:** `--cd-olive-mix-3` (`#6E6A54`, 1 consumer, differs from `mix-2` by one channel step — a typo, not a role), `--cd-danger-3` (zero consumers), `--cd-month-paper` (zero consumers), the twelve quadrant tokens (can never gain consumers).

**Not merged, with reasons:** `accent-subtle` (accent family, not neutral — see §3), `danger` vs `weekday-sunday` (same value, different semantics — see §5), `surface-textured` (carries a texture — see §1).

**Consequences accepted by Zoe:**
- The draft drawer's search field loses its recessed appearance: the gap between field and paper narrows from ~10 to ~3, so the dot texture becomes more prominent than the inset itself. To be redesigned with the drawer.
- Every screen except the pomodoro and home screens shifts warmer, as the page background moves from `#fafaf9` to `#F2F1EC`.

---

## Role count

| Family | Roles |
|---|---|
| Surfaces and lines | 5 |
| Text | 3 |
| Accent | 6 |
| Translucent channels | 3 (+3 RGB triples) |
| Semantic | 4 (+`warn`, unused) |
| Scrim | 2 |
| Elevation | 1 |
| **Total** | **24** |

Elevation contributes one role, `--cd-shadow-overlay`; its tint reuses `--cd-scrim-rgb` and its geometry is fixed across palettes.

Against 53 colour tokens today, 23 of which have zero consumers. **A palette author fills in 24 values plus 3 RGB triples.**

### Tokens to delete

36 in total:

- 12 quadrant tokens (`--cd-quad-*`, `-ink`, `-tint`) — real source is `use-theme.ts`
- 7 event-colour tokens (`--cd-swatch-1..6`, `--cd-event`) — real source is `CdAppearancePicker.vue`
- 11 shadow tokens — 6 that were already dead, plus `frame`, `pill-active`, `drawer`, `sheet`, `modal` and `menu`, all replaced by the single overlay token
- 3 scrim steps (`light`, base, `strong`) — imperceptible from `mid`
- `--cd-olive-mix-3` — one channel step from `mix-2`
- `--cd-danger-3`, `--cd-month-paper`, `--cd-line-3` — zero consumers
- `--cd-ink-3` — identical to `--cd-muted`

---

## 7. Scrim — 2 roles

All scrims share the triple `40, 38, 30` and vary only in alpha.

| Role | v1 alpha | Usage |
|---|---|---|
| `scrim` | `0.32` | Behind sheets, popovers, drawers, the event composer, the settings drawer. |
| `scrim-heavy` | `0.4` | Behind the side drawer only. |

**Five tokens collapse to two.** The existing `.28 / .30 / .32 / .34` steps are not distinguishable. Composited over `surface-page` they render `#B9B8B2`, `#B5B4AE`, `#B1B0AA`, `#ADACA6` — **four channel-steps apart, which is below the threshold of perception**. Only `.4` (`#A1A09A`, twelve steps from its neighbour) is a genuine second level.

That each alpha had its own consumer is not evidence of intent: different components picked similar-looking numbers independently. `.32` is chosen as the survivor because it already has the most consumers (4) and sits mid-range, so no site moves by more than two steps.

`--cd-scrim-rgb: 40, 38, 30` must be supplied by any palette.

---

## 8. Shadow — one token, tint themeable

`--cd-shadow-overlay` is the only shadow token. See "Elevation" below for the two-level model and why a ramp is unnecessary.

Its tint comes from `--cd-scrim-rgb`, so a palette changes shadow colour without touching geometry.

**Remaining hardcoded shadows, all kept deliberately** — none is elevation:

| Site | Purpose |
|---|---|
| `CdDraftDrawer.vue:284` | Double `inset` with a white highlight — texture lighting, tied to `surface-textured` |
| `CdDraftDrawer.vue:354` | `inset` — recession, not elevation |
| `CdDraftDrawer.vue:368` | Bespoke tint; will be revisited with the draft-drawer redesign |
| `CdSwitch.vue:77`, `CdSettingsDrawer.vue:1210` | Switch thumb — depth within a control |
| `CdFab.vue:35` | FAB — depth within a control |
| `CdPopover.vue:152` | Caret — edge decoration |
| `CdCheckCircle.vue:45` | Hover ring in the accent family; see `control-off` in §3 |
| `CdCopyToDaysCard.vue:182` | `inset` ring used as a border |

---

## 9. Event colours — outside the palette

Like the quadrant colours, these are **user data**, not theme values.

**Preset swatches** — six options a user picks from when colouring an event:

`#4A8B85` `#63996B` `#6863B0` `#8E6FB0` `#A56D91` `#4C4E57`

A deliberately cool band (teal → green → indigo → violet → plum → near-black) that avoids the quadrant hues so a custom colour never reads as a quadrant.

**Default event colour:** `#E3A75C`.

**Current state to clean up.** The same pattern as the quadrants: the CSS tokens (`--cd-swatch-1..6`, `--cd-event`) have **zero `var()` consumers**, while the real values live as literals — `COLOR_SWATCHES` in `CdAppearancePicker.vue:114`, and `#E3A75C` hardcoded as the default in `CdEventEditCard.vue:243`, `QuickAddPopover.vue:122,152`, and `Pv2EventEditCard.vue:178`.

**These values must stay literal** for the same reason as the quadrants — a chosen colour is persisted onto the event record. Delete the seven dead CSS tokens and keep a single JS source. Changing a preset does not retroactively update events already coloured with it.

---

## Elevation — 2 levels, decided

**Level 1 is "no shadow".** Anything sitting on the page — cards, month cells, event chips, segmented controls, buttons — separates via `line` and the surface roles. A shadow on something that is not actually floating is decoration, and it competes with the only real elevation signal in the app.

**Level 2 is `--cd-shadow-overlay`**, one value for everything that floats over the page and covers it: drawers, sheets, modals, menus, dropdowns, the date picker, the event composer.

This follows Carbon's rule, the only explicitly documented shadow-versus-border criterion found across eight surveyed design systems: flat-plane content gets a border if it needs to look interactive, and elevation is reserved for things that genuinely float.

**Why one overlay value rather than a ramp.** Every overlay in this app pairs with `scrim`, and the scrim is what communicates "this covers the page". The shadow only defines the panel's edge, and that job does not vary by component. The previous `drawer` / `sheet` / `modal` / `menu` tokens differed by geometry alone, with nothing distinguishing them semantically — which is how twelve tokens accumulated and six went unused.

**The value carries no vertical offset on purpose.** One shadow serves panels anchored to different edges; the bottom sheet is flush with the viewport, so a downward cast would be clipped and the sheet would read as having no shadow at all.

**Geometry is not themeable.** A palette overrides the tint channel only — elevation must read the same across palettes, or the same drawer would appear to float at different heights in different palettes.

**Kept outside the scale deliberately:** inset shadows (recession, not elevation), the switch thumb and FAB (depth *within* a control), and the popover caret (edge decoration).

---

## Nothing is open

All items from earlier drafts are resolved:

- **Elevation scale** — decided above. Two levels, the first being none.
- **`--cd-btn-primary`** (`#2F3033`) — removed. Zero consumers, and its own annotation marks it as belonging to v2. A v1 palette should not define it.
- **`CdCheckCircle`'s hover ring** — investigated. It is a hover ring rather than a focus ring, and one of three untokenised accent-family values in that component. Folded into the `control-off` role in §3.
