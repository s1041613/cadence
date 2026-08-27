// Pure notification-copy and grouping rules for the send-reminders dispatcher.
//
// Split out of index.ts so it can be unit-tested: index.ts imports `jsr:` and
// `npm:` specifiers and calls Deno.serve at module scope, none of which load
// outside Deno. Nothing in here touches the network, the database or any global,
// so `notifications.test.ts` can import it directly under vitest.

/** One queued member-activity row, as returned by pending_member_event_notifications(). */
export interface PendingNotification {
  outbox_id: string
  recipient_id: string
  calendar_id: string
  calendar_name: string
  actor_name: string
  event_title: string
  starts_at: string
  all_day: boolean
}

/** The payload shape public/sw.js expects. */
export interface PushPayload {
  title: string
  body: string
  url: string
  tag: string
}

/**
 * Wall-clock rendering shared by both notification kinds.
 *
 * All-day entries print a date only: they are encoded at UTC midnight, so a time
 * on them would render as an arbitrary hour rather than a real start.
 */
export function formatWhen(startsAt: string, allDay = false): string {
  const options: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Taipei', dateStyle: 'short' }
  if (!allDay) options.timeStyle = 'short'
  return new Date(startsAt).toLocaleString('zh-TW', options)
}

/**
 * Groups queued rows by (recipient, calendar).
 *
 * This is a correctness requirement, not a nicety: tasks-store.copyToDays()
 * bulk-inserts one event per selected day, so a single user action can enqueue
 * ~30 rows for the same recipient and calendar. Ungrouped, those arrive as ~30
 * separate system notifications.
 *
 * Insertion order is preserved (Map iterates in insertion order and the RPC
 * already orders by recipient, calendar, created_at), so each group's first row
 * is its oldest.
 */
export function groupByRecipientCalendar(
  rows: readonly PendingNotification[]
): PendingNotification[][] {
  const groups = new Map<string, PendingNotification[]>()
  for (const row of rows) {
    const key = `${row.recipient_id}|${row.calendar_id}`
    const group = groups.get(key)
    if (group) group.push(row)
    else groups.set(key, [row])
  }
  return [...groups.values()]
}

/**
 * Renders one group as a single push.
 *
 * The tag is the group's own oldest row id, NOT the calendar id: a repeated tag
 * replaces the notification already on screen, so keying on the calendar would
 * silently wipe an earlier addition the user had not read yet. Reminders key on
 * event_id, so the two kinds cannot collide either.
 */
export function memberActivityPush(group: readonly PendingNotification[]): PushPayload {
  const first = group[0]
  if (!first) throw new Error('memberActivityPush called with an empty group')

  const body =
    group.length === 1
      ? `${first.actor_name} 新增了「${first.event_title}」· ${formatWhen(first.starts_at, first.all_day)}`
      : // A tick can merge two different people's additions to the same calendar;
        // naming only the first would be wrong, so the count carries the message.
        group.every((n) => n.actor_name === first.actor_name)
        ? `${first.actor_name} 新增了 ${group.length} 個事件`
        : `${group.length} 個新事件`

  return { title: first.calendar_name, body, url: 'v2/month', tag: first.outbox_id }
}
