-- =====================================================================
-- CADENCE — per-event "show in month view" toggle
-- =====================================================================

alter table events
  add column show_in_month boolean not null default true;

comment on column events.show_in_month is 'Per-event: whether it appears on the month grid. Meaningful for type=event only — the event still shows on the day timeline when false, it is only hidden from the month view. Ignored (always true) for type=task.';
