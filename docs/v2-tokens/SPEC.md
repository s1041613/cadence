# Spec: Legacy token foundation for swappable palettes

**Status:** ready-for-agent
**Branch:** `feat/v2-tokens`
**Written:** 2026-07-31

> Not published to an issue tracker: none is configured for this project (no skill config, no tracker referenced in CLAUDE.md). Publish manually if wanted.

---

## Problem Statement

Zoe wants to swap colour palettes on the legacy layout: define one set of design tokens now, and be able to drop in a different set later without touching component code.

Today that does not work, and the reason is not obvious from looking at the app. The app renders correctly, so nothing appears broken. But only about 61% of legacy colour declarations actually read from a token. The other 39% are hardcoded literals sitting directly in component styles. Because the project currently ships exactly one palette, a hardcoded `#B3AC91` and a `var(--cd-olive)` look identical on screen. The divergence only becomes visible at the moment a second palette is applied, at which point roughly 226 colour declarations stay frozen on the old palette while everything around them changes. A partially repainted UI reads as a bug, not as a partially completed migration.

Three specific traps make this worse than a simple find-and-replace:

1. **Some hardcoded colours are invisible to a token rename.** Seventeen sites write the accent as `rgba(179, 172, 145, α)` and nine write the scrim as `rgba(40, 38, 30, α)`. These are numerically equal to the token values but share no text with the token name, so a developer who greps for the token name will believe the work is complete and still ship a leaking palette.
2. **Colour is the best-covered axis, not the worst.** Radius, shadow, and type size are all more hardcoded than tokenised, and letter-spacing, font-weight, and border-width have no tokens defined at all. "Swap the tokens" therefore cannot deliver a full visual change even in principle.
3. **Colour is defined in four places, not one.** Besides the token stylesheet, the same values are hand-mirrored into a Tailwind theme block, a Sass variable file, and a TypeScript module. The latter also holds four paired text colours that exist nowhere in CSS.

Separately, the product had accumulated seven typefaces across two UI generations with no rule governing which to use where.

## Solution

Establish the token layer as the single source of truth for the legacy layout, in a sequence where each step is independently verifiable.

From Zoe's perspective the end state is: change the values in one place, and the entire legacy UI follows. Nothing is left behind on the old palette, and no component needs editing to accept a new palette.

Two decisions shape the work:

- **Typography is settled and removed from the problem.** The product ships exactly two typefaces. Fonts are a fixed passthrough, explicitly not part of any theme, so no future palette can alter them. This is already implemented (see Implementation Decisions).
- **Colour work proceeds before layout refactoring.** Zoe is refactoring the legacy layout in a separate worktree. Token work touches the same `<style>` blocks as a layout refactor, so doing them concurrently produces same-file same-hunk merge conflicts across ~30 components. Landing tokens first means the refactor is written against tokens from the start rather than generating fresh hardcoded values that must be swept again.

## User Stories

1. As a designer, I want to change one set of colour values and see the whole legacy UI follow, so that I can evaluate a new palette without a developer editing components.
2. As a designer, I want no element to remain on the previous palette after a swap, so that what I evaluate is the real design rather than a half-repainted approximation.
3. As a designer, I want the accent colour's translucent washes to follow the palette too, so that selected and hover states do not stay warm when the rest of the UI turns neutral.
4. As a designer, I want modal and drawer scrims to follow the palette, so that overlays do not tint the screen with a colour the palette no longer contains.
5. As a designer, I want the four quadrant colours and their paired text colours to be addressable as tokens, so that the Eisenhower taxonomy can be retuned without editing TypeScript.
6. As a designer, I want a single named step for each visual role rather than a numbered ramp, so that I can tell which token to use without reading the component that uses it.
7. As a developer, I want every colour in a legacy component to reference a token, so that I never have to decide whether a literal was intentional.
8. As a developer, I want a command that fails when a hardcoded colour is reintroduced, so that coverage does not silently regress.
9. As a developer, I want that command to run in CI, so that a regression is caught in review rather than at palette-swap time.
10. As a developer, I want the accent expressed as a channel triple plus alpha steps, so that a new palette redefines one value rather than seventeen.
11. As a developer, I want deprecated token names to keep resolving during migration, so that I can convert one component at a time without breaking the app.
12. As a developer, I want each deprecated alias removed the moment its usage reaches zero, so that the alias list is a live progress indicator rather than permanent clutter.
13. As a developer, I want the alias layer to live in its own file, so that its line count shows migration progress and its deletion is a single reviewable commit.
14. As a developer, I want colour changes separated from typography changes, so that when something looks wrong I know which change caused it.
15. As a developer, I want token migration to land before the layout refactor, so that I do not resolve merge conflicts in thirty component style blocks.
16. As a developer, I want the two fully untokenised pages brought up to parity, so that the auth and invite flows are not the only screens that ignore the palette.
17. As a developer, I want to know which colour declarations are shadows rather than surface colours, so that I do not tokenise an elevation value as though it were a palette value.
18. As a developer, I want shadow geometry held fixed while only its tint is themeable, so that elevation stays consistent across palettes.
19. As a maintainer, I want the number of near-duplicate tokens reduced, so that contributors stop inventing new names for roles that already exist.
20. As a maintainer, I want two tokens that hold the same value under one name each, so that a palette author defines each role exactly once.
21. As a maintainer, I want tokens named for their role rather than their material, so that the names remain truthful when the palette changes.
22. As a maintainer, I want a documented naming rule, so that a future contributor can add a token without asking.
23. As a maintainer, I want the known limitation about Tailwind and Quasar recorded, so that the gap is a stated constraint rather than a surprise at launch.
24. As a QA reviewer, I want a single page that renders every shared component, so that I can verify a palette swap in one scroll rather than navigating the whole app.
25. As a QA reviewer, I want overlay components verified explicitly, so that teleported content is not missed.
26. As an end user, I want text to meet contrast guidelines, so that I can read the interface comfortably.
27. As an end user, I want consistent text colour on accent-filled controls, so that some buttons are not markedly harder to read than others.
28. As an end user, I want the interface to render in its intended typefaces, so that text does not fall back to system defaults.
29. As an end user, I want font weights that the typeface actually ships, so that text is not synthetically emboldened and blurry.
30. As an end user, I want Chinese text rendered by a typeface that covers it, so that mixed Chinese and English text does not switch faces mid-sentence.
31. As a future contributor, I want to add a new palette by filling in a defined list of roles, so that I do not have to audit components to discover what a palette must define.
32. As a future contributor, I want a palette that omits a required role to be obviously wrong, so that a missing value does not silently fall back to the previous palette's colour.

## Implementation Decisions

### Already implemented (typography)

- **The product ships two typefaces.** A display face used only for the month poster title, and a UI face used for everything else. Fonts are a fixed passthrough and are explicitly not themeable; no palette may override them. Decided after Zoe compared five pairings side by side.
- **Two new font tokens were introduced**, one for the display face and one for the UI face. The six pre-existing font tokens now resolve onto these two as deprecated aliases so that all 249 existing call sites continue to work.
- **The token named for titles resolves to the UI face, not the display face.** Its 60 call sites were audited and are all body-level chrome: buttons, field labels, settings rows. Pointing it at the display face would set the entire settings drawer in a single-weight serif with no Chinese coverage. This is deliberately counterintuitive and is documented at the definition.
- **Font weights were normalised to steps the UI face actually ships.** It provides 300/400/500/700/900. All 58 sites at weight 600 became 500, and all 18 sites at weight 800 became 700, so no weight is browser-synthesised. Zoe chose 600 to 500; 800 to 700 follows the same principle of preserving rather than increasing weight.
- **The display face is applied at a single site**, the month poster title, dropped from weight 800 to italic 400 because that face ships one weight. Legacy's bottom navigation uses SVG icons rather than letter glyphs, so the letter-glyph treatment seen in mockups has no legacy equivalent.
- **Font packages no longer referenced were removed from the stylesheet imports.** The Traditional Chinese face is retained purely as CJK fallback behind the display face.

### Colour: sequencing

The work is split so each stage is verifiable alone:

- **Stage 1, invisible-to-rename literals.** The accent and scrim literals that share no text with their token names. Highest priority precisely because they survive a careless migration. Around 26 sites.
- **Stage 2, hardcoded accent hexes.** Around 17 sites across 8 components. Highest visual impact on swap.
- **Stage 3, quadrant paired text colours.** Four values that exist only in TypeScript and have no CSS token. Must be promoted before quadrant text can follow a palette.
- **Stage 4, the two untokenised pages.** Clean scope, around 20 sites, self-contained.
- **Stage 5, mixed-usage components.** The bulk, around 180 sites, mechanical and low risk.
- **Stage 6, the switching layer.**

Stages 1 through 3 form the minimum verifiable unit: once complete, accent and scrim genuinely follow a palette swap. Ship and confirm that before continuing.

### Colour: token structure

- **Two tiers plus a temporary alias shim.** A primitive tier holding raw palette values, never referenced by components; a semantic tier of roles, the only tier components touch. No component tier: it would generate roughly 120 tokens whose sole value is indirection. Add one when a palette needs to override a single component without changing the role it reads.
- **The primitive tier prefix is deliberately terse and slightly ugly**, so that misuse inside a component declaration is visible in review without tooling.
- **A palette redefines the semantic tier only.** A palette that fails to define a role is broken; there is no fallback, because silently inheriting the previous palette's colour is worse than an obviously missing one.
- **The accent decomposes into distinct roles**, not one token. It currently carries at least six semantics: selected fill, toggle-on, primary action, focus border, accent-as-text, and paired text-on-accent. These have different contrast contracts (4.5:1 as text, 3:1 as a non-text affordance, and nothing against the background when used as a fill), so one value cannot satisfy all three. The current single-token approach already fails: the accent used as an icon colour measures 2.18:1.
- **The accent exposes one channel triple**, with translucent variants derived from it, so a palette redefines one value rather than each wash.
- **Twelve ad-hoc accent alphas collapse to four steps.** The twelve were not designed; they accreted. This is the one colour change that alters rendered output perceptibly, so affected sites are reviewed individually rather than replaced blindly.
- **Near-duplicate tokens are merged or dropped:** the two tokens sharing an identical value merge into one role; a line token with a single consumer and an imperceptible difference from its sibling is dropped; a scrim step 2% from its neighbour is dropped. A line token with zero consumers is retained because it completes a coherent four-step ramp, and a ramp with a gap invites hardcoding.
- **The dead primary-fill token is renamed and kept, not deleted**, because it is exactly the role needed for inverted selection states.
- **Semantic tokens may not use numbered suffixes.** Numbers communicate nothing about when to use a token, which is how two tokens came to hold the same value under different names unnoticed. Numeric ramps exist only in the primitive tier.
- **Any token used as a fill must have a paired text token**, with its contrast contract stated relative to that pair. This is the structural fix for the inconsistent text-on-accent defect.
- **Tokens are never named after a component, view, or material.** Test: if the palette or layout changed, would the name still be true?

### Colour: non-colour token families

- **Fixed passthrough:** breakpoint, font size, motion. Motion is ergonomics rather than identity; reduced-motion is a separate mechanism and must not be modelled as a palette.
- **Themeable, tint only:** shadows. Geometry stays fixed so elevation is consistent across palettes; only the tint channel varies. A palette overrides two values rather than twelve.
- **Deferred:** radius. It is the one non-colour family with a legitimate claim to being themeable, but its tokens are named after components rather than forming a scale, so they cannot be themed coherently until renamed. The scale also needs a design decision before any code changes: eight values in use fall outside the defined scale, and the most-used radius value is not a token at all.
- **Not yet defined:** letter-spacing, font-weight, border-width. These have no tokens. Creating them requires designing three scales from scratch, which is a design decision rather than an implementation one.

### Colour: the switching layer

- **A data attribute on the document root element.** Several overlay components teleport outside the app root, and the toast plugin injects into the document body entirely; only the root element reaches all of them. An app-root element would silently leave those overlays on the previous palette.
- **The current palette is the unattributed default; alternates are attribute-scoped.** If the attribute is absent (empty storage, JS disabled, isolated test render), an unattributed document still gets a complete palette. Both-scoped would leave every token unset: transparent text, vanished borders. The current palette has 589 token references and is the correct fail-safe target.
- **Specificity is deliberate.** The bare root selector and the attribute-qualified selector differ by one attribute, so the alternate wins regardless of source order and can therefore be written as a diff rather than a full duplicate.
- **One palette preference, applied globally, not per route.** Eleven legacy components are imported into newer code; a global palette gives the correct result for them without extra machinery. A per-route scheme buys nothing.
- **The attribute is set before first paint by a small same-origin script.** The Content Security Policy allows no inline scripts, so an inline snippet would be blocked and the palette would silently never apply. Serving the snippet as a file keeps the policy strict and remains render-blocking, which is what is required. Its path must be interpolated with the configured public path, which is not the root on the deployment target.
- **The page background and default text colour must be tokenised.** They are currently hardcoded on the root elements, meaning the first painted pixel is outside the palette system.
- **No transition on the root element.** It would turn a legitimate switch into a visible crossfade and can fire spuriously on load.
- **Palette state lives in its own module.** The project has no preference-persistence pattern to follow: existing stores are in-memory only, and the local-storage utility that exists is imported by nothing. Local storage is the appropriate mechanism. A dedicated module keeps the DOM side effect isolated from the pure data stores.

### Known limitation, to be stated rather than solved here

Colour is mirrored by hand into a Tailwind theme block and a Sass variable file. Both need build-time values and cannot read runtime custom properties. Until that is redesigned, a runtime palette switch changes token consumers but leaves Tailwind utility classes and framework components on the previous palette. This is a bounded, known gap. It does not block the first release but will be visible on the day it ships.

## Testing Decisions

**What makes a good test here.** This work changes how a value is referenced, not what renders. A good test therefore asserts the external, durable property, that no hardcoded palette literal remains reachable, rather than asserting that a given element has a given computed background, which would test implementation detail and break on every legitimate restyle.

**The seam is a static check, and there is exactly one.** A single command greps the source for palette literals that should no longer appear: the accent channel triple in any alpha form, the scrim triple in any alpha form, and the accent hex values. It exits non-zero and prints offending locations when any is found. Confirmed with Zoe as the chosen approach.

This is the highest available seam. It covers all sites in one invocation, needs no rendering environment, runs in CI, and catches future regressions from contributors who were not part of this work. It also catches the invisible-to-rename category, which is the specific failure this work exists to prevent.

**Component rendering tests are explicitly rejected.** The project has no component-rendering test layer, so this would be a new seam. More importantly it would not work: the test environment does not perform CSS cascade resolution, so a computed-style assertion cannot see the resolved value of a custom property. It would test nothing while appearing to test something.

**Prior art.** Existing tests live at the store, utility, and service layers and follow a consistent setup pattern; the palette-state module, when built, should be tested the same way: that it reads its initial value from the document, falls back to the default when the attribute is absent or invalid, writes both the attribute and storage on change, does not write on construction, and survives a storage backend that throws.

**Manual verification** covers what static analysis cannot:
- The shared component gallery page renders every shared component in one scroll and is the primary surface. A palette toggle belongs there, as the first section.
- Each teleporting overlay is opened individually and confirmed to follow the palette, plus one toast. These are the components an incorrect attachment point would silently miss.
- First-paint verification under throttling, stepping the filmstrip to confirm no frame shows the wrong palette, and again with the pre-paint script blocked to confirm the fallback renders a complete palette rather than an unstyled document.
- Persistence across reload, including a private-browsing context where the storage write throws.

**Build and typecheck** must pass. The typography change has already been verified this way: the production build succeeds and the full existing suite of 234 tests passes.

## Out of Scope

- **The second palette's actual values.** This spec defines the contract a palette must satisfy, not what any palette contains. Doing both at once bends the role list toward one palette's specifics.
- **Pixel changes.** Every value carries over unchanged. Contrast violations are documented, not corrected. Two exceptions are unavoidable and called out: the merged near-duplicates, and the accent alpha collapse.
- **The text-on-accent contrast defect.** Six sites place white text on the accent at 2.28:1 while three others use a dark text at 4.57:1. Zoe deferred this. Recorded here because the paired-token rule prevents recurrence even while the existing instances stand.
- **The tertiary ink contrast violation.** Around 2.60:1 against the base surface. Correcting it moves 63 render sites and belongs in its own reviewable change.
- **Deduplicating the four colour sources.** Needs its own design; see Known limitation.
- **Radius, letter-spacing, font-weight, and border-width scales.** Blocked on design decisions, not implementation.
- **Pruning the type scale.** Twenty of twenty-six size tokens have no consumer while twenty-five sites hardcode a size. Noted, not addressed.
- **Dark mode.** The tier model accommodates it; nothing here forecloses it.
- **Token tooling.** Plain CSS is sufficient at this scale and the alias layer needs no build step.
- **The newer UI generation's tokenisation.** Zoe has stated that generation will be retired.

## Further Notes

**A pre-existing build defect was found and not fixed.** The built stylesheet declares 924 font faces, but no font files are emitted to the output directory and the font URLs point at a directory that does not exist there. This was verified as pre-existing by building the unmodified baseline, which produces the same result. The practical implication is that the deployed site is likely serving no web fonts at all and rendering in system fallbacks. This is out of scope but should be investigated on its own, since it means nobody has yet seen the intended typography in production, which in turn affects how any typography decision is evaluated.

**Counts in this spec supersede earlier estimates.** Several early figures were wrong by large margins: the accent appears at 32 sites rather than roughly 90, and one ink token has 4 consumers rather than 76. The corrected figures are what make the strict migration gate affordable, reducing the accent migration from a multi-month prospect to about a day.

**Colour is the best-covered axis, which is counterintuitive.** At roughly 61% it is ahead of radius, shadow, and type size, and far ahead of the three families with no tokens at all. Any expectation that "colour is the gap" is inverted.

**Two artifacts exist for the parts prose conveys poorly**, both interactive HTML in the session scratchpad: a token-debt walkthrough that lets a reader toggle a palette and watch which elements freeze, and a typography comparison rendering the real font files. The former is the fastest way to convey why the invisible-to-rename category matters.

**A prototype-derived detail worth preserving.** One component's existing comment claims a literal was written inline rather than as a custom property because the value "resolves reliably across the deep-selector boundary." That diagnosis appears to be wrong: the underlying issue is teleport inheritance rather than the selector boundary. It is called out because it is a load-bearing written assumption; verify empirically when tokenising that component instead of assuming the surrounding pattern applies.
