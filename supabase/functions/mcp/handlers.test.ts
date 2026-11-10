import { describe, it, expect } from 'vitest'
import {
  addTodos,
  createEvent,
  getSchedule,
  hasAccess,
  updateEvent,
  updateTodo,
  type Db,
  type ToolContext
} from './handlers.ts'
import { ToolInputError, type EventRow } from './core.ts'

// A stand-in for the caller-scoped Supabase client. Each query records its chain of calls and is
// answered by the test's responder for that table, so a test can assert both what came back and
// HOW the query was scoped — the filters are the part a refactor could quietly drop.

type Call = [method: string, ...args: unknown[]]
interface Query {
  table: string
  calls: Call[]
}
type Responder = (q: Query) => { data?: unknown; error?: { message: string } | null }

function fakeDb(responders: Record<string, Responder>, rpcResults: Record<string, unknown> = {}): { db: Db; queries: Query[]; rpcs: string[] } {
  const queries: Query[] = []
  const rpcs: string[] = []
  const db: Db = {
    rpc(fn: string) {
      rpcs.push(fn)
      return Promise.resolve({ data: rpcResults[fn] ?? null, error: null })
    },
    from(table: string) {
      const q: Query = { table, calls: [] }
      queries.push(q)
      const builder: Record<string, unknown> = {}
      for (const m of ['select', 'eq', 'in', 'lt', 'lte', 'gte', 'or', 'order', 'limit', 'insert', 'update', 'upsert', 'delete', 'maybeSingle']) {
        builder[m] = (...args: unknown[]) => {
          q.calls.push([m, ...args])
          return builder
        }
      }
      builder.then = (resolve: (v: unknown) => void, reject: (e: unknown) => void) => {
        try {
          const r = (responders[table] ?? (() => ({ data: null })))(q)
          resolve({ data: r.data ?? null, error: r.error ?? null })
        } catch (e) {
          reject(e)
        }
      }
      return builder
    }
  }
  return { db, queries, rpcs }
}

const has = (q: Query, method: string): Call | undefined => q.calls.find((c) => c[0] === method)
const isWrite = (q: Query): boolean => q.calls.some((c) => ['insert', 'update', 'upsert', 'delete'].includes(c[0]))

const CAL_OWN = '11111111-1111-4111-8111-111111111111'
const CAL_SHARED = '22222222-2222-4222-8222-222222222222'

const memberships: Responder = () => ({
  data: [
    { position: 0, role: 'member', calendars: { id: CAL_SHARED, name: 'Family' } },
    { position: 1, role: 'owner', calendars: { id: CAL_OWN, name: 'Mine' } }
  ]
})

function ctxWith(db: Db): ToolContext {
  let n = 0
  return {
    db,
    userId: 'me',
    timeZone: 'Asia/Taipei',
    now: () => new Date('2026-11-11T02:00:00Z'), // 10:00 on the 11th in Taipei
    newId: () => `new-${n++}`
  }
}

function eventRow(overrides: Partial<EventRow> = {}): EventRow & { event_reminders: Array<{ minutes_before: number }> } {
  return {
    id: 'ev-1',
    calendar_id: CAL_OWN,
    owner_id: 'me',
    type: 'event',
    title: 'Dentist',
    quadrant: null,
    color: null,
    icon: null,
    all_day: false,
    starts_at: '2026-11-12T06:00:00.000Z',
    ends_at: '2026-11-12T07:00:00.000Z',
    show_in_month: true,
    location: null,
    notes: null,
    repeat_mode: 'none',
    done: false,
    estimated_pomodoros: 0,
    completed_pomodoros: 0,
    time_edited_at: null,
    event_reminders: [{ minutes_before: 15 }],
    ...overrides
  }
}

describe('hasAccess', () => {
  it('asks has_mcp_access() as the caller', async () => {
    const { db, rpcs } = fakeDb({}, { has_mcp_access: true })
    expect(await hasAccess(ctxWith(db))).toBe(true)
    expect(rpcs).toEqual(['has_mcp_access'])
  })

  it('says no for anything but true', async () => {
    expect(await hasAccess(ctxWith(fakeDb({}, { has_mcp_access: false }).db))).toBe(false)
    expect(await hasAccess(ctxWith(fakeDb({}, { has_mcp_access: null }).db))).toBe(false)
  })
})

describe('getSchedule', () => {
  it('defaults to today in the user’s zone and splits events, tasks and todos', async () => {
    const { db, queries } = fakeDb({
      calendar_members: memberships,
      events: () => ({
        data: [
          eventRow({ id: 'e', starts_at: '2026-11-11T05:00:00.000Z', ends_at: '2026-11-11T06:00:00.000Z' }),
          eventRow({ id: 't', type: 'task', quadrant: 'do', starts_at: '2026-11-11T01:00:00.000Z', ends_at: '2026-11-11T02:00:00.000Z' }),
          // Inside the widened query window but on another day once decoded: must be dropped.
          eventRow({ id: 'tomorrow' })
        ]
      }),
      day_todos: () => ({
        data: [{ id: 'd', user_id: 'me', date: '2026-11-09', origin_date: '2026-11-09', title: 'Call bank', done: false, position: 0 }]
      })
    })

    const r = await getSchedule(ctxWith(db), {})
    expect(r).toMatchObject({ today: '2026-11-11', from: '2026-11-11', to: '2026-11-11', time_zone: 'Asia/Taipei' })
    expect(r.events.map((e) => e.id)).toEqual(['e'])
    expect(r.tasks.map((e) => [e.id, e.important, e.urgent])).toEqual([['t', true, true]])
    expect(r.todos).toEqual([{ id: 'd', date: '2026-11-11', title: 'Call bank', done: false, carried_from: '2026-11-09' }])

    const events = queries.find((q) => q.table === 'events')!
    expect(has(events, 'in')).toEqual(['in', 'calendar_id', [CAL_SHARED, CAL_OWN]])
    const todos = queries.find((q) => q.table === 'day_todos')!
    expect(has(todos, 'eq')).toEqual(['eq', 'user_id', 'me'])
  })

  it('never writes', async () => {
    const { db, queries } = fakeDb({ calendar_members: memberships, events: () => ({ data: [] }), day_todos: () => ({ data: [] }) })
    await getSchedule(ctxWith(db), { from: '2026-11-01', to: '2026-11-30' })
    expect(queries.some(isWrite)).toBe(false)
  })
})

describe('createEvent', () => {
  it('goes to the user’s own default calendar, as the caller, with the app’s default reminder', async () => {
    const { db, queries } = fakeDb({ calendar_members: memberships })
    const entry = await createEvent(ctxWith(db), { title: 'Dentist', date: '2026-11-12', start: '14:00' })

    const insert = has(queries.find((q) => q.table === 'events')!, 'insert')![1] as Record<string, unknown>
    // The shared calendar sits first by position but is not the user's to default to.
    expect(insert).toMatchObject({ calendar_id: CAL_OWN, owner_id: 'me', starts_at: '2026-11-12T06:00:00.000Z', ends_at: '2026-11-12T07:00:00.000Z' })
    expect(insert.updated_at).toBeDefined()

    const reminder = has(queries.find((q) => q.table === 'event_reminders')!, 'upsert')!
    expect(reminder[1]).toEqual({ event_id: 'new-0', minutes_before: 15, fired_at: null })
    expect(entry).toMatchObject({ id: 'new-0', calendar_name: 'Mine', reminder: '15-min', mine: true })
  })

  it('writes no reminder row when asked for none', async () => {
    const { db, queries } = fakeDb({ calendar_members: memberships })
    await createEvent(ctxWith(db), { title: 'x', date: '2026-11-12', all_day: true, reminder: 'none' })
    expect(queries.some((q) => q.table === 'event_reminders')).toBe(false)
  })

  it('refuses a calendar the user is not a member of before writing anything', async () => {
    const { db, queries } = fakeDb({ calendar_members: memberships })
    await expect(
      createEvent(ctxWith(db), { title: 'x', date: '2026-11-12', all_day: true, calendar_id: '33333333-3333-4333-8333-333333333333' })
    ).rejects.toThrow(ToolInputError)
    expect(queries.some(isWrite)).toBe(false)
  })

  it('surfaces a database refusal as a failure, not a success', async () => {
    const { db } = fakeDb({ calendar_members: memberships, events: () => ({ error: { message: 'new row violates row-level security policy' } }) })
    await expect(createEvent(ctxWith(db), { title: 'x', date: '2026-11-12', all_day: true })).rejects.toThrow(/row-level security/)
  })
})

describe('updateEvent', () => {
  it('refuses another member’s event without writing', async () => {
    const { db, queries } = fakeDb({ events: () => ({ data: eventRow({ owner_id: 'someone-else' }) }), calendar_members: memberships })
    await expect(updateEvent(ctxWith(db), { id: 'ev-1', title: 'Mine now' })).rejects.toThrow(/another member/)
    expect(queries.some(isWrite)).toBe(false)
  })

  it('scopes the write to the caller and re-arms the reminder when the time moves', async () => {
    let call = 0
    const { db, queries } = fakeDb({
      calendar_members: memberships,
      events: () => (call++ === 0 ? { data: eventRow() } : { data: eventRow({ starts_at: '2026-11-12T08:00:00.000Z', ends_at: '2026-11-12T09:00:00.000Z' }) })
    })
    const entry = await updateEvent(ctxWith(db), { id: 'ev-1', start: '16:00' })

    const write = queries.filter((q) => q.table === 'events')[1]!
    expect(write.calls.filter((c) => c[0] === 'eq')).toEqual([
      ['eq', 'id', 'ev-1'],
      ['eq', 'owner_id', 'me']
    ])
    expect(has(write, 'update')![1]).toMatchObject({ starts_at: '2026-11-12T08:00:00.000Z', time_edited_at: '2026-11-11T02:00:00.000Z' })
    expect(has(queries.find((q) => q.table === 'event_reminders')!, 'upsert')![1]).toMatchObject({ minutes_before: 15, fired_at: null })
    expect(entry).toMatchObject({ start: '16:00', end: '17:00', reminder: '15-min' })
  })
})

describe('todos', () => {
  it('appends to the end of the day’s list, as the caller', async () => {
    const { db, queries } = fakeDb({ day_todos: (q) => (has(q, 'insert') ? {} : { data: [{ position: 2 }] }) })
    const r = await addTodos(ctxWith(db), { titles: ['Milk', 'Eggs'] })

    expect(r.date).toBe('2026-11-11')
    const rows = has(queries[1]!, 'insert')![1] as Array<Record<string, unknown>>
    expect(rows.map((x) => [x.title, x.position, x.user_id])).toEqual([
      ['Milk', 3, 'me'],
      ['Eggs', 4, 'me']
    ])
  })

  it('updates only the caller’s todo and reports a miss as not found', async () => {
    const { db, queries } = fakeDb({ day_todos: () => ({ data: null }) })
    await expect(updateTodo(ctxWith(db), { id: 'x', done: true })).rejects.toThrow(/No todo/)
    expect(queries[0]!.calls.filter((c) => c[0] === 'eq')).toEqual([
      ['eq', 'id', 'x'],
      ['eq', 'user_id', 'me']
    ])
  })
})
