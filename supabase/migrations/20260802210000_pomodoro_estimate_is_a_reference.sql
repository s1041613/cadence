-- =====================================================================
-- CADENCE — the pomodoro estimate is a reference, not a ceiling
--
-- estimated_pomodoros is derived automatically from the slot length, so it
-- is a guess by construction. Enforcing completed <= estimated turned that
-- guess into a hard limit: a user in flow at the estimate could not record a
-- further pomodoro, and the count physically could not exceed it.
--
-- Overrunning the estimate is now treated the way overrunning the slot's end
-- time already is — surfaced as information (the counter reads 4/3), never
-- blocked. Dropping the constraint is what makes that persistable; the three
-- front-end clamps are removed alongside it in the same change.
--
-- nonnegative_pomodoros is deliberately kept: a negative count is a bug, not
-- a user's choice.
-- =====================================================================

alter table events
  drop constraint if exists completed_pomodoros_within_estimate;

comment on column events.completed_pomodoros is
  'Completed focus sessions for a task. Meaningful for type=task. May exceed estimated_pomodoros: the estimate is a reference derived from the slot length, not a limit.';
