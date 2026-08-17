-- =====================================================================
-- CADENCE — notes: quadrant and duration
--
-- The Notebook card gains two controls: a quadrant pill and a duration
-- stepper. Both are per-note settings the user adjusts on the card itself, so
-- both persist.
--
-- 1. Quadrant is stored as important + urgent, not as a `quad` text column.
--    That pair is how this schema has always expressed the Eisenhower matrix
--    (see events.important / events.urgent) and how the client resolves it
--    (use-theme.ts quadrantOf(), which looks up QUADRANTS by exactly this
--    pair). A `quad text check (quad in ('do','plan',...))` column would be a
--    second, parallel spelling of the same four states — every reader would
--    then need to know which of the two encodings a given table uses, and the
--    two could drift out of agreement with no constraint able to catch it.
--
--    Both default false, which is the `later` quadrant ("之後再說"). That
--    matches the design's default of the least-committed quadrant, and it is
--    also the client's FALLBACK_QUADRANT, so a row written by any other caller
--    resolves to the same state the UI would show.
--
-- 2. duration_min is integer minutes, not an interval and not hours.
--    The stepper moves in 15-minute increments over 15m–8h, so minutes are
--    exact in integer arithmetic where fractional hours (0.25) are not.
--    `interval` would admit values this control can never produce (seconds,
--    days, months) and forces every reader to normalize before comparing.
--
--    Not nullable: every note has a duration the moment the card renders one,
--    and null would mean "no duration" — a fifth state the stepper cannot
--    express and the card could not display. The default is 15, the design's
--    initial value and the range's floor.
--
-- Both columns are backfilled by their defaults for existing rows, which is
-- correct rather than merely convenient: a note written before this migration
-- genuinely had no quadrant and no duration, and `later` + 15m is exactly the
-- untouched state a newly created note starts in.
--
-- The UPDATE policy these writes need already exists ("own notes updatable",
-- added in 20260816160000). No new policy is required — the existing one is
-- row-scoped, not column-scoped, so it already governs these columns.
-- =====================================================================

alter table notes
  add column important    boolean not null default false,
  add column urgent       boolean not null default false,
  add column duration_min integer not null default 15;

-- Backstop for the client's own clamp (Pv2NoteCard steps within 15..480 and
-- snaps to the 15-minute grid). Stated as a constraint so a value the stepper
-- cannot produce also cannot be written by any other caller.
alter table notes
  add constraint notes_duration_min_range
  check (duration_min between 15 and 480 and duration_min % 15 = 0);

comment on column notes.important    is 'Eisenhower axis, paired with urgent. Same encoding as events.important — the client resolves the pair to a quadrant via use-theme.ts quadrantOf(). Default false.';
comment on column notes.urgent       is 'Eisenhower axis, paired with important. false/false is the `later` quadrant, which is both the design default and the client fallback.';
comment on column notes.duration_min is 'Planned length in minutes. Integer rather than interval: the stepper moves in exact 15-minute increments over 15..480, and integer minutes compare and sum without normalization.';
