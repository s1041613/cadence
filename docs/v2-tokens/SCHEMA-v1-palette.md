# v1 Palette Schema

**Status:** draft for review
**Written:** 2026-07-31
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
| `surface-textured` | `#EEEBE1` | Carries a dot-pattern overlay (`#c9c6b8`, 22px pitch). **Provisional** — see note. | Draft drawer sheet. Also two auth pages that arguably should use `surface-page`. |
| `line` | `#E5E3DB` | Divider. 1.14:1 against `surface-page` — decorative only, below the 3:1 non-text guideline. | Borders, dividers, grid lines. 56 sites — the most-used token in the app. |

**`surface-textured` is provisional.** It exists only because the draft drawer's dot texture needs a carrier surface. Zoe has scheduled a draft-drawer redesign; if the texture does not survive it, this role folds into `surface-page`. Do not build a v2 value for it without checking whether the texture still exists.

**Note on the two auth pages.** `JoinCalendarPage` and `AuthCallbackPage` currently consume the token behind `surface-textured` (named `--cd-draft-paper`), despite having nothing to do with drafts and no texture. This is a misapplication, not a role. They should move to `surface-page`.

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

## 3. Accent — 5 roles

| Role | v1 value | Contrast vs page | Contract | Usage |
|---|---|---|---|---|
| `accent` | `#B3AC91` | 2.01:1 | A **fill**, not a text colour. Never used for text against `surface-page`. | Selected fills, toggle-on, primary action. 32 sites. |
| `on-accent` | `#3f4136` | **4.57:1 vs `accent`** ✅ | **Paired role.** Its contract is against `accent`, not the page. Any palette redefining `accent` must re-check this pair. | Text and icons on an accent fill. 9 sites. |
| `accent-mid` | `#8F8A6E` | 3.08:1 | Non-text affordance (meets 3:1). Not safe for body text. | Secondary accent icons and labels. 5 sites. |
| `accent-strong` | `#6E6A52` | **4.83:1** ✅ AA | The accent value that is safe as text. | Create-button and FAB icons. 4 sites. |
| `accent-subtle` | `#e7e4d6` | 1.06:1 | A **tinted surface** in the accent family, not a neutral. Must stay warm enough to carry an accent-tinted border. | FAB background (hover `#dfdbcb`). |
| `control-off` | `#D7D4CB` | 1.29:1 | The **unset state** of a binary control. Must read as "not yet chosen" without reading as disabled. Pairs with `accent` as the on-state. | Switch track (off), checkbox border (unchecked), dropdown borders. |

**`control-off` was found late and is not yet consistently applied.** Three components express the same state with three different values: `CdSwitch.vue:39` hardcodes `#D7D4CB` (which *is* `--cd-line-2`, just not referenced), while `CdCheckCircle.vue` uses `#c4c1b4` for its unchecked border, `#8f8c7e` on hover, and `rgba(107,107,96,.12)` for its hover ring. None of the latter three matches any token; `#8f8c7e` is 16 steps from `accent-mid` (`#8F8A6E`) and was probably meant to be it.

Consolidating these needs a per-site look, since the check circle's three values form a hover progression rather than a single state. The role itself is real and belongs in the schema regardless.

**`accent-subtle` is deliberately not merged into `surface-inset`,** despite being numerically close. The FAB composes it with an accent-tinted border (`rgba(accent-rgb, .5)`) and an `accent-strong` icon; on a neutral background that border loses its footing. Zoe reviewed this and chose to keep it separate.

**The white-on-accent defect, recorded not fixed.** Six sites place white text on `accent` at **2.28:1**, while three siblings use `on-accent` at 4.57:1. The paired-role rule above prevents recurrence; the existing six are deferred.

---

## 4. Translucent channels — 3 roles + required RGB triples

Composed as `rgba(var(--cd-ink-rgb), <alpha>)`.

| Role | Alpha | Purpose | Currently |
|---|---|---|---|
| `ink-wash-hover` | `0.06` | Hover background on buttons and list rows | 22 sites across alphas .03–.08 |
| `ink-wash-line` | `0.08` | Grid lines and column dividers | 3 sites, all in the time grid |
| `ink-wash-strong` | `0.12` | Emphasis underlines, selected cells, small shadows | 10 sites across alphas .1–.3 |

**A palette MUST supply an RGB triple for every role used translucently.** v1 needs:

```
--cd-ink-rgb:    86, 88, 94      /* MISSING TODAY — must be added */
--cd-olive-rgb:  179, 172, 145   /* exists */
--cd-scrim-rgb:  40, 38, 30      /* exists */
```

**This is the single most important line in this document.** `rgba(86, 88, 94, α)` is hand-written at **29 sites across 16 files** because no `--cd-ink-rgb` exists. Those literals share no text with any token name, so a rename reports success while the value stays frozen on the old palette. This is the exact failure the token work exists to prevent, and it is currently unprevented for the most-used colour in the app.

**Adopt in two steps.** Adding `--cd-ink-rgb` and pointing the 29 literals at it is a zero-pixel change and should land first. Collapsing 18 alphas to 3 changes rendering visibly (the week agenda's dotted rule is `.3`, the segmented shadow `.16`) and needs per-site review.

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
| **Total** | **23** |

Shadows contribute no new roles — they reuse `--cd-ink-rgb` and `--cd-scrim-rgb` as tint, with fixed geometry.

Against 53 colour tokens today, 23 of which have zero consumers. **A palette author fills in 22 values plus 3 RGB triples.**

### Tokens to delete

30 in total, none of which can ever gain a consumer:

- 12 quadrant tokens (`--cd-quad-*`, `-ink`, `-tint`) — real source is `use-theme.ts`
- 7 event-colour tokens (`--cd-swatch-1..6`, `--cd-event`) — real source is `CdAppearancePicker.vue`
- 6 dead shadow tokens (`pill-active-2`, `picker`, `settings`, `dropdown`, `dropdown-2`, `matrix-selected`)
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

## 8. Shadow — tint is themeable, geometry is not

**Geometry stays fixed across palettes.** Elevation should read the same regardless of colour, so a palette overrides the tint channels only, never the offset, blur, or spread.

Two tint channels cover every shadow in the app:

| Channel | v1 value | Used by |
|---|---|---|
| `--cd-ink-rgb` | `86, 88, 94` | Small separator shadows (1–3px) |
| `--cd-scrim-rgb` | `40, 38, 30` | Overlay shadows (drawer, sheet, modal, menu) |

**Current state:** 12 shadow tokens exist, **6 of which have zero consumers** (`pill-active-2`, `picker`, `settings`, `dropdown`, `dropdown-2`, `matrix-selected`). Delete those. The remaining 6 are consumed once each.

**Nine hardcoded shadows remain in legacy scope.** Three of them use `rgba(86, 88, 94, α)` — the same untokenised ink triple as §4, and they leak identically on a palette swap:

| Site | Value | Note |
|---|---|---|
| `CdSegmented.vue:52` | `0 1px 2px rgba(86,88,94,.16)` | **Must tokenise** — ink triple |
| `CdSettingsDrawer.vue:1130` | `0 1px 2px rgba(86,88,94,.1)` | **Must tokenise** — ink triple |
| `CdSettingsDrawer.vue:1275` | `0 1px 2px rgba(86,88,94,.08)` | **Must tokenise** — ink triple |
| `CdCheckCircle.vue:45` | `0 0 0 4px rgba(107,107,96,.12)` | Focus ring in the accent family — needs its own decision |
| `CdDraftDrawer.vue:284` | double `inset` with white highlight | Texture lighting; tied to `surface-textured` |
| `CdDraftDrawer.vue:354` | `inset 0 1px 2px rgba(0,0,0,.06)` | Neutral black — safe to leave |
| `CdDraftDrawer.vue:368` | `0 3px 10px -5px rgba(60,58,48,.22)` | Bespoke tint, no matching token |
| `CdSwitch.vue:77` | `0 1px 2px rgba(0,0,0,.18)` | Neutral black — safe to leave |

An elevation scale (how many steps exist) is still undesigned and is out of scope for this schema.

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

## Still to define

Only one item remains open, and it is a design decision rather than an implementation one.

**An elevation scale — how many levels of "raised" this product has.**

No such definition exists today. The 12 shadow tokens were hand-rolled per component, so they describe *where* a shadow is used (drawer, sheet, modal, picker, dropdown, menu) rather than *how high* the thing is. Six already have zero consumers, which is what happens when tokens are named after call sites instead of a scale.

What the current values suggest, if a scale were derived from them:

| Apparent level | Blur / spread | Currently |
|---|---|---|
| Separator | 1–3px | `frame`, `pill-active`, and 3 hardcoded shadows |
| Floating | 10–16px | `menu`, `dropdown` |
| Overlay | 30–70px | `drawer`, `sheet`, `modal`, `picker`, `settings` |

Three levels would cover every existing shadow. **This is an observation, not a decision** — the question of how many levels the design *should* have is Zoe's, and the answer determines whether the outlying values get pulled onto the scale or the scale gains a step.

Until it is decided, the safe subset is: delete the 6 dead tokens, and tokenise the 3 hardcoded shadows that use the ink triple (see §8) since those leak on a palette swap regardless of what the scale turns out to be.

---

## Resolved since the first draft

- **`--cd-btn-primary`** (`#2F3033`) — **removed from this schema.** Zero consumers, and its own annotation marks it as belonging to v2. A v1 palette should not define it; it is added to the delete list.
- **`CdCheckCircle`'s hover ring** — investigated. It is a hover ring, not a focus ring, and it turned out to be one of three untokenised accent-family values in that component. Handled as part of the new `control-off` role in §3 rather than as a standalone item.
