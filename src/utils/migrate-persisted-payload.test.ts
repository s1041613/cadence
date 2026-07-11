import { describe, it, expect } from 'vitest'
import { migratePersistedPayload } from './migrate-persisted-payload'
import { DEFAULT_CALENDAR_ID } from '@/stores/calendars-store'

describe('migratePersistedPayload', () => {
  it('returns undefined for a payload that is not even the legacy shape', () => {
    expect(migratePersistedPayload(undefined)).toBeUndefined()
    expect(migratePersistedPayload({})).toBeUndefined()
    expect(migratePersistedPayload({ tasks: [] })).toBeUndefined()
  })

  it('fills forward one pre-migration task losslessly (spec example)', () => {
    const raw = {
      tasks: [{ id: 't1', title: 'Dentist', type: 'event' }],
      inbox: [],
      inboxDraft: ''
    }

    const migrated = migratePersistedPayload(raw)

    expect(migrated?.tasks).toEqual([{ id: 't1', title: 'Dentist', type: 'event', calendarId: DEFAULT_CALENDAR_ID, reminder: null }])
  })

  it('loads all 12 pre-migration tasks intact, each assigned to a default calendar', () => {
    const raw = {
      tasks: Array.from({ length: 12 }, (_, i) => ({ id: `t${i}`, title: `Task ${i}` })),
      inbox: [],
      inboxDraft: ''
    }

    const migrated = migratePersistedPayload(raw)

    expect(migrated?.tasks).toHaveLength(12)
    expect(migrated?.tasks.every((t) => t.calendarId === DEFAULT_CALENDAR_ID && t.reminder === null)).toBe(true)
    expect(migrated?.calendars).toHaveLength(1)
    expect(migrated?.calendars[0]!.id).toBe(DEFAULT_CALENDAR_ID)
  })

  it('does not drop fields already present on a task', () => {
    const raw = {
      tasks: [{ id: 't1', title: 'Standup', calendarId: 'work-cal', reminder: '5-min' }],
      inbox: [],
      inboxDraft: ''
    }

    const migrated = migratePersistedPayload(raw)

    expect(migrated?.tasks[0]).toEqual({ id: 't1', title: 'Standup', calendarId: 'work-cal', reminder: '5-min' })
  })

  it('fills forward pre-migration inbox items (old {id, text} shape) so the Draft drawer does not crash on createdAt', () => {
    const raw = {
      tasks: [],
      inbox: [{ id: 'i1', text: 'buy milk' }],
      inboxDraft: ''
    }

    const migrated = migratePersistedPayload(raw)

    expect(migrated?.inbox).toHaveLength(1)
    expect(migrated?.inbox[0]).toMatchObject({ id: 'i1', text: 'buy milk', done: false, scheduled: null })
    expect(typeof migrated?.inbox[0]!.createdAt).toBe('string')
    expect(migrated?.inbox[0]!.createdAt.length).toBeGreaterThan(0)
  })

  it('does not drop fields already present on an inbox item', () => {
    const raw = {
      tasks: [],
      inbox: [{ id: 'i1', text: 'buy milk', createdAt: '2026-01-01', done: true, scheduled: { type: 'task' as const, color: '#000', tag: 'Scheduled' } }],
      inboxDraft: ''
    }

    const migrated = migratePersistedPayload(raw)

    expect(migrated?.inbox[0]).toEqual(raw.inbox[0])
  })

  it('fills default settings when settings is missing', () => {
    const raw = { tasks: [], inbox: [], inboxDraft: '' }
    const migrated = migratePersistedPayload(raw)
    expect(migrated?.settings).toEqual({
      timeFormat: '24-Hour',
      firstDay: 'Sunday',
      monthEventLabel: 'name',
      showPhoto: true,
      monthlyPhotos: Array(12).fill(null)
    })
  })

  it('passes through an already-migrated payload unchanged', () => {
    const raw = {
      tasks: [{ id: 't1', title: 'X', calendarId: 'c1', reminder: null }],
      inbox: [],
      inboxDraft: '',
      calendars: [{ id: 'c1', name: 'Mine', color: '#000', icon: null, cover: null, order: 0 }],
      hiddenCalendarIds: ['c1'],
      settings: { timeFormat: '24-Hour', firstDay: 'Monday', monthEventLabel: 'dot', showPhoto: false, monthlyPhotos: Array(12).fill(null) }
    }

    const migrated = migratePersistedPayload(raw)

    expect(migrated?.calendars).toEqual(raw.calendars)
    expect(migrated?.hiddenCalendarIds).toEqual(['c1'])
    expect(migrated?.settings).toEqual(raw.settings)
  })

  it('fills default monthlyPhotos when settings predates that field', () => {
    const raw = {
      tasks: [],
      inbox: [],
      inboxDraft: '',
      settings: { timeFormat: '24-Hour', firstDay: 'Monday', monthEventLabel: 'dot', showPhoto: false }
    }

    const migrated = migratePersistedPayload(raw)

    expect(migrated?.settings).toEqual({
      timeFormat: '24-Hour',
      firstDay: 'Monday',
      monthEventLabel: 'dot',
      showPhoto: false,
      monthlyPhotos: Array(12).fill(null)
    })
  })

  it('forces a stale persisted 12-Hour timeFormat to 24-Hour', () => {
    const raw = {
      tasks: [],
      inbox: [],
      inboxDraft: '',
      settings: { timeFormat: '12-Hour', firstDay: 'Monday', monthEventLabel: 'dot', showPhoto: false }
    }

    const migrated = migratePersistedPayload(raw)

    expect(migrated?.settings).toEqual({
      timeFormat: '24-Hour',
      firstDay: 'Monday',
      monthEventLabel: 'dot',
      showPhoto: false,
      monthlyPhotos: Array(12).fill(null)
    })
  })
})
