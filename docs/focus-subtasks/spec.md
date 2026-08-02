# Spec — Subtasks & Focus Session Refinement

**Branch**: `feat/focus-subtasks`
**Worktree**: `.worktrees/focus-subtasks`
**Date**: 2026-08-02
**Design sources**: `focus-screen-mockup.html`, `subtask-panel-mockup.html` (both in this folder)

---

## Problem Statement

A Cadence event is a timebox — a bounded slot on the calendar with an estimated number of pomodoros. But a timebox is rarely one indivisible activity. "Morning work, 10:00–12:00" is really three or four things: write the proposal, answer email, tidy the desk. Today the user has nowhere to put those things. The event has a title and a free-text notes field, and that is all.

This produces three distinct frustrations:

**They cannot see what the block is for.** Looking at a calendar full of "Morning work" and "Reading" tells the user when they are busy but not what they intended to accomplish. The intent lives in their head, or in a notes field they have to open a card to read.

**They cannot track progress inside a block.** Completion is all-or-nothing at the event level. A two-hour block where two of three things got done looks identical to one where nothing did.

**The focus session gives them no bearing.** Once the pomodoro timer opens, the screen shows a countdown for the current pomodoro and nothing else. The user cannot see how much of the *timebox* remains — a different and more important clock — nor what they had planned to do in it. The countdown says 18:24; the block might have 43 minutes left or 4.

Separately, and independently of subtasks, the pomodoro estimate behaves as a **hard ceiling** rather than the reference it is meant to be. The estimate is derived automatically from the slot length, so it is a guess by construction. Yet when the user reaches it, the session ends: the app credits the last pomodoro, plays a completion chime, and offers a single "Done" button. There is no way to keep going. A user who is mid-flow at the estimate is told to stop, and a user who wants a fourth pomodoro in a slot the app guessed would hold three simply cannot have one. The estimate is also enforced in the database, so the count physically cannot exceed it.

---

## Solution

Give every timebox an optional checklist of **subtasks**, and make the focus session aware of the timebox it is running inside.

A subtask is deliberately minimal: a title, a done flag, and a parent. It has no duration, no budget, no pomodoro count and no share of the estimate. This is a decision, not an omission — see Implementation Decisions.

Subtasks are created and managed in the **event preview card**, the single card that all three calendar views already open. They appear inline in the day and week views so the user can see a block's intent without opening anything. The month view is untouched: its cells are too small for subtask names, and its existing "+N" already means "N more *events*", a different noun that would mislead if mixed.

The **focus session** gains two things: a persistent context bar showing the parent task's name, its slot, and — the number that matters — how much of the slot remains; and a read-only list of the subtasks, present for orientation but not interaction. Mid-session fiddling is exactly what the end-of-session prompt exists to avoid.

Finally, the **pomodoro estimate becomes a true reference**. Reaching it still marks the moment — the chime plays, the screen says the planned pomodoros are done — but that screen now offers a way onward as well as a way out. The user can always start another pomodoro. The counter reads `4/3`, and the fact that the numerator exceeds the denominator is itself the signal that they are past the plan. This matches the existing treatment of running past the slot's end time, which warms the background but never blocks.

---

## User Stories

### Creating and managing subtasks

1. As a Cadence user, I want to add a subtask to an event from its preview card, so that I can record what I intend to do in that block without leaving the calendar.
2. As a Cadence user, I want to type a subtask and press Enter, so that I can capture a thought at the speed I think of it.
3. As a Cadence user, I want the input to stay focused after I add a subtask, so that I can type several in a row without reaching for the mouse.
4. As a Cadence user, I want to check off a subtask, so that I can record what I have finished.
5. As a Cadence user, I want to uncheck a subtask I checked by mistake, so that an accidental tap is not permanent.
6. As a Cadence user, I want to delete a subtask, so that I can remove something I no longer plan to do.
7. As a Cadence user, I want to edit a subtask's title in place, so that I can fix a typo or sharpen the wording without deleting and retyping it.
8. As a Cadence user, I want an empty title to be rejected rather than saved, so that I cannot end up with a nameless row I can no longer identify.
9. As a Cadence user, I want to abandon an edit and keep the original title, so that a mistaken keystroke is recoverable.
10. As a Cadence user, I want a completed subtask's title to stop responding to clicks, so that the strike-through tells me the truth about what I can still change.
11. As a Cadence user, I want to tap a checked subtask's checkbox again to uncheck it, so that I can reopen an item I settled too early.
12. As a Cadence user, I want unchecking a subtask to make its title editable again, so that a mis-typed item I already checked off can still be corrected.
13. As a Cadence user, I want completed subtasks to stay where they are rather than reorder, so that the list does not move under my finger as I check things off.
14. As a Cadence user, I want to see how many subtasks are done out of the total, so that I can judge a block's progress at a glance.
15. As a Cadence user, I want the subtask section to collapse, so that a long checklist does not push the rest of the card out of reach.
16. As a Cadence user, I want the section to start expanded when it has subtasks and collapsed when it does not, so that the default matches whether there is anything worth showing.
17. As a Cadence user, I want the done count to remain visible while collapsed, so that collapsing does not hide the only information the row carries.
18. As a Cadence user, I want a long list to scroll inside the card rather than stretch it, so that the card stays a predictable size and the focus button does not move.

### Seeing subtasks across the calendar

19. As a Cadence user, I want to see subtask names inside an event in the day view, so that I can read a block's intent without opening it.
20. As a Cadence user, I want a day-view event with many subtasks to show the first few and a "+N more" marker, so that one busy block does not crowd out the rest of the day.
21. As a Cadence user, I want to see subtask names in the week view, so that a week's plan is legible at a glance.
22. As a Cadence user, I want to see a count of subtasks on a week-view event, so that I know how much is hidden.
23. As a Cadence user, I want the month view to keep showing events exactly as it does today, so that a dense month does not become unreadable.
24. As a Cadence user, I want to open the same preview card from any of the three views, so that I do not have to learn three interfaces.

### Focus session orientation

25. As a Cadence user in a focus session, I want to see the parent task's name at all times, so that I know what I am working on without relying on memory.
26. As a Cadence user in a focus session, I want to see the timebox's scheduled start and end, so that I can place the session in my day.
27. As a Cadence user in a focus session, I want to see how much of the timebox remains, so that I can decide whether to start another pomodoro or wrap up.
28. As a Cadence user, I want the remaining-time figure to be visually distinct from the fixed slot times, so that I can tell at a glance which number is moving.
29. As a Cadence user in a focus session, I want to see my subtask list, so that I remember what I planned to do.
30. As a Cadence user, I want the in-session subtask list to be read-only, so that I am not tempted to fiddle with checkboxes instead of working.
31. As a Cadence user whose event has no subtasks, I want the context bar to appear anyway, so that I still get the timebox orientation that has nothing to do with subtasks.

### Escalating awareness of time

32. As a Cadence user, I want a gentle warning when the timebox has ten minutes left, so that I can begin winding down.
33. As a Cadence user, I want that warning to change the whole screen's colour and sound once, so that I notice it without it demanding a response.
34. As a Cadence user, I want the ten-minute warning to fire only once per session, so that it does not nag.
35. As a Cadence user, I want the screen to warm further once I pass the timebox's end, so that overrunning is visible without being punished.
36. As a Cadence user, I want none of these warnings to stop or pause my pomodoro, so that being interrupted is never worse than running over.

### The estimate as a reference, not a limit

37. As a Cadence user, I want to be told when I have completed the pomodoros I planned, so that the milestone is marked.
38. As a Cadence user who has reached the planned count, I want to start another pomodoro anyway, so that being in flow is not punished by a number the app guessed.
39. As a Cadence user, I want my extra pomodoros to be counted and saved, so that my record reflects what I actually did.
40. As a Cadence user past the estimate, I want the counter to keep the original estimate as its denominator, so that I can see how far past the plan I am.
41. As a Cadence user, I want each pomodoro past the estimate to return me to the same milestone screen, so that I get a natural stopping point rather than an unbounded loop.
42. As a Cadence user creating an event, I want its default pomodoro estimate to account for the breaks between pomodoros, so that following the estimate does not guarantee an overrun.

### Ending a session

43. As a Cadence user closing a focus session, I want to be asked what I completed, so that I can update my subtasks while the session is fresh in mind.
44. As a Cadence user, I want to check off subtasks in that prompt, so that I do not have to reopen the calendar to record my progress.
45. As a Cadence user, I want to skip that prompt, so that recording progress is never mandatory.
46. As a Cadence user who closes a session without completing any pomodoro, I want to leave immediately without being asked anything, so that opening a timer by mistake costs me one tap.
47. As a Cadence user finishing a pomodoro early, I want to be asked only whether it counts, so that a question about one pomodoro is not confused with a question about the whole session.
48. As a Cadence user, I want closing the browser tab to ask me nothing, so that only deliberate exits prompt me.
49. As a Cadence user, I want the buttons on screen to reflect what I can do right now, so that I never see an action that does not apply to my current state.

### Data integrity

50. As a Cadence user, I want my subtasks to persist across devices, so that a checklist written on my laptop is there on my phone.
51. As a Cadence user, I want deleting an event to delete its subtasks, so that no orphaned rows accumulate.
52. As a Cadence user, I want checking a subtask to feel instant, so that the interface does not wait on the network.
53. As a Cadence user viewing an event shared by someone else, I want the same read-only treatment subtasks that the rest of the card already has, so that permissions behave consistently.

---

## Implementation Decisions

### Subtasks are their own table, not a row on the events table

A subtask has three meaningful fields and a parent. It gets a dedicated table:

```
subtasks
  id         uuid primary key
  parent_id  uuid not null → events(id) on delete cascade
  title      text not null
  done       boolean not null default false
  position   int                       -- insertion order
  created_at timestamptz not null
```

The alternative — a self-referencing parent column on the events table — was examined against the real schema and rejected. The events table has twenty columns and five CHECK constraints encoding what distinguishes a task from an event. A subtask living there would have to satisfy all of them, which means **carrying four values it has no concept of**:

- `starts_at` and `ends_at` are non-null and would have to be copied from the parent. A subtask has no time span of its own, so these would be fabricated values — and because the calendar's primary index is on `(calendar_id, starts_at)`, every calendar query would return subtasks as though they were scheduled events. Each such query would need an exclusion filter, and any missed one would put rows the user never scheduled onto their calendar.
- `quadrant` is required of every task row, but a subtask has no quadrant meaning.
- Giving subtasks a distinct type value instead does not avoid this: two of the existing constraints — one requiring a quadrant of anything that is not an event, the other forbidding a quadrant on anything that is not a task — are jointly unsatisfiable by a third type, so both would have to be rewritten.

A separate table has none of these problems. No constraint to work around, no fabricated timestamps, no index pollution, and no existing query needs changing — subtasks are invisible to every current read by construction.

The cost is a dedicated mapper and a dedicated set of row-level security policies. For a table with four columns and no state machine, this is smaller than the exclusions the shared-table approach would require.

### Subtask authorization mirrors the parent event's

Row-level security follows the pattern events already use — calendar members may read, the owner may write — resolved through the parent event's calendar rather than a column on the subtask itself. A subtask carries no calendar or owner column; its parent is the single source of both, so a shared calendar's read-only treatment applies to subtasks with no extra bookkeeping.

Cascading delete on the parent reference means removing an event removes its subtasks in the database, with no application-level cleanup.

### A subtask has exactly three meaningful fields

Title, done flag, parent reference. No duration, no pomodoro count, no share of the estimate, no ordering weight beyond insertion order.

This is the decision that removes the most complexity. An allocation model would have required answering: how is half a pomodoro defined; must allocations sum to the slot; when a subtask is added at 11:00 does its share come from the whole slot or what remains; do completed subtasks still consume budget; how do unallocated subtasks appear in the arithmetic. None of these questions arise.

### A subtask's title is editable in place

The title can be corrected after creation, in the preview card, without deleting the row — a subtask's identity is its row, not its text, and its completion state and creation time survive a rewording.

An empty or whitespace-only title is refused rather than saved: the title is the only thing identifying a subtask, so a nameless row could not be told apart from its neighbours. Refusing means keeping the previous title, not deleting the row. An edit in progress can be abandoned, restoring what was there before.

**A completed subtask's title is locked.** Checking a subtask settles it: the title greys and strikes through, and it stops responding to clicks. The strike-through is therefore an honest signal rather than decoration — struck text is not editable text.

The checkbox itself always remains active. Unchecking restores the title to normal weight and colour and makes it editable again, so a mis-checked item is never stranded: uncheck, correct, re-check. This is the only path back, and it is deliberate — settling an item should take a distinct action to undo, not be silently overwritable.

Editing is not offered anywhere else: the focus session's list is read-only, and the settle-up prompt only checks items off.

### Pomodoros are credited to the parent, never to a subtask

The focus session runs against the parent task. Subtasks are a checklist, not timers. The existing completed-pomodoro field on the parent remains the single record of pomodoro work.

Consequence: the "start focus" button does not require selecting a subtask, and the in-session list is read-only. An earlier design draft had the user pick a subtask to focus on; that model was rejected.

### Subtask mutations reuse the existing optimistic write path

Adding, editing, checking and deleting a subtask go through the same optimistic-write-then-reconcile mechanism as the existing task done-toggle: the local state updates immediately and the write reconciles behind it.

Because subtasks are a separate table with their own service, the write queue's per-row keying does not by itself order a subtask insert after its parent's creation. In practice the parent always exists before its card can be opened, so the ordering hazard is narrow — but a subtask insert must not be issued against an unsaved parent.

A subtask is a dependent row, not an independently-owned entity: it carries no calendar or owner of its own and is only ever reached through its parent.

### A new slot-to-pomodoro function supplies the default for newly created events only

The existing automatic estimator divides slot length by focus length and rounds up. It does not account for the breaks between pomodoros, so a two-hour slot yields five — which actually require 145 minutes, 25 minutes longer than the slot. Following that estimate guarantees an overrun.

A new function computes the count that genuinely fits:

```
pomsInSlot(slotMs) = floor((slotMs + restMs) / (focusMs + restMs))
```

From the prototype: a 120-minute slot yields 4, occupying 115 minutes.

**Scope: this function supplies the default estimate when an event is created. Nothing else.** The stored estimate on the task remains the single source of truth for every read — the preview card, the focus screen's denominator, and the milestone-phase transition all continue to use it, unchanged.

Rationale for the narrow scope. Every existing event already carries a stored estimate computed the old way. Had the focus screen switched to computing its denominator live, the same event would report five pomodoros on its preview card and four on the focus screen. Recomputing everywhere instead would fix the disagreement but discard any estimate the user had adjusted by hand.

The narrow scope is also cheap because the estimate is no longer a limit. Since exceeding it is permitted and merely displays as `4/3`, an imprecise estimate on an older event costs the user nothing. The value of the new function is that it stops *producing* unachievable numbers, not that it corrects existing ones.

**Consequence for the single-accessor rule**: the codebase routes every estimate read through one accessor, whose comment requires all callers to go through it. That rule is preserved intact — the new function is not a second reader of the estimate, it is a producer of the initial value. No caller has to choose between two notions of "how many pomodoros".

### The estimate ceases to be an upper bound

Four changes, in this order:

1. **Drop the database CHECK constraint** that requires completed pomodoros to be at most the estimate. Without this, the extra pomodoro cannot be persisted at all and every front-end change is moot.
2. **Remove the three clamps** in the mapper, the tasks store and the focus store. Without this, an over-estimate value that reached the database would be clamped away on read.
3. **Widen the guard on "start another pomodoro"** so it permits the completed phase, not only the rest phase. This is the single change that makes the milestone screen actionable.
4. **Leave the two remaining estimate checks alone** — the ones that route a finished rest back to the completed phase. They now mean "return to the milestone screen", which is correct, because that screen has an exit.

The core pomodoro-completion transition is **not** modified. Reaching the estimate still enters the completed phase and still plays the completion chime.

### The completed phase becomes a fork, not a terminus

Previously the completed phase offered a single "Done" button. It now offers two: leave the session, or start another pomodoro. The milestone is preserved — the user is told the planned pomodoros are finished — but it no longer ends the session.

Each subsequent pomodoro returns to this same screen, so the user gets a decision point per pomodoro rather than an unbounded run.

### The counter's denominator stays at the original estimate

Past the estimate the counter reads `4/3`, not `4/4` and not a bare `4`. A numerator exceeding its denominator is itself the overrun signal, consistent with the existing background-warming treatment of running past the slot end.

Rejected: growing the denominator, which silently rewrites the estimate and re-triggers the milestone every pomodoro; and dropping the denominator, which changes the display format mid-session.

### The two end-of-session prompts are bound to different actions and never co-occur

| Action | Level | Question |
|---|---|---|
| Finish | pomodoro | Does this partial pomodoro count? |
| Close (✕) | session | What did you complete? |
| Done, on the milestone screen | session | What did you complete? |

Finish ends the current pomodoro and may be followed by another, so it asks nothing about subtasks. Close and Done are the same act — leaving — and share one exit path, one gate and one sheet.

The earlier framing of "merge the two sheets or show them in sequence" was mistaken: it arose from treating Finish and Close as both meaning "end". Separated by level, each is complete on its own.

### The settle-up prompt is gated on pomodoros completed *in this session*

The prompt appears only when the user actively leaves **and** at least one pomodoro has been completed during this session. Closing the tab prompts nothing.

The existing completed-pomodoro figure is the task's cumulative total from the database, not this session's — a task at 3/3 from yesterday would wrongly satisfy the gate. A **new session-scoped counter is added to the persisted focus state**, requiring a state version bump so restored sessions from the previous format are discarded rather than misread.

Per the seam decision, the gate itself is a **pure predicate in the focus-timer module**, not a store-level condition; the counter is threaded through the timer's config.

### Two button bars, mutually exclusive

Running: Pause / Finish. At the estimate: Done / Start another pomodoro. Never both, and never the milestone bar while a pomodoro is running. This is existing behaviour; the only change is the milestone bar going from one button to two.

### The context bar is independent of subtasks

It shows the parent's name, its slot, and the remaining slot time, and appears whether or not the event has subtasks. Visual hierarchy carries the distinction: the fixed slot times are dimmest, the moving remaining-time figure is brightest.

The remaining-time figure needs the slot end, which the focus store already derives.

### The card's positioning height must become dynamic

The preview popover is positioned using a fixed expected height. A variable-length subtask list breaks that assumption for events near the bottom of the viewport, which would flip or overflow. Two mitigations, both needed: the list scrolls within a maximum height, and the expected height is estimated from the subtask count.

### Chimes

One new sound is added: the ten-minute slot warning, latched to fire once per session. The existing completion chime is unchanged in both sound and trigger.

---

## Testing Decisions

### What makes a good test here

Assert on externally observable behaviour: the state a reducer returns, the effects it emits, the values a store exposes, the shape a mapper produces. Never assert on how a result was reached.

The project's established posture is **pure-logic tests only** — no jsdom, no component mounting. That posture is retained; no UI in this spec gets a test seam. This is a deliberate limitation: the preview card, focus screen and day/week rendering are verified by hand.

### Seams

Four existing seams, one new function inside an existing seam, and **one genuinely new seam** — the service for the new subtasks table. The new seam is unavoidable: a new table needs a module that reads and writes it, and the project already has one service per table. It is introduced at the same level as its siblings, not below them.

| Seam | Kind | Covers |
|---|---|---|
| focus-timer | pure reducer | The "start another pomodoro" guard admitting the completed phase; counts exceeding the estimate surviving transitions; the session-scoped pomodoro counter; the settle-up gate predicate |
| focus-store | Pinia store | Slot remaining-time derivation; the ten-minute threshold latch; ✕ and Done sharing one exit path |
| tasks-store | Pinia store | Subtask create/rename/toggle/delete as exposed to the UI; an empty or whitespace-only rename being refused without losing the previous title; **a rename of a checked subtask being refused, and permitted again once unchecked**; optimistic update and reconciliation; a parent's subtasks disappearing when it is deleted |
| events-mapper | pure | Over-estimate completed counts no longer clamped on read |
| subtasks-service | new module, new seam | Row-to-domain mapping for the new table. The one new seam this spec introduces; it exists because the table is new, and follows the existing per-table service pattern |
| convert-date-time | pure | The new slot-to-pomodoro function: the break-inclusive arithmetic, and the boundary where adding one minute to the slot does or does not admit another pomodoro |

### Prior art

The focus-timer tests are the model for the reducer work: the module reads no clock and imports nothing from the framework, so every wall-clock boundary — background throttling, reload, returning hours later — is a table test rather than a fake-timer exercise. New reducer behaviour should be table tests in the same style.

The focus-store tests are the model for the wiring work, and carry a specific lesson worth heeding: a real bug in the original refactor — the session never advancing to rest because a transient state reported itself expired — was invisible to pure reducer tests and caught only at the store seam. Where a behaviour depends on the reducer *and* the clock *and* persistence agreeing, test it at the store.

The tasks-store tests are the model for optimistic-write behaviour; the events-mapper tests for round-trip mapping.

### Explicitly worth testing

- A pomodoro count above the estimate survives a full write-and-read round trip. This is the assertion that would have caught the database constraint had it been written first.
- The settle-up gate is false at zero session pomodoros and true at one, independent of the task's cumulative total.
- Restoring a focus state persisted in the previous version is discarded, not misinterpreted.

---

## Out of Scope

- **Selecting a subtask to focus on.** Pomodoros are credited to the parent; the focus button needs no selection.
- **Per-subtask pomodoro counts.** No pomodoro is attributed to a subtask, so there is nothing to display.
- **Subtask reordering, nesting, due dates, assignees, or notes.** Three fields only.
- **Rich text, links or formatting in a subtask title.** Plain text only.
- **Changing the existing automatic pomodoro estimator.** A second function is added alongside it.
- **Rollover of unfinished work to another day.** Separately planned; no implementation exists.
- **Mini window / picture-in-picture, web notifications, tab-title countdown, vibration.** Previously declined.
- **A persistent retry queue for failed syncs.** The existing optimistic model is accepted as-is; an offline queue belongs at the tasks-store level for all writes, not for pomodoros alone.
- **Component-level tests.** Consistent with existing project posture.
- **Touch deletion gesture for subtasks.** The hover-revealed delete control has no touch equivalent; swipe-to-delete or long-press is unresolved and deferred.
- **Persisting the subtask section's collapsed state.** It resets to its default each time the card opens.

---

## Further Notes

### Order of work

The pomodoro-estimate changes and the subtask model are **independent**. The estimate work touches no subtask code and can ship first; it is also the only part requiring a migration.

Suggested sequence: the new slot-to-pomodoro function → the estimate-ceiling removal → the subtask data model → the preview card → the focus screen → day and week rendering.

### The most easily underestimated item

The pomodoro ceiling is enforced in the **database**, not only in the front end. Removing the three front-end clamps without dropping the constraint produces a write that fails at the server, which — given the optimistic write path — surfaces as a value that appears to save and then silently reverts.

### A deliberately narrow scope worth not widening

The new slot-to-pomodoro function is tempting to wire into every place a pomodoro count is displayed. It is scoped to event creation only, on purpose: widening it either makes one event report two different totals, or discards estimates the user set by hand. If a future change does widen it, all three readers — preview card, focus denominator, milestone transition — must move together or not at all.

### An open question surfaced by this work

Once the estimate no longer terminates a session, the completed phase is reachable only by reaching the estimate — and it now has an exit that leads to the settle-up prompt, which is itself an ending. Whether the completed phase and the settle-up prompt should remain two screens is worth revisiting after the first build.

### Design references

Both mockups in this folder are interactive and encode decisions that prose describes less precisely — particularly the mutually exclusive button bars, the collapse defaults, and the escalating colour states. `focus-screen-mockup.html` includes a tab per session state; `subtask-panel-mockup.html` supports adding, checking and deleting.
