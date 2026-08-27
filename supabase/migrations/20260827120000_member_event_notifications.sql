-- =====================================================================
-- CADENCE — 共享日曆「成員新增事件」推播通知
--
-- 在此之前，唯一的推播來源是 event_reminders：事件快開始時通知「事件擁有者自己」。
-- 同一個共享日曆裡，別人新增事件時其他成員完全不會知道 —— 前端沒有 Realtime、
-- 沒有輪詢，成員 B 要看到成員 A 的新事件只能重新載入 App。
--
-- 這份 migration 補上缺口，沿用既有骨架（每分鐘 pg_cron → send-reminders Edge
-- Function → Web Push），不新增 cron job、不新增 Vault secret：
--
--   events INSERT
--     └─ AFTER INSERT trigger → 對「該日曆的其他成員」各寫一列 notification_outbox
--   既有的每分鐘 tick
--     └─ send-reminders 第二段 → pending_member_event_notifications() → 推播 → 回填 sent_at
--
-- WHY AFTER INSERT 就等於「新增」：
-- 前端一律走 PostgREST 的 .upsert()（events-service.ts 的 upsertTask / insertTasks），
-- 它編譯成 INSERT ... ON CONFLICT DO UPDATE。真正插入新列時只觸發 INSERT trigger，
-- 撞到 conflict 走 UPDATE 時只觸發 UPDATE trigger。所以 row-level AFTER INSERT 天生
-- 就是「這是一筆全新事件」的正確訊號，前端不必新增任何 isNew 參數。
-- events-service.ts 是全 repo 唯一寫入 events 的地方（沒有任何 SQL function 會 insert
-- events），所以這個 trigger 是完整且唯一的攔截點。
--
-- WHY 佇列表而不是從 trigger 直接發推播：
-- 推播需要 VAPID 簽章與對外 HTTPS，Postgres 做不到，所以一定要繞經 Edge Function。
-- 中間放一張 outbox 表，語意與 event_reminders.fired_at 一致：sent_at is null = 未送，
-- 送失敗就留著等下一 tick 重試，且事件被刪除時排隊中的通知會一起消失。
-- =====================================================================

-- ---- 1. 使用者偏好：帳號層級的獨立開關 -------------------------------
-- 與 Notifications 設定頁的「Event reminders」刻意不同源：那個開關的真相來源是
-- 「這台裝置」的瀏覽器訂閱（push-service.hasActiveSubscription），是 per-device 的；
-- 這一項是 per-account 的偏好，必須跨裝置同步，所以住在 user_settings。
alter table user_settings
  add column notify_on_member_events boolean not null default true;

comment on column user_settings.notify_on_member_events is
  'Whether to receive a push when another member adds an event to a shared calendar. Account-level (unlike the per-device Event reminders switch). No row at all means "never opened Settings" — readers coalesce to true, matching this default.';

-- 不需要動 RLS：20260816180000_user_settings.sql 的 select / insert / update policy
-- 都是列層級（user_id = auth.uid()），不分欄位。

-- ---- 2. 通知佇列 ------------------------------------------------------
create table notification_outbox (
  id            uuid primary key default gen_random_uuid(),
  recipient_id  uuid not null references profiles(id)  on delete cascade,
  kind          text not null default 'member_event_created',

  -- on delete cascade 是刻意的：事件在下一個 tick 之前就被刪掉時，排隊中的通知
  -- 跟著消失，不會為一個已不存在的事件發推播。
  event_id      uuid not null references events(id)    on delete cascade,
  calendar_id   uuid not null references calendars(id) on delete cascade,

  -- 快照欄位。通知內容在入列當下就定型，之後改標題或改日曆名稱不會讓已排隊的
  -- 通知變樣 —— 送出的是「當時發生了什麼」，不是「現在長什麼樣」。
  actor_name    text not null,
  calendar_name text not null,
  event_title   text not null,
  starts_at     timestamptz not null,
  all_day       boolean not null default false,

  created_at    timestamptz not null default now(),
  -- null = 尚未送出，與 event_reminders.fired_at 同義。
  sent_at       timestamptz
);

-- 部分索引：每分鐘的掃描只看得到未送出的列，已送出的歷史列不佔索引空間。
create index notification_outbox_pending_idx
  on notification_outbox (created_at) where sent_at is null;

comment on table  notification_outbox               is 'Queue of pending member-activity pushes. A row is written by the events AFTER INSERT trigger and drained by the send-reminders Edge Function on the existing per-minute cron tick.';
comment on column notification_outbox.recipient_id  is 'Who receives the push (→ profiles). One row per recipient; the creator is never a recipient of their own event.';
comment on column notification_outbox.kind          is 'Notification kind. Only member_event_created today; the column exists so a second kind does not need a second table.';
comment on column notification_outbox.event_id      is 'Source event (→ events). Cascades on delete so a deleted event cannot still be announced.';
comment on column notification_outbox.calendar_id   is 'Source calendar (→ calendars). Also the grouping key the dispatcher uses to collapse a bulk copy into one push.';
comment on column notification_outbox.actor_name    is 'Snapshot of the creator''s display name at enqueue time.';
comment on column notification_outbox.calendar_name is 'Snapshot of the calendar name at enqueue time.';
comment on column notification_outbox.event_title   is 'Snapshot of the event title at enqueue time.';
comment on column notification_outbox.starts_at     is 'Snapshot of the event start, rendered into the push body.';
comment on column notification_outbox.all_day       is 'Snapshot of the all-day flag; the body prints a date only when true.';
comment on column notification_outbox.sent_at       is 'When the push was dispatched; null = still queued (same contract as event_reminders.fired_at).';

alter table notification_outbox enable row level security;

-- 只讀自己的。沒有 insert / update / delete policy —— 寫入只有下面的 SECURITY DEFINER
-- trigger 做得到，回填 sent_at 只有 service_role 做得到（它繞過 RLS）。
create policy "read own notifications" on notification_outbox
  for select using (recipient_id = auth.uid());

-- service_role 繞過 RLS 不等於有 table GRANT（20260724230000 的教訓）。
-- Edge Function 只需要：讀待送列、回填 sent_at、清掉過舊的已送列。
grant select, update, delete on notification_outbox to service_role;

-- ---- 3. 扇出 trigger --------------------------------------------------
-- security definer 是必要的：要跨 RLS 讀「別人的」calendar_members / profiles /
-- user_settings，並寫進一張沒有 insert policy 的表。
--
-- WHY 在入列時就過濾偏好，而不是送出時：outbox 只留下真正要送的列，派送端不必
-- 再 join user_settings，也不會累積永遠不會送出的垃圾列。代價是「事後才打開開關」
-- 不會補送歷史通知 —— 這正是期望行為。
create function queue_member_event_notifications() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into notification_outbox (
    recipient_id, event_id, calendar_id,
    actor_name, calendar_name, event_title, starts_at, all_day
  )
  select m.user_id,
         new.id,
         new.calendar_id,
         -- display_name ?? email ?? 泛稱，對齊 calendars-service.fetchMembers() 的
         -- fallback 鏈；成員名冊本來就已經對同日曆成員顯示 email，這裡沒有擴大揭露。
         coalesce(p.display_name, p.email, '日曆成員'),
         c.name,
         new.title,
         new.starts_at,
         new.all_day
  from calendar_members m
  join calendars c          on c.id = new.calendar_id
  left join profiles p      on p.id = new.owner_id
  left join user_settings s on s.user_id = m.user_id
  where m.calendar_id = new.calendar_id
    -- 不通知建立者自己。個人日曆只有一個成員，這一條就讓它自然選不到任何列。
    and m.user_id <> new.owner_id
    -- 收件者已在設定裡停用這個日曆（不是 chip、任何檢視都不顯示）→ 不打擾。
    and m.enabled
    -- 沒有 user_settings 列 = 沒碰過設定 = 預設開，與欄位 default 一致。
    and coalesce(s.notify_on_member_events, true);

  return null; -- AFTER trigger 的回傳值會被忽略。
end $$;

-- 直接呼叫 trigger function 本來就會因為缺少 trigger context 而報錯，但這個 schema
-- 的慣例是每個 SECURITY DEFINER function 都收掉 PUBLIC 的預設 EXECUTE。
revoke all on function public.queue_member_event_notifications() from public;

create trigger events_notify_members
  after insert on events
  for each row execute function queue_member_event_notifications();

-- ---- 4. 供 Edge Function 讀取的 RPC ----------------------------------
-- 比照 due_reminders()：1 天下限避免停機後洪水、LIMIT 讓單一 tick 有上界、
-- security definer 讓 service role 讀得到，並收掉 PUBLIC 的預設 EXECUTE。
-- order by (recipient_id, calendar_id) 讓派送端可以一次線性掃過就分好組。
create function pending_member_event_notifications()
returns table (
  outbox_id     uuid,
  recipient_id  uuid,
  calendar_id   uuid,
  calendar_name text,
  actor_name    text,
  event_title   text,
  starts_at     timestamptz,
  all_day       boolean
)
language sql
security definer
set search_path = public
as $$
  select n.id, n.recipient_id, n.calendar_id, n.calendar_name,
         n.actor_name, n.event_title, n.starts_at, n.all_day
  from notification_outbox n
  where n.sent_at is null
    and n.created_at > now() - interval '1 day'
  order by n.recipient_id, n.calendar_id, n.created_at
  limit 500;
$$;

-- Postgres 預設把 EXECUTE 給 PUBLIC，只 revoke anon/authenticated 仍會留給其他角色 ——
-- 那等於洩漏每個人的待送通知（收件者、日曆名、事件標題）。先收 PUBLIC 再只給
-- service_role（Edge Function 的身分）。
revoke all on function public.pending_member_event_notifications() from public;
grant execute on function public.pending_member_event_notifications() to service_role;
