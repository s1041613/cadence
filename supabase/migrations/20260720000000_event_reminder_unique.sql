-- =====================================================================
-- CADENCE — event_reminders unique(event_id)
-- The client persists a single reminder value per event. Enforcing at
-- most one reminder row per event lets writes use upsert (on_conflict
-- event_id) instead of delete-then-insert, shrinking the race surface.
-- =====================================================================

alter table event_reminders
  add constraint event_reminders_event_id_unique unique (event_id);

comment on constraint event_reminders_event_id_unique on event_reminders is
  'Single-reminder model: at most one reminder row per event so client writes can upsert on event_id.';
