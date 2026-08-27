import { describe, it, expect } from 'vitest'
import {
  formatWhen,
  groupByRecipientCalendar,
  memberActivityPush,
  type PendingNotification
} from './notifications.ts'

// The dispatcher itself needs Deno, but its copy and grouping rules are pure and
// are where the user-visible mistakes live: a wrong tag silently replaces an
// unread notification, and a missing group turns one bulk copy into a burst of
// thirty pushes. Those are worth pinning even though the rest of the Edge
// Function has no test harness.

function row(overrides: Partial<PendingNotification> = {}): PendingNotification {
  return {
    outbox_id: 'outbox-1',
    recipient_id: 'bob',
    calendar_id: 'cal-family',
    calendar_name: '家庭',
    actor_name: 'Alice',
    event_title: '晚餐',
    starts_at: '2026-09-01T04:00:00Z', // 12:00 in Asia/Taipei
    all_day: false,
    ...overrides
  }
}

describe('formatWhen', () => {
  it('renders a timed start in Taipei wall clock', () => {
    expect(formatWhen('2026-09-01T04:00:00Z')).toContain('12:00')
  })

  it('prints a date only for an all-day entry', () => {
    // All-day rows are encoded at UTC midnight, so a time would render as an
    // arbitrary hour rather than a real start.
    const formatted = formatWhen('2026-09-01T00:00:00Z', true)

    expect(formatted).not.toMatch(/\d{1,2}:\d{2}/)
    expect(formatted).toContain('2026')
  })
})

describe('groupByRecipientCalendar', () => {
  it('collapses one recipient’s rows for the same calendar into one group', () => {
    // copyToDays bulk-inserts one event per selected day; ungrouped this would be
    // three separate system notifications for one user action.
    const groups = groupByRecipientCalendar([
      row({ outbox_id: 'a' }),
      row({ outbox_id: 'b' }),
      row({ outbox_id: 'c' })
    ])

    expect(groups).toHaveLength(1)
    expect(groups[0]).toHaveLength(3)
  })

  it('keeps different recipients and different calendars apart', () => {
    const groups = groupByRecipientCalendar([
      row({ outbox_id: 'a', recipient_id: 'bob', calendar_id: 'cal-1' }),
      row({ outbox_id: 'b', recipient_id: 'carol', calendar_id: 'cal-1' }),
      row({ outbox_id: 'c', recipient_id: 'bob', calendar_id: 'cal-2' })
    ])

    expect(groups).toHaveLength(3)
  })

  it('preserves order so each group starts with its oldest row', () => {
    // The RPC orders by created_at within a recipient/calendar pair, and the tag
    // is taken from the first row — it has to be stable across ticks.
    const groups = groupByRecipientCalendar([row({ outbox_id: 'older' }), row({ outbox_id: 'newer' })])

    expect(groups[0]?.[0]?.outbox_id).toBe('older')
  })

  it('returns nothing for an empty queue', () => {
    expect(groupByRecipientCalendar([])).toEqual([])
  })
})

describe('memberActivityPush', () => {
  it('names the event when a single one was added', () => {
    const push = memberActivityPush([row()])

    expect(push.title).toBe('家庭')
    expect(push.body).toContain('Alice')
    expect(push.body).toContain('晚餐')
    expect(push.body).toContain('12:00')
  })

  it('counts instead of listing when one person added several', () => {
    const push = memberActivityPush([row({ outbox_id: 'a' }), row({ outbox_id: 'b' })])

    expect(push.body).toBe('Alice 新增了 2 個事件')
  })

  it('drops the name when a group merges two different people', () => {
    // A tick can merge two members' additions to the same calendar; naming only
    // the first would be wrong.
    const push = memberActivityPush([
      row({ outbox_id: 'a', actor_name: 'Alice' }),
      row({ outbox_id: 'b', actor_name: 'Carol' })
    ])

    expect(push.body).toBe('2 個新事件')
  })

  it('tags on the group, not the calendar, so an unread push is not replaced', () => {
    // A repeated tag replaces the notification already on screen. Keying on the
    // calendar would silently wipe an earlier addition the user had not read.
    const first = memberActivityPush([row({ outbox_id: 'a' })])
    const second = memberActivityPush([row({ outbox_id: 'b' })])

    expect(first.tag).toBe('a')
    expect(second.tag).toBe('b')
    expect(first.tag).not.toBe(second.tag)
  })

  it('points at a route the service worker can open', () => {
    // public/sw.js resolves this against its own scope, so it must stay relative.
    const push = memberActivityPush([row()])

    expect(push.url).toBe('v2/month')
    expect(push.url.startsWith('/')).toBe(false)
  })

  it('refuses an empty group rather than sending a blank notification', () => {
    expect(() => memberActivityPush([])).toThrow()
  })
})
