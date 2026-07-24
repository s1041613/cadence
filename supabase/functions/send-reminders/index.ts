// send-reminders — Cadence Web Push dispatcher.
//
// Invoked every minute by pg_cron (see migration). Finds event_reminders whose
// fire time has arrived and are not yet sent, pushes a Web Push notification to
// each of the event owner's subscribed devices, then stamps fired_at so the row
// is never re-sent.
//
// Auth: pg_cron passes a shared CRON_SECRET as a Bearer token. Deployed with
// --no-verify-jwt so this function's own check is the gate (a service-role key
// must never travel in a cron header).

import { createClient } from 'jsr:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  // Service role: bypass RLS to read every due reminder and every owner's subs.
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT')!, // e.g. 'mailto:y10135124@gmail.com'
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!
)

interface DueReminder {
  reminder_id: string
  event_id: string
  owner_id: string
  title: string
  starts_at: string
}

Deno.serve(async (req) => {
  // Fail closed if the secret is unset — otherwise the comparison target becomes
  // "Bearer undefined" and any caller sending that literal string would pass.
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (!cronSecret) {
    return new Response('server misconfigured', { status: 500 })
  }
  const auth = req.headers.get('authorization') ?? ''
  if (auth !== `Bearer ${cronSecret}`) {
    return new Response('unauthorized', { status: 401 })
  }

  const { data: due, error } = await supabase.rpc('due_reminders')
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    })
  }

  let sent = 0
  // Diagnostic counters returned in the response: `subsFound` distinguishes
  // "no device subscribed" from "send failed", and `errors` carries the real
  // web-push / query failure so a stuck `sent: 0` is debuggable from the caller.
  let subsFound = 0
  const errors: Array<{ statusCode: number | null; body: string | null; message: string }> = []
  for (const r of (due ?? []) as DueReminder[]) {
    const { data: subs, error: subsError } = await supabase
      .from('push_subscriptions')
      .select('id, payload')
      .eq('user_id', r.owner_id)
      .eq('type', 'webpush')

    // A failed subscription lookup (transient DB / PostREST error) must NOT stamp
    // fired_at — that would silently drop the reminder. Skip and let the next
    // cron tick retry this row.
    if (subsError) {
      errors.push({ statusCode: null, body: null, message: `subs query: ${subsError.message}` })
      continue
    }
    subsFound += subs?.length ?? 0

    const body = `即將開始：${new Date(r.starts_at).toLocaleString('zh-TW', {
      timeZone: 'Asia/Taipei',
      dateStyle: 'short',
      timeStyle: 'short'
    })}`
    const notification = JSON.stringify({
      title: r.title,
      body,
      url: 'v2/month',
      tag: r.event_id
    })

    for (const sub of subs ?? []) {
      try {
        await webpush.sendNotification(sub.payload, notification)
        sent++
      } catch (e) {
        // 410 Gone / 404: endpoint permanently dead — drop it. Leave transient
        // 5xx alone so a healthy device isn't purged over a blip.
        const err = e as { statusCode?: number; message?: string }
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id)
        }
        // Surface enough to debug a stuck sent:0, without echoing the provider's
        // raw response body back to the caller.
        errors.push({
          statusCode: err.statusCode ?? null,
          body: null,
          message: err.message ?? 'web-push send failed'
        })
      }
    }

    // Stamp fired_at so the row isn't rescanned. Check the error: a failed stamp
    // means the row stays unstamped and the next tick would RE-SEND — surface it
    // so the caller (and cron logs) see the double-send risk.
    const { error: stampError } = await supabase
      .from('event_reminders')
      .update({ fired_at: new Date().toISOString() })
      .eq('id', r.reminder_id)
    if (stampError) {
      errors.push({ statusCode: null, body: null, message: `stamp fired_at: ${stampError.message}` })
    }
  }

  return new Response(JSON.stringify({ due: due?.length ?? 0, sent, subsFound, errors }), {
    headers: { 'content-type': 'application/json' }
  })
})
