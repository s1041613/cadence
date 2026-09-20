-- =====================================================================
-- CADENCE — track when an event's time was changed after the fact
--
-- Records the moment an event's date/start was last changed from what was previously saved
-- (e.g. adjusting a 09:30 breakfast to when it actually happened). Set by the client
-- (tasks-store.saveTask), which is the only place that has both the previous and the incoming
-- row to compare; a save that doesn't move the date/start leaves this untouched.
-- =====================================================================

alter table events add column time_edited_at timestamptz;

comment on column events.time_edited_at is
  'Set whenever the start date/time is changed from what was previously stored. Null means the time has never been adjusted since creation.';
