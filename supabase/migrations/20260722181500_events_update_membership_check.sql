-- Tighten the events UPDATE policy to match the INSERT policy's membership requirement.
--
-- Before: "owner edits event" only checked owner_id = auth.uid(), so an event owner could UPDATE
-- their event's calendar_id to any known calendar uuid — including calendars they are not a
-- member of (writing rows into other people's calendars). INSERT already requires
-- is_member(calendar_id); UPDATE must keep the row inside a member calendar too.
drop policy "owner edits event" on events;
create policy "owner edits event" on events
for update using (owner_id = auth.uid())
with check (owner_id = auth.uid() and is_member(calendar_id));
