-- =====================================================================
-- CADENCE — 每晚 23:00 未完成提醒
--
-- 每天晚上 11 點（Asia/Taipei）檢查每位使用者「今天還沒做完的」：
--   * day_todos：done = false 且 date <= 今天。carry-over 是前端在開 App 時才做的
--     （stores/day-todos-store.ts），沒開 App 的那幾天，舊的未完成 todo 還停在過去的
--     date 上 —— 它們其實就是今天清單上的東西，所以用 <= 而不是 =。
--   * 任務（events.type = 'task'）：done = false、日期就是今天、是自己的、所在日曆沒被
--     自己停用。與前端 use-unfinished.ts 的條件對齊（只算自己的、隱藏日曆不算）。
--     刻意「只算今天」：更早的逾期任務已經有 Day 頁的 overdue sheet，若也算進來，
--     一個長期擱置的 backlog 會讓這則通知每晚都響、而且永遠不會歸零。
-- 兩者都是 0 的人不推播 —— 這則通知只在真的有東西沒做完時出現。
--
-- 沿用既有骨架（pg_cron → pg_net → send-reminders Edge Function → Web Push），
-- 同一個 Edge Function、同一組 Vault secret，只多一個 cron job，body 帶
-- {"job":"nightly_unfinished"} 讓 function 分流。不另開 function：第二個 function
-- 要另一組部署與 Vault entry，換不到任何東西。
-- =====================================================================

-- ---- 1. 使用者偏好 ---------------------------------------------------
-- 帳號層級（跨裝置同步），與 notify_on_member_events 同理，見 20260827120000。
alter table user_settings
  add column notify_nightly_unfinished boolean not null default true;

comment on column user_settings.notify_nightly_unfinished is
  'Whether to receive the 23:00 (Asia/Taipei) push listing what is still open today. Account-level. No row at all means "never opened Settings" — readers coalesce to true, matching this default.';

-- ---- 2. 供 Edge Function 讀取的 RPC ----------------------------------
-- 「今天」以 Asia/Taipei 為準，與 notifications.ts 的 formatWhen 同一個假設。
-- 任務日期的換算對齊 events-mapper.ts 的 decodeInterval：all-day 以 UTC 午夜編碼，
-- 取 UTC 日期；有時間的任務取它在台北的日期。
--
-- 每人回傳一列：兩個計數 + 各自最前面幾個標題（給通知內文用，不必整串傳回）。
create function nightly_unfinished_digest()
returns table (
  user_id     uuid,
  todo_count  int,
  task_count  int,
  todo_titles text[],
  task_titles text[]
)
language sql
security definer
set search_path = public
as $$
  with today as (
    select (now() at time zone 'Asia/Taipei')::date as d
  ),
  todos as (
    select t.user_id,
           count(*)::int as n,
           (array_agg(t.title order by t.date, t.position, t.created_at))[1:3] as titles
    from day_todos t, today
    where not t.done
      and t.date <= today.d
    group by t.user_id
  ),
  tasks as (
    select e.owner_id as user_id,
           count(*)::int as n,
           (array_agg(e.title order by e.starts_at))[1:3] as titles
    from events e
    cross join today
    join calendar_members m
      on m.calendar_id = e.calendar_id and m.user_id = e.owner_id
    where e.type = 'task'
      and not e.done
      and m.enabled
      and case when e.all_day
               then (e.starts_at at time zone 'UTC')::date
               else (e.starts_at at time zone 'Asia/Taipei')::date
          end = today.d
    group by e.owner_id
  )
  select coalesce(td.user_id, tk.user_id),
         coalesce(td.n, 0),
         coalesce(tk.n, 0),
         coalesce(td.titles, '{}'),
         coalesce(tk.titles, '{}')
  from todos td
  full join tasks tk on tk.user_id = td.user_id
  left join user_settings s on s.user_id = coalesce(td.user_id, tk.user_id)
  -- 沒有 user_settings 列 = 沒碰過設定 = 預設開，與欄位 default 一致。
  where coalesce(s.notify_nightly_unfinished, true);
$$;

-- 與 due_reminders() 同理：先收 PUBLIC 的預設 EXECUTE，只給 service_role，
-- 否則等於讓任何角色讀到每個人的 todo 標題。
revoke all on function public.nightly_unfinished_digest() from public;
grant execute on function public.nightly_unfinished_digest() to service_role;

-- ---- 3. 排程 ---------------------------------------------------------
-- pg_cron 以 UTC 計時：23:00 Asia/Taipei（UTC+8，無夏令時間）= 15:00 UTC。
-- URL 與密語從 Vault 讀，與 send-reminders-every-minute 共用同兩個 entry，
-- 所以這份 migration 不需要任何一次性設定。
select cron.schedule(
  'nightly-unfinished-2300-taipei',
  '0 15 * * *',
  $cron$
  select net.http_post(
    url := (
      select decrypted_secret from vault.decrypted_secrets
      where name = 'send_reminders_edge_function_url'
      order by created_at desc limit 1
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets
        where name = 'send_reminders_cron_secret'
        order by created_at desc limit 1
      )
    ),
    body := '{"job":"nightly_unfinished"}'::jsonb,
    -- 一次掃全部使用者，比每分鐘那一輪久；給它多一點時間。
    timeout_milliseconds := 30000
  );
  $cron$
);
