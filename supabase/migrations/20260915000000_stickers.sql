-- =====================================================================
-- CADENCE — stickers
--
-- Three tables, not one. sticker_assets is the library: an uploaded image,
-- owned by a user, uploaded once. day_stickers and month_stickers are
-- placements — an instance of a library sticker positioned on a specific
-- surface. The split exists because a placement is disposable (drag it off
-- a day, delete it, nothing else is lost) while an asset is the thing the
-- user actually spent an upload on; collapsing them into one row would mean
-- either re-uploading the same image for every placement or losing the
-- image the moment its only placement is removed.
--
-- day_stickers is keyed by an actual calendar date (like notes, like
-- events): a specific day, not a recurring one.
--
-- month_stickers is keyed by month 1-12 — deliberately NOT a specific
-- year-month. This mirrors month_photos exactly (see 20260710051205_init.sql):
-- "switching months has its own stickers" reads the same as "switching
-- months has its own background photo", which this codebase already
-- resolves as a per-calendar-month-of-year override, not a per-year one.
-- Resolution is analogous: stickersForMonth(m) = every month_stickers row
-- where month = m, regardless of which year is on screen.
--
-- Both placement tables store x/y/width as 0..1 fractions of the surface's
-- own box, not pixels — the surface renders at different sizes across phone
-- widths and orientations, and an absolute-pixel placement would drift off
-- the visible area on a narrower screen. height is deliberately absent:
-- resizing scales width only and the client derives height from the source
-- image's aspect ratio, so a sticker can never be squashed into a different
-- shape than the art it was uploaded as.
-- =====================================================================

create table sticker_assets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  storage_path text not null,
  created_at   timestamptz not null default now()
);

-- Every read is "this user's library, newest first" — the picker has no
-- other query shape. Mirrors notes_user_created_idx.
create index sticker_assets_user_created_idx on sticker_assets (user_id, created_at desc);

alter table sticker_assets enable row level security;

create policy "own sticker assets" on sticker_assets
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table day_stickers (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  date       date not null,
  -- Deleting the library asset removes every placement of it. There is no
  -- "orphaned sticker with no art" state to render around.
  sticker_id uuid not null references sticker_assets(id) on delete cascade,
  x          numeric not null check (x >= 0 and x <= 1),
  y          numeric not null check (y >= 0 and y <= 1),
  width      numeric not null check (width > 0 and width <= 1),
  rotation   numeric not null default 0,
  -- Stacking order among stickers on the same surface. Not globally unique;
  -- the client assigns max(existing)+1 on placement so the newest sticker
  -- lands on top.
  z_index    int not null default 0,
  created_at timestamptz not null default now()
);

create index day_stickers_user_date_idx on day_stickers (user_id, date);
create index day_stickers_sticker_idx on day_stickers (sticker_id);

alter table day_stickers enable row level security;

create policy "own day stickers" on day_stickers
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table month_stickers (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  month      int not null check (month between 1 and 12),
  sticker_id uuid not null references sticker_assets(id) on delete cascade,
  x          numeric not null check (x >= 0 and x <= 1),
  y          numeric not null check (y >= 0 and y <= 1),
  width      numeric not null check (width > 0 and width <= 1),
  rotation   numeric not null default 0,
  z_index    int not null default 0,
  created_at timestamptz not null default now()
);

create index month_stickers_user_month_idx on month_stickers (user_id, month);
create index month_stickers_sticker_idx on month_stickers (sticker_id);

alter table month_stickers enable row level security;

create policy "own month stickers" on month_stickers
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =====================================================================
-- Storage bucket
--   stickers   public   <uid>/<uuid>.png — the sticker library's own art.
--
-- public = true for the same reason as v2-backgrounds (20260816180000), not
-- month-photos: every consumer is a plain `<img :src>` on the day/month
-- surface, and a day or month can carry several stickers at once. A private
-- bucket means a signed URL per sticker, all expiring and needing refresh, for
-- decorative art. Object keys are crypto.randomUUID() under the owner's uid
-- folder, so — same tradeoff stated there — public exposes "someone who has
-- the URL", not "someone who can enumerate the bucket".
-- =====================================================================

insert into storage.buckets (id, name, public) values
  ('stickers', 'stickers', true)
on conflict (id) do nothing;

-- No select policy: public read is served by the bucket's own `public` flag.
-- Split into three (insert/update/delete) rather than `for all`, matching
-- "own v2 background *" — `for all` would silently add a select policy that
-- isn't wanted here.
create policy "own sticker uploads insertable" on storage.objects
for insert with check (
  bucket_id = 'stickers'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "own sticker uploads updatable" on storage.objects
for update using (
  bucket_id = 'stickers'
  and (storage.foldername(name))[1] = auth.uid()::text
) with check (
  bucket_id = 'stickers'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "own sticker uploads deletable" on storage.objects
for delete using (
  bucket_id = 'stickers'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- =====================================================================
-- Column / table documentation
-- =====================================================================

comment on table  sticker_assets            is 'A user''s uploaded sticker library. Uploaded once, placed many times via day_stickers/month_stickers.';
comment on column sticker_assets.id         is 'PK. Referenced by day_stickers.sticker_id and month_stickers.sticker_id.';
comment on column sticker_assets.user_id    is 'Owner (→ profiles). Cascades on delete. The only authorization column.';
comment on column sticker_assets.storage_path is 'Storage path in the stickers bucket (<uid>/<uuid>.png).';
comment on column sticker_assets.created_at is 'Row creation timestamp.';

comment on table  day_stickers            is 'Sticker placements on a specific calendar date (DayPageV2). x/y/width are 0..1 fractions of the day surface, not pixels.';
comment on column day_stickers.id         is 'PK.';
comment on column day_stickers.user_id    is 'Owner (→ profiles). Cascades on delete. RLS compares it to auth.uid().';
comment on column day_stickers.date       is 'The specific date this placement belongs to (not recurring).';
comment on column day_stickers.sticker_id is 'Library sticker being placed (→ sticker_assets). Cascades: deleting the library sticker removes this placement.';
comment on column day_stickers.x          is 'Left edge, 0..1 fraction of the day surface width.';
comment on column day_stickers.y          is 'Top edge, 0..1 fraction of the day surface height.';
comment on column day_stickers.width      is '0..1 fraction of the day surface width. Height is derived client-side from the sticker''s own aspect ratio — never stored, never squashed.';
comment on column day_stickers.rotation   is 'Degrees, applied around the sticker''s center.';
comment on column day_stickers.z_index    is 'Stacking order among this date''s stickers. Not globally unique.';
comment on column day_stickers.created_at is 'Row creation timestamp.';

comment on table  month_stickers            is 'Sticker placements on a calendar month (MonthPageV2). month is 1-12 and recurs every year, mirroring month_photos — not tied to one specific year.';
comment on column month_stickers.id         is 'PK.';
comment on column month_stickers.user_id    is 'Owner (→ profiles). Cascades on delete. RLS compares it to auth.uid().';
comment on column month_stickers.month      is 'Calendar month 1-12 (CHECK month between 1 and 12). Recurring: applies to that month in every year, like month_photos.month.';
comment on column month_stickers.sticker_id is 'Library sticker being placed (→ sticker_assets). Cascades: deleting the library sticker removes this placement.';
comment on column month_stickers.x          is 'Left edge, 0..1 fraction of the month surface width.';
comment on column month_stickers.y          is 'Top edge, 0..1 fraction of the month surface height.';
comment on column month_stickers.width      is '0..1 fraction of the month surface width. Height is derived client-side from the sticker''s own aspect ratio.';
comment on column month_stickers.rotation   is 'Degrees, applied around the sticker''s center.';
comment on column month_stickers.z_index    is 'Stacking order among this month''s stickers. Not globally unique.';
comment on column month_stickers.created_at is 'Row creation timestamp.';
