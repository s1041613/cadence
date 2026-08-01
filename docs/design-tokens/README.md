# Design tokens

Reference for Cadence's v1 colour palette.

| File | What it is |
|---|---|
| [`v1-tokens.html`](v1-tokens.html) | The 24 roles with swatches, values, contrast ratios and usage counts. Open it in a browser — the swatches only mean something rendered. |
| [`deferred-decisions.md`](deferred-decisions.md) | What we chose *not* to do, and why. Read before re-opening any of it. |

The tokens themselves live in `src/css/cadence-tokens.css`, with each role's contract documented at its definition. That file is the source of truth; these documents describe it.

## The two rules

**1. Any role used translucently must expose an `-rgb` channel triple.** Compose washes as `rgba(var(--cd-ink-rgb), α)`, never as `rgba(86, 88, 94, α)`. A literal shares no text with any token name, so a rename reports success while the value stays frozen on the old palette. That was true of 34 sites before this work, for the app's most-used colour.

**2. Names describe the role, never the material or the call site.** Test: *if the palette or the layout changed, would this name still be true?* `--cd-olive` starts lying the moment the accent changes. `--cd-topbar` had 17 consumers and only one was a topbar.

## Authoring a second palette

Supply a value for every role. There is no fallback — a palette that omits one is broken, because silently inheriting the previous palette's colour is worse than an obviously missing value.

Satisfy the **contract**, not the v1 value. Two roles currently fail WCAG AA and a new palette should fix them rather than copy them; see `deferred-decisions.md` §6.

Fonts, quadrant colours and event colours are not part of the palette. See `deferred-decisions.md` §9 for why the last two must stay literal.

## Checking

```
npm run check:tokens
```

Fails when a known palette value is hardcoded in the legacy layout. It cannot catch a colour that has no token — it guards against regression, not against gaps.
