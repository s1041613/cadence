// send-reminders — Cadence Web Push dispatcher.
//
// Invoked every minute by pg_cron (see migration). Dispatches TWO kinds of push
// on the same tick, deliberately in one function rather than two: a second
// function would need its own cron job and its own Vault entries for no gain.
//
//   1. Event reminders — event_reminders rows whose fire time has arrived and
//      are not yet sent, pushed to the event OWNER's own devices, then stamped
//      with fired_at so the row is never re-sent.
//   2. Member activity — notification_outbox rows written by the events
//      AFTER INSERT trigger when someone adds an event to a shared calendar,
//      pushed to the OTHER members, then stamped with sent_at.
//
// Auth: pg_cron passes a shared CRON_SECRET as a Bearer token. Deployed with
// --no-verify-jwt so this function's own check is the gate (a service-role key
// must never travel in a cron header).

import { createClient } from 'jsr:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3'
import {
  formatWhen,
  groupByRecipientCalendar,
  memberActivityPush,
  type PendingNotification
} from './notifications.ts'

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

type PushError = { statusCode: number | null; body: string | null; message: string }

/**
 * Sends one notification to every device a user has subscribed.
 *
 * `ok: false` means the subscription lookup itself failed — a transient DB /
 * PostgREST error, NOT "nothing to send". Callers must leave the source row
 * unstamped in that case so the next cron tick retries it; a user with zero
 * subscriptions still returns ok (there was simply nothing to deliver).
 */
async function deliver(
  userId: string,
  notification: string,
  errors: PushError[]
): Promise<{ ok: boolean; sent: number; subsFound: number }> {
  const { data: subs, error: subsError } = await supabase
    .from('push_subscriptions')
    .select('id, payload')
    .eq('user_id', userId)
    .eq('type', 'webpush')

  if (subsError) {
    errors.push({ statusCode: null, body: null, message: `subs query: ${subsError.message}` })
    return { ok: false, sent: 0, subsFound: 0 }
  }

  let sent = 0
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

  return { ok: true, sent, subsFound: subs?.length ?? 0 }
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
  const errors: PushError[] = []

  // ---- Phase 1: event reminders (to the event's own owner) -----------------
  for (const r of (due ?? []) as DueReminder[]) {
    const notification = JSON.stringify({
      title: r.title,
      body: `即將開始：${formatWhen(r.starts_at)}`,
      url: 'v2/month',
      tag: r.event_id
    })

    // A failed subscription lookup must NOT stamp fired_at — that would silently
    // drop the reminder. Skip and let the next cron tick retry this row.
    const result = await deliver(r.owner_id, notification, errors)
    if (!result.ok) continue
    sent += result.sent
    subsFound += result.subsFound

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

  // ---- Phase 2: member activity (to a shared calendar's other members) -----
  //
  // Enqueued by the events AFTER INSERT trigger, which has already applied every
  // filter that needs user context (not the creator, calendar not disabled by the
  // recipient, recipient's notify_on_member_events preference). Everything left
  // in the outbox is meant to be sent.
  const { data: pending, error: pendingError } = await supabase.rpc(
    'pending_member_event_notifications'
  )
  if (pendingError) {
    errors.push({ statusCode: null, body: null, message: `pending query: ${pendingError.message}` })
  }

  const queued = (pending ?? []) as PendingNotification[]
  const groups = groupByRecipientCalendar(queued)

  let notified = 0
  for (const group of groups) {
    const first = group[0]!
    const notification = JSON.stringify(memberActivityPush(group))

    const result = await deliver(first.recipient_id, notification, errors)
    // Same contract as phase 1: a failed lookup leaves the rows unstamped for
    // the next tick. A recipient with no subscribed device still gets stamped —
    // there is nothing to deliver, and leaving it would rescan the row forever.
    if (!result.ok) continue
    notified += result.sent
    subsFound += result.subsFound

    const { error: stampError } = await supabase
      .from('notification_outbox')
      .update({ sent_at: new Date().toISOString() })
      .in(
        'id',
        group.map((n) => n.outbox_id)
      )
    if (stampError) {
      errors.push({ statusCode: null, body: null, message: `stamp sent_at: ${stampError.message}` })
    }
  }

  // Housekeeping: the outbox is append-only otherwise, so drop rows that were
  // delivered long enough ago that nobody will ever look at them again.
  const pruneBefore = new Date(Date.now() - 7 * 24 * 60 * 60_000).toISOString()
  const { error: pruneError } = await supabase
    .from('notification_outbox')
    .delete()
    .not('sent_at', 'is', null)
    .lt('sent_at', pruneBefore)
  if (pruneError) {
    errors.push({ statusCode: null, body: null, message: `prune outbox: ${pruneError.message}` })
  }

  return new Response(
    JSON.stringify({
      due: due?.length ?? 0,
      sent,
      subsFound,
      // Phase 2 counters, named apart from `due`/`sent` so an existing caller
      // reading those keys is unaffected: `queued` is outbox rows scanned,
      // `groups` is pushes attempted, `notified` is devices actually reached.
      queued: queued.length,
      groups: groups.length,
      notified,
      errors
    }),
    { headers: { 'content-type': 'application/json' } }
  )
})
