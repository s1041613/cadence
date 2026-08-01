# Spec: Make the palette actually swappable

**Status:** ready-for-agent
**Branch:** `feat/v2-tokens`
**Written:** 2026-07-31
**Covers:** HANDOFF §3.3, §3.4, §3.5
**Supersedes for these sections:** `docs/v2-tokens/SPEC.md` (which specified the whole arc; this one specifies only what remains)

> No issue tracker is configured for this project, so this is not published and carries no triage label. Publish manually if one is added.

---

## Problem Statement

The token foundation is built but the feature it exists for does not work yet. Zoe can change a token value and see *some* of the legacy UI follow — accent and scrim genuinely respond now, and a static check stops that regressing. Everything else stays where it is.

Three things block a real palette swap, and they must be solved in order because each one poisons the next:

**The base colour is defined three times with two different values, and two of them are live on screen simultaneously.** `#F2F1EC` sits in the Sass variables, `#fafaf9` in the Tailwind theme block, and `#fafaf9` again hardcoded on `html, body, #q-app`. Meanwhile `--cd-bg` does not exist in the token file at all.

This is not a latent risk — it is a shipping inconsistency. The Sass `$bg` paints `FocusSession.vue` and `IndexPage.vue`; the hardcoded rule paints every other screen. **The pomodoro and home screens are warm, the rest of the app is cool near-white.** The Tailwind `--color-bg` paints nothing at all, since the `bg-bg` utility has zero consumers.

The default text colour has a milder version of the same problem: `app.css` hardcodes `color: #56585E`, numerically equal to `--cd-ink` but not linked to it, so changing ink in the token file leaves the document default behind.

The same file also holds one concept under two names: `--cd-muted` and `--cd-ink-3` are both `#9C9E94`, declared two lines apart, with 60 and 4 consumers respectively. A palette author has to define the same role twice and cannot tell that they did.

**There is no mechanism to switch.** No `data-theme` attribute, no palette store, no pre-paint script. The token file has exactly one palette in it and no way to express a second. This is the actual missing feature; everything else is preparation for it.

**361 colour declarations in the legacy layout are still hardcoded literals.** They render identically to tokens today because the app ships one palette, so nothing looks wrong. On the day a second palette is applied, those 361 sites stay on the old colours while everything around them changes. A half-repainted UI reads as a bug, not as an incomplete migration. The heaviest concentrations are `CdSettingsDrawer.vue` (49), `CdEventEditCard.vue` (38), `CdDraftDrawer.vue` (33), `FocusSession.vue` (29) and `CdAppearancePicker.vue` (22).

## Solution

Resolve the contradiction, build the switch, then sweep the remainder — in that order, because each step depends on the one before it being settled.

From Zoe's perspective the end state is: toggle a preference, and the entire legacy UI repaints. Nothing is left behind on the old colours, no component needs editing, and the choice survives a reload.

The ordering is not stylistic. Sweeping 361 literals before the base values are settled means sweeping some of them onto the wrong token and doing it twice. Building the switch first would bake a contradiction into the thing that defines what a palette *is*.

### Step 1 — Settle the base colours on the warm palette

**Decided: `#F2F1EC`, the warm beige.** Zoe is setting v1's palette as warm, so the base surface is warm and the cool near-white `#fafaf9` is the wrong value.

This is not a tie being broken arbitrarily. The two values are **both rendering right now, on different screens**:

| Value | Where it actually paints today |
|---|---|
| `#F2F1EC` (warm) | `FocusSession.vue` and `IndexPage.vue`, both via the Sass `$bg` |
| `#fafaf9` (cool) | Every other screen, via the hardcoded `html, body, #q-app` rule in `app.css` |
| `--color-bg` (Tailwind) | **Nowhere.** The `bg-bg` utility has zero consumers. |

So the app currently ships two different base colours and the seam between them is invisible only because users rarely see the pomodoro screen and a month view side by side. Choosing warm resolves a live inconsistency rather than introducing a change — it aligns the majority of screens onto the colour two screens already use.

**Consequence to expect:** every screen except those two shifts warmer. This is a real, intended visual change, not a no-op, and it should be looked at on screen before the sweep proceeds.

The chosen value becomes `--cd-bg` in the token file, and `app.css` references it rather than restating it. The two Sass consumers should migrate to the token as part of the sweep, at which point `$bg` exists only to feed Quasar.

**This scopes the palette to v1 only.** Memory records that v2 is neutral ink/paper with warm beige explicitly banned; a warm v1 base therefore confirms the two generations keep separate palettes rather than sharing one. Nothing in the switching layer's design assumes otherwise — `data-theme` on the root can carry a neutral v2 palette as a second attribute value if that is ever wanted.

Separately and not requiring a decision: `--cd-muted` and `--cd-ink-3` merge into one token. `--cd-muted` survives on consumer count (60 vs 4).

### Step 2 — Build the `data-theme` switching layer

The design is already settled (see Implementation Decisions). This step builds it.

### Step 3 — Sweep the remaining 361 literals

Mechanical, no pixel change, ordered from self-contained to entangled.

## User Stories

1. As a designer, I want to toggle between palettes in the running app, so that I can evaluate a new palette without a developer rebuilding anything.
2. As a designer, I want the whole legacy UI to repaint when I toggle, so that what I evaluate is the real design rather than a partially converted one.
3. As a designer, I want my palette choice to persist across a reload, so that I can navigate the app while evaluating rather than re-toggling on every page load.
4. As a designer, I want the page background to change with the palette, so that the largest single area of colour on screen is not the one thing that stays fixed.
5. As a designer, I want the very first painted frame to already be in the chosen palette, so that I do not see a flash of the previous one on every load.
6. As a designer, I want drawers, dropdowns, date pickers and toasts to follow the palette, so that the parts of the UI that float above the page are not the parts that betray the swap.
7. As a designer, I want translucent accent washes to follow the palette, so that selected and hover states do not stay warm when the rest of the UI turns neutral.
8. As a designer, I want scrims behind modals to follow the palette, so that overlays do not tint the screen with a colour the palette no longer contains.
9. As a designer, I want to define each colour role exactly once when authoring a palette, so that I cannot set two names to two different values by accident.
10. As a designer, I want to know the complete list of roles a palette must define, so that I do not discover a missing one by finding an unstyled element.
11. As a designer, I want every screen to share one base colour, so that the pomodoro and home screens stop being warmer than the rest of the app.
12. As a developer, I want one decided value for the page background, so that I am not choosing between two plausible ones while writing a token.
13. As a developer, I want the default text colour to reference a token rather than restate its value, so that changing ink in one place changes it everywhere.
14. As a developer, I want the two names holding the identical muted value merged, so that I stop having to decide which one to use.
15. As a developer, I want every colour in a legacy component to reference a token, so that I never have to judge whether a literal was deliberate.
16. As a developer, I want the static check to fail when a hardcoded colour is reintroduced, so that a sweep I just completed does not silently erode.
17. As a developer, I want the check extended to cover the newly tokenised values, so that coverage of the base colours is enforced the same way the accent already is.
18. As a developer, I want the palette attribute set on the document root rather than an app element, so that teleported overlays are not silently left behind.
19. As a developer, I want the current palette to be the unattributed default, so that a document with no attribute still renders a complete UI rather than a transparent one.
20. As a developer, I want the pre-paint script served as a file rather than inlined, so that the Content Security Policy does not silently block it.
21. As a developer, I want the script path built from the configured public path, so that it does not 404 on the GitHub Pages deployment where the app is not served from the root.
22. As a developer, I want palette state in its own module, so that a DOM side effect does not live inside a pure data store.
23. As a developer, I want an alternate palette to be writable as a diff rather than a full duplicate, so that adding one does not mean restating every role.
24. As a developer, I want to sweep the two self-contained pages first, so that I can validate the approach on a small scope before touching a 49-literal drawer.
25. As a developer, I want no transition on the root element, so that a palette switch is instant rather than an accidental crossfade.
26. As a maintainer, I want a palette that omits a required role to be obviously broken, so that a missing value does not silently inherit the previous palette's colour.
27. As a maintainer, I want the Tailwind and Quasar limitation recorded, so that the gap is a known constraint rather than a launch-day surprise.
28. As a maintainer, I want quadrant colours left as literal hex in TypeScript, so that CSS syntax is never written into persisted event records.
29. As an end user, I want my palette choice remembered, so that the app does not reset to the default every time I open it.
30. As an end user, I want the app to work normally if palette storage is unavailable, so that private browsing does not produce an error.
31. As an end user, I want no flash of the wrong colours on load, so that the app does not appear to glitch on every launch.

## Implementation Decisions

### Base colours

- **`--cd-bg` is introduced** in the token file, holding whichever value Zoe selects. It does not exist today.
- **`app.css` stops restating colour values.** Both the `html, body, #q-app` background and the `body` text colour become token references. These are the first pixels painted, so leaving them literal puts them outside the palette system entirely.
- **The Tailwind `@theme` block and Sass variables continue to restate values literally.** They compile at build time and cannot read a runtime custom property. This is the known limitation below, not an oversight, and the static check allowlists exactly those lines already.
- **`--cd-muted` and `--cd-ink-3` merge**, keeping `--cd-muted`. The four `--cd-ink-3` consumers migrate. Value is unchanged, so nothing re-renders differently.
- **Its contrast violation is not corrected here.** `#9C9E94` measures roughly 2.60:1 against the base surface across ~60 sites. That is a real defect and it is deliberately deferred, per the earlier spec — merging names and changing a value are separate reviewable changes.

### The switching layer

Every decision below was made in the prior session and verified against the codebase during this one. They are settled.

| Question | Decision | Why |
|---|---|---|
| Attachment point | `data-theme` on the document root element | `CdDrawer`, `CdTimeDropdown` and `CdDatePicker` teleport to `body`; `MonthViewV2` teleports to its own root; Quasar's toast plugin injects into `body`. An app-root element misses all of them. |
| Default palette | Current palette on the unattributed root; alternates are attribute-scoped | If the attribute is absent — empty storage, JS blocked, isolated test render — an unattributed document still gets a complete palette. Scoping both leaves every token unset: transparent text, vanished borders. The current palette has 589 token references and is the correct fail-safe. |
| Specificity | Bare root selector vs attribute-qualified selector | They differ by one attribute, so the alternate wins regardless of source order. This is what lets an alternate palette be written as a diff rather than a full duplicate. |
| Pre-paint | A same-origin script file, loaded via `src` | **Verified: the CSP is `default-src 'self'; script-src 'self'` with no `'unsafe-inline'`.** An inline snippet is silently blocked and the palette never applies. A same-origin file is allowed and is render-blocking, which is exactly what is wanted. |
| Path | Interpolated from the configured public path | **Verified: it is `/cadence/` when `GITHUB_PAGES=true`, `/` otherwise.** A hardcoded path 404s on the deployed site. `index.html` already interpolates `<%= publicPath %>` for the manifest link, so this follows an established pattern. A `publicAssetPath` utility exists for the same problem on the JS side. |
| Scope | One global preference, not per-route | Eleven legacy components are imported into v2 code; a global palette gives the right result for them for free. |
| State | A new dedicated module | **Verified: no store in this project persists anything.** All six existing stores are in-memory only, `v2-appearance-store` included, and `src/utils/save-load-local-storage.ts` is imported by nothing. There is no pattern to follow, so localStorage is chosen on merit. A dedicated module keeps the DOM write out of the pure data stores. |
| Transitions | None on the root element | Would turn a switch into a visible crossfade and can fire spuriously on load. |

Behaviour the module must have: read the initial value from the document, fall back to the default when the attribute is absent or holds an unrecognised value, write both the attribute and storage when the palette changes, not write on construction, and not throw when the storage backend throws.

### The sweep

Order is chosen so that risk rises only after the approach is proven:

1. **`JoinCalendarPage.vue` and `AuthCallbackPage.vue`** — 10 literals each, zero token references, fully self-contained. The cheapest place to validate the approach.
2. **Small components** — the long tail at 3 to 12 literals each.
3. **The heavy five** — `CdSettingsDrawer.vue` (49), `CdEventEditCard.vue` (38), `CdDraftDrawer.vue` (33), `FocusSession.vue` (29), `CdAppearancePicker.vue` (22). Together roughly half the total.

Constraints on the sweep:

- **No pixel changes.** Every literal maps to a token of the identical value. Where no token holds that value, add one rather than snapping to a near neighbour — a "close enough" substitution is an undocumented visual change.
- **Alphas and shadow geometry are preserved exactly.** The prior session verified this by comparing the full alpha distribution against the base commit; the same standard applies.
- **Scrim literals convert to the raw channel triple, not to shadow tokens.** Each has bespoke offset/blur/spread matching no existing shadow token; forcing them onto one would change geometry.
- **`use-theme.ts` stays authoritative and stays literal hex.** Its `backgroundColor` values are persisted onto event records, so a `var()` there writes CSS syntax into stored data. The four `--cd-quad-*-ink` tokens mirror it for CSS use; the mirroring direction must not reverse.
- **The static check is extended** as values become tokenised, so each newly converted colour is protected the way the accent and scrim already are.

### Known limitation, stated rather than solved

Colour is mirrored by hand into a Tailwind `@theme` block and a Sass variable file. Both need build-time values and cannot read runtime custom properties. **Until that is redesigned, a runtime palette switch repaints token consumers but leaves Tailwind utility classes and Quasar components on the previous palette.** This is bounded and known. It does not block a first release but will be visible the day it ships.

## Testing Decisions

Zoe asked that this spec stay on requirements rather than design a test strategy, so this section records only what already exists and what the work must not break.

**The existing seam is `npm run check:tokens`.** One static check, currently green, covering the accent channel triple in any alpha form, the scrim triple, and five accent hex values across the legacy layout. It runs with no rendering environment. The sweep rides on this: as each value is tokenised, the check gains a rule for it, so coverage cannot silently erode.

**Component rendering tests remain rejected.** The test environment performs no CSS cascade resolution, so `getComputedStyle` cannot see a resolved custom property. Such a test would assert nothing while appearing to assert something. This was decided previously and nothing here changes it.

**Existing verification must continue to pass:** `npm run build`, `npm test` (234 tests), `npm run typecheck`, `npm run check:tokens`.

A test strategy for the palette module itself is deferred to implementation time.

## Out of Scope

- **The alternate palette's actual values.** This spec defines the contract a palette satisfies, not what any palette contains. Designing both at once bends the role list toward one palette's specifics.
- **Non-colour token families — radius, shadow, font size, letter-spacing, font-weight, border-width (HANDOFF §3.6).** Blocked on design decisions that do not exist yet, which is why they are excluded rather than deferred within the spec. Each needs a scale designed before any code changes: radius has 10 tokens but 8 in-use values outside the scale and its most-used value (`8px`) is not a token at all, while `--cd-radius-chip` has zero consumers; shadow has 12 hand-rolled tokens with no definition of how many elevation steps exist; font size has 26 tokens of which 4 are consumed while ~100 sizes are hardcoded; and the remaining three families have no tokens whatsoever. **Writing these into a spec now would produce sections that say "decide this first". They need a design session, not a specification.**
- **The design token document format (HANDOFF §3.7).** Researched, not started — DTCG JSON as source with Style Dictionary generating CSS, Tailwind and Sass. It is downstream of §3.6: generating a token file is premature while the scales it would generate are undecided. One open question to verify against Style Dictionary's actual parser rather than trust: whether a plain `"8px"` string is still valid for `dimension` in DTCG 2025.10 or whether the object form is now required.
- **Pixel changes.** Values carry over unchanged, with one deliberate exception: the base surface moves to the warm `#F2F1EC` on every screen that is currently cool. That is the decision recorded in Step 1, not a side effect of the sweep.
- **Contrast corrections.** Four are documented and deferred: white text on the accent at 2.28:1 (6 sites) against dark text at 4.57:1 elsewhere; muted ink at 2.60:1 (~60 sites); 12 ad-hoc accent alphas not yet collapsed to 4 steps (17 sites); and line colours below the 3:1 non-text guideline (66 sites). Each moves rendering and deserves its own reviewable change.
- **Deduplicating the four colour sources.** The Tailwind and Sass mirrors stay hand-maintained; see Known limitation.
- **The v2 generation's tokenisation.** Zoe has stated that generation will be retired.
- **Dark mode.** The attribute-scoped model accommodates it; nothing here forecloses it.

## Further Notes

**Two corrections to the handoff, verified this session.** The handoff states ~204 hardcoded colours remain; the actual count across the legacy scan targets is **361**. And it lists "push and open a PR" as outstanding — the branch is already pushed and tracked at `origin/feat/v2-tokens` at `bd57af2`. The count matters for sizing; the push status matters because an agent following the handoff would try to redo it.

**Traps that have already caused defects, carried forward because none is inferable from the token file:**

- **`CdMonthGrid.vue` mirrors CSS pixel values into a JS `CELL_METRICS` constant** to compute how many event chips fit per row. Changing chip size, cell padding or the date-circle diameter without updating it fails silently — no error, no type error, just wrong layout. `CdMonthCell` guarantees 3 visible events before collapsing to "+N", so arithmetic yielding fewer than 3 overflows the row rather than showing fewer chips.
- **`--cd-bp-desktop` is a fake token.** CSS custom properties cannot parameterise `@media` queries; the value that applies lives in `src/css/breakpoints.sass`. Changing the token changes nothing.
- **`--cd-olive-mix-2` (`#6E6A52`) and `--cd-olive-mix-3` (`#6E6A54`)** differ by 2 in one channel and are visually identical. This is unresolved duplication, not design intent — do not invent distinct semantic roles to justify keeping both.
- **Zen Kaku ships 300/400/500/700/900 only.** No 600, no 800. A font-family token carries no weight information, so an agent reading only tokens cannot know this.
- **One component's comment claims a literal was written inline because the value "resolves reliably across the deep-selector boundary."** That diagnosis is probably wrong — the real issue is teleport inheritance. It is load-bearing written misinformation; verify empirically when tokenising that component rather than assuming the pattern generalises.

**A pre-existing build defect, verified against an unmodified baseline and not caused by this branch.** The built stylesheet declares 924 `@font-face` rules but no font files are emitted to `dist/`, and the URLs point at a directory that does not exist there. The practical implication is that **the deployed site is probably serving no web fonts at all and rendering in system fallbacks** — meaning nobody has yet seen the intended typography in production, which affects how any typography decision should be evaluated. Out of scope here; worth its own investigation.

**Typography is settled and explicitly outside the palette system.** Two faces — Instrument Serif for the month poster title only, Zen Kaku Gothic New for everything else — as a fixed passthrough that no palette may override. `--cd-font-title` aliases to the UI face, not the display face; this is counterintuitive and correct, because its ~60 call sites are body chrome and pointing it at a single-weight CJK-less serif would restyle the entire settings drawer. Documented at the definition. Do not "fix" it.
