import { describe, expect, it } from 'vitest'
import type { Task } from '../types/task'
import { buildTitleSuggestions, dismissalKey, SUGGESTION_LIMIT } from './title-suggestions'

const ME = 'me-user-id'

function mkEvent(overrides: Partial<Task> = {}): Task {
  return {
    id: crypto.randomUUID(),
    title: 'Untitled',
    date: '2026-08-01',
    start: '12:00',
    end: '13:00',
    allDay: false,
    location: '',
    repeat: 'none',
    notes: '',
    important: false,
    urgent: false,
    done: false,
    estimatedPomodoros: 0,
    completedPomodoros: 0,
    type: 'event',
    backgroundColor: null,
    icon: null,
    calendarId: 'cal-1',
    reminder: null,
    ownerId: ME,
    ...overrides
  }
}

function build(tasks: Task[], opts: { query?: string; dismissed?: Set<string> } = {}) {
  return buildTitleSuggestions(tasks, {
    ownerId: ME,
    query: opts.query ?? '',
    dismissed: opts.dismissed ?? new Set()
  })
}

describe('buildTitleSuggestions', () => {
  describe('source filtering', () => {
    it('excludes events authored by other calendar members', () => {
      const tasks = [
        mkEvent({ title: 'Mine', ownerId: ME }),
        mkEvent({ title: 'Theirs', ownerId: 'someone-else' })
      ]

      expect(build(tasks).map((s) => s.title)).toEqual(['Mine'])
    })

    it('treats an absent ownerId as own, since local drafts carry no author until they sync', () => {
      const { ownerId: _omitted, ...local } = mkEvent({ title: 'Local draft' })

      expect(build([local]).map((s) => s.title)).toEqual(['Local draft'])
    })

    it('includes quadrant tasks, so a recurring chore is suggested as readily as an event', () => {
      const tasks = [
        mkEvent({ title: 'An event', type: 'event', date: '2026-07-02' }),
        mkEvent({ title: 'A task', type: 'quadrant', date: '2026-07-01' })
      ]

      expect(build(tasks).map((s) => s.title)).toEqual(['An event', 'A task'])
    })

    it('does not let a task and an event of the same name and time become two rows', () => {
      const tasks = [
        mkEvent({ title: '吃飯', type: 'event', start: '12:00', end: '13:00', date: '2026-07-01' }),
        mkEvent({ title: '吃飯', type: 'quadrant', start: '12:00', end: '13:00', date: '2026-07-02' })
      ]

      expect(build(tasks)).toHaveLength(1)
    })

    it('excludes events with a blank title', () => {
      const tasks = [mkEvent({ title: '   ' }), mkEvent({ title: 'Real' })]

      expect(build(tasks).map((s) => s.title)).toEqual(['Real'])
    })

    it('returns nothing when there is no history', () => {
      expect(build([])).toEqual([])
    })
  })

  describe('grouping', () => {
    it('keeps same title at different times as separate suggestions', () => {
      const tasks = [
        mkEvent({ title: '頭髮', start: '16:00', end: '18:00', date: '2026-08-01' }),
        mkEvent({ title: '頭髮', start: '14:00', end: '16:00', date: '2026-08-02' })
      ]

      expect(build(tasks)).toHaveLength(2)
    })

    it('collapses repeats of the same title and time into one suggestion', () => {
      const tasks = [
        mkEvent({ title: '英文課', start: '10:00', end: '10:50', date: '2026-07-01' }),
        mkEvent({ title: '英文課', start: '10:00', end: '10:50', date: '2026-07-08' }),
        mkEvent({ title: '英文課', start: '10:00', end: '10:50', date: '2026-07-15' })
      ]

      expect(build(tasks)).toHaveLength(1)
    })

    it('treats titles differing only by case or surrounding whitespace as the same suggestion', () => {
      const tasks = [
        mkEvent({ title: 'Bikini', date: '2026-07-01' }),
        mkEvent({ title: '  bikini  ', date: '2026-07-02' })
      ]

      expect(build(tasks)).toHaveLength(1)
    })

    it('displays the title as most recently written, preserving its original case', () => {
      const tasks = [
        mkEvent({ title: 'bikini', date: '2026-07-01' }),
        mkEvent({ title: 'Bikini', date: '2026-07-02' })
      ]

      expect(build(tasks)[0]?.title).toBe('Bikini')
    })

    it('separates all-day events from timed ones under the same title', () => {
      const tasks = [
        mkEvent({ title: '出差', allDay: true, start: '', end: '' }),
        mkEvent({ title: '出差', allDay: false, start: '09:00', end: '18:00' })
      ]

      expect(build(tasks)).toHaveLength(2)
    })
  })

  describe('ordering and size', () => {
    it('puts the most recently used suggestion first', () => {
      const tasks = [
        mkEvent({ title: 'Older', date: '2026-07-01' }),
        mkEvent({ title: 'Newest', date: '2026-07-30' }),
        mkEvent({ title: 'Middle', date: '2026-07-15' })
      ]

      expect(build(tasks).map((s) => s.title)).toEqual(['Newest', 'Middle', 'Older'])
    })

    it('ranks by the most recent use of a title, not its first', () => {
      const tasks = [
        mkEvent({ title: 'Recurring', date: '2026-07-01' }),
        mkEvent({ title: 'Recurring', date: '2026-07-31' }),
        mkEvent({ title: 'One-off', date: '2026-07-15' })
      ]

      expect(build(tasks).map((s) => s.title)).toEqual(['Recurring', 'One-off'])
    })

    it('breaks a same-day tie on start time rather than leaving it to array order', () => {
      const tasks = [
        mkEvent({ title: 'Morning', date: '2026-07-20', start: '09:00', end: '10:00' }),
        mkEvent({ title: 'Evening', date: '2026-07-20', start: '20:00', end: '21:00' })
      ]

      expect(build(tasks).map((s) => s.title)).toEqual(['Evening', 'Morning'])
    })

    it('picks the later occurrence for carried values when two share a date', () => {
      const tasks = [
        mkEvent({ title: '頭髮', date: '2026-07-20', start: '09:00', end: '10:00', location: 'Morning salon' }),
        mkEvent({ title: '頭髮', date: '2026-07-20', start: '09:00', end: '10:00', location: 'Later salon' })
      ]

      // Same key entirely: the scan keeps the incumbent, so this pins the tie-break as stable
      // rather than dependent on which happened to be scanned first.
      expect(build(tasks)).toHaveLength(1)
    })

    it('caps the unfiltered list at the display limit', () => {
      const tasks = Array.from({ length: SUGGESTION_LIMIT + 5 }, (_, i) =>
        mkEvent({ title: `Event ${i}`, date: '2026-07-01' })
      )

      expect(build(tasks)).toHaveLength(SUGGESTION_LIMIT)
    })

    it('caps the filtered list at the display limit too', () => {
      const tasks = Array.from({ length: SUGGESTION_LIMIT + 5 }, (_, i) =>
        mkEvent({ title: `Meeting ${i}`, date: '2026-07-01' })
      )

      expect(build(tasks, { query: 'Meeting' })).toHaveLength(SUGGESTION_LIMIT)
    })
  })

  describe('filtering', () => {
    it('matches on prefix', () => {
      const tasks = [mkEvent({ title: '頭髮' })]

      expect(build(tasks, { query: '頭' })).toHaveLength(1)
    })

    it('does not match mid-string, so 洗頭 stays out when typing 頭', () => {
      const tasks = [mkEvent({ title: '洗頭' })]

      expect(build(tasks, { query: '頭' })).toEqual([])
    })

    it('ignores case when matching', () => {
      const tasks = [mkEvent({ title: 'Bikini' })]

      expect(build(tasks, { query: 'bik' })).toHaveLength(1)
    })

    it('ignores leading and trailing whitespace in the query', () => {
      const tasks = [mkEvent({ title: 'Bikini' })]

      expect(build(tasks, { query: '  bik  ' })).toHaveLength(1)
    })

    it('returns the full list for an empty query', () => {
      const tasks = [mkEvent({ title: 'A' }), mkEvent({ title: 'B' })]

      expect(build(tasks, { query: '' })).toHaveLength(2)
    })

    it('keeps an exact full-title match, since its time and style are still worth picking up', () => {
      const tasks = [mkEvent({ title: 'test' })]

      expect(build(tasks, { query: 'test' }).map((s) => s.title)).toEqual(['test'])
    })

    it('keeps both the exact match and longer titles sharing the prefix', () => {
      const tasks = [
        mkEvent({ title: '頭髮', date: '2026-07-20' }),
        mkEvent({ title: '頭髮乾燥', date: '2026-07-21' })
      ]

      expect(build(tasks, { query: '頭髮' }).map((s) => s.title).sort()).toEqual(['頭髮', '頭髮乾燥'])
    })
  })

  describe('dismissal', () => {
    it('omits a dismissed suggestion', () => {
      const tasks = [mkEvent({ title: '花小兔', start: '12:00', end: '13:00' })]
      const dismissed = new Set([dismissalKey('花小兔', '12:00', '13:00', false)])

      expect(build(tasks, { dismissed })).toEqual([])
    })

    it('leaves other time variants of the same title in place', () => {
      const tasks = [
        mkEvent({ title: '頭髮', start: '14:00', end: '16:00', date: '2026-08-02' }),
        mkEvent({ title: '頭髮', start: '16:00', end: '18:00', date: '2026-08-01' })
      ]
      const dismissed = new Set([dismissalKey('頭髮', '14:00', '16:00', false)])

      const result = build(tasks, { dismissed })
      expect(result).toHaveLength(1)
      expect(result[0]?.start).toBe('16:00')
    })

    it('matches dismissals regardless of the case the title was typed in', () => {
      const tasks = [mkEvent({ title: 'Bikini', start: '15:00', end: '16:00' })]
      const dismissed = new Set([dismissalKey('bikini', '15:00', '16:00', false)])

      expect(build(tasks, { dismissed })).toEqual([])
    })

    it('exposes a key on each suggestion that round-trips through dismissal', () => {
      const tasks = [mkEvent({ title: '花小兔', start: '12:00', end: '13:00' })]

      const key = build(tasks)[0]!.key
      expect(build(tasks, { dismissed: new Set([key]) })).toEqual([])
    })
  })

  describe('carry-over payload', () => {
    it('carries the fields the form should inherit', () => {
      const tasks = [
        mkEvent({
          title: '英文課',
          start: '10:00',
          end: '10:50',
          allDay: false,
          backgroundColor: '#8b5cf6',
          icon: 'book',
          calendarId: 'cal-study',
          reminder: '15-min',
          location: '南陽街'
        })
      ]

      expect(build(tasks)[0]).toMatchObject({
        title: '英文課',
        start: '10:00',
        end: '10:50',
        allDay: false,
        backgroundColor: '#8b5cf6',
        icon: 'book',
        calendarId: 'cal-study',
        reminder: '15-min',
        location: '南陽街'
      })
    })

    it('carries a task with no colour, since a quadrant task derives its hue at render time', () => {
      const tasks = [mkEvent({ title: '倒垃圾', type: 'quadrant', backgroundColor: null, start: '20:00', end: '20:15' })]

      expect(build(tasks)[0]).toMatchObject({ title: '倒垃圾', backgroundColor: null, start: '20:00', end: '20:15' })
    })

    it('omits notes, which are usually specific to one occurrence', () => {
      const tasks = [mkEvent({ notes: 'remember to bring the textbook' })]

      expect(build(tasks)[0]).not.toHaveProperty('notes')
    })

    it('omits repeat, so a suggestion never silently schedules a recurrence', () => {
      const tasks = [mkEvent({ repeat: 'weekly' })]

      expect(build(tasks)[0]).not.toHaveProperty('repeat')
    })

    it('takes the carried values from the most recent occurrence of that title and time', () => {
      const tasks = [
        mkEvent({ title: '頭髮', date: '2026-07-01', backgroundColor: '#old', location: 'Old salon' }),
        mkEvent({ title: '頭髮', date: '2026-07-20', backgroundColor: '#new', location: 'New salon' })
      ]

      expect(build(tasks)[0]).toMatchObject({ backgroundColor: '#new', location: 'New salon' })
    })
  })
})

describe('dismissalKey', () => {
  it('is stable across case and whitespace differences in the title', () => {
    expect(dismissalKey('  Bikini ', '15:00', '16:00', false)).toBe(dismissalKey('bikini', '15:00', '16:00', false))
  })

  it('distinguishes different time ranges of the same title', () => {
    expect(dismissalKey('頭髮', '14:00', '16:00', false)).not.toBe(dismissalKey('頭髮', '16:00', '18:00', false))
  })

  it('distinguishes an all-day variant from a timed one', () => {
    expect(dismissalKey('出差', '', '', true)).not.toBe(dismissalKey('出差', '', '', false))
  })
})
