-- =====================================================================
-- CADENCE — user_settings
--
-- v2 renders a full-bleed photo behind a white scrim, and lets the user pick
-- which tabs sit in the bottom nav. All three preferences — the photo, the
-- scrim's opacity, and the tab list — lived only in Pinia refs, so a reload
-- dropped them and they never crossed devices. This migration gives them a
-- home.
--
-- WHY a dedicated table rather than columns on `profiles`:
-- profiles mirrors auth.users. It is populated by handle_new_user() from the
-- OAuth payload, and every column in it is identity, not preference. Settings
-- are a different thing with a different lifetime, and they will keep growing
-- (v1's settings-store already holds timeFormat, firstDay, monthEventLabel and
-- showPhoto with no table behind them). Those belong here later.
--
-- WHY one row per user, with user_id as the PRIMARY KEY:
-- Every column is a scalar preference with exactly one value. Making user_id
-- the PK lets Postgres enforce the single-row invariant instead of the client,
-- and makes the write a plain upsert with no id to mint client-side — unlike
-- notes and inbox_items, which are collections.
--
-- WHY the row is created lazily, with no signup trigger:
-- A user who never opens Customization has no row, and the client falls back to
-- its compiled-in defaults. A `select` on a missing row returns zero rows,
-- which the service maps to null — the same "no preference set" signal, with no
-- backfill for existing users and no trigger to keep in sync.
--
-- WHY this table has a real UPDATE policy, unlike notes and
-- dismissed_title_suggestions:
-- Those two are insert-or-delete by design, so their services use
-- `upsert(..., { ignoreDuplicates: true })` to take the ON CONFLICT DO NOTHING
-- path and avoid an UPDATE policy that does not exist. Here the opposite is
-- true: every save after the first IS an update of the same row, so the
-- ON CONFLICT DO UPDATE path is the point, and the policy below is exercised on
-- every write rather than being unverified attack surface.
--
-- Table-level grants to `authenticated` come from the default privileges set in
-- 20260721000000_grant_authenticated_table_access.sql, which also covers tables
-- created after it — so this migration issues no GRANT of its own.
-- =====================================================================

create table user_settings (
  -- PK *and* FK: one row per user, cascading away with the account. Points at
  -- profiles rather than auth.users to match the majority convention in this
  -- schema — see 20260816160000_notes_editable_and_profiles_fk.sql.
  user_id         uuid primary key references profiles(id) on delete cascade,

  -- Object path inside the `v2-backgrounds` bucket: '<uid>/<uuid>.<ext>'.
  -- Deliberately a path, not a URL. A full URL embeds the project ref, so it
  -- would have to be rewritten everywhere if the project ever moved; the client
  -- derives the public URL from this path instead. Same reasoning as
  -- month_photos.image_url and calendars.cover_url.
  --
  -- NULL is meaningful and distinct from "no row at all": no row means the user
  -- has never touched Customization, NULL means they explicitly reset back to
  -- the bundled default. Both render the same image today, but keeping them
  -- apart costs nothing and lets a future "no background at all" option exist
  -- without another migration.
  background_path text,

  -- 0 = photo fully visible, 1 = solid white. Clamped client-side too, but
  -- constrained here because an out-of-range value renders a calendar nobody
  -- can read, and there is no other writer to trust.
  scrim_opacity   real not null default 0.8,

  -- Bottom-nav tab keys, in display order. NULL means "use the defaults" —
  -- again distinct from an empty array, which would be a nav with no tabs.
  --
  -- Stored as a bare text[] with no CHECK constraint on the values on purpose.
  -- The legal set, the 2–4 count bounds and the mandatory 'setting' tab are all
  -- enforced by sanitizeShownKeys() in v2-tabs-store.ts, which every read path
  -- already passes through — it has to, because it also repairs state coming
  -- from an older client. Duplicating those rules here would mean two places to
  -- update whenever a tab is added, and the DB copy would reject rows the
  -- client is perfectly able to repair.
  shown_tab_keys  text[],

  updated_at      timestamptz not null default now(),

  constraint user_settings_scrim_opacity_range
    check (scrim_opacity >= 0 and scrim_opacity <= 1),

  -- A path must be a real path or absent. An empty string would produce a
  -- broken <img src> rather than falling back to the bundled default.
  constraint user_settings_background_path_not_blank
    check (background_path is null or length(btrim(background_path)) > 0)
);

alter table user_settings enable row level security;

-- Settings are private and unshared. There is no calendar column, so unlike
-- events there is nothing for a membership check to resolve through.
create policy "own settings readable" on user_settings
  for select using (user_id = auth.uid());

create policy "own settings insertable" on user_settings
  for insert with check (user_id = auth.uid());

-- Both `using` and `with check` are required. `using` picks which rows may be
-- updated; `with check` validates the row afterwards. Without the latter a
-- caller could reassign user_id to somebody else on the way through, handing
-- their own settings row to another account.
create policy "own settings updatable" on user_settings
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- No delete policy. Resetting the photo sets background_path to NULL rather
-- than removing the row, and no UI discards the whole preference set. An
-- unexercised policy is unverified attack surface (same reasoning as
-- 20260803140000_dismissed_title_suggestions.sql).

comment on table  user_settings                 is 'One row per user holding v2 appearance and navigation preferences. Created lazily on first save; absence of a row means "use the defaults".';
comment on column user_settings.user_id         is 'Owner (→ profiles, which mirrors auth.users). PK, so Postgres enforces one row per user. The only authorization column: RLS compares it to auth.uid().';
comment on column user_settings.background_path is 'Object path in the v2-backgrounds bucket (<uid>/<uuid>.<ext>), not a URL — the client derives the public URL. NULL means the user reset back to the bundled default.';
comment on column user_settings.scrim_opacity   is 'White scrim opacity over the background photo, 0–1. Higher is more washed out and more legible. Default 0.8 matches DEFAULT_SCRIM_OPACITY in v2-appearance-store.ts.';
comment on column user_settings.shown_tab_keys  is 'Bottom-nav tab keys in display order. NULL means defaults. Values are validated by sanitizeShownKeys() client-side, not by a CHECK here — see the column comment in the migration source for why.';
comment on column user_settings.updated_at      is 'Stamped by the client on every save. Last-write-wins across devices; there is no merge, because every column is a scalar the user set deliberately.';

-- =====================================================================
-- Storage: the v2-backgrounds bucket
--
-- WHY a new bucket rather than reusing month-photos:
-- month-photos is documented in 20260710051205_init.sql as '<uid>/<month>.jpg'
-- — per-month banner photos for the v1 month view. A whole-page v2 background
-- is a different object with a different lifetime, and mixing them means any
-- future "list this user's month photos" has to filter out a foreign object.
--
-- WHY public = true, when month-photos is private:
-- The four consumers are plain `<img :src>` bindings on the calendar shell
-- (MonthPageV2, WeekPageV2, DayPageV2 and the Customization preview). A private
-- bucket forces one of two costs. A signed URL expires — on a PWA that stays
-- open all day that means a refresh timer, a re-sign on tab focus, and an
-- offline failure path, all to keep a decorative image alive, with a broken
-- image on the main calendar when any of it fails. A blob + createObjectURL
-- dies on every reload, re-downloads the full image on cold start, and defeats
-- both HTTP and service-worker caching. Public costs nothing and keeps the
-- readers as they are.
--
-- The privacy tradeoff, stated plainly: a public bucket serves any object to
-- anyone who knows its key. It is NOT anonymously listable — `public` opens the
-- object GET path, not enumeration — so the exposure is "someone who has the
-- URL", not "someone who can crawl the bucket". Filenames are crypto.randomUUID()
-- under the owner's uid folder, so keys are not guessable. The residual risk is
-- URL leakage, which is proportionate for a wallpaper sitting behind an
-- 80%-white scrim. If this bucket ever holds genuinely sensitive imagery, this
-- decision must be revisited.
-- =====================================================================

insert into storage.buckets (id, name, public) values
  ('v2-backgrounds', 'v2-backgrounds', true)
on conflict (id) do nothing;

-- Public read is served by the bucket's `public` flag, so the <img> needs no
-- select policy. Writes still need explicit ownership: `public = true` opens
-- reads only, and without these policies any authenticated user could overwrite
-- anyone else's object. Same first-path-segment ownership pattern as
-- "own month uploads" in init.sql.
--
-- Split into three policies rather than one `for all`, because there is
-- deliberately no select policy here and `for all` would silently add one.
create policy "own v2 background insertable" on storage.objects
for insert with check (
  bucket_id = 'v2-backgrounds'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "own v2 background updatable" on storage.objects
for update using (
  bucket_id = 'v2-backgrounds'
  and (storage.foldername(name))[1] = auth.uid()::text
) with check (
  bucket_id = 'v2-backgrounds'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Delete is exercised, unlike on user_settings: replacing or resetting a photo
-- removes the previous object, so a user's folder does not accumulate every
-- wallpaper they ever tried.
create policy "own v2 background deletable" on storage.objects
for delete using (
  bucket_id = 'v2-backgrounds'
  and (storage.foldername(name))[1] = auth.uid()::text
);
