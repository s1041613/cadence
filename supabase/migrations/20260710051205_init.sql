-- =====================================================================
-- CADENCE — core schema + RLS   (first Supabase migration)
-- 貼進： supabase/migrations/<timestamp>_init.sql
-- =====================================================================

-- pgcrypto: gen_random_bytes (calendar_invites.token default) lives here, not in core PG
create extension if not exists pgcrypto;

-- ---- enums ----------------------------------------------------------
create type event_type  as enum ('task', 'event');
create type quadrant    as enum ('plan', 'do', 'quick', 'later');
create type member_role as enum ('owner', 'member');
create type push_type   as enum ('webpush', 'fcm', 'apns');

-- ---- profiles (mirror of auth.users) --------------------------------
create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email        text,
  avatar_url   text,
  created_at   timestamptz not null default now()
);

-- auto-create a profile row when a new auth user signs up (Google login)
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'full_name', new.email),
          new.raw_user_meta_data->>'avatar_url');
  return new;
end $$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---- calendars ------------------------------------------------------
create table calendars (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  purpose    text,                       -- 'family' | 'work' | 'personal' ...
  color      text,                       -- calendar accent
  cover_url  text,                       -- Supabase Storage 路徑（封面照）
  owner_id   uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ---- calendar_members (成員 + 每人的個人偏好) -----------------------
-- 成員頭像直接用 profiles.avatar_url（Google 大頭貼）；沒照片才 fallback 縮寫。
-- position / enabled / selected 都是「每位使用者自己的」偏好（per-user）：
--   position  個人排序 (Arrange)
--   enabled   設定頁「啟用」開關：false = 不是 chip、任何檢視都不顯示
--   selected  chip 選取狀態：啟用中的日曆現在要不要顯示在格子上（另一份資料）
create table calendar_members (
  calendar_id  uuid not null references calendars(id) on delete cascade,
  user_id      uuid not null references profiles(id)  on delete cascade,
  role         member_role not null default 'member',
  position     int  not null default 0,
  enabled      boolean not null default true,
  selected     boolean not null default true,
  joined_at    timestamptz not null default now(),
  primary key (calendar_id, user_id)
);
create index calendar_members_user_idx on calendar_members (user_id);

-- ---- events ---------------------------------------------------------
create table events (
  id          uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references calendars(id) on delete cascade,
  owner_id    uuid not null references profiles(id),  -- 建立者 = 負責人
  type        event_type not null,
  title       text not null,
  quadrant    quadrant,                  -- task 才有；event 為 null
  color       text,                      -- event: 自訂色；task: 帶象限色
  icon        text,                      -- event 才有
  all_day     boolean not null default false,
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  location    text,
  notes       text,
  repeat_rule text,                      -- RRULE 字串，先存、展開留 v2
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  -- 設計裡定的規則：
  constraint task_has_no_allday check (not (type = 'task' and all_day)),   -- task 不能 all-day
  constraint task_has_quadrant  check (type = 'event' or quadrant is not null),
  constraint end_after_start    check (all_day or ends_at > starts_at)     -- 結束 > 開始
);
create index events_calendar_time_idx on events (calendar_id, starts_at);
create index events_owner_time_idx    on events (owner_id, starts_at);

-- ---- calendar invites (QR / 連結邀請) -------------------------------
create table calendar_invites (
  id          uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references calendars(id) on delete cascade,
  token       text not null unique default encode(gen_random_bytes(16), 'hex'),
  created_by  uuid not null references profiles(id),
  expires_at  timestamptz,
  created_at  timestamptz not null default now()
);

-- ---- push subscriptions (通用：先 web-push，之後原生 fcm/apns) ------
create table push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  type       push_type not null default 'webpush',
  payload    jsonb not null,             -- web-push subscription 或裝置 token
  created_at timestamptz not null default now(),
  unique (user_id, payload)
);

-- ---- event reminders (驅動後端排程推播) -----------------------------
create table event_reminders (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null references events(id) on delete cascade,
  minutes_before int  not null default 10,
  fired_at       timestamptz               -- null = 尚未送出
);

-- ---- month photos（每位使用者的 1–12 月照片覆寫；沒設就用系統預設）--
-- 解析邏輯（前端）：photoForMonth(m) = 使用者覆寫 ?? 系統預設 month-defaults/<m>.jpg
create table month_photos (
  user_id    uuid not null references profiles(id) on delete cascade,
  month      int  not null check (month between 1 and 12),
  image_url  text not null,            -- Storage 路徑（month-photos bucket）
  updated_at timestamptz not null default now(),
  primary key (user_id, month)
);
alter table month_photos enable row level security;
create policy "own month photos" on month_photos
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =====================================================================
-- Row Level Security
-- =====================================================================

-- helper：目前使用者是不是這個日曆的成員？
-- SECURITY DEFINER 繞過 RLS，避免 members 自我參照造成無限遞迴。
create function is_member(cal uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from calendar_members
    where calendar_id = cal and user_id = auth.uid()
  );
$$;

alter table profiles           enable row level security;
alter table calendars          enable row level security;
alter table calendar_members   enable row level security;
alter table events             enable row level security;
alter table calendar_invites   enable row level security;
alter table push_subscriptions enable row level security;
alter table event_reminders    enable row level security;

-- profiles：讀自己 + 任何和你同一個日曆的人
create policy "profiles readable to co-members" on profiles
for select using (
  id = auth.uid() or exists (
    select 1 from calendar_members m1
    join calendar_members m2 on m1.calendar_id = m2.calendar_id
    where m1.user_id = auth.uid() and m2.user_id = profiles.id
  )
);
create policy "update own profile" on profiles
for update using (id = auth.uid());

-- calendars：成員可讀；登入者可建立（成為 owner）；owner 可改/刪
create policy "members read calendars" on calendars
for select using (is_member(id) or owner_id = auth.uid());
create policy "create calendar" on calendars
for insert with check (owner_id = auth.uid());
create policy "owner updates calendar" on calendars
for update using (owner_id = auth.uid());
create policy "owner deletes calendar" on calendars
for delete using (owner_id = auth.uid());

-- calendar_members：同日曆成員可看名冊；owner 加人；自己可退出
create policy "members read roster" on calendar_members
for select using (is_member(calendar_id));
-- 只有 owner 能直接加人；自助加入一律走 accept_invite()（SECURITY DEFINER RPC，
-- 會驗 token + 未過期）。不開 `or user_id = auth.uid()`，否則任何登入者可繞過
-- 邀請 token，直接把自己 insert 進任意已知 calendar_id。
create policy "owner adds members" on calendar_members
for insert with check (
  exists (select 1 from calendars c where c.id = calendar_id and c.owner_id = auth.uid())
);
create policy "leave or owner removes" on calendar_members
for delete using (
  user_id = auth.uid()
  or exists (select 1 from calendars c where c.id = calendar_id and c.owner_id = auth.uid())
);

-- events：日曆成員都能「讀」（Month 要顯示別人的 chip + 頭像）；
--         只有「owner」能 建立/修改/刪除（隱私 + 別人的唯讀）
create policy "members read events" on events
for select using (is_member(calendar_id));
create policy "member creates own event" on events
for insert with check (is_member(calendar_id) and owner_id = auth.uid());
create policy "owner edits event" on events
for update using (owner_id = auth.uid());
create policy "owner deletes event" on events
for delete using (owner_id = auth.uid());

-- invites：只有 owner 可建立/管理邀請；接受邀請走下面的 RPC（SECURITY DEFINER，
--          受邀者不需要 SELECT 權限）
create policy "owner reads invites" on calendar_invites
for select using (
  exists (select 1 from calendars c where c.id = calendar_id and c.owner_id = auth.uid())
);
create policy "owner creates invites" on calendar_invites
for insert with check (
  exists (select 1 from calendars c where c.id = calendar_id and c.owner_id = auth.uid())
);
create policy "owner deletes invites" on calendar_invites
for delete using (
  exists (select 1 from calendars c where c.id = calendar_id and c.owner_id = auth.uid())
);

-- push subscriptions：只能碰自己的
create policy "own subscriptions" on push_subscriptions
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- reminders：擁有父事件才可讀寫
create policy "reminders on own events" on event_reminders
for all using (
  exists (select 1 from events e where e.id = event_id and e.owner_id = auth.uid())
) with check (
  exists (select 1 from events e where e.id = event_id and e.owner_id = auth.uid())
);

-- ---- 接受邀請 RPC（尚非成員也能靠 token 加入）----------------------
create function accept_invite(invite_token text) returns uuid
language plpgsql security definer set search_path = public as $$
declare inv calendar_invites;
begin
  select * into inv from calendar_invites
  where token = invite_token and (expires_at is null or expires_at > now());
  if not found then raise exception 'invalid or expired invite'; end if;
  insert into calendar_members (calendar_id, user_id, role)
  values (inv.calendar_id, auth.uid(), 'member')
  on conflict do nothing;
  return inv.calendar_id;
end $$;

-- ---- 個人偏好寫入（排序 / 啟用）------------------------------------
-- 用 RPC 而非開放 UPDATE 政策：只允許改自己的 position / enabled / selected，
-- 不會誤讓使用者改到 role 等其他欄位。

-- 依前端傳入的日曆 id 順序，重設本人的排序 (Arrange 拖曳後呼叫一次)
create function reorder_calendars(ordered uuid[]) returns void
language plpgsql security definer set search_path = public as $$
declare i int;
begin
  for i in 1 .. coalesce(array_length(ordered, 1), 0) loop
    update calendar_members set position = i
    where user_id = auth.uid() and calendar_id = ordered[i];
  end loop;
end $$;

-- 設定頁：切換本人某日曆的「啟用」(enabled)
create function set_calendar_enabled(cal uuid, en boolean) returns void
language sql security definer set search_path = public as $$
  update calendar_members set enabled = en
  where user_id = auth.uid() and calendar_id = cal;
$$;

-- Month chip：切換本人某日曆的「選取」(selected，是否顯示在格子上)
create function set_calendar_selected(cal uuid, sel boolean) returns void
language sql security definer set search_path = public as $$
  update calendar_members set selected = sel
  where user_id = auth.uid() and calendar_id = cal;
$$;

-- =====================================================================
-- Storage buckets（照片）— 在 Supabase Dashboard/CLI 建立這三個 bucket：
--   month-defaults   public 讀   系統預設 1–12 月照片：01.jpg .. 12.jpg（你自己 seed）
--   month-photos     private     使用者自傳月照片：<uid>/<month>.jpg
--   calendar-covers  成員可讀     日曆封面：<calendar_id>.jpg
-- 下面是 storage.objects 的 RLS（路徑第一層資料夾當作擁有權）
-- =====================================================================

-- 使用者只能碰「自己 uid 資料夾」底下的月照片
-- create the three storage buckets BEFORE their RLS policies (policies are inert
-- without existing buckets; must live in the migration so `supabase db push` reproduces
-- them on cloud, where seed.sql does not run).
insert into storage.buckets (id, name, public) values
  ('month-defaults',  'month-defaults',  true),
  ('month-photos',    'month-photos',    false),
  ('calendar-covers', 'calendar-covers', false)
on conflict (id) do nothing;

create policy "own month uploads" on storage.objects
for all using (
  bucket_id = 'month-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
) with check (
  bucket_id = 'month-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- 系統預設月照片：所有人可讀
create policy "read month defaults" on storage.objects
for select using (bucket_id = 'month-defaults');

-- 日曆封面：同日曆成員可讀，owner 可寫（檔名 = <calendar_id>.jpg）
create policy "members read covers" on storage.objects
for select using (
  bucket_id = 'calendar-covers'
  and is_member(split_part(name, '.', 1)::uuid)
);
create policy "owner writes cover" on storage.objects
for insert with check (
  bucket_id = 'calendar-covers'
  and exists (
    select 1 from calendars c
    where c.id = split_part(name, '.', 1)::uuid and c.owner_id = auth.uid()
  )
);

-- =====================================================================
-- Column / table documentation (visible in Studio, psql \d+, any tool)
-- =====================================================================

-- profiles
comment on table  profiles              is 'Mirror of auth.users; one row per signed-up user, auto-created by handle_new_user() on Google sign-up.';
comment on column profiles.id           is 'PK; equals auth.users.id (Google identity). Deletes cascade from auth.users.';
comment on column profiles.display_name is 'Shown name; seeded from Google full_name, falls back to email.';
comment on column profiles.email        is 'User email from the identity provider.';
comment on column profiles.avatar_url   is 'Google profile photo URL; member avatars come straight from here (no member_color stored).';
comment on column profiles.created_at   is 'Row creation timestamp.';

-- calendars
comment on table  calendars            is 'A calendar. Shared = many calendar_members; personal = a calendar with a single member. Same table for both — the difference is only whether more people were invited.';
comment on column calendars.id         is 'PK.';
comment on column calendars.name       is 'Calendar display name.';
comment on column calendars.purpose    is 'Free-form category, e.g. family | work | personal.';
comment on column calendars.color      is 'Calendar accent color.';
comment on column calendars.cover_url  is 'Supabase Storage path for the cover photo (calendar-covers bucket, <calendar_id>.jpg).';
comment on column calendars.owner_id   is 'Creator / owner (→ profiles). Only the owner can edit the calendar, invite, and edit events.';
comment on column calendars.created_at is 'Row creation timestamp.';

-- calendar_members (membership + per-user preferences)
comment on table  calendar_members             is 'Calendar membership plus each member''s own preferences. position/enabled/selected are all per-user, written only via SECURITY DEFINER RPCs (never a broad UPDATE) to avoid clobbering role.';
comment on column calendar_members.calendar_id is 'Part of PK (→ calendars).';
comment on column calendar_members.user_id     is 'Part of PK (→ profiles). The member.';
comment on column calendar_members.role         is 'owner | member. Owner has invite/edit rights.';
comment on column calendar_members.position     is 'Per-user ordering (Arrange). Set via reorder_calendars().';
comment on column calendar_members.enabled      is 'Per-user "is this calendar on the shelf". false = not a chip and hidden in every view (still listed in Settings). Set via set_calendar_enabled().';
comment on column calendar_members.selected     is 'Per-user chip selection: among enabled calendars, whether it currently shows in the grid. Set via set_calendar_selected().';
comment on column calendar_members.joined_at    is 'When this user joined the calendar.';

-- calendar_invites (link / QR token, TimeTree-style)
comment on table  calendar_invites             is 'Link/QR invites. Not bound to an email; anyone holding a valid, unexpired token can join via accept_invite(). Only the owner can create/manage invites.';
comment on column calendar_invites.id          is 'PK.';
comment on column calendar_invites.calendar_id is 'Target calendar (→ calendars).';
comment on column calendar_invites.token       is 'Random join token (gen_random_bytes, hex). Surfaced as /join/<token>. Needs pgcrypto.';
comment on column calendar_invites.created_by  is 'Owner who created the invite (→ profiles).';
comment on column calendar_invites.expires_at  is 'Optional expiry; null = never. No revoke/max-uses by design (kept simple).';
comment on column calendar_invites.created_at  is 'Row creation timestamp.';

-- events (task = has quadrant; event = no quadrant)
comment on table  events             is 'Calendar entries. type=task carries a quadrant and cannot be all-day; type=event has no quadrant and may be all-day. Members can read; only the owner can create/edit/delete.';
comment on column events.id          is 'PK.';
comment on column events.calendar_id is 'Owning calendar (→ calendars).';
comment on column events.owner_id    is 'Creator = responsible person (→ profiles). Others'' events are read-only.';
comment on column events.type        is 'task | event. The core discriminant; drives quadrant and all-day rules (see CHECK constraints).';
comment on column events.title       is 'Entry title.';
comment on column events.quadrant    is 'Eisenhower quadrant for tasks: do | plan | quick | later. NULL for events (enforced by task_has_quadrant).';
comment on column events.color       is 'Event: custom color (decoupled from quadrant palette). Task: derived quadrant color.';
comment on column events.icon        is 'Event icon (events only).';
comment on column events.all_day     is 'All-day flag. Must be false for tasks (task_has_no_allday).';
comment on column events.starts_at   is 'Start time (UTC). Time axis in UI is 06:00–23:00.';
comment on column events.ends_at     is 'End time (UTC). Must be > starts_at unless all_day (end_after_start).';
comment on column events.location    is 'Free-form location.';
comment on column events.notes       is 'Free-form notes.';
comment on column events.repeat_rule is 'RRULE string, stored only; expansion is deferred to v2.';
comment on column events.created_at  is 'Row creation timestamp.';
comment on column events.updated_at  is 'Last update timestamp.';

-- event_reminders (drives server-scheduled push)
comment on table  event_reminders                is 'Reminders that pg_cron scans to send Web Push. A row is due when its time arrives and fired_at is still null.';
comment on column event_reminders.id             is 'PK.';
comment on column event_reminders.event_id       is 'Parent event (→ events). Only the event owner can read/write its reminders.';
comment on column event_reminders.minutes_before is 'Lead time before the event start to fire the reminder.';
comment on column event_reminders.fired_at       is 'When the push was sent; null = not yet fired.';

-- push_subscriptions (transport-agnostic: webpush now, fcm/apns later)
comment on table  push_subscriptions            is 'Push endpoints per user. type routes web-push vs native; one table/function serves both to keep the native (Capacitor) seam cheap.';
comment on column push_subscriptions.id         is 'PK.';
comment on column push_subscriptions.user_id    is 'Owner (→ profiles). Users can only touch their own.';
comment on column push_subscriptions.type       is 'webpush | fcm | apns. Splits transport; PWA uses webpush today.';
comment on column push_subscriptions.payload    is 'web-push subscription JSON or native device token.';
comment on column push_subscriptions.created_at is 'Row creation timestamp.';

-- month_photos (per-user 1–12 overrides of the system defaults)
comment on table  month_photos            is 'Per-user month photo overrides (personal-level decoration, not tied to one calendar). Resolution: photoForMonth(m) = user override ?? month-defaults/<m>.jpg.';
comment on column month_photos.user_id    is 'Part of PK (→ profiles). Owner of the override.';
comment on column month_photos.month      is 'Part of PK. Calendar month 1–12 (CHECK month between 1 and 12).';
comment on column month_photos.image_url  is 'Storage path in the month-photos bucket (<uid>/<month>.jpg).';
comment on column month_photos.updated_at is 'Last update timestamp.';
