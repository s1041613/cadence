# Handoff: Cadence token foundation (`feat/v2-tokens`)

**Written:** 2026-07-31
**Worktree:** `/Users/zoe/Documents/cadence/.worktrees/v2-tokens`
**Branch:** `feat/v2-tokens`, based on `origin/main` = `26c4abd`
**State:** 10 commits, **not pushed**. Working tree clean. Codex review ran and its findings are fixed and committed (`bd57af2`).

Work in this worktree. Every git command must carry `-C /Users/zoe/Documents/cadence/.worktrees/v2-tokens`; the Bash CWD drifts back to the main repo between calls and a drifted command still succeeds against the wrong repo.

---

## 0. What this branch is for

Make the legacy layout's colours swappable, so a second palette can be dropped in without editing components. The typography consolidation came along with it because the two collided.

**Current reality:** accent and scrim genuinely follow a token swap now, and a lint script stops that regressing. Everything else does not: ~204 hardcoded colours remain, and the switching layer does not exist. This branch is the foundation, not the feature.

Related artifacts, read rather than reconstruct:
- Full spec: `/private/tmp/claude-501/-Users-zoe-Documents-cadence/6a16b51f-587e-49af-b3b8-95d3d0b6a14f/scratchpad/SPEC-token-foundation.md`
- Token schema doc: `~/claude-replies/v1-token-schema.html`
- Token-doc format research: `~/claude-replies/design-token-doc-format.html`
- Token debt walkthrough (interactive): `.../scratchpad/token-debt.html`
- Font comparisons: `.../scratchpad/font-compare.html`, `.../scratchpad/font-pairing.html`

---

## 1. Immediate state

Working tree is clean and the Codex gate has been satisfied. **The next action is to push and open a PR** (§3.2); ten commits exist only on this machine.

Codex found two defects that were clipping content on screen. Both are fixed in `bd57af2`, but the reasoning is worth carrying forward because both were **arithmetic I got wrong and then verified wrongly**:

- **The desktop event chip renders 26.2px, not 24.5px.** Its 1px border is applied inline (`CdEventBlock.vue` style binding), and unlike the phone rule the desktop chip had no `box-sizing: border-box`, so the border sat outside the box I measured. Three chips needed 127.6px against a 123px row and the third clipped silently. The chip now has an explicit border-box height so CSS and the mirrored constant agree by construction.
- **Time-grid blocks clamp to 20px minimum**, leaving 14px of content for what had become a 16px title, so short event titles clipped mid-glyph. Raising the clamp would overlap 30-minute events, so short blocks now get a compact variant (12px at 1.15 leading, fitting 20px exactly).

**Lesson for the next session:** when checking whether type fits a container, account for borders and `box-sizing`, and prefer reading the rendered box over recomputing it from the declarations.

Also fixed: `check-tokens` never scanned `src/css/app.css`, which still holds `--color-btn: #B3AC91`. It is now scanned with the `@theme` block allowlisted, and the allowlist was verified narrow enough that a literal elsewhere in that file still fails.

---

## 2. Decisions made in this session (these are settled, do not relitigate)

### Typography

| Decision | Detail |
|---|---|
| Two typefaces only | Instrument Serif (display) + Zen Kaku Gothic New (everything else) |
| Fonts are a **fixed passthrough** | Explicitly NOT themeable. No palette may override them. |
| Display face scope | Month poster title only. It ships one weight (400) and has **no CJK coverage**. |
| Weight | All legacy weights are now **700**, plus 6 at 400 and 1 at 900. |
| `--cd-font-title` aliases to the **UI** face | Counterintuitive but correct: its ~60 call sites are body chrome, none above 22px. Pointing it at the serif would restyle the whole settings drawer in a CJK-less single-weight face. Documented at the definition. Do not "fix" it. |

**Weight history, because it looks like churn in the log:** 600 and 800 were removed (Zen Kaku ships 300/400/500/700/900, so both were browser-synthesised), then Zoe requested 600 twice, then settled on **700**. The current state has zero synthesised weights, which was the original goal.

**Known consequence Zoe accepted:** 180 of 187 weight declarations are now 700, so size is the only remaining hierarchy signal. The week agenda date numeral and event title were deliberately 700-vs-500 and now match. Zoe reviewed this on screen and said it is fine. If it later reads flat, returning body-level text to 500 is the fix, and 500 is a real weight in this face.

### Type sizes

Sizes behind the old monospace token were tuned for JetBrains Mono, whose x-height is markedly larger than Zen Kaku's, so the same px value renders visibly smaller. Correction applied in three passes: a 1.065x metric-derived ratio, then a further +2px, then five explicit values Zoe specified:

| Selector | Size |
|---|---|
| `.cd-month-cell__num` | 16px |
| `.cd-event-chip` | 14px |
| `.cd-event-block__title` | 16px |
| `.cd-week-agenda__title` | 16px |
| `.cd-week-agenda__num` | 24px |

**Two sites deliberately do NOT follow the enlargement.** Both are load-bearing:
- The "All-day" gutter label sits at 11px because it is seven characters against a **fixed 50px column**; matching the hour labels overflows it. Widening the column shifts the whole grid.
- The time-grid event block **hides its start-time line below 38px tall**. A 16px title plus the time line needs ~40px but a 30-minute event is ~20px. Raising the block minimum instead would make short events overlap.

### Colour

- 41 hardcoded palette values replaced. The 26 `rgba()` literals mattered most: they share no text with their token names, so they survive a rename unnoticed and would stay frozen on the old palette. This is the failure the whole exercise exists to prevent.
- `--cd-olive-rgb` is the single input for translucent accent washes. Compose as `rgba(var(--cd-olive-rgb), <alpha>)`.
- Alphas and shadow geometry preserved exactly, so rendering is unchanged. Verified by comparing the full alpha distribution against `HEAD`.
- Four `--cd-quad-*-ink` tokens added, mirroring `use-theme.ts`. **That file stays authoritative** because its `backgroundColor` is persisted onto event records; a `var()` there would store CSS syntax as data.
- **Scrim literals were converted to the raw triple, not to shadow tokens.** Each of the 9 had bespoke offset/blur/spread that matched no existing `--cd-shadow-*`; forcing them onto tokens would have changed geometry, which the spec forbids.

### Testing seam

**One seam: a static check, `npm run check:tokens`.** Zoe chose this over component rendering tests.

Component rendering tests were explicitly rejected and should stay rejected: the test environment does not perform CSS cascade resolution, so `getComputedStyle` cannot see a resolved custom property. Such a test would assert nothing while appearing to.

The script is at `scripts/check-tokens.mjs` (plain `.mjs`, not TypeScript, because `tsx` is not a dependency and adding one for a lint script is not warranted). It catches case variants, whitespace variants, alpha-less `rgb()`, 8-digit hex, CSS Color 4 space syntax, and declarations on lines starting with a `*` selector. All verified by probe.

---

## 3. Outstanding work, in dependency order

### 3.1 Commit the current 8 files (blocked on Codex)
See §1.

### 3.2 Push and open a PR
`main` is protected, so a direct push is not possible. Nine commits currently exist only on this machine.

### 3.3 Resolve the `bg` three-way divergence  **do this before any token tooling**

This was discovered late and is a real, existing bug rather than a risk:

| Source | Name | Value |
|---|---|---|
| `src/css/quasar.variables.sass:4` | `$bg` | `#F2F1EC` |
| `src/css/app.css:51` | `--color-bg` | `#fafaf9` |
| `src/css/app.css:32` | hardcoded on `body` | `#fafaf9` |
| `src/css/cadence-tokens.css` | `--cd-bg` | **does not exist** |

`app.css:37` also hardcodes `color: #56585E`, equal to `--cd-ink` but unlinked. And one concept carries four names: `--cd-muted` / `--cd-ink-3` / `--color-ink-3` / `$ink-3`, two of them in the same file.

**Zoe must decide which value is correct.** This is a data decision, not an implementation one. Building a token file on top of the divergence would freeze the wrong value into a "single source of truth".

### 3.4 The `data-theme` switching layer  **this is what makes palettes swappable**

Designed, not built. Decisions already made:

| Question | Decision | Why |
|---|---|---|
| Attachment point | `data-theme` on `<html>` | `CdDrawer`, `CdTimeDropdown`, `CdDatePicker` teleport to `body`; `MonthViewV2` to `#mp2-root`; Quasar `Notify` injects into `body`. An app-root div misses all of them. |
| Default | v1 stays on the unattributed `:root` | If the attribute is absent (empty storage, JS blocked, jsdom), an unattributed document still gets a complete palette. Both-scoped leaves every token unset: transparent text, vanished borders. Legacy has 589 token references and is the correct fail-safe. |
| Pre-paint | `public/theme-init.js` loaded via `<script src>` | **The CSP is `script-src 'self'` with no `'unsafe-inline'`, so an inline snippet is silently blocked and the theme never applies.** A same-origin file is allowed and is render-blocking, which is what is wanted. |
| Path | interpolate `<%= publicPath %>` | It is `/cadence/` on the GitHub Pages deploy; a hardcoded path 404s. |
| Scope | one global preference, not per-route | Eleven legacy components are imported into v2 code; a global theme gives the right result for them for free. |
| State | a new dedicated store | Existing stores are in-memory only and `src/utils/save-load-local-storage.ts` is imported by nothing, so there is no pattern to follow. localStorage is appropriate. |
| Transitions | none on `:root` | Would turn a switch into a visible crossfade and can fire spuriously on load. |

Also tokenise the page background and default text colour, currently hardcoded in `app.css`, so the first painted pixel is theme-controlled.

### 3.5 Remaining ~204 hardcoded colours
Purely mechanical, no pixel change. Heaviest files: `CdSettingsDrawer.vue` (39), `CdDraftDrawer.vue` (31), `CdEventEditCard.vue` (28), `CdAppearancePicker.vue` (19), `CdEventPreviewCard.vue` (13).

`JoinCalendarPage.vue` and `AuthCallbackPage.vue` are the cleanest starting point: 6 hardcoded values each and **zero** token references, self-contained, no effect on other components.

### 3.6 Non-colour token families  **blocked on Zoe's design decisions, not on implementation**

Do not start these without a decision. Each needs a scale designed first:

| Family | State | Decision needed |
|---|---|---|
| Radius | 10 tokens, but 8 values in use fall outside the scale. The most-used radius (`8px`) is not a token; `--cd-radius-chip` has zero consumers. | Which step do the outliers map to, or is the scale itself wrong? |
| Shadow | 12 tokens, mostly hand-rolled per component | How many elevation steps exist? No such definition exists today. |
| Font size | 26 tokens, 4 consumed; ~100 sizes hardcoded | Prune to how many? Measured usage clusters at 13/13.5/14/15px and 11/11.5/12/12.5px, suggesting 6 to 8 steps. |
| letter-spacing, font-weight, border-width | **No tokens at all** | Three scales from scratch. |

### 3.7 Design token document format
Researched, not started. Recommendation: DTCG JSON as the single hand-written source, Style Dictionary 5.5.0 generating CSS, Tailwind `@theme`, and Sass. Phase 1 colour only; leave `use-theme.ts` hand-written and lint it for consistency instead of generating it. Full reasoning and a starter artifact using real project values: `~/claude-replies/design-token-doc-format.html`.

Note the format survey flagged one uncertainty worth verifying rather than trusting: whether a plain `"8px"` string is still valid for `dimension` in DTCG 2025.10, or whether the object form is now required. Check against Style Dictionary's actual parser.

### 3.8 Known limitation to state, not necessarily to solve
Colour is mirrored by hand into a Tailwind `@theme` block and a Sass variable file. Both need build-time values and cannot read runtime custom properties. **Until that is redesigned, a runtime palette switch changes token consumers but leaves Tailwind utility classes and Quasar components on the previous palette.** Bounded and known; does not block a first release but will be visible the day it ships.

---

## 4. Traps a fresh agent will fall into

These are not inferable from the token file, and each has already caused or nearly caused a defect.

1. **`CdMonthGrid.vue` mirrors CSS pixel values into a JS `CELL_METRICS` constant** to compute how many event chips fit per row. Changing chip size, cell padding, or the date-circle diameter without updating it **fails silently**: no error, no type error, just wrong layout. `CdMonthCell` guarantees 3 visible events before collapsing to "+N", so if the arithmetic yields fewer than 3 the row overflows rather than showing fewer chips. Current values were verified consistent: desktop chip computes to 24.2 against a constant of 24.5, phone 25 against 25, and both breakpoints fit 3.

2. **Quadrant colours in `use-theme.ts` are persisted to a database.** They must stay literal hex. A `var()` there writes CSS syntax into stored data. Separately: existing records hold old hex values, so changing these does not retroactively update them, and a palette swap would leave old and new events inconsistent. That is a migration problem, not a token problem.

3. **Zen Kaku ships 300/400/500/700/900 only.** No 600, no 800. A font-family token carries no weight information, so an agent reading only tokens cannot know this. Worth adding a lint rule for.

4. **`--cd-bp-desktop` is a fake token.** CSS custom properties cannot be used in `@media` queries; the value that actually applies lives in `src/css/breakpoints.sass`. An agent will assume changing the token changes the breakpoint.

5. **`--cd-olive-mix-2` (`#6E6A52`) and `--cd-olive-mix-3` (`#6E6A54`)** differ by 2 in one channel and are visually identical. Unresolved duplication, not design intent. Do not invent distinct semantic roles for them.

6. **Pre-existing build defect, verified against an unmodified baseline and NOT caused by this branch:** the built CSS declares 924 `@font-face` rules but no font files are emitted to `dist/`, and the URLs point at a directory that does not exist there. The practical implication is that **the deployed site is probably serving no web fonts at all and rendering in system fallbacks**, which means nobody has yet seen the intended typography in production. That in turn affects how any typography decision should be evaluated. Out of scope here; worth its own investigation.

---

## 5. Deferred defects, recorded deliberately

| Defect | Scale | Why deferred |
|---|---|---|
| White text on the accent at 2.28:1, while three sibling sites use dark text at 4.57:1 | 6 sites | Zoe's decision: not now. The paired-token rule prevents recurrence. |
| `--cd-muted` / `--cd-ink-3` at 2.60:1 against the base surface | 67 sites | Changing the value moves 67 render sites; deserves its own reviewable change. |
| 12 ad-hoc accent alphas not yet collapsed to 4 steps | 17 sites | Collapsing changes rendering perceptibly; needs per-site visual confirmation. |
| Line colours below the 3:1 non-text guideline | 66 sites | Defensible for decorative dividers; not for a line that is a control's only affordance. |

---

## 6. Suggested skills

- **`codex:codex-rescue`** — re-run the review gate if the dispatched one is gone. Codex review is a standing commit gate for this project; do not skip it.
- **`superpowers:code-reviewer`** — for reviewing completed work against this handoff before committing.
- **`/dispatch`** — Zoe's habit for delegating research and audits. Follow her model-tiering rule in the global `CLAUDE.md`: haiku for mechanical work, sonnet for search and routine implementation, omit the model for anything where being wrong is expensive.
- **`/worktree`** — required for any new worktree. Never `git worktree add` by hand.
- **`impeccable`** — if visual design work resumes. Note it wants `PRODUCT.md` / `DESIGN.md`, which this project lacks; that gap was skipped deliberately because the constraints were already better specified by Zoe and the existing code than an interview would produce.

---

## 7. Working conventions observed this session

- Reply in Traditional Chinese; code comments and commit messages in English.
- Anything comparative, structured, or plan-shaped goes into an HTML page under `~/claude-replies/`, not the terminal. Section-numbered per the multi-session rule in the global `CLAUDE.md`.
- Zoe iterates visually and fast. She will ask for a size, look at it, and ask again. Expect several rounds; verify layout constraints each round rather than only at the end.
- She wants trade-offs stated plainly, once, and then wants the work done as asked. The synthesised-weight issue was raised, she chose anyway, and that was the end of it.
- Verify with the real toolchain (`npm run build`, `npm test`, `npm run typecheck`, `npm run check:tokens`) rather than reasoning about whether something compiles.

## 8. Environment

- Dev server was running on **port 9000** when this was written (`npm run dev -- --port 9000`).
- Dependencies are installed in this worktree.
- No issue tracker is configured for this project, which is why the spec sits in the scratchpad rather than being published.
