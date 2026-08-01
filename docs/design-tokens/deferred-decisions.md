# Deferred decisions

**Last updated:** 2026-08-02
**Scope:** the v1 colour token work on `feat/v2-tokens`

What we deliberately did not do, and why. Each entry states the decision, what it costs, and what would need to be true to revisit it.

This exists so the next person — including future us — can tell the difference between "nobody thought about this" and "this was considered and left alone on purpose". The second kind should not be quietly re-opened without a reason.

---

## 1. White and black have no role — 67 sites

**Decision:** leave them as literals. Zoe, 2026-08-02.

`#ffffff` appears at 49 sites, `rgba(255,255,255,α)` at 8, `#000`/`rgba(0,0,0,α)` at 9, plus one Quasar `white` class.

They are two different jobs wearing one value:

- **A white surface** — popover, dropdown and card backgrounds. On a dark palette these would not stay white, so they arguably belong to the palette.
- **Text on a saturated fill** — white text on a coloured event chip. This is the same kind of role as `on-accent`: its contract is contrast against whatever fill it sits on, not a fixed colour.

**Cost of leaving it:** a second palette will not change any of these 67 sites. For a light-on-light palette that is mostly harmless; for a dark palette it is not.

**Related, already recorded:** six sites put white text on `--cd-accent` at 2.28:1 while three siblings use `--cd-on-accent` at 4.57:1. Splitting the roles above would give the fix somewhere to live.

**Revisit when:** a palette is proposed whose surfaces are not near-white.

**Note:** the 9 black shadow literals are a separate case and should probably stay literal regardless — neutral shadow tint is not palette identity, which is the same reasoning Carbon uses.

---

## 2. FocusSession is not tokenised — ~25 sites

**Decision:** out of scope. Zoe, 2026-08-02.

The pomodoro screen carries its own dark palette (`#0e3527`, `#123f30`, `#4f9c72`, white-on-dark washes) that has nothing to do with the v1 warm scheme. Tokenising it would mean either forcing it onto roles it does not fit, or inventing a parallel dark set for one screen.

**Cost of leaving it:** the screen will not follow a palette swap. Given it is already visually separate from the rest of the app, that may be correct rather than merely tolerated.

**Revisit when:** a dark palette exists, at which point this screen is a natural first consumer rather than an exception.

---

## 3. Three separate grey triples remain unreconciled

**Decision:** not addressed in this pass.

Three hand-tuned translucent greys do the same job in different components, and only one of them is under palette control:

| Triple | Where | Status |
|---|---|---|
| `rgba(86, 88, 94, α)` | app-wide | `--cd-ink-rgb` — tokenised |
| `rgba(74, 70, 52, α)` | `CdDraftDrawer` | literal, 4 sites |
| `rgba(41, 40, 32, α)` | `JoinCalendarPage`, `AuthCallbackPage` | literal, 4 sites |

**Why this one matters more than a stray hex:** a literal `rgba()` triple shares no text with any token name. Renaming or re-valuing `--cd-ink` reports success while these stay frozen. That is precisely the failure the token work exists to prevent — it has just moved to a different address.

**Cost of leaving it:** 8 sites drift out of alignment on the first palette change, and the drift is invisible to a grep.

**Revisit when:** the draft drawer is redesigned (item 5), which covers half of them. The two interstitial pages could be done at any time — they are self-contained and their greys have no reason to differ from `--cd-ink`.

---

## 4. Remaining unmatched colours in the settings drawer — ~20 sites

**Decision:** not addressed; needs new semantic roles, not just migration.

These have no equivalent token and inventing one requires a design call:

- `#7ba05b` / `#5c7a46` — the Google Calendar connect affordance. A success/connected green; the palette has no such role.
- `#2e2c28`, `#cfccc1`, `#d5d2c8` — dark and light theme preview tiles. They depict *other* palettes, so arguably they should never be themed at all.
- Assorted greys with no near neighbour in the scale.

**Cost of leaving it:** the settings drawer is the single largest remaining pocket of untokenised colour.

**Revisit when:** deciding whether the palette needs status colours (success / info) beyond `danger` and `warn`.

---

## 5. Draft drawer values pending its redesign — ~23 sites

**Decision:** deferred pending the drawer redesign Zoe has scheduled.

Includes its alternate ink triple (item 3), its dot-texture lighting, and `--cd-surface-textured`, which exists solely to carry that texture.

**Already accepted as part of the convergence:** the search field lost its recessed appearance. Its gap from the paper narrowed from about 10 steps to 3, so the dot texture now reads more strongly than the inset does. To be redesigned along with the drawer rather than patched now.

**Revisit when:** the redesign lands. If the texture does not survive it, `--cd-surface-textured` folds into `--cd-surface-page` and the role count drops by one.

---

## 6. Two contrast defects, recorded not fixed

**Decision:** documented at the token definitions rather than corrected, because each moves a large number of render sites.

| Role | Ratio vs `surface-page` | Sites | Note |
|---|---|---|---|
| `--cd-ink-secondary` | **4.33:1** — fails AA | 40 | Was 4.69:1 against the old cooler background. **Adopting the warm page colour is what pushed it below threshold.** About `#696C71` would clear 4.5:1. |
| `--cd-ink-muted` | **2.40:1** — fails AA | 89 | Was already 2.60:1. Treat as decorative; it must never carry meaning unavailable elsewhere. |

**Cost of leaving it:** secondary labels sit just under the accessibility threshold across the app.

**Revisit when:** either role is touched for any other reason — the fix is one value each. A second palette should satisfy the stated contract rather than copy these values.

---

## 7. The `data-theme` switching layer is designed, not built

**Decision:** deferred. Zoe, 2026-08-01 — the schema comes first, so v2 can be authored against a stable role list.

Settled design, ready to build:

- **`data-theme` on the document root.** `CdDrawer`, `CdTimeDropdown` and `CdDatePicker` teleport to `body` and the toast plugin injects there; an app-root element misses all of them.
- **Current palette on the unattributed `:root`.** If the attribute is absent — empty storage, JS blocked, isolated test render — the document still gets a complete palette. Scoping both would leave every token unset.
- **Pre-paint via a same-origin script file.** The CSP is `script-src 'self'` with no `'unsafe-inline'`, so an inline snippet is silently blocked and the theme never applies. Its path must interpolate `<%= publicPath %>` — that is `/cadence/` on the GitHub Pages deploy.
- **A dedicated store module.** No existing store persists anything, so there is no pattern to follow; localStorage is chosen on merit and kept out of the pure data stores.
- **No transition on the root.** It would turn a switch into a visible crossfade and can fire spuriously on load.

**Known limitation to state when it ships:** colour is mirrored by hand into a Tailwind `@theme` block and `quasar.variables.sass`. Both need build-time values and cannot read runtime custom properties, so a runtime swap repaints token consumers but leaves Tailwind utilities and Quasar components on the previous palette.

---

## 8. Elevation stops at two levels

**Decision:** two levels, the first being none. Zoe, 2026-08-01, after reviewing eight design systems.

Level 1 is *no shadow* — flat-plane content separates via `--cd-line` and the surface roles. Level 2 is one `--cd-shadow-overlay` for everything that floats over and covers the page.

**Why not a ramp:** every overlay here pairs with `--cd-scrim`, and the scrim is what communicates "this covers the page". The shadow only defines the panel's edge, and that job does not vary by component. The twelve previous tokens differed by geometry alone, which is how six of them ended up with zero consumers.

**Kept outside the scale on purpose:** inset shadows (recession, not elevation), the switch thumb and FAB (depth within a control), and the popover caret (edge decoration).

**Revisit when:** a component genuinely needs a third level. If that happens, the question to answer first is "how high is this?" — not "which existing component is it most like?", which is what produced the original twelve.

---

## 9. Quadrant and event colours stay outside the palette

**Decision:** permanent, not deferred. These are user data.

`use-theme.ts` resolves quadrant appearance and its `backgroundColor` is **persisted onto event records**. A `var()` there would write CSS syntax into stored data. The same applies to `COLOR_SWATCHES` in `CdAppearancePicker.vue`.

The CSS tokens that used to mirror them were deleted — they had zero consumers and could never gain one.

**Known consequence:** existing records hold the old hex values, so changing a quadrant or preset does not update them retroactively. Old and new events would render inconsistently. **That is a data-migration problem, not a token problem**, and it will need its own plan if these values ever change.

---

## What the guard does and does not cover

`npm run check:tokens` has 8 rules. It catches **known palette values written as literals**, including the `rgba()` triple form that a name-based grep misses.

It does **not** catch a colour that has no token — by construction, since each rule is anchored to a specific value. So it protects against regression, not against the gaps above. A green check means "no known palette value has leaked", not "everything is tokenised".

Two rules were added after an audit found literals the sweep had missed:

- `semantic-hex` — the weekday, danger and warn values. Their absence let a `#C0564B` sit directly beside a correctly-tokenised sibling with the check still passing.
- `retired-hex` — the six values whose tokens this branch deleted during convergence. It immediately caught a ninth orphan that a manual pass had missed.
