-- ============================================================================
-- Cadence Web Push — 一次性設定：把 cron 要用的 URL + 密語存進 Supabase Vault，
-- 並用 Vault-based command 重建每分鐘的 cron job。
--
-- 執行方式：Supabase Dashboard → SQL Editor → 貼上整段 → RUN。
-- ⚠️ 執行前：把下方 <貼上你的_CRON_SECRET> 換成真實 CRON_SECRET。
--    真實密語只會進你自己的 SQL Editor，不進 git、不經任何外部服務。
-- ============================================================================

-- 1) 寫入 / 更新 Vault 兩個 secret（URL 不機密、密語機密，都存 Vault 統一管理）。
do $script$
declare
  url_id uuid;
  sec_id uuid;
begin
  select id into url_id from vault.decrypted_secrets
    where name = 'send_reminders_edge_function_url' order by created_at desc limit 1;
  if url_id is null then
    perform vault.create_secret(
      'https://ycelwehlimmirgftfyzu.supabase.co/functions/v1/send-reminders',
      'send_reminders_edge_function_url',
      'Full URL for the send-reminders Edge Function');
  else
    perform vault.update_secret(url_id,
      'https://ycelwehlimmirgftfyzu.supabase.co/functions/v1/send-reminders',
      'send_reminders_edge_function_url',
      'Full URL for the send-reminders Edge Function');
  end if;

  select id into sec_id from vault.decrypted_secrets
    where name = 'send_reminders_cron_secret' order by created_at desc limit 1;
  if sec_id is null then
    perform vault.create_secret(
      '<貼上你的_CRON_SECRET>',
      'send_reminders_cron_secret',
      'Shared bearer secret for the send-reminders cron caller');
  else
    perform vault.update_secret(sec_id,
      '<貼上你的_CRON_SECRET>',
      'send_reminders_cron_secret',
      'Shared bearer secret for the send-reminders cron caller');
  end if;
end
$script$;

-- 2) 移除舊 job（若存在；名稱相同會被下方重建取代）。
do $script$
declare
  old_id bigint;
begin
  select jobid into old_id from cron.job
    where jobname = 'send-reminders-every-minute' limit 1;
  if old_id is not null then
    perform cron.unschedule(old_id);
  end if;
end
$script$;

-- 3) 重建 cron job：每分鐘打 Edge Function，URL 與 Bearer 從 Vault 讀（cron.job 表不留明文）。
select cron.schedule(
  'send-reminders-every-minute',
  '* * * * *',
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
    body := '{}'::jsonb,
    timeout_milliseconds := 5000
  );
  $cron$
);

-- 4)（可選）確認 job 建好：
-- select jobname, schedule, active from cron.job where jobname = 'send-reminders-every-minute';
