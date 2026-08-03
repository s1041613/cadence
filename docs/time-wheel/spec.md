# Spec — 事件編輯卡的時間滾輪選擇器（Time Wheel Picker）

Branch: `feat/time-wheel` · Status: ready for implementation

## Problem Statement

在 Cadence 新增或編輯事件時，設定開始/結束時間目前只有一條路徑：點一顆時間 pill，跳出一個 48 筆的下拉清單（24 小時 × 30 分刻度）。這對使用者造成三個問題：

1. **清單太長、目標太小。** 48 筆要捲很久才能找到目標時間，在手機上每一列都是小小的點擊目標，容易點錯。
2. **刻度被清單長度綁死。** 想要比 30 分更細的顆粒（例如 09:45、14:20），清單就會爆長 —— 5 分刻度等於 288 筆，實務上不可用。使用者因此無法設定「不是整點或半點」的時間。
3. **不符合使用者對行事曆 app 的既有預期。** 使用者明確指出 TimeTree 的做法才是他們想要的：點時間後在下方展開滾輪，滾動選時間，同時 chip 仍可直接打字。

## Solution

把下拉清單換成**滾輪選擇器（wheel picker）**，並保留打字路徑。

點 STARTS 或 ENDS 的時間 chip 後，在該列**正下方 inline 展開**一組兩欄滾輪：左欄小時（00–23）、右欄分鐘（00 / 05 / 10 … 55），中央選中列有高亮 pill，上下列依距離淡出。

關鍵是**兩條路徑並行、即時雙向同步**：
- 滾動滾輪 → chip 上的文字即時跟著變
- 在 chip 打字 → 滾輪即時轉到對應位置

沒有確認按鈕，滾動即生效。時間衝突（結束早於開始）由**自動推移**解決，而不是擋住使用者：改開始時間時，結束時間保持原有時長跟著移動。

App 內已有一個滾輪 —— 月/年選擇 sheet（`Pv2MonthSheet`）—— 但它是月/年寫死的完整 bottom sheet。這次會先把它的單欄滾輪抽成通用元件，讓月/年 sheet 與新的時間滾輪共用同一份實作。

## User Stories

1. As a Cadence user creating an event, I want to set the start time by scrolling a wheel, so that I can reach any time quickly without hunting through a long list.
2. As a Cadence user, I want the wheel to appear directly below the time I tapped, so that I can see which field I am editing without losing my place in the form.
3. As a Cadence user, I want to pick minutes at 5-minute granularity, so that I can schedule an event at 09:45 or 14:20 rather than being forced onto the hour or half-hour.
4. As a Cadence user, I want the time chip to update as I scroll, so that I get immediate feedback on what I am selecting.
5. As a Cadence user, I want my scroll selection to take effect without pressing a confirm button, so that setting a time is one gesture rather than two.
6. As a Cadence user who knows the exact time I want, I want to type it directly into the chip, so that I do not have to scroll to a time I could state in three keystrokes.
7. As a Cadence user typing a time, I want the wheel to turn to match what I typed, so that the two controls never disagree about the current value.
8. As a Cadence user who typed a precise time like 09:07, I want that exact value kept, so that the picker's 5-minute granularity does not silently overwrite a time I stated deliberately.
9. As a Cadence user who typed something invalid, I want the field to revert to the last valid time, so that I never save a broken value.
10. As a Cadence user, I want to move my finger from the chip to the wheel without the wheel disappearing, so that the two controls behave as one panel.
11. As a Cadence user, I want tapping elsewhere in the card to close the wheel, so that the form returns to a compact view when I am done.
12. As a Cadence user, I want only one wheel open at a time, so that the card does not become too tall to navigate on a phone.
13. As a Cadence user who changes the start time of an event, I want the end time to shift along with it and keep the same duration, so that I do not have to re-set both fields for a simple reschedule.
14. As a Cadence user who scrolls the end time earlier than the start time, I want the start time to move rather than being shown an error, so that the picker never puts me in a state I have to back out of.
15. As a Cadence user, I want times near midnight to stay valid when shifted, so that an auto-shift never produces an impossible time.
16. As a Cadence user editing an existing event whose time is not on a 5-minute boundary, I want to see the wheel open at the nearest position without my stored time being changed, so that merely opening the card never modifies my data.
17. As a Cadence user who turns on All-day, I want the time chips and any open wheel to disappear together, so that the card reflects that times no longer apply.
18. As a Cadence user who turns All-day back off, I want my previously chosen times to still be there, so that toggling does not destroy my input.
19. As a Cadence user creating a task (rather than an event), I want the time wheel available too, so that the picker behaves consistently across both types.
20. As a Cadence user, I want the same wheel behavior whether I opened the editor from the Create button, from Quick Add, or by tapping an existing event, so that the app feels consistent.
21. As a Cadence user on a phone, I want the wheel to fit within the bottom sheet without pushing the Save button out of reach, so that I can complete the form.
22. As a Cadence user on desktop, I want the wheel to work inside the docked side panel, so that the feature is not phone-only.
23. As a keyboard user, I want to move the wheel selection with arrow keys, so that I can set a time without a pointer or touchscreen.
24. As a screen-reader user, I want each wheel column announced as a list with a selected option, so that I know what the control is and what is currently chosen.
25. As a user who prefers reduced motion, I want the wheel not to animate smoothly when the system asks for reduced motion, so that the interface respects my accessibility setting.
26. As a Cadence user opening the month/year picker, I want it to look and behave exactly as before this change, so that a refactor of the shared wheel does not degrade a feature I already rely on.
27. As a Cadence user opening the month/year picker, I want it to now also respond to arrow keys and screen readers, so that it gains the accessibility the shared wheel provides.
28. As a developer, I want the time arithmetic to live in tested pure functions, so that edge cases around rounding and shifting are verified without a browser.
29. As a developer, I want one shared wheel component rather than several copies, so that a visual or behavioral fix lands everywhere at once.

## Implementation Decisions

### Scope of the change

The event edit card is shared: `Pv2EventEditCard` is rendered by the Create overlay, the Quick Add "Details" path, and the event preview's Edit mode. **Changing the card once covers all three entry points** — this is the main leverage of the change, and also means a regression there is a three-way regression.

The card is **controlled and stateless** with respect to time: start/end come in as props and go out as `update:start` / `update:end` events. It does not own the values. The auto-shift logic therefore emits both events when one end of the range moves.

### Modules to be built

**A shared single-column wheel** — a new presentational component that owns scroll-snap behavior for one column. Interface: takes an ordered list of `{ value, label }` items, a current value, and display options (item height, visible row count, font variant, per-distance font sizes, accessible label); emits value changes. It knows nothing about time, months, or years.

Extracted from the existing month/year sheet rather than written fresh — that component already solves the hard part (CSS scroll-snap with centered padding, per-distance opacity/size falloff) and is in production use.

Three defects in the existing implementation get fixed during extraction, because leaving them in a now-shared component multiplies them:
- Item height is currently a JS constant duplicated as a CSS literal, hand-kept in sync. It becomes a CSS custom property driven from the single JS value.
- Padding height is a hard-coded magic number that only works for the current row count. It becomes derived from item height and visible count.
- The component has no ARIA roles and no keyboard support. It gains `listbox` / `option` semantics, `aria-selected`, and arrow-key navigation.

**A time wheel** — composes two shared wheel columns (hours 00–23, minutes at 5-minute steps) plus a fixed `:` separator, the centered highlight pill, and top/bottom fade overlays. Interface: a `HH:MM` value in, a `HH:MM` value out.

**A time chip** — a typeable field showing the current time.

The chip's width must fit the full `HH:MM` string. The card currently caps the time input at `5ch`, which is too narrow: `ch` is the advance width of the digit zero, so five of them do not account for the colon, and at the card's bold weight the last digit clips (surfaced in the mockup as `23:25` rendering as `23:`). The new chip sizes to its content with a minimum width instead of a fixed `ch` cap. Worth checking against the shipped card too — the same rule is live there today.

It reuses the existing dropdown's draft-text mechanism verbatim (a local draft string separate from the model value, a watcher that re-syncs the draft when the model changes from outside, commit-on-blur gated by format validation, revert-to-last-valid on invalid input). That watcher *is* the "wheel turns → chip text updates" implementation; it already exists and is proven.

### Interfaces modified

The event edit card gains local state tracking which wheel (start, end, or none) is open, and the handlers that apply auto-shift before emitting.

The existing time dropdown component is **not modified and not deleted** — the legacy edit card still uses it. Only the v2 card stops importing it.

### Key decisions

**The column owns its own height.** The scroll arithmetic assumes the centred row sits exactly one padding-height below the top — the padding, the frame height, and the item height are a single interlocking set (`frame = visibleCount × itemHeight`, `padding = (visibleCount − 1) ÷ 2 × itemHeight`). A container styled to any other height shifts every selection by the mismatch, reading a row off and making the first row unselectable. The column therefore derives its height from its own props rather than filling its container, so a caller cannot desync it by styling the wrapper.

**Highlight pill lives in the time wheel, not the shared column.** The month/year sheet deliberately has no highlight band (it distinguishes the selection by size and weight alone). Putting the pill in the shared component would change that existing design.

**Fade gradient colors must be inherited, not hard-coded.** The existing sheet hard-codes its paper color into the gradient. That happens to match the edit card's surface, so it would work today by luck. It becomes a CSS variable so a future container with a different background does not show a seam.

**Typed values are not snapped to the 5-minute grid.** The wheel is a selector; typing is precise input, and precise input wins. A typed `09:07` is stored as `09:07`; the wheel merely renders at the nearest position. The resulting brief mismatch (chip reads 09:07, wheel center reads 09:05) is intended behavior.

**Opening the card never emits.** When a stored value is off-grid, the wheel positions itself without emitting a change. Emitting on mount would turn "open the card to look at it" into a silent data write.

**Auto-shift replaces the error state as the primary mechanism.** Moving start moves end by the same duration; moving end earlier than start moves start back by the same duration. The existing "end must be after start" validation and disabled Save button stay in place as a backstop for values arriving from elsewhere, but should become nearly unreachable through the picker.

**Shifted times clamp at the day boundary.** A shift that would exceed 23:55 clamps there; one that would go below 00:00 clamps at 00:00. Producing `24:30` would fail the app's own time-format validation.

**Closing is not bound to blur.** Moving a finger from the chip to the wheel necessarily blurs the input; closing on blur would make the wheel vanish on touch and break the feature entirely. Closing is driven by interaction outside both the chip and the wheel, reusing the containment check already present in the dropdown component — but scoped to the row wrapper, since this panel is inline rather than teleported.

**Inline expansion, not a secondary sheet.** The card already lives inside a bottom sheet or drawer with its own stacking context and clipping. The existing dropdown is forced to teleport to `<body>` and hard-code a z-index above both to escape that clipping. An inline panel lives in the card's own scroll body and sidesteps the problem completely.

**Only one wheel open at a time.** Card height is fixed; two open wheels would overflow it.

### Visual and typographic constraints

The v2 surface uses neutral ink-on-paper values defined as local custom properties on the card. The wheel inherits those. The app-wide warm-beige tokens are **not** used here.

Time digits use the UI font with tabular numerals. The serif face is reserved for month titles and navigation letters and must not be used for the wheel.

### Deferred: 12-hour format

The app is 24-hour only, and this is structural rather than incidental — the time-format type is a single-member union and the formatting function is an identity pass-through. Adding AM/PM means widening the type, implementing real formatting, adding a setting, and auditing every screen that displays a time. That is a separate piece of work; **this change ships 24-hour and adds no third column.**

## Testing Decisions

### What makes a good test here

Test external behavior, not implementation. For this feature that means: given a time and an operation, assert the resulting time string. Do not assert scroll offsets, DOM structure, class names, or how many times a watcher fired — all of those change when the visual design is tuned, and none of them are what the user experiences.

### The seam

**One seam: the pure time functions in the date/time utility module.** All arithmetic — grid snapping, range shifting, boundary clamping — is extracted there, and the components are left with only scrolling and rendering.

This was chosen over adding component tests because the project's test environment is `node` with no DOM library and no component-testing harness; all 37 existing tests are pure functions or stores. Introducing jsdom and a component-test harness is a project-level decision with its own tradeoffs, and it is not a prerequisite for shipping this feature correctly. The seam is at the highest point where the logic that can actually be *wrong* lives.

### Modules tested

The date/time utility module, extending its existing test file.

**Grid snapping** — rounding to the nearest step; rounding that carries into the next hour; the value already on-grid returning unchanged; and the near-midnight case where carrying would overflow the day and must clamp instead.

**Range shifting** — moving the start carries the end and preserves duration; moving the end earlier than the start carries the start back and preserves duration; a shift that would pass the end of the day clamps; a shift that would pass the start of the day clamps.

### Prior art

The existing tests in the same module are the model to follow: small `describe` blocks per function, plainly-named cases, and a comment explaining *why* an edge case matters where the reason is not self-evident (the existing date-parsing test explaining the UTC pitfall is the best example of this in the file).

### Not covered by automated tests

Scroll-snap behavior, two-way chip/wheel synchronization, the touch interaction of moving from chip to wheel, layout within the sheet and the docked panel, and the month/year sheet refactor. These are verified manually — see the verification checklist in the implementation plan. The month/year refactor in particular has **no automated safety net** and must be checked with before/after screenshots.

## Out of Scope

- **12-hour format / AM–PM column.** Reasoning above; separate change.
- **The legacy edit card and the existing time dropdown component.** Both stay exactly as they are. The v2 card is the default route; the legacy card is a fallback path and uses the warm token palette, which the v2 wheel would violate.
- **Component-testing infrastructure** (DOM environment plus a Vue test harness). A standalone project decision.
- **Date selection.** Only the time portion changes; the date picker on the same rows is untouched.
- **Changing the stored time format.** Values stay `HH:MM` 24-hour strings.
- **Migrating existing off-grid stored times.** No data is rewritten.

## Further Notes

**The riskiest part of this change is not the new feature.** It is the refactor of the existing month/year sheet onto the shared wheel. That component drives the wheel by writing scroll position, and scroll position drives value changes — so re-routing it through a `modelValue` watcher can create a feedback loop. The existing code carries a comment showing this class of bug was already hit once from the opposite direction (a value equal to the current one produces no scroll event, and therefore never emitted). Any implementation must guard programmatic scrolls against re-emitting, and the "jump to today" action is the sharpest test of it.

**Off-grid stored times exist in the wild.** The current chip accepts freely typed times and validates format only, not granularity, so values like `09:07` may already be stored. The chosen handling (render at nearest, never rewrite) is deliberate. If the brief chip/wheel mismatch proves unacceptable in use, the fallback is a 1-minute minute column — 60 items, lossless, but slower to scroll.

**Card height is the layout constraint to watch.** The card is fixed-height and already scrolls internally. On a small phone, or in the desktop docked panel, an expanded wheel is the most likely thing to break the layout. The shared column's visible-row-count option exists for this: dropping from five visible rows to three cuts the panel height substantially without any other change.

**Accessibility is a free win here.** The month/year sheet currently has no ARIA roles and no keyboard support at all. Building those into the shared column means that sheet inherits them the moment it switches over — a small amount of work that fixes an existing gap in a shipped feature, not just the new one.

**A related worktree exists.** `feat/event-datetime-picker` touches date/time selection in the same card. Worth a look before starting, to avoid conflicting edits to the same region.
