-- =====================================================================
-- CADENCE — track late time edits on events
--
-- Records when an event's date/time was changed after its previously scheduled
-- start had already passed (e.g. adjusting a 09:30 breakfast to when it actually
-- happened). Set by the client (tasks-store.saveTask); a plain edit that doesn't
-- move a passed start leaves this untouched.
-- =====================================================================

alter table events add column time_edited_at timestamptz;

comment on column events.time_edited_at is
  'Set when the start date/time was changed after the previously stored start had already passed. Null means the time has never been adjusted after the fact.';
