# Cadence

A shared calendar and focus app for people who plan their day in blocks, not in lists.

Cadence combines three things that usually live in separate apps: a **shared calendar** with
invite links and push reminders, a **pomodoro timer** bound to the event you actually scheduled,
and a **notebook** for the thinking that doesn't fit in a time slot. Built as a mobile-first PWA.

**[▸ Live demo](https://s1041613.github.io/cadence/)** — best viewed on a phone, or in a
browser's mobile device emulation. Sign-in required; the calendar, timer, and notebook are all
live against Supabase.

**Stack:** Vue 3 · TypeScript · Quasar 2 · Pinia · Supabase (Postgres + RLS + Edge Functions) · Vitest

---

## Why I built it

Existing calendars tell you *when* something is. They don't help you *do* it. I wanted the
gap closed: tap an event, and the timer that starts is already scoped to that block, already
knows how long the block is, and warns you when you're about to run past it.

The shared-calendar half came from the same place — most household and small-team scheduling
happens over screenshots and chat messages. A standing invite link and a push notification
when someone adds an event removes that whole layer.

---

## What it does

### Shared calendars
- Month / week / day views with swipe navigation between dates
- **Standing invite links** — one permanent URL per calendar (TimeTree-style), deep-linked at
  `/join/:token` and surviving the sign-in round trip for logged-out invitees
- **Member notifications** — when someone adds an event to a shared calendar, the other members
  get a Web Push notification
- Per-calendar colors, membership-checked writes enforced at the database level

### Focus timer
- Pomodoro sessions attached to a specific calendar event, not a free-floating task
- **Deadline-derived clock** — the displayed time is computed from the session deadline rather
  than counted down, so the digits stay correct across tab sleep, phone lock, and reload
- **Slot-aware warnings** — a chime when 10 minutes of the scheduled block remain, latched to
  fire once per session
- Subtasks, pomodoro estimates, and an unclamped progress ring (it reads 4/3 when you overrun —
  exceeding the estimate is itself the signal)
- Sessions rehydrate from local storage, so closing the app mid-pomodoro doesn't lose it

### Notebook
- Free-form notes with tags and search
- Copy-to-clipboard on note cards, IME-safe input handling for Chinese/Japanese typing

### Reminders
- Web Push subscriptions with VAPID
- Scheduled delivery via a Supabase Edge Function driven by `pg_cron`

---

## Engineering notes

These are the parts I'd want to talk through in an interview.

**Pure logic, thin stores.** The focus timer's state machine lives in
`src/utils/focus-timer.ts` as pure functions (`startSession`, `advanceExpired`, `projectFocus`,
`decideRehydrate`). The Pinia store in `src/stores/focus-store.ts` only owns the interval, the
audio, and the single clock read. That split is why the timer has meaningful unit tests at all —
time-dependent behavior is testable when time is an argument rather than a call to `Date.now()`.

**Services own I/O, stores own orchestration.** Every `src/services/*.ts` module talks to
Supabase and nothing else — no store imports, no component awareness. All requests carry a
10-second `AbortSignal.timeout`.

**Row-level security as the real boundary.** Authorization lives in Postgres RLS policies
(`supabase/migrations/`), not in the client. A membership check on event updates is enforced by
the database, so a tampered client can't write into a calendar it doesn't belong to.

**A lint rule for design tokens.** `scripts/check-tokens.mjs` fails the build when a palette
value is hardcoded instead of referencing a CSS custom property. The motivation: `#B3AC91` and
`var(--cd-olive)` render identically while one palette ships, so the divergence is invisible
until a second theme is applied — and the `rgba(179, 172, 145, a)` form is worse, since grepping
for the token name reports success while the value stays frozen. The script makes both visible.

**A dev-only component gallery instead of Storybook.** `/dev/gallery` renders components for
visual checks and is stripped from production builds via an `import.meta.env.DEV` route guard —
the same verification value without a second build pipeline to maintain.

---

## Tests

811 unit tests across 53 files in `src/`, plus 12 for the Edge Function. All passing.

```bash
npx vitest run --dir src        # 53 files, 811 tests
npx vitest run --dir supabase   #  1 file,   12 tests
npm run typecheck               # vue-tsc, clean
npm run check:tokens            # design-token guard
```

Coverage is concentrated where the risk is: timer state transitions, date/time conversion,
service-layer request shaping, and store orchestration. Components are verified visually
through the gallery rather than through snapshot tests.

> Note: `npm test` currently also picks up stale copies under `.worktrees/`. Use the scoped
> `--dir` commands above for an accurate run.

---

## Running locally

Requires Node 22.12+ and a Supabase project.

```bash
npm install
npm run dev
```

Create a `.env` at the project root with your Supabase credentials:

```
QCLI_SUPABASE_URL=https://<project>.supabase.co
QCLI_SUPABASE_ANON_KEY=<anon key>
```

Client-exposed environment variables use the `QCLI_` prefix, as required by Quasar's Vite
integration.

Database setup:

```bash
npx supabase start
npx supabase db push    # applies migrations in supabase/migrations/
```

---

## Project layout

```
src/
  components/    # v2/ is the current UI generation; legacy views remain routable at /legacy
  composables/   # breakpoints, swipe gestures, theming, IME-safe input
  pages/         # month, week, day, notebook, settings, login, join
  services/      # Supabase I/O — one module per table, no store imports
  stores/        # Pinia; orchestration only
  utils/         # pure logic — focus timer state machine, date conversion
supabase/
  migrations/    # schema + RLS policies
  functions/     # send-reminders Edge Function
scripts/         # check-tokens design-token guard
docs/            # design notes per feature area
```

---

## Status

Actively developed side project. The v2 UI generation is the current surface; the original
layout stays reachable at `/legacy` during the migration.

Every push to `main` runs tests, typecheck, and a production build before deploying to
GitHub Pages ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)) — a merge can't
reach the demo without passing the gate first.
